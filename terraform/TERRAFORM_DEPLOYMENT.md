# Terraform Deployment Guide - Microservices Architecture

Complete guide for deploying the microservices architecture to AWS using Terraform.

---

## 📋 Prerequisites

### 1. Required Tools

```bash
# Terraform
terraform --version  # Should be >= 1.5.0

# AWS CLI
aws --version        # Should be >= 2.0

# Docker
docker --version     # For building images
```

### 2. AWS Credentials

```bash
# Configure AWS CLI
aws configure

# Verify access
aws sts get-caller-identity
```

### 3. Existing AWS Resources

Before deploying, ensure these exist:
- ✅ S3 Bucket: `n11817143-a2`
- ✅ DynamoDB Table: `n11817143-videos`
- ✅ Cognito User Pool with App Client
- ✅ SQS Queue: `n11817143-transcode-queue`
- ✅ SSM Parameter: `/videoapp/prod/jwt-secret`

---

## 🚀 Step-by-Step Deployment

### Phase 1: Prepare Configuration

#### 1.1 Copy Variables File

```bash
cd terraform
cp terraform-microservices.tfvars.example terraform.tfvars
```

#### 1.2 Edit terraform.tfvars

```bash
nano terraform.tfvars
```

**Required changes:**
```hcl
cognito_user_pool_id = "ap-southeast-2_XXXXXXXXX"  # Your User Pool ID
cognito_client_id    = "your-client-id-here"       # Your App Client ID
```

**Optional changes:**
```hcl
# Cost Optimization for Development
enable_nat_gateway = false  # Saves ~$32/month per NAT Gateway
video_api_desired_count = 1
transcode_worker_desired_count = 0  # Start with 0, scale up when needed

# Production Settings
enable_nat_gateway = true
acm_certificate_arn = "arn:aws:acm:..."  # For HTTPS
enable_alb_deletion_protection = true
log_retention_days = 30
```

#### 1.3 Create SSM Parameter (if not exists)

```bash
aws ssm put-parameter \
  --name "/videoapp/prod/jwt-secret" \
  --value "your-secure-jwt-secret-change-this" \
  --type "SecureString" \
  --region ap-southeast-2
```

---

### Phase 2: Build and Push Docker Images

#### 2.1 Create ECR Repositories First

```bash
# Initialize Terraform with just ECR module
terraform init
terraform plan -target=module.ecr
terraform apply -target=module.ecr
```

#### 2.2 Login to ECR

```bash
# Get login command
aws ecr get-login-password --region ap-southeast-2 | \
  docker login --username AWS --password-stdin \
  $(aws sts get-caller-identity --query Account --output text).dkr.ecr.ap-southeast-2.amazonaws.com
```

#### 2.3 Build and Push Images

```bash
# Navigate to project root
cd ..

# Get ECR URLs
VIDEO_API_REPO=$(terraform -chdir=terraform output -raw video_api_repository_url 2>/dev/null)
ADMIN_REPO=$(terraform -chdir=terraform output -raw admin_service_repository_url 2>/dev/null)
WORKER_REPO=$(terraform -chdir=terraform output -raw transcode_worker_repository_url 2>/dev/null)
LAMBDA_REPO=$(terraform -chdir=terraform output -raw s3_lambda_repository_url 2>/dev/null)

# Build Video API
docker build -t $VIDEO_API_REPO:latest ./server/services/video-api
docker push $VIDEO_API_REPO:latest

# Build Admin Service
docker build -t $ADMIN_REPO:latest ./server/services/admin-service
docker push $ADMIN_REPO:latest

# Build Transcode Worker
docker build -t $WORKER_REPO:latest ./server/services/transcode-worker
docker push $WORKER_REPO:latest

# Build Lambda (production Dockerfile)
docker build -t $LAMBDA_REPO:latest -f ./lambda/s3-to-sqs/Dockerfile ./lambda/s3-to-sqs
docker push $LAMBDA_REPO:latest
```

Or use the helper script (to be created):

```bash
./scripts/build-and-push.sh
```

---

### Phase 3: Deploy Infrastructure

#### 3.1 Review Plan

```bash
cd terraform

# Review changes
terraform plan
```

Expected resources to be created:
- **VPC:** 1 VPC, 4 subnets (2 public, 2 private), 2 NAT Gateways, Internet Gateway
- **Security Groups:** 6 security groups (ALB, Video API, Admin, Worker, ElastiCache, Lambda)
- **ALB:** 1 ALB, 2 target groups, 1 listener, 2 listener rules
- **ECS:** 1 cluster, 3 services, 3 task definitions
- **ECR:** 4 repositories with lifecycle policies
- **IAM:** 2 roles (execution + task) with policies
- **CloudWatch:** Log group, 6+ alarms
- **Auto-scaling:** 6 auto-scaling targets and policies

**Total:** ~50-60 resources

#### 3.2 Apply Configuration

```bash
# Apply all resources
terraform apply

# Review and confirm with 'yes'
```

Expected time: 10-15 minutes

#### 3.3 Verify Deployment

```bash
# Check services
aws ecs list-services --cluster n11817143-videoapp-cluster

# Check tasks
aws ecs list-tasks --cluster n11817143-videoapp-cluster

# Check ALB
aws elbv2 describe-load-balancers \
  --names n11817143-videoapp-alb
```

---

### Phase 4: Configure DNS (Optional)

#### 4.1 Get ALB DNS Name

```bash
terraform output alb_dns_name
# Example: n11817143-videoapp-alb-1234567890.ap-southeast-2.elb.amazonaws.com
```

#### 4.2 Create Route 53 Record

```bash
# Option 1: Using AWS Console
# Go to Route 53 → Hosted Zones → cab432.com
# Create CNAME record: videoapp.cab432.com → ALB DNS name

# Option 2: Using AWS CLI
aws route53 change-resource-record-sets \
  --hosted-zone-id Z02680423BHWEVRU2JZDQ \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "videoapp.cab432.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "'"$(terraform output -raw alb_dns_name)"'"}]
      }
    }]
  }'
```

#### 4.3 Update Client Configuration

```bash
# Update client/.env or client API URL
VITE_API_URL=http://videoapp.cab432.com/api
VITE_ADMIN_API_URL=http://videoapp.cab432.com/api/admin
```

---

### Phase 5: Test Deployment

#### 5.1 Health Checks

```bash
ALB_DNS=$(terraform output -raw alb_dns_name)

# Test Video API
curl http://$ALB_DNS/healthz

# Test Admin API (through path-based routing)
curl http://$ALB_DNS/api/admin/healthz
```

Expected: `{"status":"ok","timestamp":"..."}`

#### 5.2 Authentication

```bash
# Register user
curl -X POST http://$ALB_DNS/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "username": "testuser"
  }'

# Sign in
curl -X POST http://$ALB_DNS/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "TestPass123!"
  }'
```

#### 5.3 Video Upload Flow

```bash
# Get presigned URL
curl -X POST http://$ALB_DNS/api/videos/presign \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "test.mp4",
    "contentType": "video/mp4"
  }'
```

---

## 📊 Monitoring and Logs

### CloudWatch Logs

```bash
# Video API logs
aws logs tail /ecs/n11817143-videoapp --follow \
  --filter-pattern "video-api"

# Admin Service logs
aws logs tail /ecs/n11817143-videoapp --follow \
  --filter-pattern "admin-service"

# Worker logs
aws logs tail /ecs/n11817143-videoapp --follow \
  --filter-pattern "transcode-worker"
```

### CloudWatch Alarms

```bash
# List alarms
aws cloudwatch describe-alarms \
  --alarm-name-prefix "n11817143-videoapp"

# Check alarm state
aws cloudwatch describe-alarms \
  --state-value ALARM
```

### Container Insights

```bash
# View metrics in AWS Console
# CloudWatch → Container Insights → n11817143-videoapp-cluster
```

---

## 🔄 Updates and Rollbacks

### Update Service Code

```bash
# 1. Build new image
docker build -t $VIDEO_API_REPO:v1.1 ./server/services/video-api

# 2. Push to ECR
docker push $VIDEO_API_REPO:v1.1

# 3. Update terraform.tfvars
video_api_image_tag = "v1.1"

# 4. Apply changes
terraform apply

# Or force update without changing image tag
aws ecs update-service \
  --cluster n11817143-videoapp-cluster \
  --service n11817143-videoapp-video-api \
  --force-new-deployment
```

### Scale Services

```bash
# Update terraform.tfvars
video_api_desired_count = 4
transcode_worker_desired_count = 2

# Apply changes
terraform apply

# Or use AWS CLI
aws ecs update-service \
  --cluster n11817143-videoapp-cluster \
  --service n11817143-videoapp-video-api \
  --desired-count 4
```

### Rollback

```bash
# Terraform rollback
terraform apply -target=module.video_api_service \
  -var="video_api_image_tag=previous-version"

# Or ECS rollback
aws ecs update-service \
  --cluster n11817143-videoapp-cluster \
  --service n11817143-videoapp-video-api \
  --task-definition n11817143-videoapp-video-api:PREVIOUS_REVISION
```

---

## 🧹 Cleanup

### Destroy Infrastructure

```bash
# Review what will be destroyed
terraform plan -destroy

# Destroy all resources
terraform destroy

# Confirm with 'yes'
```

**Note:** This will delete:
- ECS services and tasks
- ALB and target groups
- VPC and networking
- ECR repositories (images will be deleted)
- CloudWatch logs

**Will NOT delete:**
- S3 bucket and objects
- DynamoDB table and data
- Cognito User Pool
- SQS queue
- SSM parameters

### Partial Cleanup

```bash
# Stop services but keep infrastructure
terraform apply -var="video_api_desired_count=0" \
  -var="admin_service_desired_count=0" \
  -var="transcode_worker_desired_count=0"

# Or use AWS CLI
aws ecs update-service --cluster n11817143-videoapp-cluster \
  --service n11817143-videoapp-video-api --desired-count 0
```

---

## 💰 Cost Estimation

### Monthly Costs (2 AZs)

| Resource | Configuration | Monthly Cost |
|----------|---------------|--------------|
| **ECS Fargate** | 3 services, variable tasks | ~$30-60 |
| **ALB** | 1 load balancer | ~$20 |
| **NAT Gateway** | 2 gateways (1 per AZ) | ~$65 |
| **Data Transfer** | Moderate usage | ~$10 |
| **CloudWatch** | Logs + metrics | ~$5 |
| **ECR** | Image storage | ~$1 |
| **Total** | | **~$131-161/month** |

### Cost Optimization

```hcl
# Development (terraform.tfvars)
enable_nat_gateway = false  # Save $65/month
video_api_desired_count = 1
admin_service_desired_count = 1
transcode_worker_desired_count = 0
transcode_worker_min_capacity = 0

# Estimated: ~$50-60/month
```

---

## 🐛 Troubleshooting

### Issue 1: Services Won't Start

```bash
# Check task logs
aws logs tail /ecs/n11817143-videoapp --follow

# Check task stopped reason
aws ecs describe-tasks \
  --cluster n11817143-videoapp-cluster \
  --tasks TASK_ID
```

Common causes:
- Missing environment variables
- Invalid Cognito credentials
- IAM permission issues
- Image pull errors

### Issue 2: ALB Health Checks Failing

```bash
# Check target health
aws elbv2 describe-target-health \
  --target-group-arn TARGET_GROUP_ARN

# Check security groups
aws ec2 describe-security-groups \
  --group-ids SG_ID
```

Common causes:
- Port mismatch
- Health check path incorrect (`/healthz`)
- Security group not allowing ALB → ECS traffic

### Issue 3: Auto-scaling Not Working

```bash
# Check scaling policies
aws application-autoscaling describe-scaling-policies \
  --service-namespace ecs

# Check CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=n11817143-videoapp-video-api \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

---

## 📚 Additional Resources

- **Terraform AWS Provider:** https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- **ECS Fargate Documentation:** https://docs.aws.amazon.com/ecs/
- **Application Load Balancer:** https://docs.aws.amazon.com/elasticloadbalancing/
- **CloudWatch Container Insights:** https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/ContainerInsights.html

---

**Last Updated:** October 30, 2025  
**Phase:** 4 - Terraform Infrastructure  
**Student:** n11817143  
**Course:** CAB432 - Cloud Computing
