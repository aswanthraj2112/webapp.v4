# 🧪 Testing & Validation Guide

Comprehensive guide for testing and validating the deployed microservices architecture.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Test Scripts](#test-scripts)
3. [Pre-Deployment Validation](#pre-deployment-validation)
4. [Post-Deployment Testing](#post-deployment-testing)
5. [Load Testing](#load-testing)
6. [Monitoring & Metrics](#monitoring--metrics)
7. [Troubleshooting](#troubleshooting)

---

## Overview

This guide covers all testing and validation procedures for the microservices architecture, including:

- ✅ Infrastructure validation
- ✅ API endpoint testing
- ✅ Load testing
- ✅ Auto-scaling validation
- ✅ Monitoring and metrics
- ✅ End-to-end video workflow

---

## Test Scripts

### Available Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `validate-aws.sh` | Verify all AWS resources | `./tests/validate-aws.sh` |
| `test-endpoints.sh` | Test all API endpoints | `ALB_DNS=<dns> ./tests/test-endpoints.sh` |
| `load-test.sh` | Load testing with Apache Bench | `ALB_DNS=<dns> ./tests/load-test.sh` |

### Script Locations

```
tests/
├── validate-aws.sh       # AWS resource validation
├── test-endpoints.sh     # API endpoint testing
└── load-test.sh          # Load testing
```

---

## Pre-Deployment Validation

### Step 1: Validate Terraform Configuration

```bash
cd terraform

# Initialize Terraform
terraform init

# Validate configuration
terraform validate

# Check what will be created
terraform plan

# Expected output:
# Plan: 50+ resources to add, 0 to change, 0 to destroy
```

### Step 2: Build Docker Images Locally

```bash
# Test Video API build
cd server/services/video-api
docker build -t video-api:test .
docker run -p 8080:8080 video-api:test

# Test in another terminal
curl http://localhost:8080/healthz

# Repeat for other services
```

### Step 3: Test with Docker Compose

```bash
# Start all services
docker-compose up -d

# Check service health
docker-compose ps

# Test endpoints
curl http://localhost:8080/healthz      # Video API
curl http://localhost:8081/api/admin/health  # Admin Service

# View logs
docker-compose logs -f

# Cleanup
docker-compose down
```

---

## Post-Deployment Testing

### Step 1: Deploy Infrastructure

```bash
cd terraform

# Deploy all resources
terraform apply

# Get ALB DNS
ALB_DNS=$(terraform output -raw alb_dns_name)
echo "ALB DNS: $ALB_DNS"

# Save for later use
export ALB_DNS
```

### Step 2: Build and Push Images

```bash
# Login to ECR
aws ecr get-login-password --region ap-southeast-2 | \
  docker login --username AWS --password-stdin $(terraform output -raw ecr_url)

# Build and push all images
./scripts/build-and-push.sh all

# Or use individual builds
./scripts/build-and-push.sh video-api
./scripts/build-and-push.sh admin-service
./scripts/build-and-push.sh transcode-worker
./scripts/build-and-push.sh s3-lambda
```

### Step 3: Validate AWS Resources

```bash
# Run validation script
./tests/validate-aws.sh

# Expected output:
# ✓ All AWS resources validated successfully!
```

**What it checks:**
- ✅ ECR repositories exist with images
- ✅ ECS cluster is active
- ✅ ECS services are running
- ✅ ALB is active with healthy targets
- ✅ Lambda function is active
- ✅ CloudWatch log groups exist
- ✅ Auto-scaling is configured

### Step 4: Test API Endpoints

```bash
# Run endpoint tests
ALB_DNS=$ALB_DNS ./tests/test-endpoints.sh

# Or with explicit DNS
ALB_DNS=n11817143-videoapp-alb-123456.ap-southeast-2.elb.amazonaws.com \
  ./tests/test-endpoints.sh
```

**What it tests:**
- ✅ Health endpoints (Video API, Admin Service)
- ✅ User signup
- ✅ User login
- ✅ Video upload
- ✅ List videos
- ✅ Get video details
- ✅ Admin login
- ✅ Admin endpoints (list users, stats)
- ✅ CORS headers

### Step 5: Manual API Testing

#### Test Health Endpoints

```bash
# Video API health
curl http://$ALB_DNS/healthz

# Admin Service health
curl http://$ALB_DNS/api/admin/health

# Expected: {"status":"healthy"}
```

#### Test Authentication

```bash
# User signup
curl -X POST http://$ALB_DNS/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!",
    "name": "Test User"
  }'

# User login
curl -X POST http://$ALB_DNS/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!"
  }'

# Save the token from response
TOKEN="<your_token_here>"
```

#### Test Video Endpoints

```bash
# List videos
curl http://$ALB_DNS/api/videos \
  -H "Authorization: Bearer $TOKEN"

# Upload video (requires actual video file)
curl -X POST http://$ALB_DNS/api/videos/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "video=@test-video.mp4" \
  -F "title=Test Video" \
  -F "description=Test Description"

# Get video details
curl http://$ALB_DNS/api/videos/<VIDEO_ID> \
  -H "Authorization: Bearer $TOKEN"
```

#### Test Admin Endpoints

```bash
# Admin login
curl -X POST http://$ALB_DNS/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "AdminPassword123!"
  }'

# Save admin token
ADMIN_TOKEN="<admin_token_here>"

# List all users
curl http://$ALB_DNS/api/admin/users \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Get system stats
curl http://$ALB_DNS/api/admin/stats \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## Load Testing

### Basic Load Test

```bash
# Run load test with defaults (10 concurrent users, 50 requests each)
ALB_DNS=$ALB_DNS ./tests/load-test.sh

# Custom configuration
ALB_DNS=$ALB_DNS \
CONCURRENT_USERS=20 \
REQUESTS_PER_USER=100 \
./tests/load-test.sh
```

### Manual Load Testing with Apache Bench

```bash
# Install Apache Bench (if not installed)
sudo apt-get install -y apache2-utils

# Test health endpoint
ab -n 1000 -c 10 http://$ALB_DNS/healthz

# Test video list endpoint
ab -n 500 -c 5 http://$ALB_DNS/api/videos

# Sustained load test (60 seconds)
ab -t 60 -c 10 http://$ALB_DNS/healthz
```

### Load Test with wrk

```bash
# Install wrk
sudo apt-get install -y wrk

# Run load test
wrk -t12 -c100 -d30s http://$ALB_DNS/healthz

# With reporting
wrk -t12 -c100 -d30s --latency http://$ALB_DNS/api/videos
```

### Analyzing Load Test Results

**Key Metrics to Monitor:**

1. **Requests per second:** Should be >100 for simple endpoints
2. **Response time:** P95 should be <500ms
3. **Error rate:** Should be <1%
4. **CPU usage:** Should stay <70% (triggers auto-scaling at 70%)
5. **Memory usage:** Should stay <80%

---

## Monitoring & Metrics

### CloudWatch Metrics

#### ECS Service Metrics

```bash
# CPU utilization
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=n11817143-videoapp-video-api \
               Name=ClusterName,Value=n11817143-videoapp-cluster \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average

# Memory utilization
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name MemoryUtilization \
  --dimensions Name=ServiceName,Value=n11817143-videoapp-video-api \
               Name=ClusterName,Value=n11817143-videoapp-cluster \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

#### ALB Metrics

```bash
# Target response time
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name TargetResponseTime \
  --dimensions Name=LoadBalancer,Value=app/n11817143-videoapp-alb/... \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average

# Request count
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name RequestCount \
  --dimensions Name=LoadBalancer,Value=app/n11817143-videoapp-alb/... \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

### CloudWatch Logs

#### View ECS Logs

```bash
# Tail logs
aws logs tail /ecs/n11817143-videoapp --follow

# Filter for errors
aws logs tail /ecs/n11817143-videoapp --follow --filter-pattern "ERROR"

# Specific service logs
aws logs tail /ecs/n11817143-videoapp --follow --filter-pattern "video-api"

# Get recent logs
aws logs tail /ecs/n11817143-videoapp --since 1h
```

#### View Lambda Logs

```bash
# Tail Lambda logs
aws logs tail /aws/lambda/n11817143-videoapp-s3-to-sqs --follow

# Filter for errors
aws logs tail /aws/lambda/n11817143-videoapp-s3-to-sqs \
  --follow --filter-pattern "ERROR"
```

### Container Insights

**Access via AWS Console:**

1. Go to **CloudWatch → Container Insights**
2. Select cluster: `n11817143-videoapp-cluster`
3. View:
   - CPU utilization
   - Memory utilization
   - Network throughput
   - Task count
   - Service performance

### Custom Dashboards

Create a CloudWatch dashboard:

```bash
# Create dashboard JSON
cat > dashboard.json << 'EOF'
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/ECS", "CPUUtilization", {"stat": "Average"}]
        ],
        "period": 300,
        "stat": "Average",
        "region": "ap-southeast-2",
        "title": "ECS CPU Utilization"
      }
    }
  ]
}
EOF

# Create dashboard
aws cloudwatch put-dashboard \
  --dashboard-name n11817143-videoapp-dashboard \
  --dashboard-body file://dashboard.json
```

---

## Auto-scaling Validation

### Test Auto-scaling

#### Step 1: Trigger Scale-Out

```bash
# Run sustained load to increase CPU
ab -t 300 -c 50 http://$ALB_DNS/api/videos

# Or use load test script
ALB_DNS=$ALB_DNS CONCURRENT_USERS=50 ./tests/load-test.sh
```

#### Step 2: Monitor Scaling Activity

```bash
# Watch service task count
watch -n 5 'aws ecs describe-services \
  --cluster n11817143-videoapp-cluster \
  --services n11817143-videoapp-video-api \
  --query "services[0].{desired:desiredCount,running:runningCount,pending:pendingCount}"'

# Check scaling activities
aws application-autoscaling describe-scaling-activities \
  --service-namespace ecs \
  --resource-id service/n11817143-videoapp-cluster/n11817143-videoapp-video-api
```

#### Step 3: Verify Scale-In

```bash
# Stop load test
# Wait 5-10 minutes for cooldown

# Check task count decreases
aws ecs describe-services \
  --cluster n11817143-videoapp-cluster \
  --services n11817143-videoapp-video-api \
  --query "services[0].{desired:desiredCount,running:runningCount}"
```

### Expected Behavior

- **Scale-out trigger:** CPU >70% or Memory >80%
- **Scale-out cooldown:** 60 seconds
- **Scale-in trigger:** CPU <50% and Memory <60%
- **Scale-in cooldown:** 300 seconds (5 minutes)
- **Min capacity:** 1 task
- **Max capacity:** 4 tasks (configurable)

---

## End-to-End Video Workflow

### Complete Video Pipeline Test

```bash
#!/bin/bash
# Complete workflow test

# 1. Upload video to S3
aws s3 cp test-video.mp4 s3://n11817143-videos/uploads/test-video.mp4

# 2. Verify S3-to-SQS Lambda triggered
aws logs tail /aws/lambda/n11817143-videoapp-s3-to-sqs --since 1m

# 3. Check SQS queue
aws sqs get-queue-attributes \
  --queue-url $(aws sqs get-queue-url \
    --queue-name n11817143-transcode-queue \
    --query QueueUrl --output text) \
  --attribute-names ApproximateNumberOfMessages

# 4. Monitor transcode worker logs
aws logs tail /ecs/n11817143-videoapp --follow --filter-pattern "transcode"

# 5. Verify transcoded output in S3
aws s3 ls s3://n11817143-videos/transcoded/

# 6. Check video status via API
curl http://$ALB_DNS/api/videos/<VIDEO_ID> \
  -H "Authorization: Bearer $TOKEN"
```

---

## Troubleshooting

### Common Issues

#### 1. Services Not Starting

**Symptom:** ECS tasks continuously restart

**Debug:**
```bash
# Check task logs
aws ecs describe-tasks \
  --cluster n11817143-videoapp-cluster \
  --tasks $(aws ecs list-tasks \
    --cluster n11817143-videoapp-cluster \
    --service-name n11817143-videoapp-video-api \
    --query 'taskArns[0]' --output text) \
  --query 'tasks[0].containers[0].{reason:reason,exitCode:exitCode}'

# View logs
aws logs tail /ecs/n11817143-videoapp --since 10m
```

**Solutions:**
- Check environment variables are set correctly
- Verify AWS credentials/IAM roles
- Check health check endpoint
- Verify database/S3/SQS connectivity

#### 2. ALB Health Checks Failing

**Symptom:** Targets showing unhealthy

**Debug:**
```bash
# Check target health
aws elbv2 describe-target-health \
  --target-group-arn <TARGET_GROUP_ARN>

# Test health endpoint directly
curl http://<TASK_IP>:8080/healthz
```

**Solutions:**
- Verify health check path is correct
- Increase health check grace period
- Check security group rules
- Verify container is listening on correct port

#### 3. High Latency

**Symptom:** Response times >1 second

**Debug:**
```bash
# Check ALB metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name TargetResponseTime \
  --dimensions Name=LoadBalancer,Value=... \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Average,Maximum
```

**Solutions:**
- Check database query performance
- Enable caching (ElastiCache)
- Optimize container resources
- Add more tasks (scale out)

#### 4. Auto-scaling Not Working

**Symptom:** Service doesn't scale despite high load

**Debug:**
```bash
# Check scaling policies
aws application-autoscaling describe-scaling-policies \
  --service-namespace ecs \
  --resource-id service/n11817143-videoapp-cluster/n11817143-videoapp-video-api

# Check alarms
aws cloudwatch describe-alarms \
  --alarm-name-prefix n11817143-videoapp
```

**Solutions:**
- Verify CloudWatch alarms are enabled
- Check IAM permissions for auto-scaling
- Verify metric thresholds are correct
- Check cooldown periods

#### 5. Lambda Not Triggering

**Symptom:** S3 uploads don't trigger transcoding

**Debug:**
```bash
# Check Lambda function
aws lambda get-function --function-name n11817143-videoapp-s3-to-sqs

# Check S3 event notifications
aws s3api get-bucket-notification-configuration \
  --bucket n11817143-videos

# View Lambda logs
aws logs tail /aws/lambda/n11817143-videoapp-s3-to-sqs --since 1h
```

**Solutions:**
- Verify S3 event notification is configured
- Check Lambda execution role permissions
- Verify SQS queue exists
- Check Lambda environment variables

---

## Performance Benchmarks

### Expected Performance

| Metric | Target | Acceptable |
|--------|--------|------------|
| **Health endpoint** | <50ms | <100ms |
| **List videos** | <200ms | <500ms |
| **Get video details** | <150ms | <400ms |
| **Video upload** | <5s for 100MB | <10s |
| **Requests per second** | >200 | >100 |
| **Error rate** | <0.1% | <1% |
| **CPU utilization** | 40-60% | <80% |
| **Memory utilization** | 50-70% | <85% |

### Capacity Planning

**Current configuration:**

- **Video API:** 2 tasks @ 0.5 vCPU, 1GB RAM
- **Admin Service:** 1 task @ 0.25 vCPU, 512MB RAM
- **Transcode Worker:** 1 task @ 1 vCPU, 2GB RAM

**Estimated capacity:**

- **Concurrent users:** ~500-1000
- **Requests per minute:** ~10,000-20,000
- **Videos per hour:** ~50-100 (transcoding)

---

## Test Checklist

### Pre-Deployment

- [ ] Terraform validates successfully
- [ ] All Docker images build locally
- [ ] Docker Compose works locally
- [ ] All unit tests pass
- [ ] Linting passes

### Post-Deployment

- [ ] All ECR repositories created
- [ ] All images pushed to ECR
- [ ] ECS cluster is active
- [ ] All ECS services running
- [ ] ALB is active
- [ ] All targets healthy
- [ ] Lambda function deployed
- [ ] CloudWatch logs working

### Functional Testing

- [ ] Health endpoints responding
- [ ] User signup works
- [ ] User login works
- [ ] Video upload works
- [ ] Video list works
- [ ] Video details work
- [ ] Admin login works
- [ ] Admin endpoints work
- [ ] CORS headers present

### Performance Testing

- [ ] Load test completed
- [ ] Response times acceptable
- [ ] Error rate acceptable
- [ ] Auto-scaling tested
- [ ] Scale-out working
- [ ] Scale-in working

### End-to-End

- [ ] Video upload to S3
- [ ] Lambda triggers on S3 event
- [ ] SQS message created
- [ ] Worker processes job
- [ ] Video transcoded
- [ ] Output in S3
- [ ] Video playable

---

## Next Steps

After successful validation:

1. **✅ Document any issues found**
2. **✅ Fine-tune auto-scaling policies**
3. **✅ Set up monitoring dashboards**
4. **✅ Configure CloudWatch alarms**
5. **✅ Proceed to Phase 7: Documentation & Cleanup**

---

**Created:** October 30, 2025  
**Student:** n11817143  
**Course:** CAB432 - Cloud Computing
