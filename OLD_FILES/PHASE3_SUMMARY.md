# 🎉 Phase 3 Complete - Local Docker Environment

## Overview

Phase 3 is now **COMPLETE**! We've created a fully functional local development environment that mirrors the production AWS infrastructure using Docker Compose and LocalStack.

---

## 📦 What Was Created

### Core Files (8 new files)

| File | Lines | Purpose |
|------|-------|---------|
| `docker-compose.dev.yml` | 314 | Complete Docker Compose configuration |
| `dev-start.sh` | 294 | Automated startup script with checks |
| `test-setup.sh` | 75 | Quick validation script |
| `.env.example` | 51 | Environment template |
| `DOCKER_SETUP.md` | 700+ | Complete documentation |
| `PHASE3_COMPLETE.md` | 200+ | Phase summary |
| `localstack-init/01-setup-aws-resources.sh` | 245 | AWS resource provisioning |
| `lambda/s3-to-sqs/Dockerfile.dev` | 18 | Lambda dev container |
| `lambda/s3-to-sqs/test-handler.js` | 150+ | Lambda test harness |

**Total: ~2,000 lines of configuration, scripts, and documentation**

---

## 🏗️ Architecture

### Services Configured

```
┌─────────────────────────────────────────────────┐
│           Docker Network: microservices          │
│                                                  │
│  ┌──────────────┐     ┌──────────────┐         │
│  │   Client     │     │  LocalStack  │         │
│  │   (Vite)     │     │  - S3        │         │
│  │   :5173      │     │  - DynamoDB  │         │
│  └──────┬───────┘     │  - SQS       │         │
│         │             │  - SSM       │         │
│         │             │  :4566       │         │
│         │             └──────┬───────┘         │
│         │                    │                  │
│         ▼                    ▼                  │
│  ┌──────────────┐     ┌──────────────┐         │
│  │  Video-API   │────▶│  Memcached   │         │
│  │   :8080      │     │   :11211     │         │
│  └──────┬───────┘     └──────────────┘         │
│         │                                       │
│         │             ┌──────────────┐         │
│  ┌──────▼───────┐     │  Transcode   │         │
│  │ Admin-API    │     │   Worker     │         │
│  │   :8081      │     │  (No port)   │         │
│  └──────────────┘     └──────┬───────┘         │
│                               │                  │
│                        ┌──────▼───────┐         │
│                        │  S3-Lambda   │         │
│                        │  (Dev mode)  │         │
│                        └──────────────┘         │
└─────────────────────────────────────────────────┘
```

### Port Mapping

| Service | Internal Port | External Port | URL |
|---------|---------------|---------------|-----|
| Client | 5173 | 5173 | http://localhost:5173 |
| Video-API | 8080 | 8080 | http://localhost:8080 |
| Admin-API | 8081 | 8081 | http://localhost:8081 |
| LocalStack | 4566 | 4566 | http://localhost:4566 |
| Memcached | 11211 | 11211 | localhost:11211 |

---

## 🚀 Quick Start Guide

### 1. Prerequisites Check

```bash
# Verify Docker installation
docker --version        # Should be >= 20.10
docker compose version  # Should be >= 2.0
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit and add your Cognito credentials
nano .env

# Required values:
# COGNITO_USER_POOL_ID=ap-southeast-2_XXXXXXXXX
# COGNITO_CLIENT_ID=your-client-id-here
```

### 3. Start Everything

```bash
# Interactive mode (see logs in real-time)
./dev-start.sh

# Or detached mode (runs in background)
./dev-start.sh -d
```

### 4. Verify Setup

```bash
# Run validation tests
./test-setup.sh

# Check service health
curl http://localhost:8080/healthz
curl http://localhost:8081/healthz
```

### 5. Access Services

- **Frontend:** http://localhost:5173
- **API Docs:** See DOCKER_SETUP.md for endpoint details

---

## ✨ Key Features

### 1. **Automated Setup**
- ✅ One-command startup (`./dev-start.sh`)
- ✅ Automatic prerequisite checking
- ✅ Environment validation
- ✅ Health checks with retry logic
- ✅ Colored output for clarity

### 2. **LocalStack Integration**
Automatically creates:
- ✅ S3 bucket with folders (raw/, transcoded/, thumbs/)
- ✅ DynamoDB table with GSI
- ✅ SQS queues (main + DLQ)
- ✅ SSM parameters
- ✅ Secrets Manager entries
- ✅ Sample test data

### 3. **Hot Reload**
All services support live code changes:
- Video-API: Edit `server/services/video-api/src/`
- Admin-API: Edit `server/services/admin-service/src/`
- Worker: Edit `server/services/transcode-worker/src/`
- Client: Edit `client/src/`

**No container restart needed!**

### 4. **Health Monitoring**
```bash
# Check all containers
docker compose -f docker-compose.dev.yml ps

# View logs (all services)
docker compose -f docker-compose.dev.yml logs -f

# View logs (specific service)
docker compose -f docker-compose.dev.yml logs -f video-api
```

### 5. **Resource Cleanup**
```bash
# Stop services
docker compose -f docker-compose.dev.yml stop

# Stop and remove containers
docker compose -f docker-compose.dev.yml down

# Full cleanup (including volumes)
docker compose -f docker-compose.dev.yml down -v

# Clean restart
./dev-start.sh --clean
```

---

## 🧪 Testing Workflow

### 1. User Authentication

```bash
# Register new user
curl -X POST http://localhost:8080/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "username": "testuser"
  }'

# Sign in
curl -X POST http://localhost:8080/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "TestPass123!"
  }'

# Save the accessToken from response
TOKEN="eyJraWQ..."
```

### 2. Video Upload

```bash
# Get presigned URL
curl -X POST http://localhost:8080/api/videos/presign \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "test.mp4",
    "contentType": "video/mp4"
  }'

# Upload to presigned URL
curl -X PUT "$PRESIGNED_URL" \
  --upload-file test.mp4 \
  -H "Content-Type: video/mp4"

# Finalize upload
curl -X POST http://localhost:8080/api/videos/finalize \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "videoId": "VIDEO_ID",
    "title": "Test Video",
    "description": "Testing"
  }'
```

### 3. Transcoding

```bash
# Trigger transcoding
curl -X POST http://localhost:8080/api/videos/$VIDEO_ID/transcode \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"resolution": "720p"}'

# Check status
curl http://localhost:8080/api/videos/$VIDEO_ID/transcoding-status \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Admin Operations

```bash
# List all users (requires admin token)
curl http://localhost:8081/api/admin/users \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# List all videos
curl http://localhost:8081/api/admin/videos \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Delete user
curl -X DELETE http://localhost:8081/api/admin/users/testuser \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## 🐛 Common Issues & Solutions

### Issue 1: Services Won't Start

**Symptoms:** Container exits immediately, port conflicts

**Solutions:**
```bash
# Check port availability
sudo lsof -i :8080
sudo lsof -i :8081
sudo lsof -i :5173

# View error logs
docker compose -f docker-compose.dev.yml logs

# Clean restart
./dev-start.sh --clean
```

### Issue 2: LocalStack Not Ready

**Symptoms:** `ECONNREFUSED`, AWS SDK errors

**Solutions:**
```bash
# Check LocalStack health
curl http://localhost:4566/_localstack/health

# Manually run init script
docker compose -f docker-compose.dev.yml exec localstack \
  bash /etc/localstack/init/ready.d/01-setup-aws-resources.sh

# Restart LocalStack
docker compose -f docker-compose.dev.yml restart localstack
```

### Issue 3: Authentication Fails

**Symptoms:** `User pool not found`, JWT errors

**Solutions:**
```bash
# Verify .env has correct Cognito values
cat .env | grep COGNITO

# Check user exists in real Cognito
aws cognito-idp list-users \
  --user-pool-id $COGNITO_USER_POOL_ID \
  --region ap-southeast-2

# Confirm user
aws cognito-idp admin-confirm-sign-up \
  --user-pool-id $COGNITO_USER_POOL_ID \
  --username testuser
```

### Issue 4: Worker Not Processing

**Symptoms:** Videos stuck in "uploaded" status

**Solutions:**
```bash
# Check worker logs
docker compose -f docker-compose.dev.yml logs transcode-worker

# Verify SQS queue
docker compose -f docker-compose.dev.yml exec localstack \
  awslocal sqs get-queue-attributes \
    --queue-url http://localstack:4566/000000000000/n11817143-transcode-queue \
    --attribute-names All

# Restart worker
docker compose -f docker-compose.dev.yml restart transcode-worker
```

---

## 📊 Development Commands

### Container Management

```bash
# List all containers
docker compose -f docker-compose.dev.yml ps

# Start specific service
docker compose -f docker-compose.dev.yml up video-api

# Restart service
docker compose -f docker-compose.dev.yml restart admin-service

# Stop all
docker compose -f docker-compose.dev.yml stop

# Remove all
docker compose -f docker-compose.dev.yml down
```

### Logs & Debugging

```bash
# Follow all logs
docker compose -f docker-compose.dev.yml logs -f

# Specific service
docker compose -f docker-compose.dev.yml logs -f transcode-worker

# Last 100 lines
docker compose -f docker-compose.dev.yml logs --tail=100 video-api

# Shell access
docker compose -f docker-compose.dev.yml exec video-api sh
docker compose -f docker-compose.dev.yml exec localstack bash
```

### Database Operations

```bash
# Scan DynamoDB
docker compose -f docker-compose.dev.yml exec localstack \
  awslocal dynamodb scan --table-name n11817143-videos

# List S3 objects
docker compose -f docker-compose.dev.yml exec localstack \
  awslocal s3 ls s3://n11817143-a2 --recursive

# Check SQS messages
docker compose -f docker-compose.dev.yml exec localstack \
  awslocal sqs receive-message \
    --queue-url http://localstack:4566/000000000000/n11817143-transcode-queue
```

---

## 📈 Performance Optimization

### Docker Resources

Recommended settings in Docker Desktop:

- **CPUs:** 4+ cores
- **Memory:** 8+ GB RAM
- **Swap:** 2 GB
- **Disk:** 50+ GB

### Build Optimization

```bash
# Use BuildKit
export DOCKER_BUILDKIT=1

# Parallel builds
docker compose -f docker-compose.dev.yml build --parallel

# No cache rebuild
./dev-start.sh --no-cache
```

---

## 🔐 Security Notes

### ⚠️ Development Only

**This setup is for LOCAL DEVELOPMENT ONLY**

**Do NOT use these configurations in production:**
- Hardcoded AWS credentials (`test`/`test`)
- No SSL/TLS
- Permissive CORS (`*`)
- Debug logging
- Exposed ports

### Production Checklist

See DOCKER_SETUP.md for full production security checklist.

---

## 📚 Documentation

| File | Description |
|------|-------------|
| `DOCKER_SETUP.md` | **Complete guide** (700+ lines) |
| `PHASE3_COMPLETE.md` | Phase summary |
| `.env.example` | Environment template |
| `docker-compose.dev.yml` | Service definitions |
| `README.md` | Project overview |

---

## 🎯 Success Criteria

Phase 3 is complete when:

- ✅ All services start without errors
- ✅ Health checks pass
- ✅ LocalStack resources created
- ✅ User can register/login
- ✅ Video upload works
- ✅ Transcoding processes
- ✅ Admin operations function
- ✅ Hot reload works

**Status: ALL CRITERIA MET ✅**

---

## 📊 Metrics

### Files Created
- Configuration: 1 (docker-compose.dev.yml)
- Scripts: 3 (dev-start.sh, test-setup.sh, init script)
- Documentation: 4 (DOCKER_SETUP.md, PHASE3_COMPLETE.md, etc.)
- Lambda testing: 2 (Dockerfile.dev, test-handler.js)

### Lines of Code
- Configuration: 314
- Scripts: 614
- Documentation: 1,000+
- **Total: ~2,000 lines**

### Services Configured
- HTTP APIs: 2 (video-api, admin-service)
- Workers: 1 (transcode-worker)
- Functions: 1 (s3-lambda dev mode)
- Infrastructure: 2 (LocalStack, Memcached)
- Client: 1 (React/Vite)
- **Total: 7 services**

---

## 🚀 Next Phase

**Phase 4: Terraform Infrastructure** is next!

Will create:
- ECS Fargate clusters
- Task definitions
- Application Load Balancer
- Auto-scaling policies
- CloudWatch alarms
- Production VPC
- Security groups
- IAM roles

---

## 🎓 Learning Outcomes

By completing Phase 3, you now have:

1. ✅ Full Docker Compose proficiency
2. ✅ LocalStack expertise for AWS emulation
3. ✅ Microservices orchestration skills
4. ✅ Development workflow automation
5. ✅ Debugging and monitoring techniques
6. ✅ Production parity in local environment

---

## 💡 Tips for Success

1. **Always run `./test-setup.sh` after starting** to verify everything is working
2. **Use `./dev-start.sh -d`** for background mode, then check logs separately
3. **Keep `.env` updated** with real Cognito credentials
4. **Monitor logs** with `docker compose -f docker-compose.dev.yml logs -f`
5. **Clean restart** with `./dev-start.sh --clean` if things get weird
6. **Read DOCKER_SETUP.md** - it has detailed troubleshooting for every issue

---

**Status:** ✅ Phase 3 Complete  
**Date:** October 30, 2025  
**Next:** Phase 4 - Terraform Infrastructure  
**Student:** n11817143  
**Course:** CAB432 - Cloud Computing
