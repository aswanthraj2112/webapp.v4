# ✅ Testing & Validation Checklist

Quick reference checklist for validating the deployed microservices.

---

## Pre-Deployment Checklist

### Local Development
- [ ] All services build successfully with Docker
- [ ] Docker Compose runs all services
- [ ] Can access services at localhost
- [ ] Health endpoints return 200 OK
- [ ] All unit tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)

### Terraform
- [ ] `terraform validate` passes
- [ ] `terraform plan` shows expected resources (~55 resources)
- [ ] No errors in Terraform configuration
- [ ] tfvars file configured correctly

---

## Deployment Checklist

### AWS Infrastructure
- [ ] Run `terraform apply` successfully
- [ ] ECR repositories created (4 repos)
- [ ] ECS cluster created and active
- [ ] ECS services created (3 services)
- [ ] ALB created and active
- [ ] Lambda function created
- [ ] CloudWatch log groups created

### Docker Images
- [ ] Login to ECR successful
- [ ] All images built successfully
- [ ] All images pushed to ECR
- [ ] Images tagged with both commit SHA and 'latest'

### Service Deployment
- [ ] Video API tasks running (2/2)
- [ ] Admin Service tasks running (1/1)
- [ ] Transcode Worker tasks running (1/1)
- [ ] All tasks healthy in ECS
- [ ] All ALB targets healthy

---

## Functional Testing Checklist

### Infrastructure Validation
```bash
./tests/validate-aws.sh
```

- [ ] ECR repositories exist ✓
- [ ] ECR repositories have images ✓
- [ ] ECS cluster is ACTIVE ✓
- [ ] All ECS services are ACTIVE ✓
- [ ] All ECS tasks running (running == desired) ✓
- [ ] ALB is active ✓
- [ ] ALB DNS resolves ✓
- [ ] Target groups exist ✓
- [ ] All targets healthy ✓
- [ ] Lambda function is Active ✓
- [ ] CloudWatch log groups exist ✓
- [ ] Auto-scaling configured ✓

### API Endpoint Testing
```bash
ALB_DNS=<your-alb-dns> ./tests/test-endpoints.sh
```

- [ ] Video API health check (200 OK) ✓
- [ ] Admin Service health check (200 OK) ✓
- [ ] User signup (201 Created) ✓
- [ ] User login (200 OK, returns token) ✓
- [ ] Video upload (200 OK, returns video ID) ✓
- [ ] List videos (200 OK, returns array) ✓
- [ ] Get video details (200 OK, returns object) ✓
- [ ] Admin login (200 OK, returns token) ✓
- [ ] Admin list users (200 OK, returns array) ✓
- [ ] Admin system stats (200 OK, returns stats) ✓
- [ ] CORS headers present ✓

### Manual API Testing

**Health Endpoints:**
```bash
curl http://$ALB_DNS/healthz
curl http://$ALB_DNS/api/admin/health
```
- [ ] Both return `{"status":"healthy"}` ✓

**Authentication:**
```bash
# Signup
curl -X POST http://$ALB_DNS/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","name":"Test"}'

# Login
curl -X POST http://$ALB_DNS/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```
- [ ] Signup successful or user exists ✓
- [ ] Login returns valid JWT token ✓

**Video Endpoints:**
```bash
# List videos
curl http://$ALB_DNS/api/videos \
  -H "Authorization: Bearer $TOKEN"

# Upload video
curl -X POST http://$ALB_DNS/api/videos/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "video=@test.mp4" \
  -F "title=Test" \
  -F "description=Test"
```
- [ ] List returns array of videos ✓
- [ ] Upload returns video ID ✓

---

## Load Testing Checklist

### Basic Load Test
```bash
ALB_DNS=$ALB_DNS ./tests/load-test.sh
```

- [ ] Health endpoint load test passes ✓
- [ ] Video list endpoint load test passes ✓
- [ ] Sustained load test (60s) passes ✓
- [ ] Requests per second >100 ✓
- [ ] Failed requests <1% ✓
- [ ] Mean response time <500ms ✓

### Custom Load Test
```bash
ab -n 1000 -c 10 http://$ALB_DNS/healthz
```

**Results to check:**
- [ ] Requests per second: ______ (target: >200)
- [ ] Failed requests: ______ (target: 0)
- [ ] Mean time per request: ______ ms (target: <100ms)
- [ ] 95th percentile: ______ ms (target: <500ms)

---

## Auto-scaling Validation Checklist

### Trigger Scale-Out
```bash
# Run high load
ab -t 300 -c 50 http://$ALB_DNS/api/videos
```

**Monitor:**
```bash
# Watch task count
watch -n 5 'aws ecs describe-services \
  --cluster n11817143-videoapp-cluster \
  --services n11817143-videoapp-video-api \
  --query "services[0].{desired:desiredCount,running:runningCount}"'
```

- [ ] CPU usage increases above 70% ✓
- [ ] New tasks start (desired count increases) ✓
- [ ] Tasks become healthy ✓
- [ ] Load is distributed across tasks ✓
- [ ] Response times remain acceptable ✓

### Verify Scale-In
```bash
# Stop load test and wait 5-10 minutes
```

- [ ] CPU usage decreases below 50% ✓
- [ ] Task count decreases after cooldown ✓
- [ ] Scale-in happens gradually ✓
- [ ] Minimum task count maintained ✓

---

## Monitoring & Metrics Checklist

### CloudWatch Logs
```bash
# View ECS logs
aws logs tail /ecs/n11817143-videoapp --follow

# View Lambda logs
aws logs tail /aws/lambda/n11817143-videoapp-s3-to-sqs --follow
```

- [ ] ECS logs streaming ✓
- [ ] Lambda logs streaming ✓
- [ ] No critical errors in logs ✓
- [ ] Application logs visible ✓

### CloudWatch Metrics

**ECS Service Metrics:**
```bash
# CPU utilization
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=n11817143-videoapp-video-api \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

- [ ] CPU metrics available ✓
- [ ] Memory metrics available ✓
- [ ] Network metrics available ✓
- [ ] CPU usage <80% under normal load ✓
- [ ] Memory usage <85% under normal load ✓

**ALB Metrics:**
- [ ] Request count metrics ✓
- [ ] Response time metrics ✓
- [ ] Target health metrics ✓
- [ ] Response time <500ms (P95) ✓
- [ ] Healthy host count = running task count ✓

### Container Insights
**Via AWS Console: CloudWatch → Container Insights**

- [ ] Cluster visible in Container Insights ✓
- [ ] Service metrics displayed ✓
- [ ] Task metrics displayed ✓
- [ ] No performance issues visible ✓

---

## End-to-End Video Pipeline Checklist

### Complete Workflow
```bash
# 1. Upload to S3
aws s3 cp test-video.mp4 s3://n11817143-videos/uploads/test.mp4

# 2. Check Lambda logs
aws logs tail /aws/lambda/n11817143-videoapp-s3-to-sqs --since 1m

# 3. Check SQS queue
aws sqs get-queue-attributes \
  --queue-url <QUEUE_URL> \
  --attribute-names ApproximateNumberOfMessages

# 4. Monitor worker logs
aws logs tail /ecs/n11817143-videoapp --follow --filter-pattern "transcode"

# 5. Verify output
aws s3 ls s3://n11817143-videos/transcoded/
```

- [ ] S3 upload successful ✓
- [ ] Lambda triggered by S3 event ✓
- [ ] Lambda logs show successful execution ✓
- [ ] SQS message created ✓
- [ ] Worker picks up message ✓
- [ ] Worker processes video ✓
- [ ] Transcoded video appears in S3 ✓
- [ ] Video metadata updated in DynamoDB ✓
- [ ] Video playable via API ✓

---

## Security Checklist

### Network Security
- [ ] ECS tasks in private subnets ✓
- [ ] ALB in public subnets ✓
- [ ] Security groups configured correctly ✓
- [ ] No direct internet access to tasks ✓
- [ ] NAT Gateway configured for outbound ✓

### IAM & Permissions
- [ ] Task execution role has minimal permissions ✓
- [ ] Task role has required AWS service permissions ✓
- [ ] Lambda execution role configured ✓
- [ ] No hardcoded credentials in code ✓
- [ ] Secrets stored in AWS Secrets Manager/SSM ✓

### Application Security
- [ ] JWT authentication working ✓
- [ ] Admin endpoints require admin role ✓
- [ ] CORS configured correctly ✓
- [ ] Input validation working ✓
- [ ] SQL injection protection (using parameterized queries) ✓

---

## Performance Benchmarks Checklist

### Response Times
- [ ] Health endpoint: <50ms ✓
- [ ] List videos: <200ms ✓
- [ ] Get video details: <150ms ✓
- [ ] Video upload: <5s (for 100MB) ✓
- [ ] Auth endpoints: <100ms ✓

### Throughput
- [ ] Requests per second: >200 ✓
- [ ] Concurrent users supported: >500 ✓
- [ ] Videos transcoded per hour: >50 ✓

### Resource Utilization
- [ ] CPU usage: 40-60% (normal load) ✓
- [ ] Memory usage: 50-70% (normal load) ✓
- [ ] No memory leaks detected ✓
- [ ] No CPU throttling ✓

---

## Cost Validation Checklist

### Current Costs
```bash
# Check AWS Cost Explorer
# Or use AWS CLI
aws ce get-cost-and-usage \
  --time-period Start=$(date -d '1 month ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost
```

**Expected Monthly Costs:**
- [ ] ECS Fargate: ~$40-60 ✓
- [ ] ALB: ~$20 ✓
- [ ] NAT Gateway: ~$65 (or $0 if disabled) ✓
- [ ] Data Transfer: ~$10 ✓
- [ ] CloudWatch: ~$5 ✓
- [ ] ECR: ~$1 ✓
- [ ] **Total: ~$141/month** (or ~$76 with NAT disabled) ✓

### Cost Optimization
- [ ] ECR lifecycle policies active ✓
- [ ] CloudWatch log retention configured ✓
- [ ] Auto-scaling configured (scale down when idle) ✓
- [ ] No unnecessary resources running ✓
- [ ] Consider disabling NAT Gateway for dev ✓

---

## Documentation Checklist

### Code Documentation
- [ ] All services have README files ✓
- [ ] API endpoints documented ✓
- [ ] Environment variables documented ✓
- [ ] Configuration options documented ✓

### Deployment Documentation
- [ ] Terraform deployment guide complete ✓
- [ ] CI/CD pipeline documented ✓
- [ ] Testing guide complete ✓
- [ ] Troubleshooting guide included ✓

### Architecture Documentation
- [ ] Architecture diagrams created
- [ ] Service interactions documented
- [ ] Data flow documented
- [ ] Security architecture documented

---

## Issue Tracking

### Known Issues
| Issue | Severity | Status | Notes |
|-------|----------|--------|-------|
| | | | |

### Future Improvements
- [ ] Add Redis/ElastiCache for caching
- [ ] Implement blue-green deployments
- [ ] Add API rate limiting
- [ ] Implement request tracing
- [ ] Add comprehensive monitoring dashboards
- [ ] Set up alerting (Slack/PagerDuty)

---

## Final Validation

### All Systems Green
- [ ] All infrastructure deployed ✓
- [ ] All services running ✓
- [ ] All tests passing ✓
- [ ] No critical errors ✓
- [ ] Performance acceptable ✓
- [ ] Security validated ✓
- [ ] Costs within budget ✓
- [ ] Documentation complete ✓

### Sign-off
- **Tested by:** _______________
- **Date:** _______________
- **Status:** ☐ PASS  ☐ FAIL
- **Notes:** _______________________________________________

---

## Quick Commands Reference

```bash
# Get ALB DNS
cd terraform && terraform output alb_dns_name

# Validate AWS resources
./tests/validate-aws.sh

# Test all endpoints
ALB_DNS=<dns> ./tests/test-endpoints.sh

# Run load test
ALB_DNS=<dns> ./tests/load-test.sh

# Check service status
aws ecs describe-services \
  --cluster n11817143-videoapp-cluster \
  --services n11817143-videoapp-video-api

# View logs
aws logs tail /ecs/n11817143-videoapp --follow

# Check CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=n11817143-videoapp-video-api

# Force new deployment
aws ecs update-service \
  --cluster n11817143-videoapp-cluster \
  --service n11817143-videoapp-video-api \
  --force-new-deployment
```

---

**Created:** October 30, 2025  
**Student:** n11817143  
**Course:** CAB432 - Cloud Computing
