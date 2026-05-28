from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status, Query, Request
from fastapi.security import OAuth2PasswordBearer
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from jose import jwt, JWTError
from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime, timezone, timedelta
from pathlib import Path
from dotenv import load_dotenv
from collections import defaultdict
import os, uuid, asyncio, json, logging, random, string, time, httpx

# local modules
from events_bus import EventBus, OrgEvent
import providers as prov
import deliberation as delib
from skills_catalog import SKILLS_CATALOG, SKILL_CATEGORIES

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ── Config ────────────────────────────────────────────────────────────────
_jwt_secret = os.environ.get("JWT_SECRET", "")
if not _jwt_secret:
    if os.environ.get("OPENCLAW_DEV"):
        logger_boot = logging.getLogger("openclaw.boot")
        logger_boot.warning("JWT_SECRET not set — using insecure default (dev only)")
        _jwt_secret = "openclaw-dev-insecure-secret"
    else:
        raise RuntimeError("JWT_SECRET environment variable must be set in production. "
                           "Set OPENCLAW_DEV=1 to allow insecure default in development.")
SECRET_KEY   = _jwt_secret
ALGORITHM    = "HS256"
TOKEN_EXPIRE = 24  # hours

# ── Rate limiting (in-memory, per-IP) ────────────────────────────────────
_rate_store: dict = defaultdict(list)

def _check_rate_limit(key: str, max_calls: int = 10, window: int = 60):
    now = time.time()
    calls = [t for t in _rate_store[key] if now - t < window]
    _rate_store[key] = calls
    if len(calls) >= max_calls:
        raise HTTPException(429, "Too many requests. Try again later.")
    _rate_store[key].append(now)

# ── DB ────────────────────────────────────────────────────────────────────
mongo_url = os.environ["MONGO_URL"]
client    = AsyncIOMotorClient(mongo_url)
DB_NAME   = os.environ.get("DB_NAME", "openclaw")
db        = client[DB_NAME]

# ── App + Router ──────────────────────────────────────────────────────────
app        = FastAPI(title="OpenClaw Command Center v2")
api_router = APIRouter(prefix="/api")

_cors_origins = os.environ.get("CORS_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=_cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_BODY_BYTES = 2 * 1024 * 1024  # 2 MB

class BodySizeLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > MAX_BODY_BYTES:
            return JSONResponse({"detail": "Request body too large"}, status_code=413)
        return await call_next(request)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "connect-src 'self' wss: https:; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: https:;"
        )
        return response

app.add_middleware(BodySizeLimitMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("openclaw")

# ── Auth Utilities ────────────────────────────────────────────────────────
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

def hash_password(pw): return pwd_ctx.hash(pw)
def verify_password(plain, hashed): return pwd_ctx.verify(plain, hashed)

def create_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(401, "Invalid token")
    except JWTError:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user

# ── WebSocket Manager ─────────────────────────────────────────────────────
class OrgConnectionManager:
    def __init__(self):
        self._rooms: dict[str, list[tuple]] = {}
        self._user_map: dict[str, str] = {}  # client_id → user_id

    async def connect(self, org_id: str, ws: WebSocket, client_id: str, user_id: str = ""):
        await ws.accept()
        self._rooms.setdefault(org_id, []).append((ws, client_id))
        if user_id:
            self._user_map[client_id] = user_id

    def disconnect(self, org_id: str, ws: WebSocket):
        if org_id in self._rooms:
            self._rooms[org_id] = [(w, c) for w, c in self._rooms[org_id] if w is not ws]

    async def broadcast(self, org_id: str, event: dict, exclude_ws=None):
        payload = json.dumps(event, default=str)
        dead = []
        for ws, _ in self._rooms.get(org_id, []):
            if ws is exclude_ws:
                continue
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(org_id, ws)

    def room_size(self, org_id: str) -> int:
        return len(self._rooms.get(org_id, []))

    def get_client_ids(self, org_id: str) -> list:
        return [c for _, c in self._rooms.get(org_id, [])]

ws_manager = OrgConnectionManager()

# ── Event Bus ─────────────────────────────────────────────────────────────
event_bus = EventBus(db, ws_manager)

# ── Presence (in-memory, heartbeat-driven) ────────────────────────────────
# presence[org_id][user_id] = {status, last_seen, typing_in, thinking, name, avatar_color}
presence: dict[str, dict] = {}

async def update_presence(org_id: str, user_id: str, name: str, avatar_color: str,
                           status: str = "online", typing_in: str = "", thinking: bool = False):
    presence.setdefault(org_id, {})[user_id] = {
        "user_id": user_id, "name": name, "avatar_color": avatar_color,
        "status": status, "typing_in": typing_in,
        "thinking": thinking, "last_seen": now_iso()
    }
    await event_bus.publish(OrgEvent(
        event_type="presence.updated", org_id=org_id, actor_id=user_id,
        payload={"user_id": user_id, "name": name, "status": status,
                 "typing_in": typing_in, "thinking": thinking},
        persist=False  # presence events not stored
    ), persist=False)

def get_presence(org_id: str) -> list:
    import time as _time
    cutoff = _time.time() - 120  # 2-minute window
    result = []
    for uid, p in presence.get(org_id, {}).items():
        try:
            ts = datetime.fromisoformat(p["last_seen"].replace("Z","")).timestamp()
            if ts > cutoff:
                result.append(p)
        except Exception:
            result.append(p)
    return result

# ── Helpers ───────────────────────────────────────────────────────────────
def serialize_doc(doc):
    if not doc: return doc
    doc.pop("_id", None)
    for k, v in list(doc.items()):
        if isinstance(v, datetime): doc[k] = v.isoformat()
        elif isinstance(v, dict):   doc[k] = serialize_doc(v)
        elif isinstance(v, list):   doc[k] = [serialize_doc(i) if isinstance(i, dict) else (i.isoformat() if isinstance(i, datetime) else i) for i in v]
    return doc

def now_iso(): return datetime.now(timezone.utc).isoformat()
def gen_id():  return str(uuid.uuid4())
def gen_invite_code(n=8): return "".join(random.choices(string.ascii_uppercase + string.digits, k=n))
AVATAR_COLORS = ["#22d3ee","#f59e0b","#10b981","#6366f1","#ec4899","#f97316","#84cc16","#a78bfa"]

# ── Permissions ───────────────────────────────────────────────────────────
ROLE_RANK = {"owner": 5, "board": 4, "member": 3, "agent": 2, "observer": 1}

async def _get_member_role(org_id: str, user_id: str) -> Optional[str]:
    m = await db.org_members.find_one({"org_id": org_id, "user_id": user_id})
    return m.get("role") if m else None

async def _assert_member(org_id, user_id):
    role = await _get_member_role(org_id, user_id)
    if not role:
        raise HTTPException(403, "Not a member of this org")
    return role

async def _assert_min_role(org_id, user_id, min_role: str):
    role = await _get_member_role(org_id, user_id)
    if not role or ROLE_RANK.get(role, 0) < ROLE_RANK.get(min_role, 0):
        raise HTTPException(403, f"Requires {min_role} role or higher")
    return role

async def _get_org_config(org_id: str) -> dict:
    cfg = await db.org_configs.find_one({"org_id": org_id}, {"_id": 0}) or {}
    return {
        "provider": cfg.get("default_provider", ""),
        "model": cfg.get("default_model", ""),
        "openrouter_key": cfg.get("openrouter_key", os.environ.get("OPENROUTER_API_KEY", "")),
        "api_key": cfg.get("api_key", ""),
    }

async def _get_effective_config(org_id: str, user_id: str = "") -> dict:
    """Merge config: user keys override org keys override env defaults."""
    cfg = await _get_org_config(org_id)
    if user_id:
        ucfg = await db.user_configs.find_one({"user_id": user_id}, {"_id": 0}) or {}
        if ucfg.get("openrouter_key"):
            cfg["openrouter_key"] = ucfg["openrouter_key"]
        if ucfg.get("emergent_key"):
            cfg["api_key"] = ucfg["emergent_key"]
        if ucfg.get("preferred_provider"):
            cfg["provider"] = ucfg["preferred_provider"]
        if ucfg.get("preferred_model"):
            cfg["model"] = ucfg["preferred_model"]
    return cfg

# ── Pydantic request models ───────────────────────────────────────────────
class RegisterReq(BaseModel):
    email: str; password: str; name: str

class LoginReq(BaseModel):
    email: str; password: str

class OrgCreate(BaseModel):
    name: str; description: str = ""

class OrgConfigUpdate(BaseModel):
    default_provider: Optional[str] = None
    default_model: Optional[str] = None
    openrouter_key: Optional[str] = None
    api_key: Optional[str] = None

class UserConfigUpdate(BaseModel):
    openrouter_key: Optional[str] = None   # personal OpenRouter key
    emergent_key: Optional[str] = None     # personal Emergent/OpenAI key
    preferred_provider: Optional[str] = None
    preferred_model: Optional[str] = None

class JoinOrgReq(BaseModel):
    invite_code: str; agent_id: str

class AgentCreate(BaseModel):
    name: str; role: str = "Assistant"; system_prompt: str = ""
    skills: list = []; tools: list = []; model: str = "gpt-4.1-mini"
    provider_override: str = ""; model_override: str = ""

class AgentUpdate(BaseModel):
    name: Optional[str]=None; role: Optional[str]=None; system_prompt: Optional[str]=None
    skills: Optional[list]=None; tools: Optional[list]=None; model: Optional[str]=None
    api_key: Optional[str]=None; manager_id: Optional[str]=None
    is_board_member: Optional[bool]=None; status: Optional[str]=None
    position: Optional[dict]=None; provider_override: Optional[str]=None
    model_override: Optional[str]=None
    # Identity
    personality_traits: Optional[list]=None; goals: Optional[list]=None
    reputation_score: Optional[float]=None

class ProposalCreate(BaseModel):
    title: str; description: str = ""; workflow_id: Optional[str]=None; voting_type: str = "majority"

class VoteReq(BaseModel):
    value: str  # approve/reject

class CommentCreate(BaseModel):
    text: str

class WorkflowCreate(BaseModel):
    name: str; description: str = ""; trigger_type: str = "manual"
    nodes: list = []; edges: list = []

class WorkflowUpdate(BaseModel):
    name: Optional[str]=None; description: Optional[str]=None
    trigger_type: Optional[str]=None; nodes: Optional[list]=None; edges: Optional[list]=None

class ThreadCreate(BaseModel):
    title: str; participants: list

class MessageCreate(BaseModel):
    text: str

class MemberRoleUpdate(BaseModel):
    role: str  # owner/board/member/observer

class NotifMarkRead(BaseModel):
    notification_ids: list = []  # empty = mark all

class PresenceUpdate(BaseModel):
    typing_in: str = ""
    thinking: bool = False
    status: str = "online"

class DeliberationStart(BaseModel):
    proposal_id: str
    rounds: int = 1  # deliberation rounds

class MemoryNodeCreate(BaseModel):
    entity_type: str  # person/agent/project/decision/task/concept
    name: str
    description: str = ""
    metadata: dict = {}

class MemoryEdgeCreate(BaseModel):
    source_id: str
    target_id: str
    edge_type: str  # influenced/proposed/decided/executed/collaborates
    weight: float = 1.0
    metadata: dict = {}

# ════════════════════════════════════════════════════════════════════════════
# ① AUTH
# ════════════════════════════════════════════════════════════════════════════
@api_router.post("/auth/register")
async def register(req: RegisterReq, request: Request):
    _check_rate_limit(f"register:{request.client.host}", max_calls=5, window=300)
    if await db.users.find_one({"email": req.email.lower()}):
        raise HTTPException(400, "Email already registered")
    user = {
        "id": gen_id(), "email": req.email.lower(),
        "password_hash": hash_password(req.password),
        "name": req.name, "avatar_color": random.choice(AVATAR_COLORS),
        "created_at": now_iso()
    }
    await db.users.insert_one(user)
    token = create_token({"sub": user["id"]})
    return {"token": token, "user": {k: v for k, v in user.items() if k not in ("password_hash","_id")}}

@api_router.post("/auth/login")
async def login(req: LoginReq, request: Request):
    _check_rate_limit(f"login:{request.client.host}", max_calls=10, window=300)
    user = await db.users.find_one({"email": req.email.lower()}, {"_id": 0})
    if not user or not verify_password(req.password, user.get("password_hash", "")):
        raise HTTPException(401, "Invalid credentials")
    token = create_token({"sub": user["id"]})
    return {"token": token, "user": {k: v for k, v in user.items() if k != "password_hash"}}

@api_router.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return {k: v for k, v in user.items() if k != "password_hash"}

@api_router.get("/me/config")
async def get_my_config(user=Depends(get_current_user)):
    cfg = await db.user_configs.find_one({"user_id": user["id"]}, {"_id": 0}) or {}
    return {
        "has_openrouter_key": bool(cfg.get("openrouter_key")),
        "has_emergent_key":   bool(cfg.get("emergent_key")),
        "openrouter_key":     cfg.get("openrouter_key", ""),
        "emergent_key":       cfg.get("emergent_key", ""),
        "preferred_provider": cfg.get("preferred_provider", ""),
        "preferred_model":    cfg.get("preferred_model", ""),
    }

@api_router.put("/me/config")
async def update_my_config(req: UserConfigUpdate, user=Depends(get_current_user)):
    update = {k: v for k, v in req.model_dump().items() if v is not None}
    if update:
        await db.user_configs.update_one(
            {"user_id": user["id"]}, {"$set": update}, upsert=True
        )
    return {"ok": True}

@api_router.delete("/me/config/keys")
async def clear_my_keys(user=Depends(get_current_user)):
    await db.user_configs.update_one(
        {"user_id": user["id"]},
        {"$unset": {"openrouter_key": "", "emergent_key": ""}}
    )
    return {"ok": True}

# ════════════════════════════════════════════════════════════════════════════
# ② ORGS
# ════════════════════════════════════════════════════════════════════════════
@api_router.get("/orgs")
async def list_orgs(user=Depends(get_current_user)):
    mems = await db.org_members.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    org_ids = [m["org_id"] for m in mems]
    orgs = await db.orgs.find({"id": {"$in": org_ids}}, {"_id": 0}).to_list(100)
    result = []
    for org in orgs:
        m = next((x for x in mems if x["org_id"] == org["id"]), {})
        org["my_role"] = m.get("role", "member")
        result.append(serialize_doc(org))
    return result

@api_router.post("/orgs")
async def create_org(req: OrgCreate, user=Depends(get_current_user)):
    org = {
        "id": gen_id(), "name": req.name, "description": req.description,
        "owner_id": user["id"], "invite_code": gen_invite_code(), "created_at": now_iso()
    }
    await db.orgs.insert_one(org)
    mem = {"id": gen_id(), "org_id": org["id"], "user_id": user["id"],
           "role": "owner", "brought_agent_id": None, "joined_at": now_iso()}
    await db.org_members.insert_one(mem)
    await db.chart_nodes.insert_one({
        "id": gen_id(), "org_id": org["id"], "node_ref_id": user["id"],
        "node_type": "user", "manager_id": None, "is_board_member": True,
        "position": {"x": 400, "y": 100}, "created_at": now_iso()
    })
    await event_bus.publish(OrgEvent(
        event_type="org.created", org_id=org["id"], actor_id=user["id"],
        subject_id=org["id"], subject_type="org",
        payload={"org_name": org["name"], "owner": user["name"]}
    ))
    return serialize_doc(org)

@api_router.get("/orgs/{org_id}")
async def get_org(org_id: str, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    org = await db.orgs.find_one({"id": org_id}, {"_id": 0})
    if not org: raise HTTPException(404)
    return serialize_doc(org)

@api_router.get("/orgs/{org_id}/members")
async def list_members(org_id: str, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    members = await db.org_members.find({"org_id": org_id}, {"_id": 0}).to_list(100)
    result = []
    for m in members:
        u = await db.users.find_one({"id": m["user_id"]}, {"_id": 0, "password_hash": 0})
        if u: m["user"] = serialize_doc(u)
        result.append(serialize_doc(m))
    return result

@api_router.post("/orgs/{org_id}/invite")
async def refresh_invite(org_id: str, user=Depends(get_current_user)):
    await _assert_min_role(org_id, user["id"], "owner")
    code = gen_invite_code()
    await db.orgs.update_one({"id": org_id}, {"$set": {"invite_code": code}})
    return {"invite_code": code}

@api_router.post("/orgs/join")
async def join_org(req: JoinOrgReq, user=Depends(get_current_user)):
    org = await db.orgs.find_one({"invite_code": req.invite_code}, {"_id": 0})
    if not org: raise HTTPException(404, "Invalid invite code")
    if await db.org_members.find_one({"org_id": org["id"], "user_id": user["id"]}):
        raise HTTPException(400, "Already a member")
    agent = await db.agents.find_one({"id": req.agent_id, "created_by": user["id"]}, {"_id": 0})
    if not agent: raise HTTPException(400, "You must bring one of your own agents")
    mem = {"id": gen_id(), "org_id": org["id"], "user_id": user["id"],
           "role": "member", "brought_agent_id": req.agent_id, "joined_at": now_iso()}
    await db.org_members.insert_one(mem)
    await db.agents.update_one({"id": req.agent_id}, {"$set": {"org_id": org["id"]}})
    all_nodes = await db.chart_nodes.find({"org_id": org["id"]}).to_list(200)
    ypos = 100 + (len(all_nodes) // 3) * 160
    xpos = 100 + (len(all_nodes) % 3) * 250
    await db.chart_nodes.insert_one({
        "id": gen_id(), "org_id": org["id"], "node_ref_id": user["id"],
        "node_type": "user", "manager_id": None, "is_board_member": False,
        "position": {"x": xpos, "y": ypos}, "created_at": now_iso()
    })
    await event_bus.publish(OrgEvent(
        event_type="org.member_joined", org_id=org["id"], actor_id=user["id"],
        payload={"user_name": user["name"], "org_name": org["name"]}
    ))
    return serialize_doc(org)

@api_router.put("/orgs/{org_id}/members/{member_id}/role")
async def update_role(org_id: str, member_id: str, req: MemberRoleUpdate, user=Depends(get_current_user)):
    await _assert_min_role(org_id, user["id"], "owner")
    valid_roles = ["owner","board","member","observer"]
    if req.role not in valid_roles: raise HTTPException(400, f"Role must be one of {valid_roles}")
    await db.org_members.update_one({"id": member_id, "org_id": org_id}, {"$set": {"role": req.role}})
    return {"ok": True}

@api_router.get("/orgs/{org_id}/config")
async def get_org_config(org_id: str, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    cfg = await db.org_configs.find_one({"org_id": org_id}, {"_id": 0}) or {"org_id": org_id}
    cfg.pop("openrouter_key", None)  # don't expose key
    return serialize_doc(cfg)

@api_router.put("/orgs/{org_id}/config")
async def update_org_config(org_id: str, req: OrgConfigUpdate, user=Depends(get_current_user)):
    await _assert_min_role(org_id, user["id"], "owner")
    update = {k: v for k, v in req.model_dump().items() if v is not None}
    if update:
        await db.org_configs.update_one({"org_id": org_id}, {"$set": update}, upsert=True)
    return {"ok": True}

@api_router.get("/orgs/{org_id}/presence")
async def get_org_presence(org_id: str, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    return get_presence(org_id)

# ════════════════════════════════════════════════════════════════════════════
# ③ ORG CHART
# ════════════════════════════════════════════════════════════════════════════
@api_router.get("/orgs/{org_id}/chart")
async def get_chart(org_id: str, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    nodes_raw = await db.chart_nodes.find({"org_id": org_id}, {"_id": 0}).to_list(200)
    # Build delegate lookup: agent_id → {user_id, member_id}
    members = await db.org_members.find({"org_id": org_id}, {"_id": 0}).to_list(100)
    delegate_map = {
        m["brought_agent_id"]: {"user_id": m["user_id"], "member_id": m["id"]}
        for m in members if m.get("brought_agent_id")
    }
    my_member = next((m for m in members if m["user_id"] == user["id"]), {})
    my_delegate_agent_id = my_member.get("brought_agent_id")

    nodes = []
    for n in nodes_raw:
        if n["node_type"] == "user":
            ref = await db.users.find_one({"id": n["node_ref_id"]}, {"_id": 0, "password_hash": 0})
        else:
            ref = await db.agents.find_one({"id": n["node_ref_id"]}, {"_id": 0})
        n["ref_data"] = serialize_doc(ref) if ref else {}
        # Enrich with provider badge
        if n["node_type"] == "agent" and ref:
            n["ref_data"]["provider_badge_computed"] = get_provider_badge(ref)
        # Mark guest delegates and primary delegate
        n["is_guest_delegate"] = n["node_type"] == "agent" and n["node_ref_id"] in delegate_map
        n["is_my_delegate"]    = n["node_ref_id"] == my_delegate_agent_id
        if n["is_guest_delegate"]:
            n["delegate_info"] = delegate_map.get(n["node_ref_id"], {})
        nodes.append(serialize_doc(n))
    # Fetch edge labels
    edge_labels = await db.chart_edge_labels.find({"org_id": org_id}, {"_id": 0}).to_list(500)
    edge_label_map = {f"{e['source']}-{e['target']}": e.get("label","") for e in edge_labels}
    return {"nodes": nodes, "edge_labels": edge_label_map}

@api_router.put("/orgs/{org_id}/chart/nodes/{node_id}")
async def update_chart_node(org_id: str, node_id: str, data: dict, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    update = {k: data[k] for k in ("manager_id","position","is_board_member") if k in data}
    if update:
        await db.chart_nodes.update_one({"id": node_id, "org_id": org_id}, {"$set": update})
    await event_bus.publish(OrgEvent(
        event_type="chart.updated", org_id=org_id, actor_id=user["id"],
        payload={"node_id": node_id, "changes": list(update.keys())}
    ))
    return {"ok": True}

# ════════════════════════════════════════════════════════════════════════════
# ④ AGENTS
# ════════════════════════════════════════════════════════════════════════════
@api_router.get("/orgs/{org_id}/agents")
async def list_agents(org_id: str, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    agents = await db.agents.find({"org_id": org_id}, {"_id": 0}).to_list(100)
    return [serialize_doc(a) for a in agents]

@api_router.post("/orgs/{org_id}/agents")
async def create_agent(org_id: str, req: AgentCreate, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    agent = {
        "id": gen_id(), "org_id": org_id, "name": req.name, "role": req.role,
        "system_prompt": req.system_prompt, "skills": req.skills, "tools": req.tools,
        "model": req.model, "api_key": None, "status": "idle",
        "manager_id": None, "is_board_member": False, "created_by": user["id"],
        "position": {"x": 300, "y": 300}, "avatar_color": random.choice(AVATAR_COLORS),
        "provider_override": req.provider_override, "model_override": req.model_override,
        # Identity
        "personality_traits": [], "goals": [], "reputation_score": 5.0,
        "reputation_history": [], "total_deliberations": 0, "total_votes_influenced": 0,
        "created_at": now_iso()
    }
    await db.agents.insert_one(agent)
    # Add to org chart
    all_nodes = await db.chart_nodes.find({"org_id": org_id}).to_list(200)
    await db.chart_nodes.insert_one({
        "id": gen_id(), "org_id": org_id, "node_ref_id": agent["id"],
        "node_type": "agent", "manager_id": None, "is_board_member": False,
        "position": {"x": 100 + (len(all_nodes) % 3) * 250, "y": 100 + (len(all_nodes) // 3) * 160},
        "created_at": now_iso()
    })
    result = serialize_doc(agent)
    await event_bus.publish(OrgEvent(
        event_type="agent.created", org_id=org_id, actor_id=user["id"],
        subject_id=agent["id"], subject_type="agent",
        payload=result
    ))
    return result

@api_router.get("/agents/{agent_id}")
async def get_agent(agent_id: str, user=Depends(get_current_user)):
    agent = await db.agents.find_one({"id": agent_id}, {"_id": 0})
    if not agent: raise HTTPException(404)
    await _assert_member(agent["org_id"], user["id"])
    return serialize_doc(agent)

@api_router.put("/agents/{agent_id}")
async def update_agent(agent_id: str, req: AgentUpdate, user=Depends(get_current_user)):
    agent = await db.agents.find_one({"id": agent_id}, {"_id": 0})
    if not agent: raise HTTPException(404)
    await _assert_member(agent["org_id"], user["id"])
    update = {k: v for k, v in req.model_dump().items() if v is not None}
    if update:
        await db.agents.update_one({"id": agent_id}, {"$set": update})
    updated = serialize_doc(await db.agents.find_one({"id": agent_id}, {"_id": 0}))
    await event_bus.publish(OrgEvent(
        event_type="agent.updated", org_id=agent["org_id"], actor_id=user["id"],
        subject_id=agent_id, subject_type="agent", payload=updated
    ))
    return updated

@api_router.delete("/agents/{agent_id}")
async def delete_agent(agent_id: str, user=Depends(get_current_user)):
    agent = await db.agents.find_one({"id": agent_id}, {"_id": 0})
    if not agent: raise HTTPException(404)
    await _assert_member(agent["org_id"], user["id"])
    await db.agents.delete_one({"id": agent_id})
    await db.chart_nodes.delete_one({"node_ref_id": agent_id})
    await event_bus.publish(OrgEvent(
        event_type="agent.deleted", org_id=agent["org_id"], actor_id=user["id"],
        subject_id=agent_id, payload={"agent_id": agent_id}
    ))
    return {"ok": True}

# ════════════════════════════════════════════════════════════════════════════
# ⑤ SKILLS
# ════════════════════════════════════════════════════════════════════════════
@api_router.get("/skills")
async def list_skills():
    skills = await db.skills.find({}, {"_id": 0}).to_list(100)
    return [serialize_doc(s) for s in skills]

# ════════════════════════════════════════════════════════════════════════════
# ⑥ BOARD / PROPOSALS
# ════════════════════════════════════════════════════════════════════════════
@api_router.get("/orgs/{org_id}/proposals")
async def list_proposals(org_id: str, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    proposals = await db.proposals.find({"org_id": org_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    result = []
    for p in proposals:
        p = serialize_doc(p)
        p["votes"]         = await _get_votes(p["id"])
        p["comment_count"] = await db.comments.count_documents({"proposal_id": p["id"]})
        p["has_deliberation"] = bool(await db.deliberations.find_one({"proposal_id": p["id"]}))
        result.append(p)
    return result

@api_router.post("/orgs/{org_id}/proposals")
async def create_proposal(org_id: str, req: ProposalCreate, user=Depends(get_current_user)):
    await _assert_min_role(org_id, user["id"], "member")
    proposal = {
        "id": gen_id(), "org_id": org_id, "title": req.title, "description": req.description,
        "author_id": user["id"], "author_type": "user", "author_name": user["name"],
        "status": "open", "workflow_id": req.workflow_id, "voting_type": req.voting_type,
        "created_at": now_iso()
    }
    await db.proposals.insert_one(proposal)
    result = serialize_doc(proposal)
    result["votes"] = []; result["comment_count"] = 0; result["has_deliberation"] = False
    await event_bus.publish(OrgEvent(
        event_type="board.proposal_created", org_id=org_id, actor_id=user["id"],
        subject_id=proposal["id"], subject_type="proposal", payload=result
    ))
    await _create_notification_for_event("board.proposal_created", org_id, user["id"], proposal)
    return result

@api_router.get("/proposals/{proposal_id}")
async def get_proposal(proposal_id: str, user=Depends(get_current_user)):
    p = await db.proposals.find_one({"id": proposal_id}, {"_id": 0})
    if not p: raise HTTPException(404)
    await _assert_member(p["org_id"], user["id"])
    p = serialize_doc(p)
    p["votes"]    = await _get_votes(proposal_id)
    comments      = await db.comments.find({"proposal_id": proposal_id}, {"_id": 0}).sort("created_at", 1).to_list(200)
    p["comments"] = [serialize_doc(c) for c in comments]
    delib_doc     = await db.deliberations.find_one({"proposal_id": proposal_id}, {"_id": 0})
    p["deliberation"] = serialize_doc(delib_doc) if delib_doc else None
    return p

@api_router.post("/proposals/{proposal_id}/vote")
async def cast_vote(proposal_id: str, req: VoteReq, user=Depends(get_current_user)):
    proposal = await db.proposals.find_one({"id": proposal_id}, {"_id": 0})
    if not proposal: raise HTTPException(404)
    if proposal["status"] != "open": raise HTTPException(400, "Proposal not open")
    role = await _assert_member(proposal["org_id"], user["id"])
    existing = await db.votes.find_one({"proposal_id": proposal_id, "voter_id": user["id"]})
    weight = 2.0 if role in ("owner","board") else 1.0
    if existing:
        await db.votes.update_one(
            {"proposal_id": proposal_id, "voter_id": user["id"]},
            {"$set": {"value": req.value, "updated_at": now_iso()}}
        )
    else:
        await db.votes.insert_one({
            "id": gen_id(), "proposal_id": proposal_id,
            "voter_id": user["id"], "voter_name": user["name"],
            "voter_type": "user", "value": req.value,
            "weight": weight, "created_at": now_iso()
        })
    await _check_proposal_outcome(proposal, user)
    votes = await _get_votes(proposal_id)
    updated = await db.proposals.find_one({"id": proposal_id}, {"_id": 0})
    await event_bus.publish(OrgEvent(
        event_type="board.vote_cast", org_id=proposal["org_id"], actor_id=user["id"],
        subject_id=proposal_id, subject_type="proposal",
        payload={"proposal_id": proposal_id, "voter": user["name"],
                 "value": req.value, "votes": votes, "status": updated.get("status")}
    ))
    await _update_agent_reputation_on_vote(proposal["org_id"], proposal_id)
    return {"ok": True, "votes": votes}

@api_router.post("/proposals/{proposal_id}/comments")
async def add_comment(proposal_id: str, req: CommentCreate, user=Depends(get_current_user)):
    proposal = await db.proposals.find_one({"id": proposal_id}, {"_id": 0})
    if not proposal: raise HTTPException(404)
    await _assert_member(proposal["org_id"], user["id"])
    comment = {
        "id": gen_id(), "proposal_id": proposal_id,
        "author_id": user["id"], "author_name": user["name"],
        "author_type": "user", "text": req.text, "created_at": now_iso()
    }
    await db.comments.insert_one(comment)
    result = serialize_doc(comment)
    await event_bus.publish(OrgEvent(
        event_type="board.comment_added", org_id=proposal["org_id"], actor_id=user["id"],
        subject_id=proposal_id, subject_type="proposal", payload=result
    ))
    return result

# ════════════════════════════════════════════════════════════════════════════
# ⑦ DELIBERATION ENGINE
# ════════════════════════════════════════════════════════════════════════════
@api_router.post("/orgs/{org_id}/deliberations")
async def start_deliberation(org_id: str, req: DeliberationStart, user=Depends(get_current_user)):
    await _assert_min_role(org_id, user["id"], "member")
    proposal = await db.proposals.find_one({"id": req.proposal_id, "org_id": org_id}, {"_id": 0})
    if not proposal: raise HTTPException(404, "Proposal not found")
    # Get board agents for deliberation
    agents = await db.agents.find({"org_id": org_id}, {"_id": 0}).to_list(10)
    if not agents:
        raise HTTPException(400, "No agents in this org to deliberate")
    org_config = await _get_effective_config(org_id, user["id"])
    # Create deliberation record
    delib_id = gen_id()
    delib_doc = {
        "id": delib_id, "org_id": org_id, "proposal_id": req.proposal_id,
        "proposal_title": proposal["title"], "status": "running",
        "snapshots": [], "summary": None,
        "started_by": user["id"], "started_at": now_iso(), "completed_at": None
    }
    await db.deliberations.insert_one(delib_doc)
    await event_bus.publish(OrgEvent(
        event_type="deliberation.started", org_id=org_id, actor_id=user["id"],
        subject_id=delib_id, subject_type="deliberation",
        payload={"delib_id": delib_id, "proposal_title": proposal["title"],
                 "agent_count": len(agents)}
    ))
    # Run deliberation asynchronously
    asyncio.create_task(_run_deliberation(delib_id, org_id, proposal, agents, req.rounds, org_config))
    return {"delib_id": delib_id, "status": "running", "agent_count": len(agents)}

@api_router.get("/deliberations/{delib_id}")
async def get_deliberation(delib_id: str, user=Depends(get_current_user)):
    d = await db.deliberations.find_one({"id": delib_id}, {"_id": 0})
    if not d: raise HTTPException(404)
    await _assert_member(d["org_id"], user["id"])
    return serialize_doc(d)

@api_router.get("/orgs/{org_id}/deliberations")
async def list_deliberations(org_id: str, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    docs = await db.deliberations.find({"org_id": org_id}, {"_id": 0}).sort("started_at", -1).to_list(50)
    return [serialize_doc(d) for d in docs]

async def _run_deliberation(delib_id: str, org_id: str, proposal: dict, agents: list, rounds: int, org_config: dict):
    snapshots = []
    try:
        for round_num in range(1, rounds + 1):
            for agent in agents:
                # Signal agent is "thinking"
                await event_bus.publish(OrgEvent(
                    event_type="deliberation.agent_thinking", org_id=org_id,
                    actor_id=agent["id"], subject_id=delib_id,
                    payload={"agent_id": agent["id"], "agent_name": agent["name"],
                             "delib_id": delib_id, "round": round_num}
                ), persist=False)
                # Update presence: agent is thinking
                presence.setdefault(org_id, {})[f"agent_{agent['id']}"] = {
                    "user_id": agent["id"], "name": agent["name"],
                    "avatar_color": agent.get("avatar_color","#a78bfa"),
                    "status": "online", "typing_in": "", "thinking": True,
                    "last_seen": now_iso(), "is_agent": True
                }
                # Generate snapshot
                snapshot = await delib.generate_agent_snapshot(
                    agent=agent,
                    proposal_title=proposal["title"],
                    proposal_description=proposal.get("description",""),
                    prior_snapshots=snapshots,
                    round_num=round_num,
                    org_config=org_config
                )
                snapshots.append(snapshot)
                # Clear thinking presence
                presence.setdefault(org_id, {})[f"agent_{agent['id']}"]["thinking"] = False
                # Update DB + broadcast snapshot
                await db.deliberations.update_one(
                    {"id": delib_id},
                    {"$push": {"snapshots": snapshot}}
                )
                await event_bus.publish(OrgEvent(
                    event_type="deliberation.snapshot", org_id=org_id,
                    actor_id=agent["id"], subject_id=delib_id,
                    payload={"delib_id": delib_id, "snapshot": snapshot}
                ))
                # Update agent reputation
                await db.agents.update_one(
                    {"id": agent["id"]},
                    {"$inc": {"total_deliberations": 1}}
                )
                await asyncio.sleep(0.5)  # pacing

        # Generate summary
        summary = await delib.generate_deliberation_summary(
            proposal["title"], snapshots, org_config
        )
        await db.deliberations.update_one(
            {"id": delib_id},
            {"$set": {"status": "completed", "summary": summary, "completed_at": now_iso()}}
        )
        await event_bus.publish(OrgEvent(
            event_type="deliberation.completed", org_id=org_id,
            actor_id="system", subject_id=delib_id,
            payload={"delib_id": delib_id, "summary": summary,
                     "snapshot_count": len(snapshots)}
        ))
        # Create memory nodes from deliberation
        await _create_memory_from_deliberation(org_id, proposal, snapshots, summary)
        # Create notification
        await _create_notif(
            org_id=org_id, user_id=None,  # all board members
            notif_type="deliberation_complete",
            title=f"Deliberation complete: {proposal['title']}",
            body=f"Outcome: {summary.get('outcome','unknown')}. {summary.get('consensus','')}",
            link=f"/board",
        )
    except Exception as e:
        logger.error(f"Deliberation error: {e}")
        await db.deliberations.update_one({"id": delib_id}, {"$set": {"status": "failed", "error": str(e)}})

# ════════════════════════════════════════════════════════════════════════════
# ⑧ WORKFLOWS
# ════════════════════════════════════════════════════════════════════════════
@api_router.get("/orgs/{org_id}/workflows")
async def list_workflows(org_id: str, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    workflows = await db.workflows.find({"org_id": org_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    result = []
    for w in workflows:
        w = serialize_doc(w)
        w["run_count"] = await db.workflow_runs.count_documents({"workflow_id": w["id"]})
        result.append(w)
    return result

@api_router.post("/orgs/{org_id}/workflows")
async def create_workflow(org_id: str, req: WorkflowCreate, user=Depends(get_current_user)):
    await _assert_min_role(org_id, user["id"], "member")
    default_nodes = req.nodes or [
        {"id": "trigger-1", "type": "trigger", "position": {"x": 250, "y": 80},
         "data": {"label": "Manual Trigger", "nodeType": "trigger", "trigger_type": "manual", "status": "idle"}},
        {"id": "step-1", "type": "step", "position": {"x": 250, "y": 220},
         "data": {"label": "Step 1", "nodeType": "step", "action": "analyze", "agent": None, "status": "idle"}},
        {"id": "output-1", "type": "output", "position": {"x": 250, "y": 360},
         "data": {"label": "Output", "nodeType": "output", "status": "idle"}}
    ]
    default_edges = req.edges or [
        {"id": "e-t1-s1", "source": "trigger-1", "target": "step-1", "style": {"stroke": "rgba(34,211,238,0.4)", "strokeWidth": 2}},
        {"id": "e-s1-o1", "source": "step-1", "target": "output-1", "style": {"stroke": "rgba(34,211,238,0.4)", "strokeWidth": 2}}
    ]
    workflow = {
        "id": gen_id(), "org_id": org_id, "name": req.name, "description": req.description,
        "trigger_type": req.trigger_type, "nodes": default_nodes, "edges": default_edges,
        "status": "active", "created_by": user["id"], "created_at": now_iso()
    }
    await db.workflows.insert_one(workflow)
    await event_bus.publish(OrgEvent(
        event_type="workflow.created", org_id=org_id, actor_id=user["id"],
        subject_id=workflow["id"], payload={"name": workflow["name"]}
    ))
    return serialize_doc(workflow)

@api_router.get("/workflows/{workflow_id}")
async def get_workflow(workflow_id: str, user=Depends(get_current_user)):
    w = await db.workflows.find_one({"id": workflow_id}, {"_id": 0})
    if not w: raise HTTPException(404)
    await _assert_member(w["org_id"], user["id"])
    return serialize_doc(w)

@api_router.put("/workflows/{workflow_id}")
async def update_workflow(workflow_id: str, req: WorkflowUpdate, user=Depends(get_current_user)):
    w = await db.workflows.find_one({"id": workflow_id}, {"_id": 0})
    if not w: raise HTTPException(404)
    await _assert_member(w["org_id"], user["id"])
    update = {k: v for k, v in req.model_dump().items() if v is not None}
    if update:
        await db.workflows.update_one({"id": workflow_id}, {"$set": update})
    updated = await db.workflows.find_one({"id": workflow_id}, {"_id": 0})
    return serialize_doc(updated)

@api_router.delete("/workflows/{workflow_id}")
async def delete_workflow(workflow_id: str, user=Depends(get_current_user)):
    w = await db.workflows.find_one({"id": workflow_id}, {"_id": 0})
    if not w: raise HTTPException(404)
    await _assert_member(w["org_id"], user["id"])
    await db.workflows.delete_one({"id": workflow_id})
    return {"ok": True}

@api_router.post("/workflows/{workflow_id}/run")
async def run_workflow(workflow_id: str, user=Depends(get_current_user)):
    w = await db.workflows.find_one({"id": workflow_id}, {"_id": 0})
    if not w: raise HTTPException(404)
    await _assert_member(w["org_id"], user["id"])
    run = {
        "id": gen_id(), "workflow_id": workflow_id, "org_id": w["org_id"],
        "triggered_by": user["id"], "trigger_type": "manual",
        "status": "running", "step_states": {}, "started_at": now_iso(), "completed_at": None
    }
    await db.workflow_runs.insert_one(run)
    asyncio.create_task(_execute_workflow(w, run, triggered_by=user["id"]))
    return serialize_doc(run)

@api_router.get("/workflow-runs/{run_id}")
async def get_run(run_id: str, user=Depends(get_current_user)):
    run = await db.workflow_runs.find_one({"id": run_id}, {"_id": 0})
    if not run: raise HTTPException(404)
    await _assert_member(run["org_id"], user["id"])
    return serialize_doc(run)

@api_router.get("/orgs/{org_id}/workflow-runs")
async def list_runs(org_id: str, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    runs = await db.workflow_runs.find({"org_id": org_id}, {"_id": 0}).sort("started_at", -1).to_list(50)
    return [serialize_doc(r) for r in runs]

# ════════════════════════════════════════════════════════════════════════════
# ⑨ MESSAGING
# ════════════════════════════════════════════════════════════════════════════
@api_router.get("/orgs/{org_id}/threads")
async def list_threads(org_id: str, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    threads = await db.threads.find(
        {"org_id": org_id, "participants.id": user["id"]}, {"_id": 0}
    ).sort("last_message_at", -1).to_list(100)
    result = []
    for t in threads:
        t = serialize_doc(t)
        last_msg = await db.messages.find_one({"thread_id": t["id"]}, {"_id": 0}, sort=[("created_at",-1)])
        t["last_message"] = serialize_doc(last_msg) if last_msg else None
        result.append(t)
    return result

@api_router.post("/orgs/{org_id}/threads")
async def create_thread(org_id: str, req: ThreadCreate, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    participants = req.participants
    if not any(p.get("id") == user["id"] for p in participants):
        participants.append({"id": user["id"], "type": "user", "name": user["name"]})
    thread = {
        "id": gen_id(), "org_id": org_id, "title": req.title,
        "participants": participants, "created_at": now_iso(), "last_message_at": now_iso()
    }
    await db.threads.insert_one(thread)
    result = serialize_doc(thread)
    result["last_message"] = None
    return result

@api_router.get("/threads/{thread_id}/messages")
async def list_messages(thread_id: str, user=Depends(get_current_user)):
    thread = await db.threads.find_one({"id": thread_id}, {"_id": 0})
    if not thread: raise HTTPException(404)
    await _assert_member(thread["org_id"], user["id"])
    msgs = await db.messages.find({"thread_id": thread_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return [serialize_doc(m) for m in msgs]

@api_router.post("/threads/{thread_id}/messages")
async def send_message(thread_id: str, req: MessageCreate, user=Depends(get_current_user)):
    thread = await db.threads.find_one({"id": thread_id}, {"_id": 0})
    if not thread: raise HTTPException(404)
    await _assert_member(thread["org_id"], user["id"])
    msg = {
        "id": gen_id(), "thread_id": thread_id,
        "sender_id": user["id"], "sender_name": user["name"],
        "sender_type": "user", "text": req.text, "created_at": now_iso()
    }
    await db.messages.insert_one(msg)
    await db.threads.update_one({"id": thread_id}, {"$set": {"last_message_at": now_iso()}})
    result = serialize_doc(msg)
    await event_bus.publish(OrgEvent(
        event_type="message.created", org_id=thread["org_id"], actor_id=user["id"],
        subject_id=thread_id, subject_type="thread", payload=result
    ))
    return result

@api_router.post("/threads/{thread_id}/typing")
async def typing_indicator(thread_id: str, user=Depends(get_current_user)):
    thread = await db.threads.find_one({"id": thread_id}, {"_id": 0})
    if not thread: raise HTTPException(404)
    await update_presence(
        thread["org_id"], user["id"], user["name"],
        user.get("avatar_color","#22d3ee"),
        typing_in=thread_id
    )
    return {"ok": True}

# ════════════════════════════════════════════════════════════════════════════
# ⑩ NOTIFICATIONS
# ════════════════════════════════════════════════════════════════════════════
@api_router.get("/orgs/{org_id}/notifications")
async def list_notifications(org_id: str, unread_only: bool = False, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    query = {"org_id": org_id, "$or": [{"user_id": user["id"]}, {"user_id": None}]}
    if unread_only:
        query["read_at"] = None
    notifs = await db.notifications.find(query, {"_id": 0}).sort("created_at", -1).to_list(50)
    return [serialize_doc(n) for n in notifs]

@api_router.post("/orgs/{org_id}/notifications/read")
async def mark_notifications_read(org_id: str, req: NotifMarkRead, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    if req.notification_ids:
        await db.notifications.update_many(
            {"id": {"$in": req.notification_ids}, "org_id": org_id},
            {"$set": {"read_at": now_iso()}}
        )
    else:
        # mark all as read for this user
        await db.notifications.update_many(
            {"org_id": org_id, "$or": [{"user_id": user["id"]}, {"user_id": None}], "read_at": None},
            {"$set": {"read_at": now_iso()}}
        )
    return {"ok": True}

@api_router.get("/orgs/{org_id}/notifications/count")
async def notif_count(org_id: str, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    count = await db.notifications.count_documents({
        "org_id": org_id,
        "$or": [{"user_id": user["id"]}, {"user_id": None}],
        "read_at": None
    })
    return {"unread": count}

# ════════════════════════════════════════════════════════════════════════════
# ⑪ MEMORY GRAPH
# ════════════════════════════════════════════════════════════════════════════
@api_router.get("/orgs/{org_id}/memory/nodes")
async def list_memory_nodes(org_id: str, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    nodes = await db.memory_nodes.find({"org_id": org_id}, {"_id": 0}).to_list(500)
    return [serialize_doc(n) for n in nodes]

@api_router.get("/orgs/{org_id}/memory/edges")
async def list_memory_edges(org_id: str, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    edges = await db.memory_edges.find({"org_id": org_id}, {"_id": 0}).to_list(500)
    return [serialize_doc(e) for e in edges]

@api_router.post("/orgs/{org_id}/memory/nodes")
async def create_memory_node(org_id: str, req: MemoryNodeCreate, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    node = {
        "id": gen_id(), "org_id": org_id, "entity_type": req.entity_type,
        "name": req.name, "description": req.description, "metadata": req.metadata,
        "confidence": 1.0, "influence_score": 0.0, "mention_count": 1,
        "created_by": user["id"], "created_at": now_iso(), "updated_at": now_iso()
    }
    await db.memory_nodes.insert_one(node)
    result = serialize_doc(node)
    await event_bus.publish(OrgEvent(
        event_type="memory.node_created", org_id=org_id, actor_id=user["id"],
        subject_id=node["id"], payload=result
    ))
    return result

@api_router.post("/orgs/{org_id}/memory/edges")
async def create_memory_edge(org_id: str, req: MemoryEdgeCreate, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    edge = {
        "id": gen_id(), "org_id": org_id, "source_id": req.source_id,
        "target_id": req.target_id, "edge_type": req.edge_type,
        "weight": req.weight, "metadata": req.metadata, "created_at": now_iso()
    }
    await db.memory_edges.insert_one(edge)
    # Update influence score of source node
    await db.memory_nodes.update_one(
        {"id": req.source_id}, {"$inc": {"influence_score": req.weight}}
    )
    return serialize_doc(edge)

# ════════════════════════════════════════════════════════════════════════════
# ⑫ SYSTEM HEALTH
# ════════════════════════════════════════════════════════════════════════════
@api_router.get("/orgs/{org_id}/health")
async def system_health(org_id: str, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    provider_health = prov.get_provider_health()
    ws_connections  = ws_manager.room_size(org_id)
    online_users    = len(get_presence(org_id))
    total_agents    = await db.agents.count_documents({"org_id": org_id})
    total_workflows = await db.workflows.count_documents({"org_id": org_id})
    total_delibs    = await db.deliberations.count_documents({"org_id": org_id})
    memory_nodes    = await db.memory_nodes.count_documents({"org_id": org_id})
    events_today    = await db.events.count_documents({
        "org_id": org_id,
        "created_at": {"$gte": datetime.now(timezone.utc).replace(hour=0, minute=0, second=0).isoformat()}
    })
    return {
        "providers": provider_health,
        "connections": {"ws": ws_connections, "online_users": online_users},
        "org_stats": {
            "total_agents": total_agents,
            "total_workflows": total_workflows,
            "total_deliberations": total_delibs,
            "memory_nodes": memory_nodes,
            "events_today": events_today,
        },
        "models": {
            "routing": {k: {"provider": v[0], "model": v[1]} for k, v in prov.ROUTE_TABLE.items()},
        }
    }

# ════════════════════════════════════════════════════════════════════════════
# ⑬ EVENTS LOG
# ════════════════════════════════════════════════════════════════════════════
@api_router.get("/orgs/{org_id}/events")
async def get_events(org_id: str, limit: int = 50, event_type: str = None, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    docs = await event_bus.recent(org_id, limit=min(limit,100), event_type=event_type)
    return [serialize_doc(d) for d in docs]

# ════════════════════════════════════════════════════════════════════════════
# ⑭ DASHBOARD
# ════════════════════════════════════════════════════════════════════════════
@api_router.get("/orgs/{org_id}/activity")
async def get_activity(org_id: str, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    events = await event_bus.recent(org_id, limit=20)
    return events

@api_router.get("/orgs/{org_id}/stats")
async def get_stats(org_id: str, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    thread_ids = [t["id"] async for t in db.threads.find({"org_id": org_id}, {"id": 1, "_id": 0})]
    return {
        "members": await db.org_members.count_documents({"org_id": org_id}),
        "agents": await db.agents.count_documents({"org_id": org_id}),
        "open_proposals": await db.proposals.count_documents({"org_id": org_id, "status": "open"}),
        "workflows": await db.workflows.count_documents({"org_id": org_id}),
        "active_runs": await db.workflow_runs.count_documents({"org_id": org_id, "status": "running"}),
        "total_messages": await db.messages.count_documents({"thread_id": {"$in": thread_ids}}),
        "deliberations": await db.deliberations.count_documents({"org_id": org_id}),
        "memory_nodes": await db.memory_nodes.count_documents({"org_id": org_id}),
        "unread_notifs": await db.notifications.count_documents({
            "org_id": org_id, "$or": [{"user_id": user["id"]},{"user_id": None}], "read_at": None
        }),
    }

# ════════════════════════════════════════════════════════════════════════════
# WebSocket endpoint
# ════════════════════════════════════════════════════════════════════════════
@app.websocket("/ws/org/{org_id}")
async def ws_endpoint(ws: WebSocket, org_id: str, token: str = None):
    user_id, user_name, avatar_color = "", "", ""
    if token:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            uid = payload.get("sub")
            u = await db.users.find_one({"id": uid}, {"_id": 0})
            if u:
                user_id     = u["id"]
                user_name   = u["name"]
                avatar_color = u.get("avatar_color","#22d3ee")
        except Exception:
            pass

    # Reject unauthenticated or non-member connections
    if not user_id:
        await ws.close(code=4001)
        return
    member = await db.org_members.find_one({"org_id": org_id, "user_id": user_id})
    if not member:
        await ws.close(code=4003)
        return

    client_id = user_id
    await ws_manager.connect(org_id, ws, client_id, user_id)
    await ws.send_text(json.dumps({"event": "connected", "data": {"client_id": client_id, "org_id": org_id}}))
    # Announce presence
    if user_id:
        await update_presence(org_id, user_id, user_name, avatar_color, "online")
    try:
        while True:
            raw = await ws.receive_text()
            try:
                data = json.loads(raw)
                etype = data.get("type")
                if etype == "ping":
                    await ws.send_text(json.dumps({"event": "pong"}))
                    if user_id:
                        await update_presence(org_id, user_id, user_name, avatar_color, "online",
                                              data.get("typing_in",""), data.get("thinking", False))
                elif etype == "presence":
                    await update_presence(org_id, user_id, user_name, avatar_color,
                                          data.get("status","online"),
                                          data.get("typing_in",""), data.get("thinking",False))
            except Exception:
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect(org_id, ws)
        if user_id:
            await update_presence(org_id, user_id, user_name, avatar_color, "offline")

# ════════════════════════════════════════════════════════════════════════════
# Internal helpers
# ════════════════════════════════════════════════════════════════════════════
async def _get_votes(proposal_id: str) -> list:
    votes = await db.votes.find({"proposal_id": proposal_id}, {"_id": 0}).to_list(200)
    return [serialize_doc(v) for v in votes]

async def _check_proposal_outcome(proposal: dict, user: dict):
    org_id = proposal["org_id"]
    member_count = await db.org_members.count_documents({"org_id": org_id})
    votes = await db.votes.find({"proposal_id": proposal["id"]}, {"_id": 0}).to_list(200)
    approve_w = sum(v.get("weight",1) for v in votes if v["value"] == "approve")
    reject_w  = sum(v.get("weight",1) for v in votes if v["value"] == "reject")
    if len(votes) >= max(1, member_count // 2):
        if approve_w > reject_w:
            await db.proposals.update_one({"id": proposal["id"]}, {"$set": {"status": "approved"}})
            await event_bus.publish(OrgEvent(
                event_type="board.proposal_approved", org_id=org_id, actor_id=user["id"],
                subject_id=proposal["id"], payload={"proposal_id": proposal["id"], "title": proposal["title"]}
            ))
            await _create_notif(org_id, None, "proposal_approved",
                f"✅ Proposal approved: {proposal['title']}", "The proposal passed majority vote.", "/board")
            if proposal.get("workflow_id"):
                w = await db.workflows.find_one({"id": proposal["workflow_id"]}, {"_id": 0})
                if w:
                    run = {
                        "id": gen_id(), "workflow_id": w["id"], "org_id": org_id,
                        "triggered_by": proposal["id"], "trigger_type": "vote_passed",
                        "status": "running", "step_states": {}, "started_at": now_iso(), "completed_at": None
                    }
                    await db.workflow_runs.insert_one(run)
                    asyncio.create_task(_execute_workflow(w, run))
        elif reject_w > approve_w:
            await db.proposals.update_one({"id": proposal["id"]}, {"$set": {"status": "rejected"}})
            await event_bus.publish(OrgEvent(
                event_type="board.proposal_rejected", org_id=org_id, actor_id=user["id"],
                subject_id=proposal["id"], payload={"proposal_id": proposal["id"]}
            ))

async def _execute_workflow_node(node: dict, run: dict, org_config: dict) -> dict:
    """Execute a single workflow node based on its type."""
    ntype = (node.get("type") or node.get("data", {}).get("type") or "default").lower()
    data  = node.get("data", {})

    if ntype in ("trigger", "start"):
        return {"status": "completed", "output": "triggered"}

    elif ntype == "agent_task":
        agent_id   = data.get("agent_id")
        task_desc  = data.get("task_description") or data.get("label") or "Complete the assigned task"
        if agent_id:
            agent = await db.agents.find_one({"id": agent_id}, {"_id": 0})
            if agent:
                try:
                    resp = await asyncio.wait_for(
                        prov.call_model(
                            task_type="default",
                            system=agent.get("system_prompt") or f"You are {agent.get('name','Agent')}.",
                            user=task_desc,
                            openrouter_key=org_config.get("openrouter_key", ""),
                        ),
                        timeout=45,
                    )
                    output = resp.text[:1000] if resp.text else "[no output]"
                    thought = {
                        "id": gen_id(), "agent_id": agent_id, "org_id": agent["org_id"],
                        "content": output, "thought_type": "workflow_task",
                        "source": "workflow", "created_at": now_iso(),
                    }
                    await db.agent_thoughts.insert_one(thought)
                    return {"status": "completed", "output": output}
                except asyncio.TimeoutError:
                    return {"status": "failed", "output": "task timed out"}
                except Exception as exc:
                    return {"status": "failed", "output": str(exc)}
        return {"status": "completed", "output": "no agent configured"}

    elif ntype == "http_request":
        url    = data.get("url", "")
        method = (data.get("method") or "GET").upper()
        if url:
            try:
                async with httpx.AsyncClient(timeout=15) as c:
                    r = await getattr(c, method.lower())(url)
                    return {"status": "completed", "output": r.text[:500], "status_code": r.status_code}
            except Exception as exc:
                return {"status": "failed", "output": str(exc)}
        return {"status": "skipped", "output": "no URL configured"}

    elif ntype == "delay":
        seconds = max(1, min(int(data.get("seconds") or data.get("delay", 2)), 30))
        await asyncio.sleep(seconds)
        return {"status": "completed", "output": f"delayed {seconds}s"}

    elif ntype == "condition":
        return {"status": "completed", "output": f"condition evaluated: {data.get('condition', '')}"}

    else:
        await asyncio.sleep(random.uniform(0.3, 0.8))
        return {"status": "completed", "output": "step completed"}


async def _execute_workflow(workflow: dict, run: dict, triggered_by: str = ""):
    org_id = run["org_id"]
    run_id = run["id"]
    nodes  = workflow.get("nodes", [])
    edges  = workflow.get("edges", [])
    org_config = await _get_effective_config(org_id, triggered_by or run.get("triggered_by", ""))

    await event_bus.publish(OrgEvent(
        event_type="workflow.run_started", org_id=org_id, actor_id="system",
        subject_id=run_id,
        payload={"run_id": run_id, "workflow_name": workflow["name"]}
    ))

    order = _topo_sort(nodes, edges)
    run_failed = False

    for node_id in order:
        node = next((n for n in nodes if n["id"] == node_id), None)
        if not node:
            continue
        await db.workflow_runs.update_one(
            {"id": run_id},
            {"$set": {f"step_states.{node_id}": {"status": "running", "started_at": now_iso()}}}
        )
        await event_bus.publish(OrgEvent(
            event_type="workflow.step_changed", org_id=org_id, actor_id="system",
            subject_id=run_id, payload={"run_id": run_id, "node_id": node_id, "status": "running"}
        ))
        try:
            result = await _execute_workflow_node(node, run, org_config)
        except Exception as exc:
            result = {"status": "failed", "output": str(exc)}

        step_status = result.get("status", "completed")
        if step_status == "failed":
            run_failed = True
        await db.workflow_runs.update_one(
            {"id": run_id},
            {"$set": {f"step_states.{node_id}": {
                "status": step_status,
                "output": result.get("output", ""),
                "completed_at": now_iso()
            }}}
        )
        await event_bus.publish(OrgEvent(
            event_type="workflow.step_changed", org_id=org_id, actor_id="system",
            subject_id=run_id, payload={"run_id": run_id, "node_id": node_id, "status": step_status}
        ))

    final_status = "failed" if run_failed else "completed"
    await db.workflow_runs.update_one(
        {"id": run_id}, {"$set": {"status": final_status, "completed_at": now_iso()}}
    )
    await event_bus.publish(OrgEvent(
        event_type="workflow.run_completed", org_id=org_id, actor_id="system",
        subject_id=run_id, payload={"run_id": run_id, "status": final_status}
    ))
    await _create_notif(org_id, None, "workflow_complete",
        f"Workflow '{workflow['name']}' {final_status}", "", "/workflows")

def _topo_sort(nodes: list, edges: list) -> list:
    adj = {n["id"]: [] for n in nodes}
    ind = {n["id"]: 0 for n in nodes}
    for e in edges:
        src, tgt = e.get("source"), e.get("target")
        if src in adj and tgt in adj:
            adj[src].append(tgt); ind[tgt] = ind.get(tgt,0) + 1
    queue = [nid for nid, d in ind.items() if d == 0]
    order = []
    while queue:
        nid = queue.pop(0); order.append(nid)
        for nxt in adj.get(nid,[]):
            ind[nxt] -= 1
            if ind[nxt] == 0: queue.append(nxt)
    return order

async def _create_notif(org_id: str, user_id, notif_type: str, title: str, body: str, link: str):
    notif = {
        "id": gen_id(), "org_id": org_id, "user_id": user_id,
        "type": notif_type, "title": title, "body": body, "link": link,
        "read_at": None, "created_at": now_iso()
    }
    await db.notifications.insert_one(notif)
    await event_bus.publish(OrgEvent(
        event_type="notification.created", org_id=org_id, actor_id="system",
        subject_id=notif["id"],
        payload={"notification": serialize_doc(notif)}
    ))

async def _create_notification_for_event(event_type: str, org_id: str, actor_id: str, resource: dict):
    if event_type == "board.proposal_created":
        await _create_notif(org_id, None, "proposal_created",
            f"New proposal: {resource['title']}", resource.get('description',''), "/board")

# ── Agent schedule runner ─────────────────────────────────────────────────
async def _run_scheduled_task(agent: dict, sched: dict):
    creator_id = sched.get("created_by") or agent.get("created_by", "")
    org_config = await _get_effective_config(agent["org_id"], creator_id)
    task_desc = sched.get("task_description") or "Perform your scheduled task."
    try:
        resp = await asyncio.wait_for(
            prov.call_model(
                task_type="default",
                system=agent.get("system_prompt") or f"You are {agent.get('name', 'Agent')}.",
                user=task_desc,
                openrouter_key=org_config.get("openrouter_key", ""),
            ),
            timeout=45,
        )
        output = resp.text[:1000] if resp.text else "[no output]"
    except asyncio.TimeoutError:
        output = "[scheduled task timed out]"
    except Exception as exc:
        output = f"[error: {exc}]"

    thought = {
        "id": gen_id(), "agent_id": agent["id"], "org_id": agent["org_id"],
        "content": output, "thought_type": "scheduled_task",
        "source": "schedule", "created_at": now_iso(),
    }
    await db.agent_thoughts.insert_one(thought)
    await event_bus.publish(OrgEvent(
        event_type="agent.scheduled_task", org_id=agent["org_id"], actor_id=agent["id"],
        subject_id=agent["id"],
        payload={"task": task_desc[:200], "output": output[:200], "schedule_id": sched["id"]}
    ))

async def _agent_schedule_runner():
    """Background loop: fires enabled agent schedules when their next_run time is due."""
    INTERVAL_DELTAS = {
        "hourly": timedelta(hours=1),
        "daily":  timedelta(days=1),
        "weekly": timedelta(weeks=1),
    }
    while True:
        try:
            now = datetime.now(timezone.utc)
            schedules = await db.agent_schedules.find({"enabled": True}, {"_id": 0}).to_list(200)
            for sched in schedules:
                try:
                    next_run_str = sched.get("next_run") or ""
                    next_run = datetime.fromisoformat(next_run_str.replace("Z", "+00:00"))
                except Exception:
                    continue
                if now < next_run:
                    continue
                agent = await db.agents.find_one({"id": sched["agent_id"]}, {"_id": 0})
                if not agent:
                    continue
                asyncio.create_task(_run_scheduled_task(agent, sched))
                delta = INTERVAL_DELTAS.get(sched.get("interval", "daily"), timedelta(days=1))
                await db.agent_schedules.update_one(
                    {"id": sched["id"]},
                    {"$set": {"last_run": now.isoformat(), "next_run": (now + delta).isoformat()}}
                )
        except Exception as exc:
            logger.error(f"Schedule runner error: {exc}")
        await asyncio.sleep(60)  # poll every minute

async def _update_agent_reputation_on_vote(org_id: str, proposal_id: str):
    delib = await db.deliberations.find_one({"proposal_id": proposal_id, "org_id": org_id})
    if not delib or not delib.get("snapshots"): return
    proposal = await db.proposals.find_one({"id": proposal_id}, {"_id": 0})
    if not proposal or proposal.get("status") == "open": return
    final_outcome = proposal["status"]  # approved/rejected
    for snap in delib.get("snapshots", []):
        agent_id = snap.get("agent_id")
        if not agent_id: continue
        stance = snap.get("stance","abstain")
        matched = (stance == "approve" and final_outcome == "approved") or \
                  (stance == "reject"  and final_outcome == "rejected")
        delta = 0.1 if matched else -0.05
        await db.agents.update_one(
            {"id": agent_id},
            {"$inc": {"reputation_score": delta, "total_votes_influenced": 1},
             "$push": {"reputation_history": {"delta": delta, "matched": matched, "ts": now_iso()}}}
        )

async def _create_memory_from_deliberation(org_id: str, proposal: dict, snapshots: list, summary: dict):
    # Create a decision memory node for this proposal
    decision_node = {
        "id": gen_id(), "org_id": org_id, "entity_type": "decision",
        "name": proposal["title"], "description": summary.get("recommended_action",""),
        "metadata": {"outcome": summary.get("outcome"), "proposal_id": proposal["id"]},
        "confidence": 0.8, "influence_score": 0.0, "mention_count": 1,
        "created_by": "system", "created_at": now_iso(), "updated_at": now_iso()
    }
    await db.memory_nodes.insert_one(decision_node)
    # Create agent → decision edges
    for snap in snapshots:
        agent_node = await db.memory_nodes.find_one({"org_id": org_id, "metadata.agent_id": snap["agent_id"]})
        if not agent_node:
            agent_node = {
                "id": gen_id(), "org_id": org_id, "entity_type": "agent",
                "name": snap["agent_name"], "description": "",
                "metadata": {"agent_id": snap["agent_id"]},
                "confidence": 0.9, "influence_score": snap.get("confidence",0.5),
                "mention_count": 1, "created_by": "system",
                "created_at": now_iso(), "updated_at": now_iso()
            }
            await db.memory_nodes.insert_one(agent_node)
        await db.memory_edges.insert_one({
            "id": gen_id(), "org_id": org_id,
            "source_id": agent_node["id"], "target_id": decision_node["id"],
            "edge_type": "influenced", "weight": snap.get("confidence",0.5),
            "metadata": {"stance": snap.get("stance"), "reasoning": snap.get("reasoning","")},
            "created_at": now_iso()
        })

# ════════════════════════════════════════════════════════════════════════════
# ⑮ SKILL MARKETPLACE (Phase 4)
# ════════════════════════════════════════════════════════════════════════════
class SkillInstallReq(BaseModel):
    skill_id: str
    source_override: str = ""  # stub: github url / zip / url

@api_router.get("/marketplace/skills")
async def list_marketplace_skills(category: str = "all", q: str = ""):
    skills = SKILLS_CATALOG
    if category and category != "all":
        skills = [s for s in skills if s["category"] == category]
    if q:
        ql = q.lower()
        skills = [s for s in skills if ql in s["name"].lower() or ql in s["description"].lower() or any(ql in t for t in s["tags"])]
    return {"skills": skills, "categories": SKILL_CATEGORIES, "total": len(skills)}

@api_router.get("/marketplace/skills/{skill_id}")
async def get_marketplace_skill(skill_id: str):
    skill = next((s for s in SKILLS_CATALOG if s["id"] == skill_id), None)
    if not skill:
        raise HTTPException(404, "Skill not found")
    return skill

@api_router.get("/orgs/{org_id}/skills/installed")
async def list_installed_skills(org_id: str, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    installs = await db.org_installed_skills.find({"org_id": org_id}, {"_id": 0}).to_list(200)
    custom_skills = {s["id"]: s async for s in db.custom_skills.find({"org_id": org_id}, {"_id": 0})}
    result = []
    for inst in installs:
        sid = inst["skill_id"]
        catalog = custom_skills.get(sid) or next((s for s in SKILLS_CATALOG if s["id"] == sid), {})
        result.append(serialize_doc({**catalog, **inst}))
    return result

@api_router.post("/orgs/{org_id}/skills/install")
async def install_skill(org_id: str, req: SkillInstallReq, user=Depends(get_current_user)):
    await _assert_min_role(org_id, user["id"], "member")
    catalog = next((s for s in SKILLS_CATALOG if s["id"] == req.skill_id), None)
    if not catalog:
        raise HTTPException(404, "Skill not in catalog")
    existing = await db.org_installed_skills.find_one({"org_id": org_id, "skill_id": req.skill_id})
    if existing:
        raise HTTPException(400, "Skill already installed")
    install = {
        "id": gen_id(), "org_id": org_id, "skill_id": req.skill_id,
        "installed_version": catalog["version"], "enabled": True,
        "installed_by": user["id"], "installed_at": now_iso(),
        "source_override": req.source_override,
    }
    await db.org_installed_skills.insert_one(install)
    await event_bus.publish(OrgEvent(
        event_type="skill.installed", org_id=org_id, actor_id=user["id"],
        payload={"skill_id": req.skill_id, "name": catalog["name"]}
    ))
    await _create_notif(org_id, None, "skill_installed",
        f"Skill installed: {catalog['name']}", catalog["description"], "/marketplace")
    return serialize_doc(install)

@api_router.delete("/orgs/{org_id}/skills/{skill_id}")
async def uninstall_skill(org_id: str, skill_id: str, user=Depends(get_current_user)):
    await _assert_min_role(org_id, user["id"], "member")
    result = await db.org_installed_skills.delete_one({"org_id": org_id, "skill_id": skill_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Skill not installed")
    await event_bus.publish(OrgEvent(
        event_type="skill.uninstalled", org_id=org_id, actor_id=user["id"],
        payload={"skill_id": skill_id}
    ))
    return {"ok": True}

class CustomSkillCreate(BaseModel):
    name: str
    description: str
    category: str = "custom"
    capabilities: List[str] = []
    permissions: List[str] = []
    endpoint: str = ""
    version: str = "1.0.0"

@api_router.post("/orgs/{org_id}/skills/custom")
async def create_custom_skill(org_id: str, req: CustomSkillCreate, user=Depends(get_current_user)):
    """Create a custom skill scoped to this org and auto-install it."""
    await _assert_min_role(org_id, user["id"], "member")
    skill_id = f"custom-{gen_id()}"
    skill = {
        "id": skill_id, "org_id": org_id,
        "name": req.name, "description": req.description,
        "category": req.category, "capabilities": req.capabilities,
        "permissions": req.permissions, "endpoint": req.endpoint,
        "version": req.version, "author": user["name"],
        "author_id": user["id"], "source": "custom",
        "rating": 0.0, "downloads": 0, "reviews": 0,
        "featured": False, "author_verified": False, "tags": [],
        "color": "#a78bfa", "price": "free",
        "created_at": now_iso(), "updated_at": now_iso(),
    }
    await db.custom_skills.insert_one(skill)
    install = {
        "id": gen_id(), "org_id": org_id, "skill_id": skill_id,
        "installed_version": req.version, "enabled": True,
        "installed_by": user["id"], "installed_at": now_iso(),
        "source_override": "", "is_custom": True,
    }
    await db.org_installed_skills.insert_one(install)
    await event_bus.publish(OrgEvent(
        event_type="skill.installed", org_id=org_id, actor_id=user["id"],
        payload={"skill_id": skill_id, "name": req.name, "custom": True}
    ))
    return serialize_doc({**skill, "install_id": install["id"]})

@api_router.get("/orgs/{org_id}/skills/custom")
async def list_custom_skills(org_id: str, user=Depends(get_current_user)):
    """List custom skills created by this org."""
    await _assert_member(org_id, user["id"])
    skills = await db.custom_skills.find({"org_id": org_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [serialize_doc(s) for s in skills]

@api_router.put("/orgs/{org_id}/skills/{skill_id}/toggle")
async def toggle_skill(org_id: str, skill_id: str, user=Depends(get_current_user)):
    await _assert_min_role(org_id, user["id"], "member")
    inst = await db.org_installed_skills.find_one({"org_id": org_id, "skill_id": skill_id})
    if not inst:
        raise HTTPException(404, "Skill not installed")
    new_state = not inst.get("enabled", True)
    await db.org_installed_skills.update_one(
        {"org_id": org_id, "skill_id": skill_id},
        {"$set": {"enabled": new_state}}
    )
    return {"enabled": new_state}

# ════════════════════════════════════════════════════════════════════════════
# ⑯ AGENT AUTONOMY — Tasks + Goals + Thought Logs (Phase 4)
# ════════════════════════════════════════════════════════════════════════════
class AgentTaskCreate(BaseModel):
    title: str
    description: str = ""
    priority: str = "medium"  # low/medium/high/critical
    due_date: str = ""

class AgentTaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None  # pending/in_progress/completed/cancelled/blocked
    priority: Optional[str] = None

class AgentGoalCreate(BaseModel):
    title: str
    description: str = ""
    metric: str = ""
    target_value: str = ""
    deadline: str = ""

class AgentGoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None  # active/completed/paused/cancelled
    progress: Optional[float] = None  # 0-100
    metric: Optional[str] = None
    current_value: Optional[str] = None

class AgentThoughtCreate(BaseModel):
    content: str
    thought_type: str = "observation"  # observation/plan/decision/concern/insight

class AgentScheduleCreate(BaseModel):
    task_description: str
    interval: str = "daily"   # hourly/daily/weekly
    enabled: bool = True

@api_router.get("/agents/{agent_id}/tasks")
async def list_agent_tasks(agent_id: str, user=Depends(get_current_user)):
    agent = await db.agents.find_one({"id": agent_id}, {"_id": 0})
    if not agent: raise HTTPException(404)
    await _assert_member(agent["org_id"], user["id"])
    tasks = await db.agent_tasks.find({"agent_id": agent_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [serialize_doc(t) for t in tasks]

@api_router.post("/agents/{agent_id}/tasks")
async def create_agent_task(agent_id: str, req: AgentTaskCreate, user=Depends(get_current_user)):
    agent = await db.agents.find_one({"id": agent_id}, {"_id": 0})
    if not agent: raise HTTPException(404)
    await _assert_member(agent["org_id"], user["id"])
    task = {
        "id": gen_id(), "agent_id": agent_id, "org_id": agent["org_id"],
        "title": req.title, "description": req.description,
        "priority": req.priority, "status": "pending",
        "due_date": req.due_date, "assigned_by": user["id"],
        "created_at": now_iso(), "updated_at": now_iso(),
    }
    await db.agent_tasks.insert_one(task)
    result = serialize_doc(task)
    await event_bus.publish(OrgEvent(
        event_type="agent.task_created", org_id=agent["org_id"], actor_id=user["id"],
        subject_id=agent_id, payload={"task_id": task["id"], "title": req.title, "agent_name": agent["name"]}
    ))
    return result

@api_router.put("/agents/{agent_id}/tasks/{task_id}")
async def update_agent_task(agent_id: str, task_id: str, req: AgentTaskUpdate, user=Depends(get_current_user)):
    agent = await db.agents.find_one({"id": agent_id}, {"_id": 0})
    if not agent: raise HTTPException(404)
    await _assert_member(agent["org_id"], user["id"])
    update = {k: v for k, v in req.model_dump().items() if v is not None}
    update["updated_at"] = now_iso()
    await db.agent_tasks.update_one({"id": task_id, "agent_id": agent_id}, {"$set": update})
    updated = await db.agent_tasks.find_one({"id": task_id}, {"_id": 0})
    return serialize_doc(updated)

@api_router.delete("/agents/{agent_id}/tasks/{task_id}")
async def delete_agent_task(agent_id: str, task_id: str, user=Depends(get_current_user)):
    agent = await db.agents.find_one({"id": agent_id}, {"_id": 0})
    if not agent: raise HTTPException(404)
    await _assert_member(agent["org_id"], user["id"])
    await db.agent_tasks.delete_one({"id": task_id, "agent_id": agent_id})
    return {"ok": True}

@api_router.get("/agents/{agent_id}/goals")
async def list_agent_goals(agent_id: str, user=Depends(get_current_user)):
    agent = await db.agents.find_one({"id": agent_id}, {"_id": 0})
    if not agent: raise HTTPException(404)
    await _assert_member(agent["org_id"], user["id"])
    goals = await db.agent_goals.find({"agent_id": agent_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return [serialize_doc(g) for g in goals]

@api_router.post("/agents/{agent_id}/goals")
async def create_agent_goal(agent_id: str, req: AgentGoalCreate, user=Depends(get_current_user)):
    agent = await db.agents.find_one({"id": agent_id}, {"_id": 0})
    if not agent: raise HTTPException(404)
    await _assert_member(agent["org_id"], user["id"])
    goal = {
        "id": gen_id(), "agent_id": agent_id, "org_id": agent["org_id"],
        "title": req.title, "description": req.description,
        "metric": req.metric, "target_value": req.target_value,
        "current_value": "0", "deadline": req.deadline,
        "status": "active", "progress": 0.0,
        "created_by": user["id"], "created_at": now_iso(),
    }
    await db.agent_goals.insert_one(goal)
    return serialize_doc(goal)

@api_router.put("/agents/{agent_id}/goals/{goal_id}")
async def update_agent_goal(agent_id: str, goal_id: str, req: AgentGoalUpdate, user=Depends(get_current_user)):
    agent = await db.agents.find_one({"id": agent_id}, {"_id": 0})
    if not agent: raise HTTPException(404)
    await _assert_member(agent["org_id"], user["id"])
    update = {k: v for k, v in req.model_dump().items() if v is not None}
    await db.agent_goals.update_one({"id": goal_id, "agent_id": agent_id}, {"$set": update})
    updated = await db.agent_goals.find_one({"id": goal_id}, {"_id": 0})
    return serialize_doc(updated)

@api_router.get("/agents/{agent_id}/thoughts")
async def list_agent_thoughts(agent_id: str, limit: int = 50, user=Depends(get_current_user)):
    agent = await db.agents.find_one({"id": agent_id}, {"_id": 0})
    if not agent: raise HTTPException(404)
    await _assert_member(agent["org_id"], user["id"])
    thoughts = await db.agent_thoughts.find({"agent_id": agent_id}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return [serialize_doc(t) for t in thoughts]

@api_router.post("/agents/{agent_id}/thoughts")
async def add_agent_thought(agent_id: str, req: AgentThoughtCreate, user=Depends(get_current_user)):
    agent = await db.agents.find_one({"id": agent_id}, {"_id": 0})
    if not agent: raise HTTPException(404)
    await _assert_member(agent["org_id"], user["id"])
    thought = {
        "id": gen_id(), "agent_id": agent_id, "org_id": agent["org_id"],
        "content": req.content, "thought_type": req.thought_type,
        "source": "user", "created_at": now_iso(),
    }
    await db.agent_thoughts.insert_one(thought)
    result = serialize_doc(thought)
    await event_bus.publish(OrgEvent(
        event_type="agent.thought_added", org_id=agent["org_id"], actor_id=user["id"],
        subject_id=agent_id, payload=result
    ))
    return result

@api_router.get("/agents/{agent_id}/schedules")
async def list_agent_schedules(agent_id: str, user=Depends(get_current_user)):
    agent = await db.agents.find_one({"id": agent_id}, {"_id": 0})
    if not agent: raise HTTPException(404)
    await _assert_member(agent["org_id"], user["id"])
    schedules = await db.agent_schedules.find({"agent_id": agent_id}, {"_id": 0}).to_list(20)
    return [serialize_doc(s) for s in schedules]

@api_router.post("/agents/{agent_id}/schedules")
async def create_agent_schedule(agent_id: str, req: AgentScheduleCreate, user=Depends(get_current_user)):
    agent = await db.agents.find_one({"id": agent_id}, {"_id": 0})
    if not agent: raise HTTPException(404)
    await _assert_member(agent["org_id"], user["id"])
    schedule = {
        "id": gen_id(), "agent_id": agent_id, "org_id": agent["org_id"],
        "task_description": req.task_description, "interval": req.interval,
        "enabled": req.enabled, "last_run": None, "next_run": now_iso(),
        "created_by": user["id"], "created_at": now_iso(),
    }
    await db.agent_schedules.insert_one(schedule)
    return serialize_doc(schedule)

@api_router.put("/agents/{agent_id}/schedules/{schedule_id}/toggle")
async def toggle_schedule(agent_id: str, schedule_id: str, user=Depends(get_current_user)):
    agent = await db.agents.find_one({"id": agent_id}, {"_id": 0})
    if not agent: raise HTTPException(404)
    await _assert_member(agent["org_id"], user["id"])
    sched = await db.agent_schedules.find_one({"id": schedule_id, "agent_id": agent_id})
    if not sched: raise HTTPException(404)
    new_state = not sched.get("enabled", True)
    await db.agent_schedules.update_one({"id": schedule_id}, {"$set": {"enabled": new_state}})
    return {"enabled": new_state}

@api_router.get("/agents/{agent_id}/autonomy-summary")
async def agent_autonomy_summary(agent_id: str, user=Depends(get_current_user)):
    agent = await db.agents.find_one({"id": agent_id}, {"_id": 0})
    if not agent: raise HTTPException(404)
    await _assert_member(agent["org_id"], user["id"])
    return {
        "task_counts": {
            "pending":     await db.agent_tasks.count_documents({"agent_id": agent_id, "status": "pending"}),
            "in_progress": await db.agent_tasks.count_documents({"agent_id": agent_id, "status": "in_progress"}),
            "completed":   await db.agent_tasks.count_documents({"agent_id": agent_id, "status": "completed"}),
        },
        "active_goals":   await db.agent_goals.count_documents({"agent_id": agent_id, "status": "active"}),
        "thought_count":  await db.agent_thoughts.count_documents({"agent_id": agent_id}),
        "schedules":      await db.agent_schedules.count_documents({"agent_id": agent_id, "enabled": True}),
        "reputation":     agent.get("reputation_score", 5.0),
        "deliberations":  agent.get("total_deliberations", 0),
    }

# ════════════════════════════════════════════════════════════════════════════
# ⑰ ORG CHART LAYOUTS (Phase 4)
# ════════════════════════════════════════════════════════════════════════════
class OrgLayoutSave(BaseModel):
    name: str
    layout_type: str  # tree/radial/force/swimlane
    view_state: dict = {}  # zoom, pan, etc.
    node_positions: dict = {}  # {node_id: {x,y}}

@api_router.get("/orgs/{org_id}/layouts")
async def list_layouts(org_id: str, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    layouts = await db.org_layouts.find({"org_id": org_id}, {"_id": 0}).sort("saved_at", -1).to_list(20)
    return [serialize_doc(l) for l in layouts]

@api_router.post("/orgs/{org_id}/layouts")
async def save_layout(org_id: str, req: OrgLayoutSave, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    layout = {
        "id": gen_id(), "org_id": org_id, "name": req.name,
        "layout_type": req.layout_type, "view_state": req.view_state,
        "node_positions": req.node_positions, "saved_by": user["id"],
        "saved_at": now_iso(),
    }
    await db.org_layouts.insert_one(layout)
    return serialize_doc(layout)

@api_router.delete("/orgs/{org_id}/layouts/{layout_id}")
async def delete_layout(org_id: str, layout_id: str, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    await db.org_layouts.delete_one({"id": layout_id, "org_id": org_id})
    return {"ok": True}

# ════════════════════════════════════════════════════════════════════════════
# ⑱ WAR ROOM enhanced events (Phase 4)
# ════════════════════════════════════════════════════════════════════════════
@api_router.get("/orgs/{org_id}/war-room/sessions")
async def list_war_room_sessions(org_id: str, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    docs = await db.deliberations.find({"org_id": org_id}, {"_id": 0}).sort("started_at", -1).to_list(50)
    return [serialize_doc(d) for d in docs]

@api_router.get("/orgs/{org_id}/agent-activity")
async def agent_activity_feed(org_id: str, user=Depends(get_current_user)):
    """Live agent activity for War Room + Command Center."""
    await _assert_member(org_id, user["id"])
    agents = await db.agents.find({"org_id": org_id}, {"_id": 0}).to_list(50)
    activity = []
    for a in agents:
        recent_tasks  = await db.agent_tasks.find({"agent_id": a["id"]}, {"_id": 0}).sort("updated_at", -1).limit(2).to_list(2)
        recent_thoughts = await db.agent_thoughts.find({"agent_id": a["id"]}, {"_id": 0}).sort("created_at", -1).limit(1).to_list(1)
        p = presence.get(org_id, {}).get(f"agent_{a['id']}", {})
        activity.append({
            "agent": serialize_doc(a),
            "status": p.get("status", "offline"),
            "thinking": p.get("thinking", False),
            "recent_tasks": [serialize_doc(t) for t in recent_tasks],
            "last_thought": serialize_doc(recent_thoughts[0]) if recent_thoughts else None,
            "task_counts": {
                "pending":    await db.agent_tasks.count_documents({"agent_id": a["id"], "status": "pending"}),
                "in_progress": await db.agent_tasks.count_documents({"agent_id": a["id"], "status": "in_progress"}),
            },
        })
    return activity

# ════════════════════════════════════════════════════════════════════════════
# ⑲ PERSONAL AGENTS + DELEGATE SYSTEM (Phase 5)
# ════════════════════════════════════════════════════════════════════════════

class DelegateSwapReq(BaseModel):
    new_agent_id: str
    reason: str = ""

class SwapReviewReq(BaseModel):
    approved: bool
    review_note: str = ""

@api_router.get("/me/agents")
async def my_agents(user=Depends(get_current_user)):
    """All agents created by the current user with delegation status."""
    agents = await db.agents.find({"created_by": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    result = []
    for agent in agents:
        a = serialize_doc(agent)
        # Check if this agent is a delegate in any org
        delegation = await db.org_members.find_one({"brought_agent_id": agent["id"]})
        if delegation:
            org = await db.orgs.find_one({"id": delegation["org_id"]}, {"_id": 0})
            a["delegated_to"] = {
                "org": serialize_doc(org) if org else {},
                "member_id": delegation["id"],
                "role": delegation.get("role", "member"),
                "joined_at": delegation.get("joined_at"),
            }
        else:
            a["delegated_to"] = None
        # Task/goal counts
        a["pending_tasks"]  = await db.agent_tasks.count_documents({"agent_id": agent["id"], "status": "pending"})
        a["active_goals"]   = await db.agent_goals.count_documents({"agent_id": agent["id"], "status": "active"})
        a["thought_count"]  = await db.agent_thoughts.count_documents({"agent_id": agent["id"]})
        result.append(a)
    return result

@api_router.get("/me/agents/available-for-delegation")
async def agents_available_for_delegation(user=Depends(get_current_user)):
    """Agents that are NOT yet delegates in any org — available to bring on invite."""
    agents = await db.agents.find({"created_by": user["id"]}, {"_id": 0}).to_list(200)
    result = []
    for agent in agents:
        delegation = await db.org_members.find_one({"brought_agent_id": agent["id"]})
        if not delegation:
            result.append(serialize_doc(agent))
    return result

# ── Delegate swap requests ────────────────────────────────────────────────
@api_router.post("/orgs/{org_id}/delegates/request-swap")
async def request_delegate_swap(org_id: str, req: DelegateSwapReq, user=Depends(get_current_user)):
    """User requests to replace their current delegate with a different agent."""
    member = await db.org_members.find_one({"org_id": org_id, "user_id": user["id"]})
    if not member:
        raise HTTPException(403, "Not a member of this org")
    if not member.get("brought_agent_id"):
        raise HTTPException(400, "You have no delegate in this org")
    # Verify new agent belongs to user
    new_agent = await db.agents.find_one({"id": req.new_agent_id, "created_by": user["id"]})
    if not new_agent:
        raise HTTPException(400, "Agent not found or does not belong to you")
    # Check new agent isn't already a delegate elsewhere
    existing = await db.org_members.find_one({"brought_agent_id": req.new_agent_id})
    if existing and existing["org_id"] != org_id:
        raise HTTPException(400, "That agent is already a delegate in another org")
    # Create request
    swap_req = {
        "id": gen_id(), "org_id": org_id,
        "requesting_user_id": user["id"],
        "requesting_user_name": user["name"],
        "current_agent_id": member["brought_agent_id"],
        "new_agent_id": req.new_agent_id,
        "new_agent_name": new_agent["name"],
        "reason": req.reason,
        "status": "pending",
        "requested_at": now_iso(),
        "reviewed_by": None, "reviewed_at": None, "review_note": "",
    }
    await db.delegate_swap_requests.insert_one(swap_req)
    result = serialize_doc(swap_req)
    await event_bus.publish(OrgEvent(
        event_type="delegate.swap_requested", org_id=org_id, actor_id=user["id"],
        payload={**result, "requesting_user_name": user["name"]}
    ))
    await _create_notif(org_id, None, "delegate_swap_request",
        f"Delegate swap request from {user['name']}",
        f"Wants to swap to: {new_agent['name']}",
        "/settings")
    return result

@api_router.get("/orgs/{org_id}/delegates/swap-requests")
async def list_swap_requests(org_id: str, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    requests = await db.delegate_swap_requests.find(
        {"org_id": org_id}, {"_id": 0}
    ).sort("requested_at", -1).to_list(50)
    result = []
    for r in requests:
        r = serialize_doc(r)
        # Enrich with agent details
        cur  = await db.agents.find_one({"id": r["current_agent_id"]}, {"_id": 0})
        new_ = await db.agents.find_one({"id": r["new_agent_id"]}, {"_id": 0})
        r["current_agent"]  = serialize_doc(cur)  if cur  else {}
        r["new_agent"]      = serialize_doc(new_) if new_ else {}
        result.append(r)
    return result

@api_router.put("/orgs/{org_id}/delegates/swap-requests/{request_id}")
async def review_swap_request(org_id: str, request_id: str, req: SwapReviewReq, user=Depends(get_current_user)):
    """Owner/board reviews a delegate swap request."""
    await _assert_min_role(org_id, user["id"], "board")
    swap_req = await db.delegate_swap_requests.find_one({"id": request_id, "org_id": org_id})
    if not swap_req:
        raise HTTPException(404, "Request not found")
    if swap_req["status"] != "pending":
        raise HTTPException(400, "Request already reviewed")
    new_status = "approved" if req.approved else "rejected"
    await db.delegate_swap_requests.update_one(
        {"id": request_id},
        {"$set": {
            "status": new_status,
            "reviewed_by": user["id"],
            "reviewed_at": now_iso(),
            "review_note": req.review_note,
        }}
    )
    if req.approved:
        # Execute the swap: update org_members + move agent to new org
        old_agent_id = swap_req["current_agent_id"]
        new_agent_id = swap_req["new_agent_id"]
        await db.org_members.update_one(
            {"org_id": org_id, "user_id": swap_req["requesting_user_id"]},
            {"$set": {"brought_agent_id": new_agent_id}}
        )
        # Remove old agent's chart node, add new agent's chart node
        await db.chart_nodes.delete_one({"org_id": org_id, "node_ref_id": old_agent_id})
        all_nodes = await db.chart_nodes.find({"org_id": org_id}).to_list(200)
        await db.chart_nodes.insert_one({
            "id": gen_id(), "org_id": org_id, "node_ref_id": new_agent_id,
            "node_type": "agent", "manager_id": None, "is_board_member": False,
            "position": {"x": 100 + (len(all_nodes) % 4) * 250, "y": 100 + (len(all_nodes) // 4) * 160},
            "created_at": now_iso(),
        })
        # Update agent's org_id
        await db.agents.update_one({"id": new_agent_id}, {"$set": {"org_id": org_id}})
        await event_bus.publish(OrgEvent(
            event_type="delegate.swapped", org_id=org_id, actor_id=user["id"],
            payload={"old_agent_id": old_agent_id, "new_agent_id": new_agent_id}
        ))
        await _create_notif(org_id, swap_req["requesting_user_id"], "delegate_swap_approved",
            "Your delegate swap was approved!",
            f"Your new delegate is now active in the org.", "/org-chart")
    else:
        await _create_notif(org_id, swap_req["requesting_user_id"], "delegate_swap_rejected",
            "Your delegate swap was rejected",
            req.review_note or "The org admin declined your request.", "/settings")

    return {"ok": True, "status": new_status}

@api_router.get("/orgs/{org_id}/delegates/my-request")
async def my_swap_request(org_id: str, user=Depends(get_current_user)):
    """Get the current user's pending swap request, if any."""
    await _assert_member(org_id, user["id"])
    req = await db.delegate_swap_requests.find_one(
        {"org_id": org_id, "requesting_user_id": user["id"], "status": "pending"},
        {"_id": 0}
    )
    return serialize_doc(req) if req else None

@api_router.get("/orgs/{org_id}/my-delegate")
async def my_delegate(org_id: str, user=Depends(get_current_user)):
    """Get current user's delegate agent in this org."""
    member = await db.org_members.find_one({"org_id": org_id, "user_id": user["id"]})
    if not member or not member.get("brought_agent_id"):
        return None
    agent = await db.agents.find_one({"id": member["brought_agent_id"]}, {"_id": 0})
    return serialize_doc(agent) if agent else None

# ════════════════════════════════════════════════════════════════════════════
# ⑳ ORG CHART GOVERNANCE (Phase 6)
# ════════════════════════════════════════════════════════════════════════════

PROVIDER_BADGES = ['OpenClaw', 'Hermes', 'Claude', 'OpenAI', 'Codex', 'Gemini', 'OpenRouter', 'Ollama', 'DeepSeek', 'Custom']
PROVIDER_BADGE_COLORS = {
    'Claude':     '#d97706', 'OpenAI':     '#74aa9c', 'Codex':      '#74aa9c',
    'Gemini':     '#4285f4', 'OpenRouter':  '#8b5cf6', 'Ollama':     '#10b981',
    'Hermes':     '#f97316', 'DeepSeek':    '#22d3ee', 'OpenClaw':   '#a78bfa',
    'Custom':     '#6b7280',
}

def get_provider_badge(agent: dict) -> str:
    if agent.get("provider_badge"): return agent["provider_badge"]
    m  = (agent.get("model") or "").lower()
    pb = (agent.get("provider_override") or "").lower()
    if "claude" in m or "anthropic" in pb: return "Claude"
    if "codex"  in m: return "Codex"
    if "gpt"    in m or "openai"   in pb: return "OpenAI"
    if "gemini" in m or "google"   in pb: return "Gemini"
    if "deepseek" in m: return "DeepSeek"
    if "ollama" in pb or "ollama" in m: return "Ollama"
    if "openrouter" in pb: return "OpenRouter"
    if "hermes" in m: return "Hermes"
    return "Custom"

class OrgChartFinalizeReq(BaseModel):
    label: str = ""
    reason: str = ""

class OrgChartChangeProposalCreate(BaseModel):
    change_type: str       # node_name | node_role | node_provider | node_department | manager_change | edge_label | edge_delete | board_seat
    subject_id: str        # node_id or edge_id
    subject_name: str
    before: dict
    after: dict
    reason: str = ""
    edge_source: str = ""  # for edge changes
    edge_target: str = ""

class ChartVoteReq(BaseModel):
    value: str  # approve | reject
    note: str = ""

class EmergencyUnlockReq(BaseModel):
    reason: str

# ── Helpers ────────────────────────────────────────────────────────────────
async def _get_chart_governance(org_id: str) -> dict:
    cfg = await db.org_chart_configs.find_one({"org_id": org_id}, {"_id": 0})
    return cfg or {"org_id": org_id, "is_governed": False, "emergency_override": False}

async def _is_governed(org_id: str) -> bool:
    cfg = await _get_chart_governance(org_id)
    if cfg.get("emergency_override"): return False  # temporarily unlocked
    return cfg.get("is_governed", False)

async def _log_audit(org_id: str, change_type: str, subject_id: str, subject_name: str,
                     before: dict, after: dict, proposed_by: str, proposed_by_name: str,
                     vote_result: str, reason: str):
    await db.org_chart_audit_log.insert_one({
        "id": gen_id(), "org_id": org_id, "change_type": change_type,
        "subject_id": subject_id, "subject_name": subject_name,
        "before": before, "after": after,
        "proposed_by": proposed_by, "proposed_by_name": proposed_by_name,
        "vote_result": vote_result, "reason": reason,
        "applied_at": now_iso() if vote_result in ("approved","emergency_applied") else None,
        "created_at": now_iso(),
    })

# ── Governance endpoints ───────────────────────────────────────────────────
@api_router.get("/orgs/{org_id}/chart/governance")
async def get_chart_governance(org_id: str, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    cfg = await _get_chart_governance(org_id)
    versions  = await db.org_chart_versions.count_documents({"org_id": org_id})
    pending   = await db.org_chart_change_proposals.count_documents({"org_id": org_id, "status": "pending"})
    cfg["version_count"]      = versions
    cfg["pending_proposals"]  = pending
    return serialize_doc(cfg)

@api_router.post("/orgs/{org_id}/chart/finalize")
async def finalize_chart(org_id: str, req: OrgChartFinalizeReq, user=Depends(get_current_user)):
    await _assert_min_role(org_id, user["id"], "owner")
    nodes = await db.chart_nodes.find({"org_id": org_id}, {"_id": 0}).to_list(300)
    ver_count = await db.org_chart_versions.count_documents({"org_id": org_id})
    snapshot = {
        "id": gen_id(), "org_id": org_id, "version": ver_count + 1,
        "snapshot": [serialize_doc(n) for n in nodes],
        "label": req.label or f"v{ver_count + 1} — {now_iso()[:10]}",
        "created_by": user["id"], "created_at": now_iso(),
    }
    await db.org_chart_versions.insert_one(snapshot)
    await db.org_chart_configs.update_one(
        {"org_id": org_id},
        {"$set": {"is_governed": True, "emergency_override": False,
                  "finalized_at": now_iso(), "finalized_by": user["id"]}},
        upsert=True
    )
    await _log_audit(org_id, "governance.finalized", org_id, "Org Chart",
                     {"is_governed": False}, {"is_governed": True},
                     user["id"], user["name"], "emergency_applied", req.reason or "Initial finalization")
    await event_bus.publish(OrgEvent(
        event_type="chart.governance_changed", org_id=org_id, actor_id=user["id"],
        payload={"is_governed": True, "version": ver_count + 1}
    ))
    await _create_notif(org_id, None, "chart_governed",
        "Org chart finalized — Governed Mode active",
        "All future changes require board approval.", "/org-chart")
    return {"ok": True, "version": ver_count + 1, "is_governed": True}

@api_router.post("/orgs/{org_id}/chart/emergency-unlock")
async def emergency_unlock(org_id: str, req: EmergencyUnlockReq, user=Depends(get_current_user)):
    await _assert_min_role(org_id, user["id"], "owner")
    await db.org_chart_configs.update_one(
        {"org_id": org_id},
        {"$set": {"emergency_override": True, "emergency_override_by": user["id"],
                  "emergency_override_at": now_iso(), "emergency_override_reason": req.reason}},
        upsert=True
    )
    await _log_audit(org_id, "governance.emergency_unlock", org_id, "Org Chart",
                     {"emergency_override": False}, {"emergency_override": True},
                     user["id"], user["name"], "emergency_applied", req.reason)
    await _create_notif(org_id, None, "chart_emergency_unlock",
        f"⚠️ Emergency override activated by {user['name']}",
        req.reason, "/org-chart")
    return {"ok": True}

@api_router.post("/orgs/{org_id}/chart/re-lock")
async def re_lock_chart(org_id: str, user=Depends(get_current_user)):
    await _assert_min_role(org_id, user["id"], "owner")
    await db.org_chart_configs.update_one(
        {"org_id": org_id},
        {"$set": {"emergency_override": False}},
        upsert=True
    )
    await _log_audit(org_id, "governance.re_locked", org_id, "Org Chart",
                     {"emergency_override": True}, {"emergency_override": False},
                     user["id"], user["name"], "emergency_applied", "Manual re-lock")
    return {"ok": True}

@api_router.get("/orgs/{org_id}/chart/versions")
async def list_chart_versions(org_id: str, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    versions = await db.org_chart_versions.find({"org_id": org_id}, {"_id": 0, "snapshot": 0}).sort("version", -1).to_list(20)
    return [serialize_doc(v) for v in versions]

@api_router.get("/orgs/{org_id}/chart/versions/{version_id}/snapshot")
async def get_chart_snapshot(org_id: str, version_id: str, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    snap = await db.org_chart_versions.find_one({"id": version_id, "org_id": org_id}, {"_id": 0})
    if not snap: raise HTTPException(404)
    return serialize_doc(snap)

# ── Change Proposals ──────────────────────────────────────────────────────
@api_router.get("/orgs/{org_id}/chart/change-proposals")
async def list_chart_proposals(org_id: str, status_filter: str = None, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    query = {"org_id": org_id}
    if status_filter: query["status"] = status_filter
    proposals = await db.org_chart_change_proposals.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [serialize_doc(p) for p in proposals]

@api_router.post("/orgs/{org_id}/chart/change-proposals")
async def create_chart_proposal(org_id: str, req: OrgChartChangeProposalCreate, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    proposal = {
        "id": gen_id(), "org_id": org_id,
        "change_type": req.change_type,
        "subject_id": req.subject_id, "subject_name": req.subject_name,
        "before": req.before, "after": req.after,
        "reason": req.reason,
        "edge_source": req.edge_source, "edge_target": req.edge_target,
        "proposed_by": user["id"], "proposed_by_name": user["name"],
        "status": "pending",
        "votes": [],
        "created_at": now_iso(), "applied_at": None,
    }
    await db.org_chart_change_proposals.insert_one(proposal)
    result = serialize_doc(proposal)
    await event_bus.publish(OrgEvent(
        event_type="chart.proposal_created", org_id=org_id, actor_id=user["id"],
        subject_id=proposal["id"], payload=result
    ))
    await _create_notif(org_id, None, "chart_proposal",
        f"Org chart change proposed by {user['name']}",
        f"{req.change_type}: {req.subject_name}", "/board")
    return result

@api_router.post("/orgs/{org_id}/chart/change-proposals/{proposal_id}/vote")
async def vote_chart_proposal(org_id: str, proposal_id: str, req: ChartVoteReq, user=Depends(get_current_user)):
    await _assert_min_role(org_id, user["id"], "board")
    proposal = await db.org_chart_change_proposals.find_one({"id": proposal_id, "org_id": org_id})
    if not proposal: raise HTTPException(404)
    if proposal["status"] != "pending": raise HTTPException(400, "Proposal already resolved")
    # Upsert vote
    votes = [v for v in proposal.get("votes", []) if v.get("voter_id") != user["id"]]
    votes.append({"voter_id": user["id"], "voter_name": user["name"], "value": req.value, "note": req.note, "voted_at": now_iso()})
    await db.org_chart_change_proposals.update_one({"id": proposal_id}, {"$set": {"votes": votes}})
    # Check majority
    org_member_count = await db.org_members.count_documents({"org_id": org_id})
    board_member_count = max(1, await db.org_members.count_documents({"org_id": org_id, "role": {"$in": ["owner","board"]}}))
    approve_count = sum(1 for v in votes if v["value"] == "approve")
    reject_count  = sum(1 for v in votes if v["value"] == "reject")
    outcome = None
    if approve_count > board_member_count // 2:
        outcome = "approved"
    elif reject_count >= board_member_count - board_member_count // 2:
        outcome = "rejected"

    if outcome:
        await db.org_chart_change_proposals.update_one(
            {"id": proposal_id},
            {"$set": {"status": outcome, "applied_at": now_iso() if outcome == "approved" else None}}
        )
        if outcome == "approved":
            await _apply_chart_proposal(proposal, org_id)
        await _log_audit(org_id, proposal["change_type"], proposal["subject_id"], proposal["subject_name"],
                         proposal["before"], proposal["after"],
                         proposal["proposed_by"], proposal["proposed_by_name"],
                         outcome, proposal["reason"])
        await event_bus.publish(OrgEvent(
            event_type=f"chart.proposal_{outcome}", org_id=org_id, actor_id=user["id"],
            payload={"proposal_id": proposal_id, "change_type": proposal["change_type"]}
        ))
        notif_title = f"Chart change {'approved ✅' if outcome=='approved' else 'rejected ✗'}: {proposal['subject_name']}"
        await _create_notif(org_id, proposal["proposed_by"], f"chart_proposal_{outcome}", notif_title, proposal["reason"], "/org-chart")

    updated = await db.org_chart_change_proposals.find_one({"id": proposal_id}, {"_id": 0})
    return serialize_doc(updated)

async def _apply_chart_proposal(proposal: dict, org_id: str):
    ct = proposal["change_type"]
    sid = proposal["subject_id"]
    after = proposal["after"]
    if ct in ("node_name", "node_role", "node_department"):
        node = await db.chart_nodes.find_one({"id": sid, "org_id": org_id})
        ref_id = node["node_ref_id"] if node else None
        agent = await db.agents.find_one({"id": ref_id}) if ref_id else None
        if agent:
            update_field = {"node_name": "name", "node_role": "role", "node_department": "department"}.get(ct, "name")
            await db.agents.update_one({"id": agent["id"]}, {"$set": {update_field: after.get("value", "")}})
    elif ct == "node_provider":
        node = await db.chart_nodes.find_one({"id": sid, "org_id": org_id})
        ref_id = node["node_ref_id"] if node else None
        agent = await db.agents.find_one({"id": ref_id}) if ref_id else None
        if agent:
            await db.agents.update_one({"id": agent["id"]},
                {"$set": {"provider_badge": after.get("provider_badge", "Custom"),
                           "model": after.get("model", agent.get("model",""))}})
    elif ct == "manager_change":
        await db.chart_nodes.update_one({"id": sid, "org_id": org_id},
                                         {"$set": {"manager_id": after.get("manager_id")}})
    elif ct == "board_seat":
        await db.chart_nodes.update_one({"id": sid, "org_id": org_id},
                                         {"$set": {"is_board_member": after.get("is_board_member", False)}})
    elif ct == "edge_label":
        # Store edge labels in a separate collection keyed by source+target
        await db.chart_edge_labels.update_one(
            {"org_id": org_id, "source": proposal.get("edge_source"), "target": proposal.get("edge_target")},
            {"$set": {"label": after.get("label", ""), "updated_at": now_iso()}},
            upsert=True
        )
    elif ct == "edge_delete":
        # Update manager_id to null for the target node
        target = proposal.get("edge_target") or sid
        await db.chart_nodes.update_one({"id": target, "org_id": org_id},
                                         {"$set": {"manager_id": None}})
    await event_bus.publish(OrgEvent(
        event_type="chart.updated", org_id=org_id, actor_id="system",
        payload={"node_id": sid, "change_type": ct}
    ))

# ── Audit Log ─────────────────────────────────────────────────────────────
@api_router.get("/orgs/{org_id}/chart/audit-log")
async def get_chart_audit_log(org_id: str, limit: int = 50, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    logs = await db.org_chart_audit_log.find({"org_id": org_id}, {"_id": 0}).sort("created_at", -1).limit(min(limit,200)).to_list(min(limit,200))
    return [serialize_doc(l) for l in logs]

# ── Edge Labels (draft mode) ──────────────────────────────────────────────
@api_router.get("/orgs/{org_id}/chart/edge-labels")
async def get_edge_labels(org_id: str, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    labels = await db.chart_edge_labels.find({"org_id": org_id}, {"_id": 0}).to_list(500)
    return [serialize_doc(l) for l in labels]

@api_router.put("/orgs/{org_id}/chart/edge-labels")
async def update_edge_label(org_id: str, data: dict, user=Depends(get_current_user)):
    """Update or create an edge label. In governed mode, creates a change proposal."""
    await _assert_member(org_id, user["id"])
    governed = await _is_governed(org_id)
    source = data.get("source", ""); target = data.get("target", ""); label = data.get("label", "")
    if governed:
        existing = await db.chart_edge_labels.find_one({"org_id": org_id, "source": source, "target": target})
        before_label = existing["label"] if existing else ""
        proposal = {
            "id": gen_id(), "org_id": org_id,
            "change_type": "edge_label",
            "subject_id": f"{source}__{target}", "subject_name": f"{source} → {target}",
            "before": {"label": before_label}, "after": {"label": label},
            "reason": data.get("reason", ""),
            "edge_source": source, "edge_target": target,
            "proposed_by": user["id"], "proposed_by_name": user["name"],
            "status": "pending", "votes": [],
            "created_at": now_iso(), "applied_at": None,
        }
        await db.org_chart_change_proposals.insert_one(proposal)
        await _log_audit(org_id, "edge_label", f"{source}__{target}", f"{source} → {target}",
                         {"label": before_label}, {"label": label},
                         user["id"], user["name"], "proposed", data.get("reason", ""))
        await event_bus.publish(OrgEvent(
            event_type="chart.proposal_created", org_id=org_id, actor_id=user["id"],
            payload={"change_type": "edge_label", "subject_id": f"{source}__{target}"}
        ))
        return {"ok": True, "governed": True, "proposal_id": proposal["id"]}
    await db.chart_edge_labels.update_one(
        {"org_id": org_id, "source": source, "target": target},
        {"$set": {"label": label, "updated_at": now_iso()}},
        upsert=True
    )
    await _log_audit(org_id, "edge_label", f"{source}__{target}", f"{source} → {target}",
                     {}, {"label": label}, user["id"], user["name"], "draft_applied", "")
    await event_bus.publish(OrgEvent(
        event_type="chart.updated", org_id=org_id, actor_id=user["id"],
        payload={"source": source, "target": target, "label": label}
    ))
    return {"ok": True, "governed": False}

# ── Enhanced chart node update (governance-aware) ─────────────────────────
@api_router.put("/orgs/{org_id}/chart/nodes/{node_id}/inline")
async def update_chart_node_inline(org_id: str, node_id: str, data: dict, user=Depends(get_current_user)):
    """Inline node update. Draft mode: applies instantly. Governed mode: creates proposals."""
    await _assert_member(org_id, user["id"])
    governed = await _is_governed(org_id)
    node = await db.chart_nodes.find_one({"id": node_id, "org_id": org_id})
    if not node: raise HTTPException(404)
    ref_id = node.get("node_ref_id")
    subject_name = node.get("label") or node_id
    reason = data.get("reason", "")

    if governed:
        # In governed mode, create a change proposal for each modified field
        agent = await db.agents.find_one({"id": ref_id}, {"_id": 0}) if ref_id else None
        proposal_ids = []

        async def _make_proposal(change_type, before, after, **extra):
            p = {
                "id": gen_id(), "org_id": org_id,
                "change_type": change_type,
                "subject_id": node_id, "subject_name": subject_name,
                "before": before, "after": after, "reason": reason,
                "edge_source": "", "edge_target": "",
                "proposed_by": user["id"], "proposed_by_name": user["name"],
                "status": "pending", "votes": [],
                "created_at": now_iso(), "applied_at": None,
                **extra,
            }
            await db.org_chart_change_proposals.insert_one(p)
            await _log_audit(org_id, change_type, node_id, subject_name,
                             before, after, user["id"], user["name"], "proposed", reason)
            proposal_ids.append(p["id"])

        if "name" in data and agent:
            await _make_proposal("node_name", {"value": agent.get("name", "")}, {"value": data["name"]})
        if "role" in data and agent:
            await _make_proposal("node_role", {"value": agent.get("role", "")}, {"value": data["role"]})
        if "department" in data and agent:
            await _make_proposal("node_department", {"value": agent.get("department", "")}, {"value": data["department"]})
        if ("provider_badge" in data or "model" in data) and agent:
            await _make_proposal("node_provider",
                {"provider_badge": agent.get("provider_badge", "Custom"), "model": agent.get("model", "")},
                {"provider_badge": data.get("provider_badge", agent.get("provider_badge", "Custom")),
                 "model": data.get("model", agent.get("model", ""))})
        if "manager_id" in data:
            await _make_proposal("manager_change",
                {"manager_id": node.get("manager_id")}, {"manager_id": data["manager_id"]})
        if "is_board_member" in data:
            await _make_proposal("board_seat",
                {"is_board_member": node.get("is_board_member", False)},
                {"is_board_member": data["is_board_member"]})

        if proposal_ids:
            await event_bus.publish(OrgEvent(
                event_type="chart.proposal_created", org_id=org_id, actor_id=user["id"],
                payload={"node_id": node_id, "proposal_ids": proposal_ids}
            ))
        return {"ok": True, "governed": True, "proposal_ids": proposal_ids}

    # Draft mode: apply directly
    if node.get("node_type") == "agent" and ref_id:
        update = {}
        if "name"           in data: update["name"]           = data["name"]
        if "role"           in data: update["role"]           = data["role"]
        if "department"     in data: update["department"]     = data["department"]
        if "provider_badge" in data: update["provider_badge"] = data["provider_badge"]
        if "model"          in data: update["model"]          = data["model"]
        if update:
            await db.agents.update_one({"id": ref_id}, {"$set": update})
            await _log_audit(org_id, "node_inline_update", node_id, subject_name,
                             {}, update, user["id"], user["name"], "draft_applied", reason)
    if "manager_id" in data:
        before_mgr = node.get("manager_id")
        await db.chart_nodes.update_one({"id": node_id, "org_id": org_id}, {"$set": {"manager_id": data["manager_id"]}})
        await _log_audit(org_id, "manager_change", node_id, subject_name,
                         {"manager_id": before_mgr}, {"manager_id": data["manager_id"]},
                         user["id"], user["name"], "draft_applied", reason)
    if "is_board_member" in data:
        before_board = node.get("is_board_member", False)
        await db.chart_nodes.update_one({"id": node_id, "org_id": org_id}, {"$set": {"is_board_member": data["is_board_member"]}})
        await _log_audit(org_id, "board_seat", node_id, subject_name,
                         {"is_board_member": before_board}, {"is_board_member": data["is_board_member"]},
                         user["id"], user["name"], "draft_applied", reason)
    if "position" in data:
        await db.chart_nodes.update_one({"id": node_id, "org_id": org_id}, {"$set": {"position": data["position"]}})
    await event_bus.publish(OrgEvent(
        event_type="chart.updated", org_id=org_id, actor_id=user["id"],
        payload={"node_id": node_id}
    ))
    agent = await db.agents.find_one({"id": ref_id}, {"_id": 0}) if ref_id and node.get("node_type") == "agent" else None
    return {"ok": True, "governed": False, "provider_badge": get_provider_badge(agent) if agent else "Custom"}

# ── Enrich chart endpoint with provider badge ─────────────────────────────

# ── Seeds + Indexes ───────────────────────────────────────────────────────
SKILLS_SEED = [
    {"id": "skill-coding",   "name": "Coding",        "description": "Write, review, and debug code", "category": "technical"},
    {"id": "skill-research", "name": "Research",      "description": "Deep research and fact-finding", "category": "knowledge"},
    {"id": "skill-analysis", "name": "Analysis",      "description": "Analyze data and insights",      "category": "knowledge"},
    {"id": "skill-api",      "name": "API Execution", "description": "Call external APIs",             "category": "technical"},
    {"id": "skill-writing",  "name": "Writing",       "description": "Draft documents and reports",    "category": "creative"},
    {"id": "skill-decision", "name": "Decision",      "description": "Strategic decision-making",      "category": "strategic"},
]

@app.get("/health")
async def health_check():
    """Public unauthenticated health check."""
    try:
        await db.command("ping")
        db_ok = True
    except Exception:
        db_ok = False
    return {"status": "ok" if db_ok else "degraded", "db": db_ok, "version": "4.0.0"}

@app.on_event("startup")
async def startup():
    for skill in SKILLS_SEED:
        await db.skills.update_one({"id": skill["id"]}, {"$setOnInsert": skill}, upsert=True)
    for col, idxs in [
        ("users", [("email", {"unique": True})]),
        ("org_members", [([("org_id",1),("user_id",1)], {})]),
        ("events", [([("org_id",1),("created_at",-1)], {})]),
        ("notifications", [([("org_id",1),("user_id",1),("read_at",1)], {})]),
        ("memory_nodes", [([("org_id",1)], {})]),
        ("deliberations", [([("org_id",1),("proposal_id",1)], {})]),
        ("agent_tasks", [([("agent_id",1),("status",1)], {})]),
        ("agent_goals", [([("agent_id",1)], {})]),
        ("agent_thoughts", [([("agent_id",1),("created_at",-1)], {})]),
        ("org_installed_skills", [([("org_id",1),("skill_id",1)], {})]),
        ("delegate_swap_requests", [([("org_id",1),("status",1)], {})]),
        ("org_chart_change_proposals", [([("org_id",1),("status",1)], {})]),
        ("org_chart_audit_log",        [([("org_id",1),("created_at",-1)], {})]),
        ("org_chart_configs",          [([("org_id",1)], {"unique": True})]),
        ("user_configs",               [([("user_id",1)], {"unique": True})]),
    ]:
        for idx in idxs:
            try:
                if isinstance(idx[0], str):
                    await getattr(db, col).create_index(idx[0], **idx[1])
                else:
                    await getattr(db, col).create_index(idx[0], **idx[1])
            except Exception:
                pass
    asyncio.create_task(_agent_schedule_runner())
    logger.info("Neural-Org backend started — AI Operating System v4")

@app.on_event("shutdown")
async def shutdown():
    client.close()

app.include_router(api_router)

