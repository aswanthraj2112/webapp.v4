# Docker Development Setup Guide

Complete guide for running the microservices architecture locally with Docker Compose.

---

## 🏗️ Architecture Overview

The development environment consists of:

1. **LocalStack** - AWS service emulation (S3, SQS, DynamoDB, SSM, Secrets Manager)
2. **Memcached** - Cache service
3. **Video-API** - Main API service (port 8080)
4. **Admin-Service** - Admin operations (port 8081)
5. **Transcode-Worker** - Background video processing
6. **S3-Lambda** - S3 event handler (development mode)
7. **Client** - React frontend (port 5173)

---

## 📋 Prerequisites

### Required Software

- **Docker** >= 20.10
- **Docker Compose** >= 2.0
- **Node.js** >= 18 (for local development)
- **AWS Account** (for Cognito only)

### Installation

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install docker.io docker-compose-v2

# macOS (Homebrew)
brew install docker docker-compose

# Windows
# Download Docker Desktop from https://docker.com
```

### Verify Installation

```bash
docker --version
docker compose version
```

---

## 🚀 Quick Start

### 1. Clone and Navigate

```bash
cd /home/ubuntu/oct1/webapp.v5
```

### 2. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env and add your Cognito credentials
nano .env
```

**Required values in `.env`:**

```env
COGNITO_USER_POOL_ID=ap-southeast-2_XXXXXXXXX
COGNITO_CLIENT_ID=your-client-id-here
COGNITO_REGION=ap-southeast-2
```

### 3. Make Scripts Executable

```bash
chmod +x localstack-init/01-setup-aws-resources.sh
```

### 4. Build and Start Services

```bash
# Build all services
docker compose -f docker-compose.dev.yml build

# Start all services
docker compose -f docker-compose.dev.yml up

# Or run in detached mode
docker compose -f docker-compose.dev.yml up -d
```

### 5. Verify Services

```bash
# Check all containers are running
docker compose -f docker-compose.dev.yml ps

# Check logs
docker compose -f docker-compose.dev.yml logs -f
```

### 6. Access Services

| Service | URL | Description |
|---------|-----|-------------|
| **Client** | http://localhost:5173 | React frontend |
| **Video API** | http://localhost:8080 | Main API endpoints |
| **Admin API** | http://localhost:8081 | Admin operations |
| **LocalStack** | http://localhost:4566 | AWS services |
| **Memcached** | localhost:11211 | Cache service |

---

## 🔧 Detailed Setup

### LocalStack Initialization

LocalStack automatically runs the initialization script on startup:

**What gets created:**

1. **S3 Bucket:** `n11817143-a2`
   - Folders: `raw/`, `transcoded/`, `thumbs/`
   - CORS configuration
   - Versioning enabled

2. **DynamoDB Table:** `n11817143-videos`
   - Primary key: `videoId` (String)
   - GSI: `userId-uploadDate-index`
   - Pay-per-request billing

3. **SQS Queues:**
   - Main queue: `n11817143-transcode-queue`
   - Dead letter queue: `n11817143-transcode-dlq`
   - Visibility timeout: 600s (10 minutes)
   - Max receive count: 3

4. **SSM Parameters:**
   - `/videoapp/dev/jwt-secret`
   - `/videoapp/dev/s3-bucket`
   - `/videoapp/dev/dynamodb-table`
   - `/videoapp/dev/sqs-queue-url`

5. **Sample Data:**
   - One test video entry in DynamoDB

### Verify LocalStack Resources

```bash
# List S3 buckets
docker compose -f docker-compose.dev.yml exec localstack \
  awslocal s3 ls

# List DynamoDB tables
docker compose -f docker-compose.dev.yml exec localstack \
  awslocal dynamodb list-tables

# List SQS queues
docker compose -f docker-compose.dev.yml exec localstack \
  awslocal sqs list-queues

# Get SSM parameters
docker compose -f docker-compose.dev.yml exec localstack \
  awslocal ssm describe-parameters
```

---

## 🧪 Testing the System

### 1. Health Checks

```bash
# Video API health
curl http://localhost:8080/healthz

# Admin API health
curl http://localhost:8081/healthz

# Expected response:
# {"status":"ok","timestamp":"2025-10-30T..."}
```

### 2. User Registration

```bash
curl -X POST http://localhost:8080/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "username": "testuser"
  }'
```

### 3. User Sign In

```bash
curl -X POST http://localhost:8080/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "TestPass123!"
  }'

# Save the accessToken from response
```

### 4. Upload Video

```bash
# Step 1: Get presigned URL
curl -X POST http://localhost:8080/api/videos/presign \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "test-video.mp4",
    "contentType": "video/mp4"
  }'

# Step 2: Upload to S3 (use presignedUrl from response)
curl -X PUT "PRESIGNED_URL" \
  --upload-file test-video.mp4 \
  -H "Content-Type: video/mp4"

# Step 3: Finalize upload
curl -X POST http://localhost:8080/api/videos/finalize \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "videoId": "VIDEO_ID_FROM_PRESIGN",
    "title": "Test Video",
    "description": "Testing upload flow"
  }'
```

### 5. Trigger Transcoding

```bash
curl -X POST http://localhost:8080/api/videos/VIDEO_ID/transcode \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resolution": "720p"
  }'
```

### 6. Check Transcoding Status

```bash
curl http://localhost:8080/api/videos/VIDEO_ID/transcoding-status \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 7. Admin Operations

```bash
# List all users (requires admin token)
curl http://localhost:8081/api/admin/users \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"

# List all videos
curl http://localhost:8081/api/admin/videos \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. LocalStack Not Initializing

**Symptom:** Resources not created, services can't connect

**Solution:**
```bash
# Check LocalStack logs
docker compose -f docker-compose.dev.yml logs localstack

# Restart LocalStack
docker compose -f docker-compose.dev.yml restart localstack

# Manually run init script
docker compose -f docker-compose.dev.yml exec localstack \
  bash /etc/localstack/init/ready.d/01-setup-aws-resources.sh
```

#### 2. Services Can't Connect to LocalStack

**Symptom:** `ECONNREFUSED` errors, AWS SDK timeouts

**Solution:**
```bash
# Verify network connectivity
docker compose -f docker-compose.dev.yml exec video-api \
  ping localstack

# Check environment variables
docker compose -f docker-compose.dev.yml exec video-api \
  env | grep AWS

# Ensure AWS_ENDPOINT is set correctly
AWS_ENDPOINT=http://localstack:4566
```

#### 3. Cognito Authentication Fails

**Symptom:** `User pool not found`, `Invalid credentials`

**Solution:**
```bash
# Verify .env file has correct Cognito values
cat .env | grep COGNITO

# Ensure user exists in Cognito
aws cognito-idp list-users \
  --user-pool-id YOUR_POOL_ID \
  --region ap-southeast-2

# Check if user needs confirmation
aws cognito-idp admin-confirm-sign-up \
  --user-pool-id YOUR_POOL_ID \
  --username testuser \
  --region ap-southeast-2
```

#### 4. Video Upload Fails

**Symptom:** 403 Forbidden, presigned URL errors

**Solution:**
```bash
# Check S3 bucket exists
docker compose -f docker-compose.dev.yml exec localstack \
  awslocal s3 ls s3://n11817143-a2

# Verify CORS configuration
docker compose -f docker-compose.dev.yml exec localstack \
  awslocal s3api get-bucket-cors --bucket n11817143-a2

# Check S3 force path style is enabled
S3_FORCE_PATH_STYLE=true
```

#### 5. Transcode Worker Not Processing

**Symptom:** Videos stuck in "uploaded" status

**Solution:**
```bash
# Check worker logs
docker compose -f docker-compose.dev.yml logs transcode-worker

# Verify SQS queue has messages
docker compose -f docker-compose.dev.yml exec localstack \
  awslocal sqs get-queue-attributes \
    --queue-url http://localstack:4566/000000000000/n11817143-transcode-queue \
    --attribute-names All

# Check dead letter queue
docker compose -f docker-compose.dev.yml exec localstack \
  awslocal sqs receive-message \
    --queue-url http://localstack:4566/000000000000/n11817143-transcode-dlq
```

#### 6. Port Already in Use

**Symptom:** `bind: address already in use`

**Solution:**
```bash
# Find process using port
sudo lsof -i :8080

# Kill process
kill -9 PID

# Or change port in docker-compose.dev.yml
ports:
  - "8090:8080"  # Changed from 8080:8080
```

---

## 🔍 Monitoring and Debugging

### View Logs

```bash
# All services
docker compose -f docker-compose.dev.yml logs -f

# Specific service
docker compose -f docker-compose.dev.yml logs -f video-api

# Last 100 lines
docker compose -f docker-compose.dev.yml logs --tail=100 transcode-worker
```

### Inspect Containers

```bash
# List running containers
docker compose -f docker-compose.dev.yml ps

# Container stats (CPU, memory)
docker stats

# Execute commands in container
docker compose -f docker-compose.dev.yml exec video-api sh

# Inspect container details
docker compose -f docker-compose.dev.yml inspect video-api
```

### Database Queries

```bash
# Query DynamoDB
docker compose -f docker-compose.dev.yml exec localstack \
  awslocal dynamodb scan \
    --table-name n11817143-videos

# Get specific video
docker compose -f docker-compose.dev.yml exec localstack \
  awslocal dynamodb get-item \
    --table-name n11817143-videos \
    --key '{"videoId":{"S":"VIDEO_ID"}}'
```

### Queue Monitoring

```bash
# Check queue depth
docker compose -f docker-compose.dev.yml exec localstack \
  awslocal sqs get-queue-attributes \
    --queue-url http://localstack:4566/000000000000/n11817143-transcode-queue \
    --attribute-names ApproximateNumberOfMessages

# Peek at messages (without deleting)
docker compose -f docker-compose.dev.yml exec localstack \
  awslocal sqs receive-message \
    --queue-url http://localstack:4566/000000000000/n11817143-transcode-queue \
    --max-number-of-messages 1
```

---

## 🛠️ Development Workflow

### Hot Reload

All services are configured with volume mounts for hot reloading:

```yaml
volumes:
  - ./server/services/video-api/src:/app/src
  - ./server/shared:/app/shared
```

**Changes automatically reload** - no restart needed!

### Making Changes

1. **Edit code** in `server/services/*/src/`
2. **Watch logs** to see reload:
   ```bash
   docker compose -f docker-compose.dev.yml logs -f video-api
   ```
3. **Test changes** immediately

### Adding Dependencies

```bash
# Add to package.json
cd server/services/video-api
npm install new-package --save

# Rebuild container
docker compose -f docker-compose.dev.yml build video-api

# Restart service
docker compose -f docker-compose.dev.yml restart video-api
```

### Database Migrations

```bash
# Add new DynamoDB attributes
docker compose -f docker-compose.dev.yml exec localstack \
  awslocal dynamodb update-table \
    --table-name n11817143-videos \
    --attribute-definitions AttributeName=newField,AttributeType=S
```

---

## 🧹 Cleanup

### Stop Services

```bash
# Stop all services (preserves data)
docker compose -f docker-compose.dev.yml stop

# Stop and remove containers (preserves volumes)
docker compose -f docker-compose.dev.yml down

# Remove everything including volumes
docker compose -f docker-compose.dev.yml down -v
```

### Reset Environment

```bash
# Complete cleanup
docker compose -f docker-compose.dev.yml down -v --remove-orphans

# Remove all images
docker compose -f docker-compose.dev.yml down --rmi all

# Prune everything
docker system prune -a --volumes
```

### Restart Fresh

```bash
# Full reset and restart
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml build --no-cache
docker compose -f docker-compose.dev.yml up
```

---

## 📊 Performance Tips

### Resource Allocation

Edit Docker Desktop settings:

- **CPUs:** 4+ cores
- **Memory:** 8+ GB
- **Swap:** 2 GB
- **Disk:** 50+ GB

### Build Optimization

```bash
# Use BuildKit for faster builds
export DOCKER_BUILDKIT=1
docker compose -f docker-compose.dev.yml build

# Parallel builds
docker compose -f docker-compose.dev.yml build --parallel
```

### Reduce Log Verbosity

In `docker-compose.dev.yml`:

```yaml
environment:
  - LOG_LEVEL=info  # Change from 'debug'
```

---

## 🔐 Security Notes

### Development Only

⚠️ **This setup is for LOCAL DEVELOPMENT ONLY**

**Do NOT use in production:**
- Hardcoded AWS credentials (`test` / `test`)
- Exposed ports without authentication
- No SSL/TLS encryption
- Permissive CORS settings
- Debug logging enabled

### Production Checklist

- [ ] Use AWS IAM roles (no hardcoded credentials)
- [ ] Enable SSL/TLS with valid certificates
- [ ] Restrict CORS origins
- [ ] Use AWS Secrets Manager for sensitive data
- [ ] Enable CloudWatch logging
- [ ] Set up WAF rules
- [ ] Implement rate limiting
- [ ] Use VPC for private networking
- [ ] Enable encryption at rest and in transit

---

## 📚 Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [LocalStack Documentation](https://docs.localstack.cloud/)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)

---

## 🆘 Getting Help

If you encounter issues:

1. **Check logs:** `docker compose -f docker-compose.dev.yml logs -f`
2. **Review this guide:** Especially the troubleshooting section
3. **Verify configuration:** Ensure `.env` is correct
4. **Test components:** Use curl commands to isolate issues
5. **Check GitHub Issues:** Similar problems may have solutions

---

*Last Updated: October 30, 2025*  
*Assignment: CAB432 A3 - Microservices Architecture*
