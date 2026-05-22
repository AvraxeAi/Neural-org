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
    
    # Print summary
    all_passed = tester.print_summary()
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())
