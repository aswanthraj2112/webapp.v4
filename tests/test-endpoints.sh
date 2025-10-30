#!/bin/bash

# Test All API Endpoints
# Comprehensive testing script for deployed microservices

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ALB_DNS="${ALB_DNS:-}"
TEST_EMAIL="testuser@example.com"
TEST_PASSWORD="TestPassword123!"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="AdminPassword123!"

# Test results
PASSED=0
FAILED=0
TOTAL=0

# Functions
print_header() {
    echo -e "\n${BLUE}================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================================${NC}\n"
}

print_test() {
    echo -e "${YELLOW}[TEST]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
    ((PASSED++))
    ((TOTAL++))
}

print_failure() {
    echo -e "${RED}[✗]${NC} $1"
    ((FAILED++))
    ((TOTAL++))
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Check if ALB DNS is provided
if [ -z "$ALB_DNS" ]; then
    print_info "ALB_DNS not provided. Attempting to get from Terraform..."
    if [ -f "terraform/terraform.tfstate" ]; then
        cd terraform
        ALB_DNS=$(terraform output -raw alb_dns_name 2>/dev/null || echo "")
        cd ..
    fi
    
    if [ -z "$ALB_DNS" ]; then
        echo -e "${RED}Error: ALB_DNS not found${NC}"
        echo "Usage: ALB_DNS=your-alb-dns.elb.amazonaws.com ./tests/test-endpoints.sh"
        exit 1
    fi
fi

BASE_URL="http://${ALB_DNS}"
print_info "Testing endpoints at: $BASE_URL"

# Global variables for tokens
ACCESS_TOKEN=""
ADMIN_TOKEN=""
VIDEO_ID=""

#################################################
# Test 1: Health Checks
#################################################
print_header "Test 1: Health Checks"

print_test "Testing Video API health endpoint..."
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/healthz" || echo "000")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    print_success "Video API health check passed (200 OK)"
    print_info "Response: $BODY"
else
    print_failure "Video API health check failed (HTTP $HTTP_CODE)"
fi

print_test "Testing Admin Service health endpoint..."
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/admin/health" || echo "000")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    print_success "Admin Service health check passed (200 OK)"
    print_info "Response: $BODY"
else
    print_failure "Admin Service health check failed (HTTP $HTTP_CODE)"
fi

#################################################
# Test 2: Authentication - User Signup
#################################################
print_header "Test 2: User Authentication - Signup"

print_test "Creating new user account..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/signup" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"$TEST_EMAIL\",
        \"password\": \"$TEST_PASSWORD\",
        \"name\": \"Test User\"
    }" || echo "000")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
    print_success "User signup successful (HTTP $HTTP_CODE)"
    print_info "Response: $BODY"
elif echo "$BODY" | grep -q "already exists"; then
    print_success "User already exists (continuing with login)"
else
    print_failure "User signup failed (HTTP $HTTP_CODE)"
    print_info "Response: $BODY"
fi

#################################################
# Test 3: Authentication - User Login
#################################################
print_header "Test 3: User Authentication - Login"

print_test "Logging in as regular user..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"$TEST_EMAIL\",
        \"password\": \"$TEST_PASSWORD\"
    }" || echo "000")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    ACCESS_TOKEN=$(echo "$BODY" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    print_success "User login successful (HTTP $HTTP_CODE)"
    print_info "Access token obtained: ${ACCESS_TOKEN:0:20}..."
else
    print_failure "User login failed (HTTP $HTTP_CODE)"
    print_info "Response: $BODY"
fi

#################################################
# Test 4: Video Upload
#################################################
print_header "Test 4: Video Upload"

if [ -z "$ACCESS_TOKEN" ]; then
    print_failure "Cannot test video upload - no access token"
else
    print_test "Creating test video file..."
    # Create a small test video file (1 second black screen)
    TEST_VIDEO="/tmp/test-video.mp4"
    if command -v ffmpeg &> /dev/null; then
        ffmpeg -f lavfi -i color=black:s=320x240:d=1 -vcodec libx264 -y "$TEST_VIDEO" 2>/dev/null
        print_info "Test video created: $TEST_VIDEO"
    else
        # Create a dummy file if ffmpeg is not available
        echo "dummy video content" > "$TEST_VIDEO"
        print_info "Created dummy video file (ffmpeg not available)"
    fi
    
    print_test "Uploading video..."
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/videos/upload" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -F "video=@$TEST_VIDEO" \
        -F "title=Test Video" \
        -F "description=Automated test video" || echo "000")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
        VIDEO_ID=$(echo "$BODY" | grep -o '"id":"[^"]*' | cut -d'"' -f4 || \
                   echo "$BODY" | grep -o '"videoId":"[^"]*' | cut -d'"' -f4)
        print_success "Video upload successful (HTTP $HTTP_CODE)"
        print_info "Video ID: $VIDEO_ID"
    else
        print_failure "Video upload failed (HTTP $HTTP_CODE)"
        print_info "Response: $BODY"
    fi
    
    # Cleanup
    rm -f "$TEST_VIDEO"
fi

#################################################
# Test 5: List Videos
#################################################
print_header "Test 5: List Videos"

print_test "Fetching video list..."
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/videos" \
    -H "Authorization: Bearer $ACCESS_TOKEN" || echo "000")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    VIDEO_COUNT=$(echo "$BODY" | grep -o '"id"' | wc -l)
    print_success "Video list retrieved successfully (HTTP $HTTP_CODE)"
    print_info "Found $VIDEO_COUNT video(s)"
else
    print_failure "Video list retrieval failed (HTTP $HTTP_CODE)"
    print_info "Response: $BODY"
fi

#################################################
# Test 6: Get Video Details
#################################################
print_header "Test 6: Get Video Details"

if [ -z "$VIDEO_ID" ]; then
    # Try to get first video from list
    VIDEO_ID=$(echo "$BODY" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
fi

if [ -z "$VIDEO_ID" ]; then
    print_failure "Cannot test video details - no video ID available"
else
    print_test "Fetching video details for ID: $VIDEO_ID"
    RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/videos/$VIDEO_ID" \
        -H "Authorization: Bearer $ACCESS_TOKEN" || echo "000")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        print_success "Video details retrieved successfully (HTTP $HTTP_CODE)"
        print_info "Response: $BODY"
    else
        print_failure "Video details retrieval failed (HTTP $HTTP_CODE)"
        print_info "Response: $BODY"
    fi
fi

#################################################
# Test 7: Admin Authentication
#################################################
print_header "Test 7: Admin Authentication"

print_test "Logging in as admin..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"$ADMIN_EMAIL\",
        \"password\": \"$ADMIN_PASSWORD\"
    }" || echo "000")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    ADMIN_TOKEN=$(echo "$BODY" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    print_success "Admin login successful (HTTP $HTTP_CODE)"
    print_info "Admin token obtained: ${ADMIN_TOKEN:0:20}..."
else
    print_failure "Admin login failed (HTTP $HTTP_CODE)"
    print_info "Response: $BODY"
fi

#################################################
# Test 8: Admin - List All Users
#################################################
print_header "Test 8: Admin - List All Users"

if [ -z "$ADMIN_TOKEN" ]; then
    print_failure "Cannot test admin endpoints - no admin token"
else
    print_test "Fetching all users (admin)..."
    RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/admin/users" \
        -H "Authorization: Bearer $ADMIN_TOKEN" || echo "000")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        USER_COUNT=$(echo "$BODY" | grep -o '"email"' | wc -l)
        print_success "User list retrieved successfully (HTTP $HTTP_CODE)"
        print_info "Found $USER_COUNT user(s)"
    else
        print_failure "User list retrieval failed (HTTP $HTTP_CODE)"
        print_info "Response: $BODY"
    fi
fi

#################################################
# Test 9: Admin - System Stats
#################################################
print_header "Test 9: Admin - System Statistics"

if [ -z "$ADMIN_TOKEN" ]; then
    print_failure "Cannot test admin stats - no admin token"
else
    print_test "Fetching system statistics..."
    RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/admin/stats" \
        -H "Authorization: Bearer $ADMIN_TOKEN" || echo "000")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        print_success "System stats retrieved successfully (HTTP $HTTP_CODE)"
        print_info "Response: $BODY"
    else
        print_failure "System stats retrieval failed (HTTP $HTTP_CODE)"
        print_info "Response: $BODY"
    fi
fi

#################################################
# Test 10: CORS Headers
#################################################
print_header "Test 10: CORS Headers"

print_test "Checking CORS headers..."
RESPONSE=$(curl -s -I -X OPTIONS "$BASE_URL/api/videos" \
    -H "Origin: http://localhost:3000" \
    -H "Access-Control-Request-Method: GET" || echo "")

if echo "$RESPONSE" | grep -qi "Access-Control-Allow-Origin"; then
    print_success "CORS headers present"
    print_info "$(echo "$RESPONSE" | grep -i "Access-Control")"
else
    print_failure "CORS headers missing"
fi

#################################################
# Test Summary
#################################################
print_header "Test Summary"

echo -e "${BLUE}Total Tests:${NC} $TOTAL"
echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${RED}Failed:${NC} $FAILED"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✓ All tests passed!${NC}\n"
    exit 0
else
    echo -e "\n${RED}✗ Some tests failed${NC}\n"
    exit 1
fi
