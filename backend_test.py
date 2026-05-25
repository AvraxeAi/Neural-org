#!/usr/bin/env python3
"""
Backend API Test Suite for Org Chart Governance (Phase 6)
Tests all governance-related endpoints
"""
import requests
import sys
import json
from datetime import datetime

class OrgChartGovernanceTest:
    def __init__(self, base_url="https://org-nexus-7.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.org_id = None
        self.node_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, passed, message=""):
        """Log test result"""
        self.tests_run += 1
        if passed:
            self.tests_passed += 1
            print(f"✅ {name}: PASSED")
        else:
            print(f"❌ {name}: FAILED - {message}")
        self.test_results.append({
            "test": name,
            "passed": passed,
            "message": message
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {method} {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)

            print(f"   Status: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                try:
                    resp_data = response.json()
                    print(f"   Response: {json.dumps(resp_data, indent=2)[:200]}...")
                    self.log_test(name, True)
                    return True, resp_data
                except:
                    self.log_test(name, True)
                    return True, {}
            else:
                try:
                    error_msg = response.json()
                    print(f"   Error: {error_msg}")
                    self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}: {error_msg}")
                except:
                    self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}")
                return False, {}

        except Exception as e:
            print(f"   Exception: {str(e)}")
            self.log_test(name, False, str(e))
            return False, {}

    def test_login(self):
        """Test login with provided credentials"""
        print("\n" + "="*60)
        print("PHASE 1: Authentication")
        print("="*60)
        
        success, response = self.run_test(
            "Login with test credentials",
            "POST",
            "auth/login",
            200,
            data={"email": "Rustyadj@gmail.com", "password": "Arabia@24"}
        )
        if success and 'token' in response:
            self.token = response['token']
            print(f"   ✓ Token obtained: {self.token[:20]}...")
            return True
        return False

    def test_get_orgs(self):
        """Get user's orgs"""
        print("\n" + "="*60)
        print("PHASE 2: Get Organization")
        print("="*60)
        
        success, response = self.run_test(
            "Get user orgs",
            "GET",
            "orgs",
            200
        )
        if success and response:
            self.org_id = response[0]['id']
            print(f"   ✓ Org ID: {self.org_id}")
            return True
        return False

    def test_governance_endpoints(self):
        """Test all governance-related endpoints"""
        print("\n" + "="*60)
        print("PHASE 3: Governance Endpoints")
        print("="*60)
        
        # 1. Get governance state (should be draft initially)
        success, gov_data = self.run_test(
            "GET /chart/governance - Initial state",
            "GET",
            f"orgs/{self.org_id}/chart/governance",
            200
        )
        if success:
            is_governed = gov_data.get('is_governed', False)
            print(f"   ✓ is_governed: {is_governed}")
            print(f"   ✓ emergency_override: {gov_data.get('emergency_override', False)}")
            print(f"   ✓ version_count: {gov_data.get('version_count', 0)}")
            print(f"   ✓ pending_proposals: {gov_data.get('pending_proposals', 0)}")

        # 2. Get chart to find a node
        success, chart_data = self.run_test(
            "GET /chart - Get chart nodes",
            "GET",
            f"orgs/{self.org_id}/chart",
            200
        )
        if success and chart_data.get('nodes'):
            # Find an agent node
            agent_nodes = [n for n in chart_data['nodes'] if n.get('node_type') == 'agent']
            if agent_nodes:
                self.node_id = agent_nodes[0]['id']
                print(f"   ✓ Found agent node: {self.node_id}")
                print(f"   ✓ Provider badge: {agent_nodes[0].get('ref_data', {}).get('provider_badge_computed', 'N/A')}")
            else:
                # Use first node
                self.node_id = chart_data['nodes'][0]['id']
                print(f"   ✓ Using first node: {self.node_id}")

        # 3. Test inline node update (draft mode)
        if self.node_id:
            success, update_data = self.run_test(
                "PUT /chart/nodes/{id}/inline - Update node in draft mode",
                "PUT",
                f"orgs/{self.org_id}/chart/nodes/{self.node_id}/inline",
                200,
                data={
                    "name": "Test Agent Updated",
                    "role": "Test Role",
                    "department": "Engineering",
                    "provider_badge": "Claude"
                }
            )

        # 4. Get change proposals (should be empty initially)
        success, proposals = self.run_test(
            "GET /chart/change-proposals - Initial list",
            "GET",
            f"orgs/{self.org_id}/chart/change-proposals",
            200
        )
        if success:
            print(f"   ✓ Proposals count: {len(proposals)}")

        # 5. Get audit log (should have some entries)
        success, audit_log = self.run_test(
            "GET /chart/audit-log - Get audit entries",
            "GET",
            f"orgs/{self.org_id}/chart/audit-log",
            200
        )
        if success:
            print(f"   ✓ Audit log entries: {len(audit_log)}")

        # 6. Get versions (should be empty before finalize)
        success, versions = self.run_test(
            "GET /chart/versions - Get version list",
            "GET",
            f"orgs/{self.org_id}/chart/versions",
            200
        )
        if success:
            print(f"   ✓ Versions count: {len(versions)}")

    def test_finalize_workflow(self):
        """Test finalize and governed mode workflow"""
        print("\n" + "="*60)
        print("PHASE 4: Finalize & Governed Mode")
        print("="*60)
        
        # 1. Finalize the chart
        success, finalize_data = self.run_test(
            "POST /chart/finalize - Finalize chart structure",
            "POST",
            f"orgs/{self.org_id}/chart/finalize",
            200,
            data={
                "label": "Test Version v1",
                "reason": "Testing governance finalization"
            }
        )
        if success:
            print(f"   ✓ Chart finalized")
            print(f"   ✓ Version: {finalize_data.get('version', 'N/A')}")
            print(f"   ✓ is_governed: {finalize_data.get('is_governed', False)}")

        # 2. Verify governance state changed
        success, gov_data = self.run_test(
            "GET /chart/governance - After finalize",
            "GET",
            f"orgs/{self.org_id}/chart/governance",
            200
        )
        if success:
            is_governed = gov_data.get('is_governed', False)
            if is_governed:
                print(f"   ✅ Chart is now GOVERNED")
            else:
                print(f"   ❌ Chart should be governed but is_governed={is_governed}")

        # 3. Try inline update in governed mode (should fail)
        if self.node_id:
            success, _ = self.run_test(
                "PUT /chart/nodes/{id}/inline - Should fail in governed mode",
                "PUT",
                f"orgs/{self.org_id}/chart/nodes/{self.node_id}/inline",
                400,  # Expecting 400 error
                data={"name": "Should Fail"}
            )
            if success:
                print(f"   ✅ Correctly blocked inline update in governed mode")

        # 4. Create a change proposal
        if self.node_id:
            success, proposal_data = self.run_test(
                "POST /chart/change-proposals - Create proposal",
                "POST",
                f"orgs/{self.org_id}/chart/change-proposals",
                200,
                data={
                    "change_type": "node_name",
                    "subject_id": self.node_id,
                    "subject_name": "Test Node",
                    "before": {"value": "Old Name"},
                    "after": {"value": "New Name"},
                    "reason": "Testing proposal creation"
                }
            )
            if success:
                proposal_id = proposal_data.get('id')
                print(f"   ✓ Proposal created: {proposal_id}")
                
                # 5. Vote on the proposal
                if proposal_id:
                    success, vote_data = self.run_test(
                        "POST /chart/change-proposals/{id}/vote - Vote approve",
                        "POST",
                        f"orgs/{self.org_id}/chart/change-proposals/{proposal_id}/vote",
                        200,
                        data={
                            "value": "approve",
                            "note": "Testing vote functionality"
                        }
                    )
                    if success:
                        print(f"   ✓ Vote cast successfully")
                        print(f"   ✓ Proposal status: {vote_data.get('status', 'N/A')}")

    def test_emergency_override(self):
        """Test emergency override functionality"""
        print("\n" + "="*60)
        print("PHASE 5: Emergency Override")
        print("="*60)
        
        # 1. Activate emergency override
        success, _ = self.run_test(
            "POST /chart/emergency-unlock - Activate override",
            "POST",
            f"orgs/{self.org_id}/chart/emergency-unlock",
            200,
            data={"reason": "Testing emergency override"}
        )
        if success:
            print(f"   ✅ Emergency override activated")

        # 2. Verify governance state
        success, gov_data = self.run_test(
            "GET /chart/governance - Check override state",
            "GET",
            f"orgs/{self.org_id}/chart/governance",
            200
        )
        if success:
            emergency_override = gov_data.get('emergency_override', False)
            if emergency_override:
                print(f"   ✅ Emergency override is active")
            else:
                print(f"   ❌ Emergency override should be active")

        # 3. Try inline update (should work now)
        if self.node_id:
            success, _ = self.run_test(
                "PUT /chart/nodes/{id}/inline - Should work in override mode",
                "PUT",
                f"orgs/{self.org_id}/chart/nodes/{self.node_id}/inline",
                200,
                data={"name": "Override Update"}
            )
            if success:
                print(f"   ✅ Inline update works in override mode")

        # 4. Re-lock the chart
        success, _ = self.run_test(
            "POST /chart/re-lock - Re-lock chart",
            "POST",
            f"orgs/{self.org_id}/chart/re-lock",
            200
        )
        if success:
            print(f"   ✅ Chart re-locked")

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        print(f"Total tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.tests_run - self.tests_passed > 0:
            print("\n❌ Failed tests:")
            for result in self.test_results:
                if not result['passed']:
                    print(f"  - {result['test']}: {result['message']}")
        
        return 0 if self.tests_passed == self.tests_run else 1

def main():
    print("="*60)
    print("ORG CHART GOVERNANCE TEST SUITE - Phase 6")
    print("="*60)
    
    tester = OrgChartGovernanceTest()
    
    # Run test phases
    if not tester.test_login():
        print("\n❌ Login failed, stopping tests")
        return 1
    
    if not tester.test_get_orgs():
        print("\n❌ Failed to get orgs, stopping tests")
        return 1
    
    tester.test_governance_endpoints()
    tester.test_finalize_workflow()
    tester.test_emergency_override()
    
    return tester.print_summary()

if __name__ == "__main__":
    sys.exit(main())
