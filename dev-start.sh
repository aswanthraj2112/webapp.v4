#!/bin/bash

# Quick start script for local development
# Usage: ./dev-start.sh [options]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENV_FILE=".env"
ENV_EXAMPLE=".env.example"
COMPOSE_FILE="docker-compose.dev.yml"
INIT_SCRIPT="localstack-init/01-setup-aws-resources.sh"

# Functions
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

check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        echo "Install Docker: https://docs.docker.com/get-docker/"
        exit 1
    fi
    print_success "Docker installed: $(docker --version)"
    
    # Check Docker Compose
    if ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not installed"
        echo "Install Docker Compose: https://docs.docker.com/compose/install/"
        exit 1
    fi
    print_success "Docker Compose installed: $(docker compose version)"
    
    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running"
        echo "Start Docker Desktop or run: sudo systemctl start docker"
        exit 1
    fi
    print_success "Docker daemon is running"
    
    echo ""
}

setup_environment() {
    print_header "Setting Up Environment"
    
    # Check if .env exists
    if [ ! -f "$ENV_FILE" ]; then
        print_warning ".env file not found"
        
        if [ -f "$ENV_EXAMPLE" ]; then
            print_info "Copying .env.example to .env"
            cp "$ENV_EXAMPLE" "$ENV_FILE"
            print_success "Created .env file"
            
            print_warning "⚠️  IMPORTANT: Edit .env and add your Cognito credentials!"
            echo ""
            echo "Required values:"
            echo "  - COGNITO_USER_POOL_ID"
            echo "  - COGNITO_CLIENT_ID"
            echo "  - COGNITO_REGION"
            echo ""
            read -p "Press Enter after editing .env, or Ctrl+C to exit..."
        else
            print_error ".env.example not found"
            exit 1
        fi
    else
        print_success ".env file exists"
        
        # Check if Cognito variables are set
        if grep -q "COGNITO_USER_POOL_ID=ap-southeast-2_XXXXXXXXX" "$ENV_FILE" || \
           grep -q "COGNITO_CLIENT_ID=your-client-id-here" "$ENV_FILE"; then
            print_warning "Cognito credentials not configured in .env"
            echo ""
            echo "Please edit .env and set:"
            echo "  - COGNITO_USER_POOL_ID"
            echo "  - COGNITO_CLIENT_ID"
            echo ""
            read -p "Continue anyway? (y/N) " -n 1 -r
            echo ""
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    fi
    
    # Make init script executable
    if [ -f "$INIT_SCRIPT" ]; then
        chmod +x "$INIT_SCRIPT"
        print_success "Init script is executable"
    fi
    
    echo ""
}

cleanup() {
    print_header "Cleaning Up Previous Deployment"
    
    print_info "Stopping existing containers..."
    docker compose -f "$COMPOSE_FILE" down 2>/dev/null || true
    
    if [ "$1" == "--clean" ]; then
        print_warning "Removing volumes (clean start)..."
        docker compose -f "$COMPOSE_FILE" down -v
    fi
    
    print_success "Cleanup complete"
    echo ""
}

build_services() {
    print_header "Building Services"
    
    print_info "Building Docker images (this may take a few minutes)..."
    
    if [ "$1" == "--no-cache" ]; then
        docker compose -f "$COMPOSE_FILE" build --no-cache
    else
        docker compose -f "$COMPOSE_FILE" build
    fi
    
    print_success "Build complete"
    echo ""
}

start_services() {
    print_header "Starting Services"
    
    print_info "Starting containers..."
    
    if [ "$1" == "--detached" ] || [ "$1" == "-d" ]; then
        docker compose -f "$COMPOSE_FILE" up -d
        print_success "Services started in detached mode"
        echo ""
        print_info "View logs with: docker compose -f $COMPOSE_FILE logs -f"
    else
        print_success "Services starting... (Press Ctrl+C to stop)"
        echo ""
        docker compose -f "$COMPOSE_FILE" up
    fi
}

show_services() {
    print_header "Service Status"
    
    docker compose -f "$COMPOSE_FILE" ps
    
    echo ""
    print_header "Service URLs"
    
    echo -e "${GREEN}Frontend:${NC}     http://localhost:5173"
    echo -e "${GREEN}Video API:${NC}    http://localhost:8080"
    echo -e "${GREEN}Admin API:${NC}    http://localhost:8081"
    echo -e "${GREEN}LocalStack:${NC}   http://localhost:4566"
    
    echo ""
    print_header "Quick Commands"
    
    echo "View logs:        docker compose -f $COMPOSE_FILE logs -f"
    echo "Stop services:    docker compose -f $COMPOSE_FILE stop"
    echo "Restart service:  docker compose -f $COMPOSE_FILE restart video-api"
    echo "Shell access:     docker compose -f $COMPOSE_FILE exec video-api sh"
    echo "Clean restart:    ./dev-start.sh --clean"
    
    echo ""
}

wait_for_services() {
    print_header "Waiting for Services"
    
    print_info "Waiting for LocalStack..."
    for i in {1..30}; do
        if curl -s http://localhost:4566/_localstack/health > /dev/null 2>&1; then
            print_success "LocalStack is ready"
            break
        fi
        sleep 2
    done
    
    print_info "Waiting for Video API..."
    for i in {1..30}; do
        if curl -s http://localhost:8080/healthz > /dev/null 2>&1; then
            print_success "Video API is ready"
            break
        fi
        sleep 2
    done
    
    print_info "Waiting for Admin API..."
    for i in {1..30}; do
        if curl -s http://localhost:8081/healthz > /dev/null 2>&1; then
            print_success "Admin API is ready"
            break
        fi
        sleep 2
    done
    
    echo ""
}

# Main script
main() {
    clear
    
    print_header "Video App Microservices - Development Setup"
    echo ""
    
    # Parse arguments
    DETACHED=""
    NO_CACHE=""
    CLEAN=""
    SKIP_BUILD=""
    
    for arg in "$@"; do
        case $arg in
            -d|--detached)
                DETACHED="-d"
                ;;
            --no-cache)
                NO_CACHE="--no-cache"
                ;;
            --clean)
                CLEAN="--clean"
                ;;
            --skip-build)
                SKIP_BUILD="true"
                ;;
            --help)
                echo "Usage: ./dev-start.sh [options]"
                echo ""
                echo "Options:"
                echo "  -d, --detached    Run in detached mode"
                echo "  --no-cache        Build without cache"
                echo "  --clean           Remove volumes and start fresh"
                echo "  --skip-build      Skip build step (use existing images)"
                echo "  --help            Show this help message"
                echo ""
                exit 0
                ;;
            *)
                print_error "Unknown option: $arg"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
    
    # Run setup steps
    check_prerequisites
    setup_environment
    cleanup "$CLEAN"
    
    if [ -z "$SKIP_BUILD" ]; then
        build_services "$NO_CACHE"
    else
        print_info "Skipping build step"
        echo ""
    fi
    
    start_services "$DETACHED" &
    START_PID=$!
    
    if [ -n "$DETACHED" ]; then
        sleep 10
        wait_for_services
        show_services
    fi
    
    wait $START_PID
}

# Run main function
main "$@"
