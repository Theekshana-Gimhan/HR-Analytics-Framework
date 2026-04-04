#!/bin/bash

# Simpala HR - Test API Suite
# Run this after deployment to test all fixes
# Usage: bash test-apis.sh <base_url> <auth_token> <company_id> <employee_id>

set -e

BASE_URL="${1:-http://localhost:3001/api/v1}"
AUTH_TOKEN="${2}"
COMPANY_ID="${3}"
EMPLOYEE_ID="${4}"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Simpala HR - Test API Suite${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Base URL: $BASE_URL"
echo "Company ID: $COMPANY_ID"
echo "Employee ID: $EMPLOYEE_ID"
echo ""

# Function to make API call
call_api() {
  local method=$1
  local endpoint=$2
  local data=$3
  local auth=${4:-"-H \"Authorization: Bearer $AUTH_TOKEN\""}

  if [ -z "$data" ]; then
    curl -s -X "$method" "$BASE_URL$endpoint" \
      $auth \
      -H "Content-Type: application/json" | jq .
  else
    curl -s -X "$method" "$BASE_URL$endpoint" \
      $auth \
      -H "Content-Type: application/json" \
      -d "$data" | jq .
  fi
}

# Test 1: Health Check
echo -e "${YELLOW}[TEST 1] Health Check - Verify test endpoints available${NC}"
curl -s -X GET "$BASE_URL/test/health" \
  -H "Content-Type: application/json" | jq .
echo ""

# Test 2: Employee Creation Validation
echo -e "${YELLOW}[TEST 2] Employee Creation Validation${NC}"
call_api POST "/test/employee-creation" '{"scenario":"valid"}' "-H \"Authorization: Bearer $AUTH_TOKEN\""
echo ""

# Test 3: Leave Application Error Handling
echo -e "${YELLOW}[TEST 3] Leave Application Error Handling${NC}"
call_api POST "/test/leave-application" '{"scenario":"valid"}' "-H \"Authorization: Bearer $AUTH_TOKEN\""
echo ""

# Test 4: Payroll EPF Calculation
echo -e "${YELLOW}[TEST 4] Payroll EPF Calculation (Verify rates)${NC}"
if [ -n "$EMPLOYEE_ID" ]; then
  call_api POST "/test/payroll-calculation" "{\"employeeId\":$EMPLOYEE_ID}" "-H \"Authorization: Bearer $AUTH_TOKEN\""
else
  echo -e "${RED}Skipped: employeeId not provided${NC}"
fi
echo ""

# Test 5: Attendance CSV Import
echo -e "${YELLOW}[TEST 5] Attendance CSV Import${NC}"
call_api POST "/test/attendance-import" '{"scenario":"valid"}' "-H \"Authorization: Bearer $AUTH_TOKEN\""
echo ""

# Test 6: Bank File Export Encoding (CRLF + UTF-8)
echo -e "${YELLOW}[TEST 6] Bank File Export Encoding (CRLF + UTF-8)${NC}"
echo "Testing SLIPS format for current month..."
CURRENT_MONTH=$(date +%-m)
CURRENT_YEAR=$(date +%Y)
call_api POST "/test/bank-file-export" "{\"month\":$CURRENT_MONTH,\"year\":$CURRENT_YEAR,\"fileType\":\"SLIPS\"}" "-H \"Authorization: Bearer $AUTH_TOKEN\""
echo ""

# Test 7: Leave Anniversary Accrual
echo -e "${YELLOW}[TEST 7] Leave Anniversary Accrual${NC}"
if [ -n "$EMPLOYEE_ID" ]; then
  call_api POST "/test/leave-accrual" "{\"employeeId\":$EMPLOYEE_ID}" "-H \"Authorization: Bearer $AUTH_TOKEN\""
else
  echo -e "${RED}Skipped: employeeId not provided${NC}"
fi
echo ""

# Test 8: Multi-Tenancy Isolation
echo -e "${YELLOW}[TEST 8] Multi-Tenancy Isolation${NC}"
call_api GET "/test/multi-tenancy" "" "-H \"Authorization: Bearer $AUTH_TOKEN\""
echo ""

# Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Test Suite Complete${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "To get an auth token, login first:"
echo "  curl -X POST $BASE_URL/auth/login \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"email\":\"your@email.com\",\"password\":\"password\"}'"
echo ""
echo "Look for 'accessToken' in the response."
