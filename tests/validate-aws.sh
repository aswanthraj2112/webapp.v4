#!/bin/bash

# AWS Services Validation Script
# Verify all AWS resources are deployed correctly

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
AWS_REGION="${AWS_REGION:-ap-southeast-2}"
PROJECT_PREFIX="n11817143-videoapp"

PASSED=0
FAILED=0

print_header() {
    echo -e "\n${BLUE}================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
    ((PASSED++))
}

print_failure() {
    echo -e "${RED}[✗]${NC} $1"
    ((FAILED++))
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        print_failure "$1 not found. Please install AWS CLI"
        exit 1
    fi
}

#################################################
# Prerequisites
#################################################
print_header "Checking Prerequisites"

check_command aws
check_command jq

print_success "AWS CLI installed"
print_success "jq installed"

# Verify AWS credentials
if aws sts get-caller-identity --region $AWS_REGION &> /dev/null; then
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    print_success "AWS credentials valid"
    print_info "Account ID: $ACCOUNT_ID"
else
    print_failure "AWS credentials invalid or not configured"
    exit 1
fi

#################################################
# ECR Repositories
#################################################
print_header "Checking ECR Repositories"

REPOS=(
    "${PROJECT_PREFIX}-video-api"
    "${PROJECT_PREFIX}-admin-service"
    "${PROJECT_PREFIX}-transcode-worker"
    "${PROJECT_PREFIX}-s3-to-sqs-lambda"
)

for REPO in "${REPOS[@]}"; do
    if aws ecr describe-repositories \
        --repository-names "$REPO" \
        --region $AWS_REGION &> /dev/null; then
        
        IMAGE_COUNT=$(aws ecr list-images \
            --repository-name "$REPO" \
            --region $AWS_REGION \
            --query 'length(imageIds)' \
            --output text)
        
        print_success "ECR repository exists: $REPO ($IMAGE_COUNT images)"
    else
        print_failure "ECR repository missing: $REPO"
    fi
done

#################################################
# ECS Cluster
#################################################
print_header "Checking ECS Cluster"

CLUSTER_NAME="${PROJECT_PREFIX}-cluster"

if aws ecs describe-clusters \
    --clusters "$CLUSTER_NAME" \
    --region $AWS_REGION \
    --query 'clusters[0].status' \
    --output text | grep -q "ACTIVE"; then
    
    print_success "ECS cluster is ACTIVE: $CLUSTER_NAME"
    
    # Get cluster details
    SERVICES_COUNT=$(aws ecs list-services \
        --cluster "$CLUSTER_NAME" \
        --region $AWS_REGION \
        --query 'length(serviceArns)' \
        --output text)
    
    TASKS_COUNT=$(aws ecs list-tasks \
        --cluster "$CLUSTER_NAME" \
        --region $AWS_REGION \
        --query 'length(taskArns)' \
        --output text)
    
    print_info "Services: $SERVICES_COUNT"
    print_info "Running tasks: $TASKS_COUNT"
else
    print_failure "ECS cluster not found or not active: $CLUSTER_NAME"
fi

#################################################
# ECS Services
#################################################
print_header "Checking ECS Services"

SERVICES=(
    "${PROJECT_PREFIX}-video-api"
    "${PROJECT_PREFIX}-admin-service"
    "${PROJECT_PREFIX}-transcode-worker"
)

for SERVICE in "${SERVICES[@]}"; do
    SERVICE_STATUS=$(aws ecs describe-services \
        --cluster "$CLUSTER_NAME" \
        --services "$SERVICE" \
        --region $AWS_REGION \
        --query 'services[0].{status:status,running:runningCount,desired:desiredCount}' \
        --output json 2>/dev/null)
    
    if [ ! -z "$SERVICE_STATUS" ]; then
        STATUS=$(echo "$SERVICE_STATUS" | jq -r '.status')
        RUNNING=$(echo "$SERVICE_STATUS" | jq -r '.running')
        DESIRED=$(echo "$SERVICE_STATUS" | jq -r '.desired')
        
        if [ "$STATUS" = "ACTIVE" ] && [ "$RUNNING" -eq "$DESIRED" ]; then
            print_success "Service healthy: $SERVICE ($RUNNING/$DESIRED tasks)"
        else
            print_failure "Service unhealthy: $SERVICE ($RUNNING/$DESIRED tasks, status: $STATUS)"
        fi
    else
        print_failure "Service not found: $SERVICE"
    fi
done

#################################################
# Application Load Balancer
#################################################
print_header "Checking Application Load Balancer"

ALB_NAME="${PROJECT_PREFIX}-alb"

ALB_ARN=$(aws elbv2 describe-load-balancers \
    --region $AWS_REGION \
    --query "LoadBalancers[?starts_with(LoadBalancerName, '${PROJECT_PREFIX}')].LoadBalancerArn" \
    --output text)

if [ ! -z "$ALB_ARN" ]; then
    ALB_DNS=$(aws elbv2 describe-load-balancers \
        --load-balancer-arns "$ALB_ARN" \
        --region $AWS_REGION \
        --query 'LoadBalancers[0].DNSName' \
        --output text)
    
    ALB_STATE=$(aws elbv2 describe-load-balancers \
        --load-balancer-arns "$ALB_ARN" \
        --region $AWS_REGION \
        --query 'LoadBalancers[0].State.Code' \
        --output text)
    
    if [ "$ALB_STATE" = "active" ]; then
        print_success "ALB is active"
        print_info "DNS: $ALB_DNS"
    else
        print_failure "ALB state: $ALB_STATE"
    fi
    
    # Check target groups
    TARGET_GROUPS=$(aws elbv2 describe-target-groups \
        --load-balancer-arn "$ALB_ARN" \
        --region $AWS_REGION \
        --query 'length(TargetGroups)' \
        --output text)
    
    print_info "Target groups: $TARGET_GROUPS"
else
    print_failure "ALB not found"
fi

#################################################
# Target Health
#################################################
print_header "Checking Target Health"

if [ ! -z "$ALB_ARN" ]; then
    TARGET_GROUP_ARNS=$(aws elbv2 describe-target-groups \
        --load-balancer-arn "$ALB_ARN" \
        --region $AWS_REGION \
        --query 'TargetGroups[*].TargetGroupArn' \
        --output text)
    
    for TG_ARN in $TARGET_GROUP_ARNS; do
        TG_NAME=$(aws elbv2 describe-target-groups \
            --target-group-arns "$TG_ARN" \
            --region $AWS_REGION \
            --query 'TargetGroups[0].TargetGroupName' \
            --output text)
        
        HEALTH_STATUS=$(aws elbv2 describe-target-health \
            --target-group-arn "$TG_ARN" \
            --region $AWS_REGION \
            --query 'TargetHealthDescriptions[*].TargetHealth.State' \
            --output text)
        
        HEALTHY_COUNT=$(echo "$HEALTH_STATUS" | grep -o "healthy" | wc -l)
        TOTAL_COUNT=$(echo "$HEALTH_STATUS" | wc -w)
        
        if [ $HEALTHY_COUNT -eq $TOTAL_COUNT ] && [ $TOTAL_COUNT -gt 0 ]; then
            print_success "Target group healthy: $TG_NAME ($HEALTHY_COUNT/$TOTAL_COUNT)"
        else
            print_failure "Target group unhealthy: $TG_NAME ($HEALTHY_COUNT/$TOTAL_COUNT)"
        fi
    done
fi

#################################################
# Lambda Function
#################################################
print_header "Checking Lambda Function"

LAMBDA_NAME="${PROJECT_PREFIX}-s3-to-sqs"

LAMBDA_STATE=$(aws lambda get-function \
    --function-name "$LAMBDA_NAME" \
    --region $AWS_REGION \
    --query 'Configuration.State' \
    --output text 2>/dev/null || echo "NotFound")

if [ "$LAMBDA_STATE" = "Active" ]; then
    print_success "Lambda function is active: $LAMBDA_NAME"
    
    LAMBDA_VERSION=$(aws lambda get-function \
        --function-name "$LAMBDA_NAME" \
        --region $AWS_REGION \
        --query 'Configuration.Version' \
        --output text)
    
    LAMBDA_MODIFIED=$(aws lambda get-function \
        --function-name "$LAMBDA_NAME" \
        --region $AWS_REGION \
        --query 'Configuration.LastModified' \
        --output text)
    
    print_info "Version: $LAMBDA_VERSION"
    print_info "Last modified: $LAMBDA_MODIFIED"
else
    print_failure "Lambda function not found or not active: $LAMBDA_NAME"
fi

#################################################
# CloudWatch Log Groups
#################################################
print_header "Checking CloudWatch Log Groups"

LOG_GROUPS=(
    "/ecs/${PROJECT_PREFIX}"
    "/aws/lambda/${LAMBDA_NAME}"
)

for LOG_GROUP in "${LOG_GROUPS[@]}"; do
    if aws logs describe-log-groups \
        --log-group-name-prefix "$LOG_GROUP" \
        --region $AWS_REGION \
        --query 'logGroups[0]' \
        --output text &> /dev/null; then
        
        STREAM_COUNT=$(aws logs describe-log-streams \
            --log-group-name "$LOG_GROUP" \
            --region $AWS_REGION \
            --query 'length(logStreams)' \
            --output text 2>/dev/null || echo "0")
        
        print_success "Log group exists: $LOG_GROUP ($STREAM_COUNT streams)"
    else
        print_failure "Log group not found: $LOG_GROUP"
    fi
done

#################################################
# Auto-scaling Configuration
#################################################
print_header "Checking Auto-scaling Configuration"

for SERVICE in "${SERVICES[@]}"; do
    RESOURCE_ID="service/${CLUSTER_NAME}/${SERVICE}"
    
    SCALABLE_TARGET=$(aws application-autoscaling describe-scalable-targets \
        --service-namespace ecs \
        --resource-ids "$RESOURCE_ID" \
        --region $AWS_REGION \
        --query 'ScalableTargets[0]' \
        --output json 2>/dev/null)
    
    if [ ! -z "$SCALABLE_TARGET" ] && [ "$SCALABLE_TARGET" != "null" ]; then
        MIN_CAP=$(echo "$SCALABLE_TARGET" | jq -r '.MinCapacity')
        MAX_CAP=$(echo "$SCALABLE_TARGET" | jq -r '.MaxCapacity')
        
        print_success "Auto-scaling configured: $SERVICE (min: $MIN_CAP, max: $MAX_CAP)"
    else
        print_failure "Auto-scaling not configured: $SERVICE"
    fi
done

#################################################
# Summary
#################################################
print_header "Validation Summary"

TOTAL=$((PASSED + FAILED))
echo -e "${BLUE}Total Checks:${NC} $TOTAL"
echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${RED}Failed:${NC} $FAILED"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✓ All AWS resources validated successfully!${NC}\n"
    exit 0
else
    echo -e "\n${RED}✗ Some validations failed${NC}\n"
    exit 1
fi
