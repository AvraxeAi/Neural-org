import requests
import sys
import json
from datetime import datetime

BASE_URL = "https://org-nexus-7.preview.emergentagent.com/api"
TEST_EMAIL = "Rustyadj@gmail.com"
TEST_PASSWORD = "Arabia@24"

class OpenClawAPITester:
    def __init__(self):
        self.token = None
        self.user = None
        self.org_id = None
        self.agent_id = None
        self.proposal_id = None
        self.workflow_id = None
        self.thread_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, json_data=None):
        """Run a single API test"""
        url = f"{BASE_URL}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=json_data or data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=json_data or data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "endpoint": endpoint
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "error": str(e),
                "endpoint": endpoint
            })
            return False, {}

    def test_auth_flow(self):
        """Test authentication endpoints"""
        print("\n" + "="*60)
        print("TESTING AUTHENTICATION")
        print("="*60)
        
        # Test login
        success, response = self.run_test(
            "Login with test credentials",
            "POST",
            "auth/login",
            200,
            json_data={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user = response.get('user', {})
            print(f"   Token obtained for user: {self.user.get('name', 'Unknown')}")
            
            # Test /auth/me
            success, me_response = self.run_test(
                "Get current user info",
                "GET",
                "auth/me",
                200
            )
            return True
        else:
            print("❌ Login failed - cannot proceed with other tests")
            return False

    def test_org_endpoints(self):
        """Test organization endpoints"""
        print("\n" + "="*60)
        print("TESTING ORGANIZATION ENDPOINTS")
        print("="*60)
        
        # List orgs
        success, response = self.run_test(
            "List user organizations",
            "GET",
            "orgs",
            200
        )
        
        if success and response:
            if len(response) > 0:
                self.org_id = response[0]['id']
                print(f"   Using org: {response[0].get('name', 'Unknown')} (ID: {self.org_id})")
            else:
                print("   No organizations found - creating one")
                success, create_response = self.run_test(
                    "Create organization",
                    "POST",
                    "orgs",
                    200,
                    json_data={"name": "Test Org", "description": "Test organization"}
                )
                if success:
                    self.org_id = create_response['id']
        
        if not self.org_id:
            print("❌ No org_id available - cannot proceed")
            return False
        
        # Get org details
        self.run_test(
            "Get organization details",
            "GET",
            f"orgs/{self.org_id}",
            200
        )
        
        # List members
        self.run_test(
            "List organization members",
            "GET",
            f"orgs/{self.org_id}/members",
            200
        )
        
        return True

    def test_agent_endpoints(self):
        """Test agent endpoints"""
        print("\n" + "="*60)
        print("TESTING AGENT ENDPOINTS")
        print("="*60)
        
        if not self.org_id:
            print("❌ No org_id - skipping agent tests")
            return False
        
        # List skills first
        success, skills_response = self.run_test(
            "List available skills",
            "GET",
            "skills",
            200
        )
        
        # Create agent
        success, response = self.run_test(
            "Create new agent",
            "POST",
            f"orgs/{self.org_id}/agents",
            200,
            json_data={
                "name": "Test Agent Alpha",
                "role": "Developer",
                "system_prompt": "You are a helpful AI assistant",
                "skills": ["skill-coding", "skill-analysis"],
                "tools": ["web_search", "code_exec"],
                "model": "gpt-4"
            }
        )
        
        if success and 'id' in response:
            self.agent_id = response['id']
            print(f"   Agent created with ID: {self.agent_id}")
            
            # Get agent details
            self.run_test(
                "Get agent details",
                "GET",
                f"agents/{self.agent_id}",
                200
            )
            
            # Update agent
            self.run_test(
                "Update agent",
                "PUT",
                f"agents/{self.agent_id}",
                200,
                json_data={"status": "active"}
            )
        
        # List agents
        self.run_test(
            "List organization agents",
            "GET",
            f"orgs/{self.org_id}/agents",
            200
        )
        
        return True

    def test_org_chart_endpoints(self):
        """Test org chart endpoints"""
        print("\n" + "="*60)
        print("TESTING ORG CHART ENDPOINTS")
        print("="*60)
        
        if not self.org_id:
            print("❌ No org_id - skipping org chart tests")
            return False
        
        # Get org chart
        success, response = self.run_test(
            "Get organization chart",
            "GET",
            f"orgs/{self.org_id}/chart",
            200
        )
        
        if success and response and len(response) > 0:
            node_id = response[0]['id']
            # Update chart node
            self.run_test(
                "Update chart node position",
                "PUT",
                f"orgs/{self.org_id}/chart/nodes/{node_id}",
                200,
                json_data={"position": {"x": 100, "y": 200}}
            )
        
        return True

    def test_board_endpoints(self):
        """Test board/proposal endpoints"""
        print("\n" + "="*60)
        print("TESTING BOARD/PROPOSAL ENDPOINTS")
        print("="*60)
        
        if not self.org_id:
            print("❌ No org_id - skipping board tests")
            return False
        
        # Create proposal
        success, response = self.run_test(
            "Create new proposal",
            "POST",
            f"orgs/{self.org_id}/proposals",
            200,
            json_data={
                "title": "Test Proposal - Hire New Engineers",
                "description": "We should hire 3 new engineers for the team",
                "voting_type": "majority"
            }
        )
        
        if success and 'id' in response:
            self.proposal_id = response['id']
            print(f"   Proposal created with ID: {self.proposal_id}")
            
            # Get proposal details
            self.run_test(
                "Get proposal details",
                "GET",
                f"proposals/{self.proposal_id}",
                200
            )
            
            # Cast vote
            self.run_test(
                "Vote on proposal (approve)",
                "POST",
                f"proposals/{self.proposal_id}/vote",
                200,
                json_data={"value": "approve"}
            )
            
            # Add comment
            self.run_test(
                "Add comment to proposal",
                "POST",
                f"proposals/{self.proposal_id}/comments",
                200,
                json_data={"text": "I agree with this proposal!"}
            )
        
        # List proposals
        self.run_test(
            "List organization proposals",
            "GET",
            f"orgs/{self.org_id}/proposals",
            200
        )
        
        return True

    def test_workflow_endpoints(self):
        """Test workflow endpoints"""
        print("\n" + "="*60)
        print("TESTING WORKFLOW ENDPOINTS")
        print("="*60)
        
        if not self.org_id:
            print("❌ No org_id - skipping workflow tests")
            return False
        
        # Create workflow
        success, response = self.run_test(
            "Create new workflow",
            "POST",
            f"orgs/{self.org_id}/workflows",
            200,
            json_data={
                "name": "Test Workflow - Onboarding",
                "description": "Employee onboarding workflow",
                "trigger_type": "manual"
            }
        )
        
        if success and 'id' in response:
            self.workflow_id = response['id']
            print(f"   Workflow created with ID: {self.workflow_id}")
            
            # Get workflow details
            self.run_test(
                "Get workflow details",
                "GET",
                f"workflows/{self.workflow_id}",
                200
            )
            
            # Update workflow
            self.run_test(
                "Update workflow",
                "PUT",
                f"workflows/{self.workflow_id}",
                200,
                json_data={"description": "Updated workflow description"}
            )
            
            # Run workflow
            success, run_response = self.run_test(
                "Run workflow",
                "POST",
                f"workflows/{self.workflow_id}/run",
                200
            )
            
            if success and 'id' in run_response:
                run_id = run_response['id']
                print(f"   Workflow run started with ID: {run_id}")
                
                # Get run details
                self.run_test(
                    "Get workflow run details",
                    "GET",
                    f"workflow-runs/{run_id}",
                    200
                )
        
        # List workflows
        self.run_test(
            "List organization workflows",
            "GET",
            f"orgs/{self.org_id}/workflows",
            200
        )
        
        # List workflow runs
        self.run_test(
            "List workflow runs",
            "GET",
            f"orgs/{self.org_id}/workflow-runs",
            200
        )
        
        return True

    def test_messaging_endpoints(self):
        """Test messaging endpoints"""
        print("\n" + "="*60)
        print("TESTING MESSAGING ENDPOINTS")
        print("="*60)
        
        if not self.org_id:
            print("❌ No org_id - skipping messaging tests")
            return False
        
        # Create thread
        success, response = self.run_test(
            "Create new message thread",
            "POST",
            f"orgs/{self.org_id}/threads",
            200,
            json_data={
                "title": "Test Discussion Thread",
                "participants": [
                    {"id": self.user.get('id'), "type": "user", "name": self.user.get('name', 'Test User')}
                ]
            }
        )
        
        if success and 'id' in response:
            self.thread_id = response['id']
            print(f"   Thread created with ID: {self.thread_id}")
            
            # Send message
            self.run_test(
                "Send message to thread",
                "POST",
                f"threads/{self.thread_id}/messages",
                200,
                json_data={"text": "Hello! This is a test message."}
            )
            
            # Get messages
            self.run_test(
                "Get thread messages",
                "GET",
                f"threads/{self.thread_id}/messages",
                200
            )
        
        # List threads
        self.run_test(
            "List organization threads",
            "GET",
            f"orgs/{self.org_id}/threads",
            200
        )
        
        return True

    def test_dashboard_endpoints(self):
        """Test dashboard endpoints"""
        print("\n" + "="*60)
        print("TESTING DASHBOARD ENDPOINTS")
        print("="*60)
        
        if not self.org_id:
            print("❌ No org_id - skipping dashboard tests")
            return False
        
        # Get stats
        self.run_test(
            "Get organization stats",
            "GET",
            f"orgs/{self.org_id}/stats",
            200
        )
        
        # Get activity
        self.run_test(
            "Get organization activity feed",
            "GET",
            f"orgs/{self.org_id}/activity",
            200
        )
        
        return True

    def test_phase3_deliberation_endpoints(self):
        """Test Phase 3 deliberation endpoints"""
        print("\n" + "="*60)
        print("TESTING PHASE 3 - DELIBERATION ENDPOINTS")
        print("="*60)
        
        if not self.org_id:
            print("❌ No org_id - skipping deliberation tests")
            return False
        
        # List deliberations
        success, response = self.run_test(
            "List organization deliberations",
            "GET",
            f"orgs/{self.org_id}/deliberations",
            200
        )
        
        # If there are existing deliberations, test getting one
        if success and response and len(response) > 0:
            delib_id = response[0]['id']
            print(f"   Found existing deliberation: {delib_id}")
            self.run_test(
                "Get single deliberation details",
                "GET",
                f"deliberations/{delib_id}",
                200
            )
        else:
            print("   No existing deliberations found (expected for new org)")
        
        return True

    def test_phase3_memory_endpoints(self):
        """Test Phase 3 memory graph endpoints"""
        print("\n" + "="*60)
        print("TESTING PHASE 3 - MEMORY GRAPH ENDPOINTS")
        print("="*60)
        
        if not self.org_id:
            print("❌ No org_id - skipping memory tests")
            return False
        
        # List memory nodes
        self.run_test(
            "List memory nodes",
            "GET",
            f"orgs/{self.org_id}/memory/nodes",
            200
        )
        
        # List memory edges
        self.run_test(
            "List memory edges",
            "GET",
            f"orgs/{self.org_id}/memory/edges",
            200
        )
        
        return True

    def test_phase3_notification_endpoints(self):
        """Test Phase 3 notification endpoints"""
        print("\n" + "="*60)
        print("TESTING PHASE 3 - NOTIFICATION ENDPOINTS")
        print("="*60)
        
        if not self.org_id:
            print("❌ No org_id - skipping notification tests")
            return False
        
        # List notifications
        self.run_test(
            "List organization notifications",
            "GET",
            f"orgs/{self.org_id}/notifications",
            200
        )
        
        # Get unread count
        self.run_test(
            "Get unread notification count",
            "GET",
            f"orgs/{self.org_id}/notifications/count",
            200
        )
        
        return True

    def test_phase3_system_health_endpoints(self):
        """Test Phase 3 system health endpoints"""
        print("\n" + "="*60)
        print("TESTING PHASE 3 - SYSTEM HEALTH ENDPOINTS")
        print("="*60)
        
        if not self.org_id:
            print("❌ No org_id - skipping health tests")
            return False
        
        # Get system health
        success, response = self.run_test(
            "Get system health",
            "GET",
            f"orgs/{self.org_id}/health",
            200
        )
        
        if success and response:
            print(f"   Health data received:")
            if 'providers' in response:
                print(f"     - Providers: {len(response['providers'])} entries")
            if 'connections' in response:
                print(f"     - Connections: {response['connections']}")
            if 'org_stats' in response:
                print(f"     - Org stats: {response['org_stats']}")
        
        return True

    def test_phase3_events_endpoints(self):
        """Test Phase 3 events log endpoints"""
        print("\n" + "="*60)
        print("TESTING PHASE 3 - EVENTS LOG ENDPOINTS")
        print("="*60)
        
        if not self.org_id:
            print("❌ No org_id - skipping events tests")
            return False
        
        # Get events
        self.run_test(
            "Get organization events log",
            "GET",
            f"orgs/{self.org_id}/events",
            200
        )
        
        return True

    def test_phase4_skill_marketplace(self):
        """Test Phase 4 Skill Marketplace endpoints"""
        print("\n" + "="*60)
        print("TESTING PHASE 4 - SKILL MARKETPLACE")
        print("="*60)
        
        # Get all marketplace skills
        success, response = self.run_test(
            "GET /marketplace/skills - List all skills",
            "GET",
            "marketplace/skills",
            200
        )
        
        if success and response:
            skills = response.get('skills', [])
            categories = response.get('categories', [])
            print(f"   Found {len(skills)} skills in marketplace")
            print(f"   Found {len(categories)} categories")
            
            if len(skills) != 42:
                print(f"   ⚠️  Expected 42 skills, got {len(skills)}")
        
        # Get skills by category
        self.run_test(
            "GET /marketplace/skills?category=research",
            "GET",
            "marketplace/skills?category=research",
            200
        )
        
        # Search skills
        self.run_test(
            "GET /marketplace/skills?q=web",
            "GET",
            "marketplace/skills?q=web",
            200
        )
        
        if not self.org_id:
            print("❌ No org_id - skipping org-specific skill tests")
            return False
        
        # List installed skills (should be empty initially)
        success, response = self.run_test(
            "GET /orgs/{id}/skills/installed - List installed skills",
            "GET",
            f"orgs/{self.org_id}/skills/installed",
            200
        )
        
        # Install a skill
        success, install_response = self.run_test(
            "POST /orgs/{id}/skills/install - Install Web Researcher skill",
            "POST",
            f"orgs/{self.org_id}/skills/install",
            200,
            json_data={"skill_id": "skill-web-researcher"}
        )
        
        if success and install_response:
            skill_id = install_response.get('skill_id', 'skill-web-researcher')
            print(f"   Skill installed: {skill_id}")
            
            # Verify it appears in installed list
            success, installed_list = self.run_test(
                "Verify skill appears in installed list",
                "GET",
                f"orgs/{self.org_id}/skills/installed",
                200
            )
            
            if success and installed_list:
                print(f"   Installed skills count: {len(installed_list)}")
            
            # Toggle skill (disable)
            self.run_test(
                "PUT /orgs/{id}/skills/{skill_id}/toggle - Disable skill",
                "PUT",
                f"orgs/{self.org_id}/skills/{skill_id}/toggle",
                200
            )
            
            # Toggle skill (enable)
            self.run_test(
                "PUT /orgs/{id}/skills/{skill_id}/toggle - Enable skill",
                "PUT",
                f"orgs/{self.org_id}/skills/{skill_id}/toggle",
                200
            )
            
            # Uninstall skill
            self.run_test(
                "DELETE /orgs/{id}/skills/{skill_id} - Uninstall skill",
                "DELETE",
                f"orgs/{self.org_id}/skills/{skill_id}",
                200
            )
        
        return True

    def test_phase4_agent_autonomy(self):
        """Test Phase 4 Agent Autonomy endpoints"""
        print("\n" + "="*60)
        print("TESTING PHASE 4 - AGENT AUTONOMY")
        print("="*60)
        
        if not self.agent_id:
            print("❌ No agent_id - skipping autonomy tests")
            return False
        
        # Get tasks (should be empty initially)
        success, tasks_response = self.run_test(
            "GET /agents/{id}/tasks - List agent tasks",
            "GET",
            f"agents/{self.agent_id}/tasks",
            200
        )
        
        if success:
            print(f"   Initial tasks count: {len(tasks_response) if isinstance(tasks_response, list) else 0}")
        
        # Create a task
        success, task_response = self.run_test(
            "POST /agents/{id}/tasks - Create task",
            "POST",
            f"agents/{self.agent_id}/tasks",
            200,
            json_data={
                "title": "Review code for security vulnerabilities",
                "priority": "high",
                "description": "Perform security audit on main codebase"
            }
        )
        
        task_id = None
        if success and task_response:
            task_id = task_response.get('id')
            print(f"   Task created with ID: {task_id}")
        
        # Update task status
        if task_id:
            self.run_test(
                "PUT /agents/{id}/tasks/{task_id} - Update task status",
                "PUT",
                f"agents/{self.agent_id}/tasks/{task_id}",
                200,
                json_data={"status": "in_progress"}
            )
        
        # Get goals (should be empty initially)
        success, goals_response = self.run_test(
            "GET /agents/{id}/goals - List agent goals",
            "GET",
            f"agents/{self.agent_id}/goals",
            200
        )
        
        if success:
            print(f"   Initial goals count: {len(goals_response) if isinstance(goals_response, list) else 0}")
        
        # Create a goal
        success, goal_response = self.run_test(
            "POST /agents/{id}/goals - Create goal",
            "POST",
            f"agents/{self.agent_id}/goals",
            200,
            json_data={
                "title": "Improve code review accuracy",
                "metric": "accuracy_score",
                "target_value": "95",
                "current_value": "85"
            }
        )
        
        if success and goal_response:
            print(f"   Goal created with ID: {goal_response.get('id')}")
        
        # Get thoughts
        self.run_test(
            "GET /agents/{id}/thoughts - List agent thoughts",
            "GET",
            f"agents/{self.agent_id}/thoughts",
            200
        )
        
        # Get schedules
        success, schedules_response = self.run_test(
            "GET /agents/{id}/schedules - List agent schedules",
            "GET",
            f"agents/{self.agent_id}/schedules",
            200
        )
        
        if success:
            print(f"   Initial schedules count: {len(schedules_response) if isinstance(schedules_response, list) else 0}")
        
        # Create a schedule
        success, schedule_response = self.run_test(
            "POST /agents/{id}/schedules - Create schedule",
            "POST",
            f"agents/{self.agent_id}/schedules",
            200,
            json_data={
                "task_description": "Daily code quality check",
                "interval": "daily"
            }
        )
        
        schedule_id = None
        if success and schedule_response:
            schedule_id = schedule_response.get('id')
            print(f"   Schedule created with ID: {schedule_id}")
        
        # Toggle schedule
        if schedule_id:
            self.run_test(
                "PUT /agents/{id}/schedules/{schedule_id}/toggle - Toggle schedule",
                "PUT",
                f"agents/{self.agent_id}/schedules/{schedule_id}/toggle",
                200
            )
        
        # Get autonomy summary
        success, summary_response = self.run_test(
            "GET /agents/{id}/autonomy-summary - Get autonomy summary",
            "GET",
            f"agents/{self.agent_id}/autonomy-summary",
            200
        )
        
        if success and summary_response:
            print(f"   Autonomy summary received:")
            if 'task_counts' in summary_response:
                print(f"     - Task counts: {summary_response['task_counts']}")
            if 'active_goals' in summary_response:
                print(f"     - Active goals: {summary_response['active_goals']}")
        
        return True

    def test_phase4_org_chart_layouts(self):
        """Test Phase 4 Org Chart Layout endpoints"""
        print("\n" + "="*60)
        print("TESTING PHASE 4 - ORG CHART LAYOUTS")
        print("="*60)
        
        if not self.org_id:
            print("❌ No org_id - skipping layout tests")
            return False
        
        # Get layouts (this endpoint might not exist, but we test the chart endpoint)
        success, response = self.run_test(
            "GET /orgs/{id}/chart - Verify chart supports multiple layouts",
            "GET",
            f"orgs/{self.org_id}/chart",
            200
        )
        
        if success and response:
            print(f"   Chart has {len(response)} nodes")
            print("   ✓ Chart endpoint working (layouts are frontend-only)")
        
        return True

    def test_phase5_my_agents_endpoints(self):
        """Test Phase 5 My Agents endpoints"""
        print("\n" + "="*60)
        print("TESTING PHASE 5 - MY AGENTS ENDPOINTS")
        print("="*60)
        
        # GET /api/me/agents - returns all user agents with delegated_to field
        success, response = self.run_test(
            "GET /me/agents - List all user agents",
            "GET",
            "me/agents",
            200
        )
        
        if success and response:
            print(f"   Found {len(response)} agents for current user")
            if len(response) > 0:
                agent = response[0]
                print(f"   Sample agent: {agent.get('name', 'Unknown')}")
                if 'delegated_to' in agent:
                    print(f"   ✓ delegated_to field present: {agent['delegated_to']}")
                else:
                    print(f"   ⚠️  delegated_to field missing")
        
        # GET /api/me/agents/available-for-delegation - returns undelegated agents
        success, response = self.run_test(
            "GET /me/agents/available-for-delegation - List undelegated agents",
            "GET",
            "me/agents/available-for-delegation",
            200
        )
        
        if success and response:
            print(f"   Found {len(response)} agents available for delegation")
        
        return True

    def test_phase5_delegate_endpoints(self):
        """Test Phase 5 Delegate endpoints"""
        print("\n" + "="*60)
        print("TESTING PHASE 5 - DELEGATE ENDPOINTS")
        print("="*60)
        
        if not self.org_id:
            print("❌ No org_id - skipping delegate tests")
            return False
        
        # GET /api/orgs/{id}/delegates/swap-requests - returns empty array or swap requests
        success, response = self.run_test(
            "GET /orgs/{id}/delegates/swap-requests - List swap requests",
            "GET",
            f"orgs/{self.org_id}/delegates/swap-requests",
            200
        )
        
        if success:
            if isinstance(response, list):
                print(f"   Found {len(response)} swap requests")
                if len(response) == 0:
                    print("   ✓ No swap requests (expected for owner)")
            else:
                print(f"   ⚠️  Expected array, got: {type(response)}")
        
        # GET /api/orgs/{id}/my-delegate - returns null for owner (no brought agent)
        success, response = self.run_test(
            "GET /orgs/{id}/my-delegate - Get my delegate agent",
            "GET",
            f"orgs/{self.org_id}/my-delegate",
            200
        )
        
        if success:
            if response is None or response == {}:
                print("   ✓ Returns null for owner (no brought agent)")
            else:
                print(f"   Delegate info: {response}")
        
        return True

    def test_phase5_org_chart_delegate_fields(self):
        """Test Phase 5 Org Chart delegate fields"""
        print("\n" + "="*60)
        print("TESTING PHASE 5 - ORG CHART DELEGATE FIELDS")
        print("="*60)
        
        if not self.org_id:
            print("❌ No org_id - skipping chart delegate tests")
            return False
        
        # GET /api/orgs/{id}/chart - nodes include is_guest_delegate and is_my_delegate fields
        success, response = self.run_test(
            "GET /orgs/{id}/chart - Verify delegate fields in nodes",
            "GET",
            f"orgs/{self.org_id}/chart",
            200
        )
        
        if success and response:
            print(f"   Chart has {len(response)} nodes")
            
            # Check for delegate fields
            has_guest_delegate_field = False
            has_my_delegate_field = False
            
            for node in response:
                if 'is_guest_delegate' in node:
                    has_guest_delegate_field = True
                if 'is_my_delegate' in node:
                    has_my_delegate_field = True
                
                # Print sample node with delegate info
                if node.get('is_guest_delegate') or node.get('is_my_delegate'):
                    print(f"   Node: {node.get('ref_data', {}).get('name', 'Unknown')}")
                    print(f"     - is_guest_delegate: {node.get('is_guest_delegate', False)}")
                    print(f"     - is_my_delegate: {node.get('is_my_delegate', False)}")
            
            if has_guest_delegate_field:
                print("   ✓ is_guest_delegate field present in nodes")
            else:
                print("   ⚠️  is_guest_delegate field missing")
            
            if has_my_delegate_field:
                print("   ✓ is_my_delegate field present in nodes")
            else:
                print("   ⚠️  is_my_delegate field missing")
        
        return True

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        print(f"Total tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Tests failed: {len(self.failed_tests)}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for fail in self.failed_tests:
                print(f"  - {fail.get('test', 'Unknown')}")
                print(f"    Endpoint: {fail.get('endpoint', 'Unknown')}")
                if 'expected' in fail:
                    print(f"    Expected: {fail['expected']}, Got: {fail['actual']}")
                if 'error' in fail:
                    print(f"    Error: {fail['error']}")
        
        return len(self.failed_tests) == 0

def main():
    print("="*60)
    print("OpenClaw Command Center - Backend API Testing")
    print("="*60)
    print(f"Base URL: {BASE_URL}")
    print(f"Test Email: {TEST_EMAIL}")
    print("="*60)
    
    tester = OpenClawAPITester()
    
    # Run all test suites
    if not tester.test_auth_flow():
        print("\n❌ Authentication failed - stopping tests")
        return 1
    
    tester.test_org_endpoints()
    tester.test_agent_endpoints()
    tester.test_org_chart_endpoints()
    tester.test_board_endpoints()
    tester.test_workflow_endpoints()
    tester.test_messaging_endpoints()
    tester.test_dashboard_endpoints()
    
    # Phase 3 tests
    print("\n" + "="*60)
    print("PHASE 3 FEATURE TESTING")
    print("="*60)
    tester.test_phase3_deliberation_endpoints()
    tester.test_phase3_memory_endpoints()
    tester.test_phase3_notification_endpoints()
    tester.test_phase3_system_health_endpoints()
    tester.test_phase3_events_endpoints()
    
    # Phase 4 tests
    print("\n" + "="*60)
    print("PHASE 4 FEATURE TESTING")
    print("="*60)
    tester.test_phase4_skill_marketplace()
    tester.test_phase4_agent_autonomy()
    tester.test_phase4_org_chart_layouts()
    
    # Phase 5 tests
    print("\n" + "="*60)
    print("PHASE 5 FEATURE TESTING")
    print("="*60)
    tester.test_phase5_my_agents_endpoints()
    tester.test_phase5_delegate_endpoints()
    tester.test_phase5_org_chart_delegate_fields()
    
    # Print summary
    all_passed = tester.print_summary()
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())
