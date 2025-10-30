#!/bin/bash

# Load Testing Script
# Simulate concurrent users accessing the video platform

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
ALB_DNS="${ALB_DNS:-}"
CONCURRENT_USERS="${CONCURRENT_USERS:-10}"
REQUESTS_PER_USER="${REQUESTS_PER_USER:-50}"
RAMP_UP_TIME="${RAMP_UP_TIME:-5}"

print_header() {
    echo -e "\n${BLUE}================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================================${NC}\n"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Check dependencies
if ! command -v ab &> /dev/null; then
    print_error "Apache Bench (ab) not found. Installing..."
    sudo apt-get update && sudo apt-get install -y apache2-utils
fi

# Get ALB DNS
if [ -z "$ALB_DNS" ]; then
    print_info "ALB_DNS not provided. Attempting to get from Terraform..."
    if [ -f "terraform/terraform.tfstate" ]; then
        cd terraform
        ALB_DNS=$(terraform output -raw alb_dns_name 2>/dev/null || echo "")
        cd ..
    fi
    
    if [ -z "$ALB_DNS" ]; then
        print_error "ALB_DNS not found"
        echo "Usage: ALB_DNS=your-alb-dns.elb.amazonaws.com CONCURRENT_USERS=10 ./tests/load-test.sh"
        exit 1
    fi
fi

BASE_URL="http://${ALB_DNS}"

print_header "Load Testing Configuration"
print_info "Target: $BASE_URL"
print_info "Concurrent Users: $CONCURRENT_USERS"
print_info "Requests per User: $REQUESTS_PER_USER"
print_info "Total Requests: $((CONCURRENT_USERS * REQUESTS_PER_USER))"

#################################################
# Test 1: Health Endpoint Load Test
#################################################
print_header "Test 1: Health Endpoint Load Test"

print_info "Running load test on /healthz endpoint..."
ab -n $((CONCURRENT_USERS * REQUESTS_PER_USER)) \
   -c $CONCURRENT_USERS \
   -g /tmp/health-test.tsv \
   "$BASE_URL/healthz" 2>&1 | tee /tmp/health-test-results.txt

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    print_success "Health endpoint load test completed"
    
    # Extract key metrics
    REQUESTS=$(grep "Complete requests:" /tmp/health-test-results.txt | awk '{print $3}')
    FAILED=$(grep "Failed requests:" /tmp/health-test-results.txt | awk '{print $3}')
    REQ_PER_SEC=$(grep "Requests per second:" /tmp/health-test-results.txt | awk '{print $4}')
    MEAN_TIME=$(grep "Time per request:" /tmp/health-test-results.txt | head -1 | awk '{print $4}')
    
    echo ""
    print_info "Completed requests: $REQUESTS"
    print_info "Failed requests: $FAILED"
    print_info "Requests per second: $REQ_PER_SEC"
    print_info "Mean time per request: $MEAN_TIME ms"
else
    print_error "Health endpoint load test failed"
fi

#################################################
# Test 2: Video List Endpoint Load Test
#################################################
print_header "Test 2: Video List Endpoint Load Test"

print_info "Running load test on /api/videos endpoint..."
ab -n $((CONCURRENT_USERS * REQUESTS_PER_USER)) \
   -c $CONCURRENT_USERS \
   -g /tmp/videos-test.tsv \
   "$BASE_URL/api/videos" 2>&1 | tee /tmp/videos-test-results.txt

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    print_success "Video list endpoint load test completed"
    
    REQUESTS=$(grep "Complete requests:" /tmp/videos-test-results.txt | awk '{print $3}')
    FAILED=$(grep "Failed requests:" /tmp/videos-test-results.txt | awk '{print $3}')
    REQ_PER_SEC=$(grep "Requests per second:" /tmp/videos-test-results.txt | awk '{print $4}')
    MEAN_TIME=$(grep "Time per request:" /tmp/videos-test-results.txt | head -1 | awk '{print $4}')
    
    echo ""
    print_info "Completed requests: $REQUESTS"
    print_info "Failed requests: $FAILED"
    print_info "Requests per second: $REQ_PER_SEC"
    print_info "Mean time per request: $MEAN_TIME ms"
else
    print_error "Video list endpoint load test failed"
fi

#################################################
# Test 3: Sustained Load Test
#################################################
print_header "Test 3: Sustained Load Test (60 seconds)"

print_info "Running sustained load test..."
ab -t 60 \
   -c $CONCURRENT_USERS \
   -g /tmp/sustained-test.tsv \
   "$BASE_URL/healthz" 2>&1 | tee /tmp/sustained-test-results.txt

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    print_success "Sustained load test completed"
    
    REQUESTS=$(grep "Complete requests:" /tmp/sustained-test-results.txt | awk '{print $3}')
    FAILED=$(grep "Failed requests:" /tmp/sustained-test-results.txt | awk '{print $3}')
    REQ_PER_SEC=$(grep "Requests per second:" /tmp/sustained-test-results.txt | awk '{print $4}')
    
    echo ""
    print_info "Total requests in 60s: $REQUESTS"
    print_info "Failed requests: $FAILED"
    print_info "Average requests per second: $REQ_PER_SEC"
else
    print_error "Sustained load test failed"
fi

#################################################
# Summary
#################################################
print_header "Load Test Summary"

print_success "All load tests completed"
print_info "Results saved to /tmp/*-test-results.txt"
print_info "TSV data saved to /tmp/*-test.tsv"

echo ""
print_info "To visualize results, you can use gnuplot:"
echo "  gnuplot -e \"set terminal png; set output 'results.png'; plot '/tmp/health-test.tsv' using 5 with lines\""

echo ""
print_info "Check CloudWatch metrics for:"
echo "  - ECS service CPU/Memory usage"
echo "  - ALB target response times"
echo "  - Auto-scaling activity"
