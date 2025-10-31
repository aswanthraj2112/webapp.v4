#!/bin/bash

# Build and push Docker images to ECR
# Usage: ./build-and-push.sh [service-name] or ./build-and-push.sh all

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed"
    exit 1
fi

# Get AWS account ID and region
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region || echo "ap-southeast-2")
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

print_header "Building and Pushing Docker Images"
echo "AWS Account: $AWS_ACCOUNT_ID"
echo "AWS Region: $AWS_REGION"
echo "ECR Registry: $ECR_REGISTRY"
echo ""

# Login to ECR
print_info "Logging in to ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY
print_success "Logged in to ECR"
echo ""

# Determine which services to build
if [ "$1" == "all" ] || [ -z "$1" ]; then
    SERVICES=("video-api" "admin-service" "transcode-worker" "s3-lambda")
else
    SERVICES=("$1")
fi

# Build and push each service
for SERVICE in "${SERVICES[@]}"; do
    print_header "Building $SERVICE"
    
    case $SERVICE in
        video-api)
            REPO="${ECR_REGISTRY}/n11817143-app/video-api"
            BUILD_PATH="./server/services/video-api"
            DOCKERFILE="Dockerfile"
            ;;
        admin-service)
            REPO="${ECR_REGISTRY}/n11817143-app/admin-service"
            BUILD_PATH="./server/services/admin-service"
            DOCKERFILE="Dockerfile"
            ;;
        transcode-worker)
            REPO="${ECR_REGISTRY}/n11817143-app/transcode-worker"
            BUILD_PATH="./server/services/transcode-worker"
            DOCKERFILE="Dockerfile"
            ;;
        s3-lambda)
            REPO="${ECR_REGISTRY}/n11817143-app/s3-to-sqs-lambda"
            BUILD_PATH="./lambda/s3-to-sqs"
            DOCKERFILE="Dockerfile"
            ;;
        *)
            print_error "Unknown service: $SERVICE"
            continue
            ;;
    esac
    
    # Check if path exists
    if [ ! -d "$BUILD_PATH" ]; then
        print_error "Build path not found: $BUILD_PATH"
        continue
    fi
    
    # Build image
    print_info "Building Docker image..."
    if [ "$SERVICE" == "transcode-worker" ] || [ "$SERVICE" == "video-api" ] || [ "$SERVICE" == "admin-service" ]; then
        # Build from project root for services that need shared code
        docker build -t ${REPO}:latest -f ${BUILD_PATH}/${DOCKERFILE} .
    else
        # Build from service directory for standalone services
        docker build -t ${REPO}:latest -f ${BUILD_PATH}/${DOCKERFILE} ${BUILD_PATH}
    fi
    
    if [ $? -eq 0 ]; then
        print_success "Built $SERVICE"
    else
        print_error "Failed to build $SERVICE"
        continue
    fi
    
    # Tag with timestamp
    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    docker tag ${REPO}:latest ${REPO}:${TIMESTAMP}
    
    # Push images
    print_info "Pushing images to ECR..."
    docker push ${REPO}:latest
    docker push ${REPO}:${TIMESTAMP}
    
    if [ $? -eq 0 ]; then
        print_success "Pushed $SERVICE"
        echo "  - ${REPO}:latest"
        echo "  - ${REPO}:${TIMESTAMP}"
    else
        print_error "Failed to push $SERVICE"
    fi
    
    echo ""
done

print_header "Summary"
print_success "All specified images built and pushed successfully!"
echo ""
print_info "To deploy to ECS, run:"
echo "  cd terraform"
echo "  terraform apply"
echo ""
print_info "Or force update services:"
echo "  aws ecs update-service --cluster n11817143-videoapp-cluster --service n11817143-videoapp-video-api --force-new-deployment"
echo "  aws ecs update-service --cluster n11817143-videoapp-cluster --service n11817143-videoapp-admin-service --force-new-deployment"
echo "  aws ecs update-service --cluster n11817143-videoapp-cluster --service n11817143-videoapp-transcode-worker --force-new-deployment"
echo ""
