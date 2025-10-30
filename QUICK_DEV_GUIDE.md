# Quick Reference Card - Local Development

## 🚀 Getting Started (30 seconds)

```bash
# 1. Setup (first time only)
cp .env.example .env
nano .env  # Add your Cognito credentials

# 2. Start everything
./dev-start.sh

# 3. Test it works
./test-setup.sh
```

---

## 📋 Essential Commands

### Start/Stop

```bash
# Start (interactive)
./dev-start.sh

# Start (background)
./dev-start.sh -d

# Stop all
docker compose -f docker-compose.dev.yml stop

# Clean restart
./dev-start.sh --clean

# Force rebuild
./dev-start.sh --no-cache
```

### View Logs

```bash
# All services
docker compose -f docker-compose.dev.yml logs -f

# Specific service
docker compose -f docker-compose.dev.yml logs -f video-api
docker compose -f docker-compose.dev.yml logs -f transcode-worker
docker compose -f docker-compose.dev.yml logs -f localstack

# Last 50 lines
docker compose -f docker-compose.dev.yml logs --tail=50
```

### Check Status

```bash
# Container status
docker compose -f docker-compose.dev.yml ps

# Health checks
curl http://localhost:8080/healthz  # Video API
curl http://localhost:8081/healthz  # Admin API

# Run validation
./test-setup.sh
```

---

## 🌐 Service URLs

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:5173 | React app |
| **Video API** | http://localhost:8080 | Main API |
| **Admin API** | http://localhost:8081 | Admin ops |
| **LocalStack** | http://localhost:4566 | AWS emulation |

---

## 🧪 API Testing

### Authentication

```bash
# Register
curl -X POST http://localhost:8080/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!","username":"testuser"}'

# Login
curl -X POST http://localhost:8080/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"TestPass123!"}'

# Save token
TOKEN="eyJraWQ..."
```

### Videos

```bash
# Get presigned URL
curl -X POST http://localhost:8080/api/videos/presign \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"filename":"test.mp4","contentType":"video/mp4"}'

# List videos
curl http://localhost:8080/api/videos \
  -H "Authorization: Bearer $TOKEN"

# Get video
curl http://localhost:8080/api/videos/$VIDEO_ID \
  -H "Authorization: Bearer $TOKEN"

# Trigger transcoding
curl -X POST http://localhost:8080/api/videos/$VIDEO_ID/transcode \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"resolution":"720p"}'

# Check status
curl http://localhost:8080/api/videos/$VIDEO_ID/transcoding-status \
  -H "Authorization: Bearer $TOKEN"
```

### Admin

```bash
# List users
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

## 🔧 Debugging

### Shell Access

```bash
# Video API
docker compose -f docker-compose.dev.yml exec video-api sh

# LocalStack
docker compose -f docker-compose.dev.yml exec localstack bash

# Worker
docker compose -f docker-compose.dev.yml exec transcode-worker sh
```

### AWS Resources (LocalStack)

```bash
# S3
docker compose -f docker-compose.dev.yml exec localstack \
  awslocal s3 ls s3://n11817143-a2

# DynamoDB
docker compose -f docker-compose.dev.yml exec localstack \
  awslocal dynamodb scan --table-name n11817143-videos

# SQS
docker compose -f docker-compose.dev.yml exec localstack \
  awslocal sqs get-queue-attributes \
    --queue-url http://localstack:4566/000000000000/n11817143-transcode-queue \
    --attribute-names All
```

### Restart Services

```bash
# Restart one service
docker compose -f docker-compose.dev.yml restart video-api

# Restart worker
docker compose -f docker-compose.dev.yml restart transcode-worker

# Restart LocalStack
docker compose -f docker-compose.dev.yml restart localstack
```

---

## 🐛 Common Issues

### Port Already in Use
```bash
# Find what's using the port
sudo lsof -i :8080

# Kill the process
kill -9 PID

# Or change port in docker-compose.dev.yml
```

### LocalStack Not Ready
```bash
# Check health
curl http://localhost:4566/_localstack/health

# Restart
docker compose -f docker-compose.dev.yml restart localstack

# Rerun init
docker compose -f docker-compose.dev.yml exec localstack \
  bash /etc/localstack/init/ready.d/01-setup-aws-resources.sh
```

### Worker Not Processing
```bash
# Check logs
docker compose -f docker-compose.dev.yml logs transcode-worker

# Check queue
docker compose -f docker-compose.dev.yml exec localstack \
  awslocal sqs receive-message \
    --queue-url http://localstack:4566/000000000000/n11817143-transcode-queue

# Restart worker
docker compose -f docker-compose.dev.yml restart transcode-worker
```

### Authentication Fails
```bash
# Verify .env
cat .env | grep COGNITO

# Check user exists
aws cognito-idp list-users \
  --user-pool-id $COGNITO_USER_POOL_ID \
  --region ap-southeast-2

# Confirm user
aws cognito-idp admin-confirm-sign-up \
  --user-pool-id $COGNITO_USER_POOL_ID \
  --username testuser
```

---

## 🧹 Cleanup

```bash
# Stop services (keep data)
docker compose -f docker-compose.dev.yml stop

# Remove containers (keep volumes)
docker compose -f docker-compose.dev.yml down

# Full cleanup (remove everything)
docker compose -f docker-compose.dev.yml down -v

# Prune Docker system
docker system prune -a --volumes
```

---

## 📊 Monitoring

### Container Stats

```bash
# Real-time stats
docker stats

# Container list
docker compose -f docker-compose.dev.yml ps

# Network info
docker network ls
docker network inspect microservices-network
```

### Resource Usage

```bash
# Disk usage
docker system df

# Image sizes
docker images

# Volume usage
docker volume ls
```

---

## 🔍 Useful Aliases

Add to your `~/.bashrc`:

```bash
# Docker Compose shortcuts
alias dc='docker compose -f docker-compose.dev.yml'
alias dcup='./dev-start.sh -d'
alias dcdown='docker compose -f docker-compose.dev.yml down'
alias dclogs='docker compose -f docker-compose.dev.yml logs -f'
alias dcps='docker compose -f docker-compose.dev.yml ps'
alias dctest='./test-setup.sh'

# LocalStack shortcuts
alias aws-local='docker compose -f docker-compose.dev.yml exec localstack awslocal'
alias s3-local='aws-local s3'
alias dynamo-local='aws-local dynamodb'
alias sqs-local='aws-local sqs'
```

Then use:
```bash
dcup              # Start services
dclogs            # View logs
dctest            # Run tests
s3-local ls       # List S3 buckets
dynamo-local list-tables  # List DynamoDB tables
```

---

## 📚 Documentation Links

- **Full Setup Guide:** `DOCKER_SETUP.md` (700+ lines)
- **Phase Summary:** `PHASE3_SUMMARY.md`
- **Architecture:** `MICROSERVICES_SUMMARY.md`
- **Environment:** `.env.example`

---

## 🎯 Daily Workflow

```bash
# Morning: Start services
./dev-start.sh -d

# Check everything is running
./test-setup.sh

# Develop (code changes auto-reload)
# Edit files in:
#   - server/services/video-api/src/
#   - server/services/admin-service/src/
#   - server/services/transcode-worker/src/
#   - client/src/

# View logs as you work
docker compose -f docker-compose.dev.yml logs -f video-api

# Test your changes
curl http://localhost:8080/api/...

# Evening: Stop services
docker compose -f docker-compose.dev.yml stop

# Weekly: Clean restart
./dev-start.sh --clean
```

---

## 📦 File Structure

```
webapp.v5/
├── docker-compose.dev.yml       # Main compose file
├── dev-start.sh                 # Startup script ⭐
├── test-setup.sh                # Validation script ⭐
├── .env                         # Your config (gitignored)
├── .env.example                 # Template
├── DOCKER_SETUP.md              # Full guide (READ THIS)
├── PHASE3_SUMMARY.md            # Phase summary
├── localstack-init/
│   └── 01-setup-aws-resources.sh  # AWS setup
└── lambda/s3-to-sqs/
    ├── Dockerfile.dev           # Dev container
    └── test-handler.js          # Test harness
```

---

## 💡 Pro Tips

1. **Use detached mode** (`-d`) and view logs separately
2. **Run `./test-setup.sh`** after every start
3. **Monitor worker logs** to see transcoding progress
4. **Use `--clean`** if things get weird
5. **Read error messages** in logs carefully
6. **Check LocalStack health** first when debugging AWS issues
7. **Keep `.env` updated** with real Cognito credentials

---

## 🆘 Need Help?

1. Check `DOCKER_SETUP.md` troubleshooting section
2. View logs: `docker compose -f docker-compose.dev.yml logs -f`
3. Validate setup: `./test-setup.sh`
4. Clean restart: `./dev-start.sh --clean`
5. Check this reference card for common commands

---

**Last Updated:** October 30, 2025  
**Phase:** 3 Complete ✅  
**Next:** Phase 4 - Terraform Infrastructure
