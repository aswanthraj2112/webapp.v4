#!/bin/bash

# Quick test script to verify local setup
# Run after starting docker-compose

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================="
echo "Testing Microservices Setup"
echo "========================================="
echo ""

# Test 1: Health checks
echo "Test 1: Health Checks"
echo "---------------------"

if curl -sf http://localhost:8080/healthz > /dev/null; then
    echo -e "${GREEN}✅ Video API is healthy${NC}"
else
    echo -e "${RED}❌ Video API is down${NC}"
fi

if curl -sf http://localhost:8081/healthz > /dev/null; then
    echo -e "${GREEN}✅ Admin API is healthy${NC}"
else
    echo -e "${RED}❌ Admin API is down${NC}"
fi

if curl -sf http://localhost:4566/_localstack/health > /dev/null; then
    echo -e "${GREEN}✅ LocalStack is healthy${NC}"
else
    echo -e "${RED}❌ LocalStack is down${NC}"
fi

echo ""

# Test 2: LocalStack resources
echo "Test 2: LocalStack Resources"
echo "----------------------------"

S3_BUCKETS=$(docker compose -f docker-compose.dev.yml exec -T localstack awslocal s3 ls 2>/dev/null | wc -l)
if [ "$S3_BUCKETS" -gt 0 ]; then
    echo -e "${GREEN}✅ S3 buckets exist ($S3_BUCKETS)${NC}"
else
    echo -e "${RED}❌ No S3 buckets found${NC}"
fi

DYNAMO_TABLES=$(docker compose -f docker-compose.dev.yml exec -T localstack awslocal dynamodb list-tables --region ap-southeast-2 2>/dev/null | grep -c "n11817143" || echo "0")
if [ "$DYNAMO_TABLES" -gt 0 ]; then
    echo -e "${GREEN}✅ DynamoDB tables exist${NC}"
else
    echo -e "${RED}❌ No DynamoDB tables found${NC}"
fi

SQS_QUEUES=$(docker compose -f docker-compose.dev.yml exec -T localstack awslocal sqs list-queues --region ap-southeast-2 2>/dev/null | grep -c "transcode" || echo "0")
if [ "$SQS_QUEUES" -gt 0 ]; then
    echo -e "${GREEN}✅ SQS queues exist${NC}"
else
    echo -e "${RED}❌ No SQS queues found${NC}"
fi

echo ""

# Test 3: Container status
echo "Test 3: Container Status"
echo "------------------------"

docker compose -f docker-compose.dev.yml ps

echo ""

# Test 4: Environment check
echo "Test 4: Environment Check"
echo "-------------------------"

if [ -f ".env" ]; then
    echo -e "${GREEN}✅ .env file exists${NC}"
    
    if grep -q "COGNITO_USER_POOL_ID=ap-southeast-2_X" .env; then
        echo -e "${YELLOW}⚠️  Cognito credentials not configured${NC}"
    else
        echo -e "${GREEN}✅ Cognito credentials configured${NC}"
    fi
else
    echo -e "${RED}❌ .env file missing${NC}"
fi

echo ""

# Summary
echo "========================================="
echo "Test Summary"
echo "========================================="
echo ""
echo "If all tests pass, you can:"
echo "1. Test authentication: curl -X POST http://localhost:8080/api/auth/signup ..."
echo "2. Access frontend: http://localhost:5173"
echo "3. View logs: docker compose -f docker-compose.dev.yml logs -f"
echo ""
echo "See DOCKER_SETUP.md for detailed testing instructions"
echo ""
