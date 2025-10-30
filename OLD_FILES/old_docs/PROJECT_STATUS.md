# Project Status Report - October 30, 2025

## Executive Summary

**Project**: Video Application Microservices Architecture (CAB432 Assignment 3)  
**Student**: n11817143  
**Environment**: AWS ECS Fargate with Application Load Balancer  
**Current Status**: 🟡 **PARTIALLY DEPLOYED - DEBUGGING IN PROGRESS**

---

## Current Deployment State

### Infrastructure Status: ✅ DEPLOYED

| Resource Type | Name | Status | Details |
|--------------|------|--------|---------|
| ECS Cluster | n11817143-app-cluster | ✅ Running | Fargate-based |
| Application Load Balancer | n11817143-app-alb | ✅ Active | Internet-facing |
| ALB DNS | n11817143-app-alb-1811658624.ap-southeast-2.elb.amazonaws.com | ✅ Accessible | HTTP only |
| ECR Repositories | 4 repositories | ✅ Created | Images pushed |
| Target Groups | 2 groups | ✅ Created | admin + video-api |
| VPC | vpc-007bab53289655834 | ✅ Existing | aws-controltower-VPC |
| Security Group | sg-032bd1ff8cf77dbb9 | ✅ Existing | CAB432SG |

### Service Status: ⚠️ DEGRADED

| Service | Desired | Running | Health Status | Issue |
|---------|---------|---------|---------------|-------|
| **video-api** | 1 | 0 | ❌ Not Running | Crash loop - containers exit immediately |
| **admin-service** | 1 | 2 | ⚠️ Unhealthy | Tasks running but health checks timing out |
| **transcode-worker** | 1 | 1 | ✅ Running | Worker appears stable (no health check) |

### ECR Images: ✅ UP TO DATE

All images successfully pushed to ECR:
- `901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-app/video-api:latest`
- `901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-app/admin-service:latest`
- `901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-app/transcode-worker:latest`
- `901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-app/s3-to-sqs-lambda:latest`

---

## Project Structure

### Active Files and Directories

```
webapp.v5/
├── README.md                           # Main project documentation
├── ARCHITECTURE.md                     # System architecture overview
├── API_REFERENCE.md                    # API endpoints documentation
├── QUICK_REFERENCE.md                  # Quick command reference
├── QUICK_DEV_GUIDE.md                  # Development setup guide
├── DOCKER_SETUP.md                     # Docker configuration guide
├── DOCUMENTATION_INDEX.md              # Documentation overview
├── DEPLOYMENT_SESSION_LOG.md           # Detailed deployment session log
├── PROJECT_STATUS.md                   # This file
│
├── client/                             # React frontend application
│   ├── src/                           # Frontend source code
│   ├── Dockerfile                     # Frontend container config
│   ├── nginx.conf                     # Nginx configuration
│   └── package.json                   # Frontend dependencies
│
├── server/                             # Backend services
│   ├── shared/                        # Shared utilities across services
│   │   ├── auth/                      # Authentication middleware
│   │   ├── config/                    # Configuration management
│   │   ├── utils/                     # Utility functions
│   │   └── package.json               # Shared dependencies
│   │
│   └── services/                      # Microservices
│       ├── video-api/                 # Main video API service
│       │   ├── src/                   # API source code
│       │   ├── Dockerfile             # Container configuration
│       │   └── package.json           # Service dependencies
│       │
│       ├── admin-service/             # Admin operations service
│       │   ├── src/                   # Admin API source
│       │   ├── Dockerfile             # Container configuration
│       │   └── package.json           # Service dependencies
│       │
│       └── transcode-worker/          # Video processing worker
│           ├── src/                   # Worker source code
│           ├── Dockerfile             # Container configuration
│           └── package.json           # Worker dependencies
│
├── terraform/                          # Infrastructure as Code
│   ├── main.tf                        # Main Terraform configuration
│   ├── variables.tf                   # Variable definitions
│   ├── outputs.tf                     # Output definitions
│   ├── terraform.tfvars               # Variable values
│   │
│   └── modules/                       # Reusable Terraform modules
│       ├── alb/                       # Application Load Balancer
│       ├── ecr/                       # Container Registry
│       ├── ecs-cluster/               # ECS Cluster setup
│       └── ecs-service/               # Reusable ECS service module
│
├── lambda/                             # Lambda functions
│   └── s3-to-sqs/                     # S3 event to SQS trigger
│
├── scripts/                            # Utility scripts
│   ├── build-and-push.sh              # Build and push Docker images
│   ├── gather-aws-info.sh             # Collect AWS resource info
│   └── auto-configure.sh              # Auto configuration script
│
├── tests/                              # Testing scripts
│   ├── test-endpoints.sh              # API endpoint tests
│   └── load-test.sh                   # Load testing
│
└── OLD_FILES/                          # Archived/deprecated files
    ├── *.md                           # Old documentation
    ├── scripts/                       # Old utility scripts
    └── terraform_backups/             # Terraform state backups
```

---

## Implementation Status

### ✅ Completed Components

#### 1. Infrastructure (Terraform)
- [x] VPC configuration (using existing QUT VPC)
- [x] Security group configuration (using CAB432SG)
- [x] Application Load Balancer with target groups
- [x] ECR repositories for all services
- [x] ECS Cluster (Fargate)
- [x] ECS Task Definitions for all services
- [x] ECS Services with auto-scaling
- [x] CloudWatch alarms (CPU, Memory)
- [x] IAM roles (using existing QUT roles)

#### 2. Application Code
- [x] Shared utilities module
  - [x] Configuration management with Parameter Store fallback
  - [x] AWS SDK clients (S3, DynamoDB, SQS, Cognito)
  - [x] Authentication middleware (JWT, Cognito)
  - [x] Error handling utilities
  - [x] Caching utilities (ElastiCache/Memcached)
  
- [x] Video-API Service
  - [x] Express.js server setup
  - [x] Authentication endpoints (login, signup, verify)
  - [x] Video CRUD operations
  - [x] Upload/download with presigned URLs
  - [x] Caching layer integration
  - [x] Health check endpoint
  
- [x] Admin Service
  - [x] Express.js server setup
  - [x] Admin-only operations
  - [x] User management
  - [x] System statistics
  - [x] Health check endpoint
  
- [x] Transcode Worker
  - [x] SQS message polling
  - [x] Video transcoding with FFmpeg
  - [x] Status updates to DynamoDB
  - [x] Error handling and retry logic

#### 3. Docker Configuration
- [x] Dockerfiles for all services
- [x] Multi-stage builds for optimization
- [x] Health check configurations
- [x] Proper directory structure maintenance
- [x] Shared dependency installation

#### 4. AWS Resources (Pre-existing)
- [x] S3 Bucket: n11817143-a2
- [x] DynamoDB Table: n11817143-VideoApp
- [x] SQS Queue: n11817143-transcode-queue
- [x] Cognito User Pool: ap-southeast-2_CdVnmKfW
- [x] ElastiCache Cluster: n11817143-a2-cache (optional)

---

## Critical Issues & Blockers

### 🔴 Issue #1: Video-API Service Crash Loop

**Status**: BLOCKER  
**Priority**: CRITICAL  
**Impact**: Core API is not accessible

**Symptoms**:
- Tasks start but immediately exit with code 1
- Continuous restart loop
- No running containers
- Desired: 1, Running: 0

**Possible Root Causes**:
1. **Application startup failure**
   - Config initialization may be failing
   - Missing or incorrect environment variables
   - AWS SDK client initialization issues
   
2. **Dependency issues**
   - Shared module dependencies might not be fully installed
   - Import path problems in container
   
3. **AWS service connectivity**
   - Unable to reach DynamoDB, S3, or Cognito
   - Network/security group issues (unlikely as transcode-worker runs)
   
4. **Port binding issues**
   - Application may be trying to bind to wrong port or interface

**Debug Steps Needed**:
- [ ] Test Docker image locally with all env vars
- [ ] Check container logs (CloudWatch access needed)
- [ ] Verify all shared dependencies are installed
- [ ] Test if app can connect to AWS services
- [ ] Check if listening on 0.0.0.0 vs 127.0.0.1

### 🟡 Issue #2: Admin Service Health Check Failures

**Status**: DEGRADED  
**Priority**: HIGH  
**Impact**: Admin operations not accessible via ALB

**Symptoms**:
- 2 tasks running (should be 1)
- Both tasks unhealthy in target group
- Health check timeout errors
- Containers appear to be running but not responding

**Target Health**:
```
172.31.86.2    - unhealthy - Target.Timeout
172.31.78.227  - unhealthy - Target.Timeout
```

**Possible Root Causes**:
1. **Port mismatch**
   - Fixed Dockerfile to use 8081, but issue persists
   - May need to rebuild with --no-cache
   
2. **Application not starting**
   - Similar to video-api, may be failing silently
   - Health check endpoint not reachable
   
3. **Network/routing issue**
   - ALB cannot reach container health check endpoint
   - Security group may need verification
   
4. **Application binding to localhost**
   - App might be listening on 127.0.0.1 instead of 0.0.0.0
   - Container can't respond to external health checks

**Debug Steps Needed**:
- [ ] Rebuild admin-service with --no-cache
- [ ] Test direct connection to task IP: curl http://172.31.86.2:8081/healthz
- [ ] Verify Express is binding to '0.0.0.0'
- [ ] Check health check endpoint code
- [ ] Scale down to 1 task (currently 2 running)

### ✅ Non-Issue: Transcode Worker

**Status**: RUNNING  
**Priority**: N/A  
**Impact**: None - appears to be working

**Details**:
- Worker is running (1/1)
- No health check configured (as expected for background worker)
- SQS polling should be active
- Ready to process transcoding jobs

---

## Configuration Issues Fixed

### 1. ✅ QUT Compliance
- **Issue**: ECS tasks were using private subnets
- **Fix**: Changed to public subnets with public IP assignment
- **Impact**: Tasks can now pull images and access AWS services

### 2. ✅ ALB Subnet Configuration
- **Issue**: ALB was using all public subnets causing AZ conflicts
- **Fix**: Hardcoded 3 unique subnets from different AZs
- **Impact**: ALB now deploys successfully

### 3. ✅ Cognito User Pool ID Typo
- **Issue**: Hardcoded pool ID had typo (KfrW vs KfW)
- **Fix**: Use environment variable, correct fallback value
- **Impact**: Authentication should work correctly

### 4. ✅ DynamoDB Table Name
- **Issue**: terraform.tfvars had "n11817143-videos" but actual table is "n11817143-VideoApp"
- **Fix**: Updated terraform.tfvars to correct name
- **Impact**: Services can now access correct DynamoDB table

### 5. ✅ Docker Import Paths
- **Issue**: Dockerfiles copied files flat, breaking relative imports
- **Fix**: Maintain source directory structure in containers
- **Impact**: Import statements now resolve correctly

### 6. ✅ Shared Dependencies
- **Issue**: Services couldn't find shared module dependencies
- **Fix**: Install shared dependencies in Dockerfiles
- **Impact**: Shared utilities can now be imported

### 7. ✅ NPM Install Command
- **Issue**: `npm ci` requires package-lock.json
- **Fix**: Use `npm install --omit=dev` instead
- **Impact**: Dependencies install successfully

### 8. ⚠️ Admin Service Port
- **Issue**: Dockerfile used port 8080, Terraform expects 8081
- **Fix**: Updated Dockerfile to use 8081
- **Status**: Fixed but needs rebuild with --no-cache

---

## Environment Configuration

### AWS Resources
```
Region:          ap-southeast-2
Account ID:      901444280953
VPC:             vpc-007bab53289655834
Security Group:  sg-032bd1ff8cf77dbb9 (CAB432SG)
S3 Bucket:       n11817143-a2
DynamoDB:        n11817143-VideoApp
SQS Queue:       n11817143-transcode-queue
Cognito Pool:    ap-southeast-2_CdVnmKfW
Cognito Client:  1dnnr9c18vuk983t8iojkgd8e
```

### Service Ports
```
video-api:        8080 (HTTP)
admin-service:    8081 (HTTP)
transcode-worker: N/A (background worker)
```

### Auto-scaling Configuration
```
video-api:
  - Min: 1, Max: 5, Desired: 1
  - CPU target: 70%, Memory target: 80%

admin-service:
  - Min: 1, Max: 3, Desired: 1
  - CPU target: 70%, Memory target: 80%

transcode-worker:
  - Min: 0, Max: 10, Desired: 1
  - CPU target: 70%, Memory target: 80%
```

---

## API Endpoints (When Deployed)

### Video API Service
```
Base URL: http://<ALB-DNS>/api

Authentication:
  POST   /api/auth/signup     - Create new user account
  POST   /api/auth/login      - Login and get JWT token
  POST   /api/auth/verify     - Verify JWT token
  POST   /api/auth/refresh    - Refresh JWT token

Videos:
  GET    /api/videos          - List all videos (authenticated)
  GET    /api/videos/:id      - Get video details
  POST   /api/videos          - Create video metadata
  PUT    /api/videos/:id      - Update video metadata
  DELETE /api/videos/:id      - Delete video
  GET    /api/videos/:id/upload-url    - Get S3 upload URL
  GET    /api/videos/:id/download-url  - Get S3 download URL

Health:
  GET    /healthz             - Service health check
```

### Admin Service
```
Base URL: http://<ALB-DNS>/api/admin

Admin Operations (requires admin role):
  GET    /api/admin/users          - List all users
  GET    /api/admin/users/:id      - Get user details
  DELETE /api/admin/users/:id      - Delete user
  GET    /api/admin/videos         - List all videos (all users)
  GET    /api/admin/stats          - System statistics
  POST   /api/admin/cache/clear    - Clear cache

Health:
  GET    /api/admin/healthz        - Service health check
```

### ALB Routes
```
/api/*           → video-api:8080
/api/admin/*     → admin-service:8081
```

---

## Next Steps & Action Items

### Immediate Actions (Critical)

#### 1. Debug Video-API Crash Loop
**Priority**: CRITICAL  
**Estimated Time**: 2-4 hours  

Steps:
```bash
# Test Docker image locally
docker run --rm -it \
  -e NODE_ENV=prod \
  -e PORT=8080 \
  -e AWS_REGION=ap-southeast-2 \
  -e DYNAMODB_TABLE_NAME=n11817143-VideoApp \
  -e S3_BUCKET_NAME=n11817143-a2 \
  -e COGNITO_USER_POOL_ID=ap-southeast-2_CdVnmKfW \
  -e COGNITO_CLIENT_ID=1dnnr9c18vuk983t8iojkgd8e \
  -e USE_PARAMETER_STORE=false \
  901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-app/video-api:latest

# Check logs
docker logs <container-id>

# If credentials needed, add:
  -e AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID \
  -e AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY \
  -e AWS_SESSION_TOKEN=$AWS_SESSION_TOKEN \
```

**Possible Solutions**:
- Add fallback config to skip Parameter Store/Secrets Manager completely
- Ensure Express binds to 0.0.0.0 not localhost
- Verify all import paths resolve correctly
- Check if any synchronous AWS calls are blocking startup

#### 2. Fix Admin Service Health Checks
**Priority**: HIGH  
**Estimated Time**: 1-2 hours

Steps:
```bash
# Rebuild with no cache
cd /home/ubuntu/oct1/webapp.v5
docker build --no-cache \
  -f server/services/admin-service/Dockerfile \
  -t 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-app/admin-service:latest .

# Push to ECR
docker push 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-app/admin-service:latest

# Force new deployment
aws ecs update-service \
  --cluster n11817143-app-cluster \
  --service n11817143-app-admin-service \
  --force-new-deployment \
  --region ap-southeast-2

# Test locally first
docker run --rm -it -p 8081:8081 \
  -e NODE_ENV=prod -e PORT=8081 -e AWS_REGION=ap-southeast-2 \
  -e USE_PARAMETER_STORE=false \
  <image-name>
```

#### 3. Request CloudWatch Logs Access
**Priority**: HIGH  
**Estimated Time**: N/A (depends on QUT)

Current error:
```
User is not authorized to perform: logs:FilterLogEvents
```

Action: Contact QUT support to request temporary CloudWatch Logs read permission for debugging.

### Short-term Goals (This Week)

- [ ] Get all 3 services running and healthy
- [ ] Verify ALB routing works correctly
- [ ] Test authentication flow (signup, login, token verification)
- [ ] Test video upload/download flow
- [ ] Verify transcode worker processes jobs
- [ ] Load test with concurrent users
- [ ] Document any issues or limitations

### Medium-term Goals (Next Week)

- [ ] Deploy frontend client to S3/CloudFront
- [ ] Set up custom domain with Route53 (if needed)
- [ ] Configure HTTPS with ACM certificate
- [ ] Implement CloudWatch dashboards
- [ ] Set up SNS alerts for alarms
- [ ] Create deployment pipeline (CI/CD)
- [ ] Write comprehensive tests
- [ ] Performance optimization

### Long-term Goals (Before Submission)

- [ ] Complete all assignment requirements
- [ ] Write final documentation
- [ ] Create architecture diagrams
- [ ] Record demo video
- [ ] Prepare presentation materials
- [ ] Code cleanup and documentation
- [ ] Final testing and validation

---

## Known Limitations

### CloudWatch Logs
- **Issue**: IAM permissions deny access to logs:FilterLogEvents
- **Impact**: Cannot view container logs for debugging
- **Workaround**: Test Docker images locally to see stdout/stderr
- **Solution**: Request temporary CloudWatch read access from QUT

### Parameter Store / Secrets Manager
- **Issue**: Services try to load config but may fail
- **Impact**: Startup delays or failures
- **Workaround**: Services have fallback to hardcoded/env var config
- **Solution**: Set USE_PARAMETER_STORE=false (already done)

### ElastiCache
- **Issue**: Optional caching not tested
- **Impact**: May add latency on cache misses
- **Workaround**: Cache is optional, app works without it
- **Solution**: Test ElastiCache connectivity separately

### HTTPS/SSL
- **Issue**: ALB only has HTTP listener (no certificate)
- **Impact**: Insecure communication
- **Workaround**: HTTP acceptable for development/testing
- **Solution**: Add ACM certificate for production

---

## Testing Strategy

### Unit Tests
- [ ] Shared utilities (auth, config, AWS clients)
- [ ] API route handlers
- [ ] Database operations
- [ ] Caching layer

### Integration Tests
- [ ] Authentication flow
- [ ] Video upload/download
- [ ] Transcode job processing
- [ ] Admin operations

### System Tests
- [ ] End-to-end user workflows
- [ ] Load testing (concurrent users)
- [ ] Failure scenarios (service down, network issues)
- [ ] Auto-scaling behavior

### Manual Testing Checklist
```bash
# Health checks
curl http://<ALB-DNS>/healthz
curl http://<ALB-DNS>/api/admin/healthz

# Authentication
curl -X POST http://<ALB-DNS>/api/auth/signup -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","name":"Test User"}'

curl -X POST http://<ALB-DNS>/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'

# Video operations (with JWT token)
curl http://<ALB-DNS>/api/videos -H "Authorization: Bearer <token>"
```

---

## Documentation

### Available Documentation
- [README.md](README.md) - Project overview and setup
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture
- [API_REFERENCE.md](API_REFERENCE.md) - API endpoints
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - Command reference
- [QUICK_DEV_GUIDE.md](QUICK_DEV_GUIDE.md) - Development guide
- [DOCKER_SETUP.md](DOCKER_SETUP.md) - Docker configuration
- [DEPLOYMENT_SESSION_LOG.md](DEPLOYMENT_SESSION_LOG.md) - Detailed deployment log
- [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md) - Documentation index

### Documentation Needed
- [ ] Infrastructure architecture diagram
- [ ] Data flow diagrams
- [ ] Security architecture
- [ ] Deployment procedures
- [ ] Troubleshooting guide
- [ ] Performance tuning guide

---

## Cost Estimation

### Current AWS Resources
```
ECS Fargate:
  - 4 tasks × 0.5 vCPU × $0.04856/hour = ~$70/month
  - 4 tasks × 1GB memory × $0.00532/hour = ~$15/month

ALB:
  - $16.20/month base + $0.008/LCU-hour

ECR Storage:
  - ~2GB × $0.10/GB-month = $0.20/month

Data Transfer:
  - First 1GB free, then $0.114/GB

Total Estimated: ~$100-120/month
```

### Optimization Opportunities
- Scale transcode worker to 0 when idle
- Use Spot instances (not available with Fargate)
- Reduce task CPU/memory if possible
- Implement aggressive auto-scaling down

---

## Deployment Commands Quick Reference

### Build and Deploy All Services
```bash
cd /home/ubuntu/oct1/webapp.v5

# Login to ECR
aws ecr get-login-password --region ap-southeast-2 | \
  docker login --username AWS --password-stdin \
  901444280953.dkr.ecr.ap-southeast-2.amazonaws.com

# Build all images
docker build -f server/services/video-api/Dockerfile \
  -t 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-app/video-api:latest .
docker build -f server/services/admin-service/Dockerfile \
  -t 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-app/admin-service:latest .
docker build -f server/services/transcode-worker/Dockerfile \
  -t 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-app/transcode-worker:latest .

# Push all images
docker push 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-app/video-api:latest
docker push 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-app/admin-service:latest
docker push 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-app/transcode-worker:latest

# Force redeploy all services
aws ecs update-service --cluster n11817143-app-cluster \
  --service n11817143-app-video-api --force-new-deployment --region ap-southeast-2
aws ecs update-service --cluster n11817143-app-cluster \
  --service n11817143-app-admin-service --force-new-deployment --region ap-southeast-2
aws ecs update-service --cluster n11817143-app-cluster \
  --service n11817143-app-transcode-worker --force-new-deployment --region ap-southeast-2
```

---

## Contact & Support

**Student**: n11817143@qut.edu.au  
**Assignment**: CAB432 Assignment 3 - Cloud Application  
**Submission**: TBD

---

**Last Updated**: October 30, 2025 - 15:30 AEST  
**Next Review**: After resolving critical blockers  
**Status**: 🟡 Partially Deployed - Active Debugging
