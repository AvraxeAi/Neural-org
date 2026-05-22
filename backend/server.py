from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from jose import jwt, JWTError
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Any
from datetime import datetime, timezone, timedelta
from pathlib import Path
from dotenv import load_dotenv
import os, uuid, asyncio, json, logging, random, string

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ── Config ────────────────────────────────────────────────────────────────
SECRET_KEY = os.environ.get("JWT_SECRET", "openclaw-super-secret-key-2024")
ALGORITHM  = "HS256"
TOKEN_EXPIRE_HOURS = 24

# ── DB ────────────────────────────────────────────────────────────────────
mongo_url = os.environ["MONGO_URL"]
client    = AsyncIOMotorClient(mongo_url)
DB_NAME   = os.environ.get("DB_NAME", "openclaw")
db        = client[DB_NAME]

# ── App + Router ──────────────────────────────────────────────────────────
app        = FastAPI(title="OpenClaw Command Center")
api_router = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("openclaw")

# ── Auth Utilities ────────────────────────────────────────────────────────
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

def hash_password(pw: str) -> str:
    return pwd_ctx.hash(pw)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)

def create_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# ── WebSocket Manager ─────────────────────────────────────────────────────
class OrgConnectionManager:
    def __init__(self):
        self._rooms: dict[str, list[tuple[WebSocket, str]]] = {}

    async def connect(self, org_id: str, ws: WebSocket, client_id: str):
        await ws.accept()
        self._rooms.setdefault(org_id, []).append((ws, client_id))

    def disconnect(self, org_id: str, ws: WebSocket):
        if org_id in self._rooms:
            self._rooms[org_id] = [(w, c) for w, c in self._rooms[org_id] if w is not ws]

    async def broadcast(self, org_id: str, event: dict, exclude_ws: WebSocket | None = None):
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

ws_manager = OrgConnectionManager()

# ── Helpers ───────────────────────────────────────────────────────────────
def serialize_doc(doc: dict) -> dict:
    if not doc:
        return doc
    doc.pop("_id", None)
    for k, v in list(doc.items()):
        if isinstance(v, datetime):
            doc[k] = v.isoformat()
        elif isinstance(v, dict):
            doc[k] = serialize_doc(v)
        elif isinstance(v, list):
            doc[k] = [serialize_doc(i) if isinstance(i, dict) else (i.isoformat() if isinstance(i, datetime) else i) for i in v]
    return doc

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def gen_id() -> str:
    return str(uuid.uuid4())

def gen_invite_code(n=8) -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=n))

AVATAR_COLORS = ["#22d3ee","#f59e0b","#10b981","#6366f1","#ec4899","#f97316","#84cc16","#a78bfa"]

# ── Pydantic Request Models ───────────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str

class LoginRequest(BaseModel):
    email: str
    password: str

class OrgCreate(BaseModel):
    name: str
    description: str = ""

class JoinOrgRequest(BaseModel):
    invite_code: str
    agent_id: str  # agent to bring

class AgentCreate(BaseModel):
    name: str
    role: str = "Assistant"
    system_prompt: str = ""
    skills: list = []
    tools: list = []
    model: str = "gpt-4"

class AgentUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    system_prompt: Optional[str] = None
    skills: Optional[list] = None
    tools: Optional[list] = None
    model: Optional[str] = None
    api_key: Optional[str] = None
    manager_id: Optional[str] = None
    is_board_member: Optional[bool] = None
    status: Optional[str] = None
    position: Optional[dict] = None

class ProposalCreate(BaseModel):
    title: str
    description: str = ""
    workflow_id: Optional[str] = None
    voting_type: str = "majority"

class VoteRequest(BaseModel):
    value: str  # "approve" or "reject"

class CommentCreate(BaseModel):
    text: str

class WorkflowCreate(BaseModel):
    name: str
    description: str = ""
    trigger_type: str = "manual"
    nodes: list = []
    edges: list = []

class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    trigger_type: Optional[str] = None
    nodes: Optional[list] = None
    edges: Optional[list] = None

class ThreadCreate(BaseModel):
    title: str
    participants: list  # [{id, type, name}]

class MessageCreate(BaseModel):
    text: str

class MemberRoleUpdate(BaseModel):
    role: str

# ── ① AUTH ROUTES ─────────────────────────────────────────────────────────
@api_router.post("/auth/register")
async def register(req: RegisterRequest):
    if await db.users.find_one({"email": req.email.lower()}):
        raise HTTPException(400, "Email already registered")
    user = {
        "id": gen_id(),
        "email": req.email.lower(),
        "password_hash": hash_password(req.password),
        "name": req.name,
        "avatar_color": random.choice(AVATAR_COLORS),
        "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    token = create_token({"sub": user["id"]})
    return {"token": token, "user": {k: v for k, v in user.items() if k != "password_hash" and k != "_id"}}

@api_router.post("/auth/login")
async def login(req: LoginRequest):
    user = await db.users.find_one({"email": req.email.lower()}, {"_id": 0})
    if not user or not verify_password(req.password, user.get("password_hash", "")):
        raise HTTPException(401, "Invalid credentials")
    token = create_token({"sub": user["id"]})
    safe_user = {k: v for k, v in user.items() if k != "password_hash"}
    return {"token": token, "user": safe_user}

@api_router.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return {k: v for k, v in user.items() if k != "password_hash"}

# ── ② ORG ROUTES ─────────────────────────────────────────────────────────
@api_router.get("/orgs")
async def list_orgs(user=Depends(get_current_user)):
    memberships = await db.org_members.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    org_ids = [m["org_id"] for m in memberships]
    orgs = await db.orgs.find({"id": {"$in": org_ids}}, {"_id": 0}).to_list(100)
    result = []
    for org in orgs:
        m = next((x for x in memberships if x["org_id"] == org["id"]), {})
        org["my_role"] = m.get("role", "member")
        result.append(serialize_doc(org))
    return result

@api_router.post("/orgs")
async def create_org(req: OrgCreate, user=Depends(get_current_user)):
    org = {
        "id": gen_id(),
        "name": req.name,
        "description": req.description,
        "owner_id": user["id"],
        "invite_code": gen_invite_code(),
        "created_at": now_iso(),
    }
    await db.orgs.insert_one(org)
    member = {
        "id": gen_id(), "org_id": org["id"],
        "user_id": user["id"], "role": "owner",
        "brought_agent_id": None, "joined_at": now_iso()
    }
    await db.org_members.insert_one(member)
    # add user to org chart
    await db.chart_nodes.insert_one({
        "id": gen_id(), "org_id": org["id"],
        "node_ref_id": user["id"], "node_type": "user",
        "manager_id": None, "is_board_member": True,
        "position": {"x": 400, "y": 100}, "created_at": now_iso()
    })
    return serialize_doc(org)

@api_router.get("/orgs/{org_id}")
async def get_org(org_id: str, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    org = await db.orgs.find_one({"id": org_id}, {"_id": 0})
    if not org:
        raise HTTPException(404, "Org not found")
    return serialize_doc(org)

@api_router.get("/orgs/{org_id}/members")
async def list_members(org_id: str, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    members = await db.org_members.find({"org_id": org_id}, {"_id": 0}).to_list(100)
    result = []
    for m in members:
        u = await db.users.find_one({"id": m["user_id"]}, {"_id": 0, "password_hash": 0})
        if u:
            m["user"] = serialize_doc(u)
        result.append(serialize_doc(m))
    return result

@api_router.post("/orgs/{org_id}/invite")
async def refresh_invite(org_id: str, user=Depends(get_current_user)):
    await _assert_role(org_id, user["id"], ["owner"])
    code = gen_invite_code()
    await db.orgs.update_one({"id": org_id}, {"$set": {"invite_code": code}})
    return {"invite_code": code}

@api_router.post("/orgs/join")
async def join_org(req: JoinOrgRequest, user=Depends(get_current_user)):
    org = await db.orgs.find_one({"invite_code": req.invite_code}, {"_id": 0})
    if not org:
        raise HTTPException(404, "Invalid invite code")
    existing = await db.org_members.find_one({"org_id": org["id"], "user_id": user["id"]})
    if existing:
        raise HTTPException(400, "Already a member")
    # validate agent belongs to user
    agent = await db.agents.find_one({"id": req.agent_id, "created_by": user["id"]}, {"_id": 0})
    if not agent:
        raise HTTPException(400, "You must bring one of your own agents")
    member = {
        "id": gen_id(), "org_id": org["id"],
        "user_id": user["id"], "role": "member",
        "brought_agent_id": req.agent_id, "joined_at": now_iso()
    }
    await db.org_members.insert_one(member)
    # move agent to this org
    await db.agents.update_one({"id": req.agent_id}, {"$set": {"org_id": org["id"]}})
    # add user to org chart
    all_nodes = await db.chart_nodes.find({"org_id": org["id"]}).to_list(100)
    ypos = 100 + (len(all_nodes) // 3) * 160
    xpos = 100 + (len(all_nodes) % 3) * 250
    await db.chart_nodes.insert_one({
        "id": gen_id(), "org_id": org["id"],
        "node_ref_id": user["id"], "node_type": "user",
        "manager_id": None, "is_board_member": False,
        "position": {"x": xpos, "y": ypos}, "created_at": now_iso()
    })
    return serialize_doc(org)

@api_router.put("/orgs/{org_id}/members/{member_id}/role")
async def update_member_role(org_id: str, member_id: str, req: MemberRoleUpdate, user=Depends(get_current_user)):
    await _assert_role(org_id, user["id"], ["owner"])
    await db.org_members.update_one({"id": member_id, "org_id": org_id}, {"$set": {"role": req.role}})
    return {"ok": True}

# ── ③ ORG CHART ──────────────────────────────────────────────────────────
@api_router.get("/orgs/{org_id}/chart")
async def get_chart(org_id: str, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    nodes_raw = await db.chart_nodes.find({"org_id": org_id}, {"_id": 0}).to_list(200)
    nodes = []
    for n in nodes_raw:
        # enrich with user/agent data
        if n["node_type"] == "user":
            ref = await db.users.find_one({"id": n["node_ref_id"]}, {"_id": 0, "password_hash": 0})
        else:
            ref = await db.agents.find_one({"id": n["node_ref_id"]}, {"_id": 0})
        n["ref_data"] = serialize_doc(ref) if ref else {}
        nodes.append(serialize_doc(n))
    return nodes

@api_router.put("/orgs/{org_id}/chart/nodes/{node_id}")
async def update_chart_node(org_id: str, node_id: str, data: dict, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    update = {}
    if "manager_id" in data:
        update["manager_id"] = data["manager_id"]
    if "position" in data:
        update["position"] = data["position"]
    if "is_board_member" in data:
        update["is_board_member"] = data["is_board_member"]
    if update:
        await db.chart_nodes.update_one({"id": node_id, "org_id": org_id}, {"$set": update})
    await ws_manager.broadcast(org_id, {"event": "chart_updated", "data": {"node_id": node_id}})
    return {"ok": True}

# ── ④ AGENTS ─────────────────────────────────────────────────────────────
@api_router.get("/orgs/{org_id}/agents")
async def list_agents(org_id: str, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    agents = await db.agents.find({"org_id": org_id}, {"_id": 0}).to_list(100)
    return [serialize_doc(a) for a in agents]

@api_router.post("/orgs/{org_id}/agents")
async def create_agent(org_id: str, req: AgentCreate, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    agent = {
        "id": gen_id(), "org_id": org_id,
        "name": req.name, "role": req.role,
        "system_prompt": req.system_prompt,
        "skills": req.skills, "tools": req.tools,
        "model": req.model, "api_key": None,
        "status": "idle", "manager_id": None,
        "is_board_member": False,
        "created_by": user["id"],
        "position": {"x": 300, "y": 300},
        "avatar_color": random.choice(AVATAR_COLORS),
        "created_at": now_iso()
    }
    await db.agents.insert_one(agent)
    # add to org chart
    all_nodes = await db.chart_nodes.find({"org_id": org_id}).to_list(200)
    ypos = 100 + ((len(all_nodes) // 3) + 1) * 160
    xpos = 100 + (len(all_nodes) % 3) * 250
    chart_node = {
        "id": gen_id(), "org_id": org_id,
        "node_ref_id": agent["id"], "node_type": "agent",
        "manager_id": None, "is_board_member": False,
        "position": {"x": xpos, "y": ypos}, "created_at": now_iso()
    }
    await db.chart_nodes.insert_one(chart_node)
    result = serialize_doc(agent)
    await ws_manager.broadcast(org_id, {"event": "agent_created", "data": result})
    return result

@api_router.get("/agents/{agent_id}")
async def get_agent(agent_id: str, user=Depends(get_current_user)):
    agent = await db.agents.find_one({"id": agent_id}, {"_id": 0})
    if not agent:
        raise HTTPException(404, "Agent not found")
    await _assert_member(agent["org_id"], user["id"])
    return serialize_doc(agent)

@api_router.put("/agents/{agent_id}")
async def update_agent(agent_id: str, req: AgentUpdate, user=Depends(get_current_user)):
    agent = await db.agents.find_one({"id": agent_id}, {"_id": 0})
    if not agent:
        raise HTTPException(404, "Agent not found")
    await _assert_member(agent["org_id"], user["id"])
    update = {k: v for k, v in req.model_dump().items() if v is not None}
    if update:
        await db.agents.update_one({"id": agent_id}, {"$set": update})
    updated = await db.agents.find_one({"id": agent_id}, {"_id": 0})
    result = serialize_doc(updated)
    await ws_manager.broadcast(agent["org_id"], {"event": "agent_updated", "data": result})
    return result

@api_router.delete("/agents/{agent_id}")
async def delete_agent(agent_id: str, user=Depends(get_current_user)):
    agent = await db.agents.find_one({"id": agent_id}, {"_id": 0})
    if not agent:
        raise HTTPException(404)
    await _assert_member(agent["org_id"], user["id"])
    await db.agents.delete_one({"id": agent_id})
    await db.chart_nodes.delete_one({"node_ref_id": agent_id, "org_id": agent["org_id"]})
    await ws_manager.broadcast(agent["org_id"], {"event": "agent_deleted", "data": {"agent_id": agent_id}})
    return {"ok": True}

# ── ⑤ SKILLS CATALOG ─────────────────────────────────────────────────────
@api_router.get("/skills")
async def list_skills():
    skills = await db.skills.find({}, {"_id": 0}).to_list(100)
    return [serialize_doc(s) for s in skills]

# ── ⑥ BOARD / PROPOSALS ──────────────────────────────────────────────────
@api_router.get("/orgs/{org_id}/proposals")
async def list_proposals(org_id: str, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    proposals = await db.proposals.find({"org_id": org_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    result = []
    for p in proposals:
        p = serialize_doc(p)
        p["votes"] = await _get_proposal_votes(p["id"])
        p["comment_count"] = await db.comments.count_documents({"proposal_id": p["id"]})
        result.append(p)
    return result

@api_router.post("/orgs/{org_id}/proposals")
async def create_proposal(org_id: str, req: ProposalCreate, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    proposal = {
        "id": gen_id(), "org_id": org_id,
        "title": req.title, "description": req.description,
        "author_id": user["id"], "author_type": "user",
        "author_name": user["name"],
        "status": "open",
        "workflow_id": req.workflow_id,
        "voting_type": req.voting_type,
        "created_at": now_iso()
    }
    await db.proposals.insert_one(proposal)
    result = serialize_doc(proposal)
    result["votes"] = []
    result["comment_count"] = 0
    await ws_manager.broadcast(org_id, {"event": "proposal_created", "data": result})
    return result

@api_router.get("/proposals/{proposal_id}")
async def get_proposal(proposal_id: str, user=Depends(get_current_user)):
    p = await db.proposals.find_one({"id": proposal_id}, {"_id": 0})
    if not p:
        raise HTTPException(404)
    await _assert_member(p["org_id"], user["id"])
    p = serialize_doc(p)
    p["votes"] = await _get_proposal_votes(proposal_id)
    comments = await db.comments.find({"proposal_id": proposal_id}, {"_id": 0}).sort("created_at", 1).to_list(200)
    p["comments"] = [serialize_doc(c) for c in comments]
    return p

@api_router.post("/proposals/{proposal_id}/vote")
async def cast_vote(proposal_id: str, req: VoteRequest, user=Depends(get_current_user)):
    proposal = await db.proposals.find_one({"id": proposal_id}, {"_id": 0})
    if not proposal:
        raise HTTPException(404)
    if proposal["status"] != "open":
        raise HTTPException(400, "Proposal is not open for voting")
    await _assert_member(proposal["org_id"], user["id"])
    # check if already voted
    existing = await db.votes.find_one({"proposal_id": proposal_id, "voter_id": user["id"]})
    if existing:
        # update vote
        await db.votes.update_one({"proposal_id": proposal_id, "voter_id": user["id"]},
                                   {"$set": {"value": req.value, "updated_at": now_iso()}})
    else:
        # check if board member for weight
        mem = await db.org_members.find_one({"org_id": proposal["org_id"], "user_id": user["id"]})
        weight = 2.0 if mem and mem.get("role") == "board" else 1.0
        vote = {
            "id": gen_id(), "proposal_id": proposal_id,
            "voter_id": user["id"], "voter_name": user["name"],
            "voter_type": "user", "value": req.value,
            "weight": weight, "created_at": now_iso()
        }
        await db.votes.insert_one(vote)
    # check if vote threshold met
    await _check_proposal_outcome(proposal, user)
    votes = await _get_proposal_votes(proposal_id)
    updated_proposal = await db.proposals.find_one({"id": proposal_id}, {"_id": 0})
    await ws_manager.broadcast(proposal["org_id"], {
        "event": "vote_cast",
        "data": {"proposal_id": proposal_id, "voter": user["name"],
                 "value": req.value, "votes": votes,
                 "status": updated_proposal.get("status")}
    })
    return {"ok": True, "votes": votes}

@api_router.post("/proposals/{proposal_id}/comments")
async def add_comment(proposal_id: str, req: CommentCreate, user=Depends(get_current_user)):
    proposal = await db.proposals.find_one({"id": proposal_id}, {"_id": 0})
    if not proposal:
        raise HTTPException(404)
    await _assert_member(proposal["org_id"], user["id"])
    comment = {
        "id": gen_id(), "proposal_id": proposal_id,
        "author_id": user["id"], "author_name": user["name"],
        "author_type": "user", "text": req.text,
        "created_at": now_iso()
    }
    await db.comments.insert_one(comment)
    result = serialize_doc(comment)
    await ws_manager.broadcast(proposal["org_id"], {"event": "comment_added", "data": result})
    return result

# ── ⑦ WORKFLOWS ──────────────────────────────────────────────────────────
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
    await _assert_member(org_id, user["id"])
    # default starter nodes
    default_nodes = req.nodes or [
        {"id": "trigger-1", "type": "trigger", "position": {"x": 250, "y": 80},
         "data": {"label": "Manual Trigger", "trigger_type": "manual", "status": "idle"}},
        {"id": "step-1", "type": "step", "position": {"x": 250, "y": 220},
         "data": {"label": "Step 1", "action": "analyze", "agent": None, "status": "idle"}},
        {"id": "output-1", "type": "output", "position": {"x": 250, "y": 360},
         "data": {"label": "Output", "status": "idle"}}
    ]
    default_edges = req.edges or [
        {"id": "e-t1-s1", "source": "trigger-1", "target": "step-1"},
        {"id": "e-s1-o1", "source": "step-1", "target": "output-1"}
    ]
    workflow = {
        "id": gen_id(), "org_id": org_id,
        "name": req.name, "description": req.description,
        "trigger_type": req.trigger_type,
        "nodes": default_nodes,
        "edges": default_edges,
        "status": "active",
        "created_by": user["id"],
        "created_at": now_iso()
    }
    await db.workflows.insert_one(workflow)
    return serialize_doc(workflow)

@api_router.get("/workflows/{workflow_id}")
async def get_workflow(workflow_id: str, user=Depends(get_current_user)):
    w = await db.workflows.find_one({"id": workflow_id}, {"_id": 0})
    if not w:
        raise HTTPException(404)
    await _assert_member(w["org_id"], user["id"])
    return serialize_doc(w)

@api_router.put("/workflows/{workflow_id}")
async def update_workflow(workflow_id: str, req: WorkflowUpdate, user=Depends(get_current_user)):
    w = await db.workflows.find_one({"id": workflow_id}, {"_id": 0})
    if not w:
        raise HTTPException(404)
    await _assert_member(w["org_id"], user["id"])
    update = {k: v for k, v in req.model_dump().items() if v is not None}
    if update:
        await db.workflows.update_one({"id": workflow_id}, {"$set": update})
    updated = await db.workflows.find_one({"id": workflow_id}, {"_id": 0})
    return serialize_doc(updated)

@api_router.delete("/workflows/{workflow_id}")
async def delete_workflow(workflow_id: str, user=Depends(get_current_user)):
    w = await db.workflows.find_one({"id": workflow_id}, {"_id": 0})
    if not w:
        raise HTTPException(404)
    await _assert_role(w["org_id"], user["id"], ["owner", "member"])
    await db.workflows.delete_one({"id": workflow_id})
    return {"ok": True}

@api_router.post("/workflows/{workflow_id}/run")
async def run_workflow(workflow_id: str, user=Depends(get_current_user)):
    w = await db.workflows.find_one({"id": workflow_id}, {"_id": 0})
    if not w:
        raise HTTPException(404)
    await _assert_member(w["org_id"], user["id"])
    run = {
        "id": gen_id(), "workflow_id": workflow_id, "org_id": w["org_id"],
        "triggered_by": user["id"], "trigger_type": "manual",
        "status": "running",
        "step_states": {},
        "started_at": now_iso(), "completed_at": None
    }
    await db.workflow_runs.insert_one(run)
    asyncio.create_task(_execute_workflow(w, run))
    return serialize_doc(run)

@api_router.get("/workflow-runs/{run_id}")
async def get_run(run_id: str, user=Depends(get_current_user)):
    run = await db.workflow_runs.find_one({"id": run_id}, {"_id": 0})
    if not run:
        raise HTTPException(404)
    await _assert_member(run["org_id"], user["id"])
    return serialize_doc(run)

@api_router.get("/orgs/{org_id}/workflow-runs")
async def list_runs(org_id: str, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    runs = await db.workflow_runs.find({"org_id": org_id}, {"_id": 0}).sort("started_at", -1).to_list(50)
    return [serialize_doc(r) for r in runs]

# ── ⑧ MESSAGING ──────────────────────────────────────────────────────────
@api_router.get("/orgs/{org_id}/threads")
async def list_threads(org_id: str, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    threads = await db.threads.find(
        {"org_id": org_id, "participants.id": user["id"]},
        {"_id": 0}
    ).sort("last_message_at", -1).to_list(100)
    result = []
    for t in threads:
        t = serialize_doc(t)
        last_msg = await db.messages.find_one(
            {"thread_id": t["id"]}, {"_id": 0},
            sort=[("created_at", -1)]
        )
        t["last_message"] = serialize_doc(last_msg) if last_msg else None
        t["unread"] = 0  # simplified
        result.append(t)
    return result

@api_router.post("/orgs/{org_id}/threads")
async def create_thread(org_id: str, req: ThreadCreate, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    # ensure user is in participants
    participants = req.participants
    if not any(p.get("id") == user["id"] for p in participants):
        participants.append({"id": user["id"], "type": "user", "name": user["name"]})
    thread = {
        "id": gen_id(), "org_id": org_id,
        "title": req.title, "participants": participants,
        "created_at": now_iso(), "last_message_at": now_iso()
    }
    await db.threads.insert_one(thread)
    result = serialize_doc(thread)
    result["last_message"] = None
    return result

@api_router.get("/threads/{thread_id}/messages")
async def list_messages(thread_id: str, user=Depends(get_current_user)):
    thread = await db.threads.find_one({"id": thread_id}, {"_id": 0})
    if not thread:
        raise HTTPException(404)
    await _assert_member(thread["org_id"], user["id"])
    msgs = await db.messages.find({"thread_id": thread_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return [serialize_doc(m) for m in msgs]

@api_router.post("/threads/{thread_id}/messages")
async def send_message(thread_id: str, req: MessageCreate, user=Depends(get_current_user)):
    thread = await db.threads.find_one({"id": thread_id}, {"_id": 0})
    if not thread:
        raise HTTPException(404)
    await _assert_member(thread["org_id"], user["id"])
    msg = {
        "id": gen_id(), "thread_id": thread_id,
        "sender_id": user["id"], "sender_name": user["name"],
        "sender_type": "user", "text": req.text,
        "created_at": now_iso()
    }
    await db.messages.insert_one(msg)
    await db.threads.update_one({"id": thread_id}, {"$set": {"last_message_at": now_iso()}})
    result = serialize_doc(msg)
    await ws_manager.broadcast(thread["org_id"], {"event": "message_created", "data": result})
    return result

# ── ⑨ DASHBOARD / ACTIVITY ───────────────────────────────────────────────
@api_router.get("/orgs/{org_id}/activity")
async def get_activity(org_id: str, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    # recent proposals
    proposals = await db.proposals.find({"org_id": org_id}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    # recent messages
    msgs = await db.messages.find(
        {"thread_id": {"$in": [t["id"] async for t in db.threads.find({"org_id": org_id}, {"id": 1, "_id": 0})]}},
        {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)
    # recent runs
    runs = await db.workflow_runs.find({"org_id": org_id}, {"_id": 0}).sort("started_at", -1).limit(5).to_list(5)
    activities = []
    for p in proposals:
        activities.append({"type": "proposal", "title": f"Proposal: {p['title']}", "time": p.get("created_at"), "status": p.get("status")})
    for m in msgs:
        activities.append({"type": "message", "title": f"{m.get('sender_name','?')}: {m['text'][:50]}", "time": m.get("created_at")})
    for r in runs:
        activities.append({"type": "workflow_run", "title": f"Workflow run {r['status']}", "time": r.get("started_at"), "status": r.get("status")})
    activities.sort(key=lambda x: x.get("time") or "", reverse=True)
    return activities[:15]

@api_router.get("/orgs/{org_id}/stats")
async def get_stats(org_id: str, user=Depends(get_current_user)):
    await _assert_member(org_id, user["id"])
    return {
        "members": await db.org_members.count_documents({"org_id": org_id}),
        "agents": await db.agents.count_documents({"org_id": org_id}),
        "open_proposals": await db.proposals.count_documents({"org_id": org_id, "status": "open"}),
        "workflows": await db.workflows.count_documents({"org_id": org_id}),
        "active_runs": await db.workflow_runs.count_documents({"org_id": org_id, "status": "running"}),
        "total_messages": await db.messages.count_documents(
            {"thread_id": {"$in": [t["id"] async for t in db.threads.find({"org_id": org_id}, {"id": 1, "_id": 0})]}}
        ),
    }

# ── WebSocket ─────────────────────────────────────────────────────────────
@app.websocket("/ws/org/{org_id}")
async def ws_endpoint(ws: WebSocket, org_id: str, token: str = None):
    # validate token
    user_id = None
    if token:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("sub")
        except Exception:
            pass
    client_id = user_id or str(uuid.uuid4())[:8]
    await ws_manager.connect(org_id, ws, client_id)
    await ws.send_text(json.dumps({"event": "connected", "data": {"client_id": client_id, "org_id": org_id}}))
    try:
        while True:
            raw = await ws.receive_text()
            try:
                data = json.loads(raw)
                if data.get("type") == "ping":
                    await ws.send_text(json.dumps({"event": "pong"}))
            except Exception:
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect(org_id, ws)

# ── Internal Helpers ──────────────────────────────────────────────────────
async def _assert_member(org_id: str, user_id: str):
    m = await db.org_members.find_one({"org_id": org_id, "user_id": user_id})
    if not m:
        raise HTTPException(403, "Not a member of this org")

async def _assert_role(org_id: str, user_id: str, roles: list):
    m = await db.org_members.find_one({"org_id": org_id, "user_id": user_id})
    if not m or m.get("role") not in roles:
        raise HTTPException(403, "Insufficient permissions")

async def _get_proposal_votes(proposal_id: str) -> list:
    votes = await db.votes.find({"proposal_id": proposal_id}, {"_id": 0}).to_list(200)
    return [serialize_doc(v) for v in votes]

async def _check_proposal_outcome(proposal: dict, user: dict):
    org_id = proposal["org_id"]
    member_count = await db.org_members.count_documents({"org_id": org_id})
    votes = await db.votes.find({"proposal_id": proposal["id"]}, {"_id": 0}).to_list(200)
    approve_weight = sum(v.get("weight", 1) for v in votes if v["value"] == "approve")
    reject_weight  = sum(v.get("weight", 1) for v in votes if v["value"] == "reject")
    total_weight   = approve_weight + reject_weight
    # Simple majority check (>50% of members voted + majority approve)
    if len(votes) >= max(1, member_count // 2):
        if approve_weight > reject_weight:
            await db.proposals.update_one({"id": proposal["id"]}, {"$set": {"status": "approved"}})
            await ws_manager.broadcast(org_id, {
                "event": "proposal_approved",
                "data": {"proposal_id": proposal["id"], "title": proposal["title"]}
            })
            # trigger linked workflow if any
            if proposal.get("workflow_id"):
                w = await db.workflows.find_one({"id": proposal["workflow_id"]}, {"_id": 0})
                if w:
                    run = {
                        "id": gen_id(), "workflow_id": w["id"], "org_id": org_id,
                        "triggered_by": proposal["id"], "trigger_type": "vote_passed",
                        "status": "running", "step_states": {},
                        "started_at": now_iso(), "completed_at": None
                    }
                    await db.workflow_runs.insert_one(run)
                    asyncio.create_task(_execute_workflow(w, run))
        elif reject_weight > approve_weight:
            await db.proposals.update_one({"id": proposal["id"]}, {"$set": {"status": "rejected"}})
            await ws_manager.broadcast(org_id, {
                "event": "proposal_rejected",
                "data": {"proposal_id": proposal["id"]}
            })

async def _execute_workflow(workflow: dict, run: dict):
    org_id = run["org_id"]
    run_id = run["id"]
    nodes  = workflow.get("nodes", [])
    edges  = workflow.get("edges", [])
    await ws_manager.broadcast(org_id, {
        "event": "workflow_run_started",
        "data": {"run_id": run_id, "workflow_name": workflow["name"]}
    })
    # topological sort
    order = _topo_sort(nodes, edges)
    for node_id in order:
        node = next((n for n in nodes if n["id"] == node_id), None)
        if not node:
            continue
        node_type = node.get("type", "step")
        await db.workflow_runs.update_one(
            {"id": run_id},
            {"$set": {f"step_states.{node_id}": {"status": "running", "started_at": now_iso()}}}
        )
        await ws_manager.broadcast(org_id, {
            "event": "step_state_changed",
            "data": {"run_id": run_id, "node_id": node_id, "status": "running"}
        })
        # simulate execution time
        await asyncio.sleep(random.uniform(0.8, 2.0))
        await db.workflow_runs.update_one(
            {"id": run_id},
            {"$set": {f"step_states.{node_id}": {"status": "completed", "completed_at": now_iso()}}}
        )
        await ws_manager.broadcast(org_id, {
            "event": "step_state_changed",
            "data": {"run_id": run_id, "node_id": node_id, "status": "completed"}
        })
    # mark run complete
    await db.workflow_runs.update_one(
        {"id": run_id},
        {"$set": {"status": "completed", "completed_at": now_iso()}}
    )
    await ws_manager.broadcast(org_id, {
        "event": "workflow_run_completed",
        "data": {"run_id": run_id}
    })

def _topo_sort(nodes: list, edges: list) -> list:
    """Simple topological sort for workflow execution order."""
    adjacency: dict[str, list] = {n["id"]: [] for n in nodes}
    in_degree: dict[str, int]  = {n["id"]: 0 for n in nodes}
    for e in edges:
        src, tgt = e.get("source"), e.get("target")
        if src in adjacency and tgt in adjacency:
            adjacency[src].append(tgt)
            in_degree[tgt] = in_degree.get(tgt, 0) + 1
    queue = [nid for nid, deg in in_degree.items() if deg == 0]
    order = []
    while queue:
        nid = queue.pop(0)
        order.append(nid)
        for nxt in adjacency.get(nid, []):
            in_degree[nxt] -= 1
            if in_degree[nxt] == 0:
                queue.append(nxt)
    return order

# ── App lifecycle ─────────────────────────────────────────────────────────
SKILLS_SEED = [
    {"id": "skill-coding",   "name": "Coding",        "description": "Write, review, and debug code", "category": "technical", "icon": "code"},
    {"id": "skill-research", "name": "Research",      "description": "Deep research and fact-finding", "category": "knowledge", "icon": "search"},
    {"id": "skill-analysis", "name": "Analysis",      "description": "Analyze data and generate insights", "category": "knowledge", "icon": "bar-chart"},
    {"id": "skill-api",      "name": "API Execution", "description": "Call and integrate external APIs", "category": "technical", "icon": "zap"},
    {"id": "skill-writing",  "name": "Writing",       "description": "Draft documents, proposals, and reports", "category": "creative", "icon": "file-text"},
    {"id": "skill-decision", "name": "Decision",      "description": "Strategic decision-making and planning", "category": "strategic", "icon": "target"},
]

@app.on_event("startup")
async def startup():
    for skill in SKILLS_SEED:
        await db.skills.update_one({"id": skill["id"]}, {"$setOnInsert": skill}, upsert=True)
    # create indexes
    await db.users.create_index("email", unique=True)
    await db.org_members.create_index([("org_id", 1), ("user_id", 1)])
    await db.chart_nodes.create_index([("org_id", 1)])
    await db.proposals.create_index([("org_id", 1)])
    await db.workflow_runs.create_index([("org_id", 1)])
    await db.messages.create_index([("thread_id", 1)])
    logger.info("OpenClaw backend started")

@app.on_event("shutdown")
async def shutdown():
    client.close()

app.include_router(api_router)
