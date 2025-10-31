# 🚀 Deployment Guide

Complete step-by-step guide to deploy the video processing application from scratch.

## Prerequisites

Before starting, ensure you have:

- ✅ AWS Account with CAB432 student access
- ✅ AWS CLI installed and configured
- ✅ Terraform >= 1.5.0 installed
- ✅ Docker installed and running
- ✅ Node.js 18+ and npm installed
- ✅ Git installed

## Step 1: AWS Authentication

```bash
# Login to AWS SSO
aws sso login --profile cab432

# Verify access
aws sts get-caller-identity --profile cab432

# Set profile for this session
export AWS_PROFILE=cab432
```

## Step 2: Clone Repository

```bash
# Clone the repository
git clone https://github.com/aswanthraj2112/webapp.v4.git
cd webapp.v4
git checkout webapp.v5
```

## Step 3: Review Terraform Configuration

```bash
cd terraform

# Review terraform.tfvars
cat terraform.tfvars

# Ensure these values are correct:
# - cognito_user_pool_id = "ap-southeast-2_CdVnmKfW"
# - cognito_client_id = "296uu7cjlfinpnspc04kp53p83"
# - domain_name = "n11817143-videoapp.cab432.com"
# - dynamodb_table_name = "n11817143-VideoApp"
# - s3_bucket_name = "n11817143-a2"
# - sqs_queue_name = "n11817143-A3"
```

## Step 4: Deploy Infrastructure

```bash
# Initialize Terraform
terraform init

# Review planned changes
terraform plan

# Apply infrastructure (this takes ~5-10 minutes)
terraform apply

# Save outputs
terraform output > outputs.txt
```

### What Gets Created:
- ✅ ECS Cluster (n11817143-app-cluster)
- ✅ Application Load Balancer (n11817143-app-alb)
- ✅ 4 ECR repositories (video-api, admin-service, transcode-worker, s3-to-sqs-lambda)
- ✅ 3 ECS Services (Video API, Admin Service, Transcode Worker)
- ✅ 1 Lambda Function (S3-to-SQS)
- ✅ S3 bucket for frontend (n11817143-app-static-website-prod)
- ✅ CloudFront distribution
- ✅ Route53 DNS records
- ✅ SQS Dead Letter Queue (n11817143-A3-dlq)

## Step 5: Build and Push Docker Images

```bash
cd ..

# Build and push all services (including Lambda)
./scripts/build-and-push.sh all

# Or build individually:
# ./scripts/build-and-push.sh video-api
# ./scripts/build-and-push.sh admin-service
# ./scripts/build-and-push.sh transcode-worker
# ./scripts/build-and-push.sh s3-lambda
```

This step:
1. Builds Docker images locally
2. Tags them for ECR
3. Pushes to ECR repositories
4. Takes ~10-15 minutes

## Step 6: Wait for Services to Start

```bash
# Check service status
aws ecs describe-services \
  --cluster n11817143-app-cluster \
  --services n11817143-app-video-api n11817143-app-admin-service n11817143-app-transcode-worker \
  --region ap-southeast-2 \
  --query 'services[*].[serviceName,runningCount,desiredCount]' \
  --output table

# Wait until runningCount == desiredCount for all services
# This can take 2-5 minutes
```

## Step 7: Configure S3 CORS

```bash
# Create CORS configuration
cat > /tmp/s3-cors.json << 'EOF'
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedOrigins": [
        "http://localhost:3000",
        "https://n11817143-videoapp.cab432.com",
        "https://app.n11817143-videoapp.cab432.com"
      ],
      "ExposeHeaders": ["ETag", "x-amz-request-id"],
      "MaxAgeSeconds": 3000
    }
  ]
}
EOF

# Apply CORS configuration
aws s3api put-bucket-cors \
  --bucket n11817143-a2 \
  --cors-configuration file:///tmp/s3-cors.json \
  --region ap-southeast-2
```

## Step 8: Deploy Frontend

```bash
# Navigate to client directory
cd client

# Install dependencies
npm install

# Build production bundle
npm run build

# Deploy to S3
aws s3 sync dist/ s3://n11817143-app-static-website/ --delete --region ap-southeast-2

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id E3MBOUQVWZEHJQ \
  --paths "/*" \
  --region us-east-1

# Wait for invalidation (1-2 minutes)
```

## Step 9: Verify Deployment

### Check Backend API

```bash
# Test backend config endpoint
curl https://n11817143-videoapp.cab432.com/api/config

# Expected output:
# {
#   "cognito": {
#     "region": "ap-southeast-2",
#     "userPoolId": "ap-southeast-2_CdVnmKfrW",
#     "clientId": "296uu7cjlfinpnspc04kp53p83"
#   }
# }

# Test health check
curl https://n11817143-videoapp.cab432.com/healthz
```

### Check Frontend

```bash
# Test frontend access
curl -I https://app.n11817143-videoapp.cab432.com

# Expected: HTTP/2 200
```

### Check ECS Services

```bash
# Run status script
cd ..
./status.sh
```

## Step 10: Test the Application

1. **Open Frontend**: https://app.n11817143-videoapp.cab432.com
2. **Sign In**: Use existing Cognito user (e.g., `username`)
3. **Upload Video**: Click "Upload Video", select MP4/MOV/AVI file
4. **Wait for Transcoding**: Watch status change from "Processing" to "Completed"
5. **Play Video**: Select quality and play

## Troubleshooting

### Issue: Services not starting

```bash
# Check task failures
aws ecs list-tasks \
  --cluster n11817143-app-cluster \
  --desired-status STOPPED \
  --region ap-southeast-2

# Describe failed task
aws ecs describe-tasks \
  --cluster n11817143-app-cluster \
  --tasks <task-arn> \
  --region ap-southeast-2
```

### Issue: Frontend showing blank page

```bash
# Check CloudFront distribution
aws cloudfront get-distribution \
  --id E3MBOUQVWZEHJQ \
  --query 'Distribution.Status'

# Check S3 bucket contents
aws s3 ls s3://n11817143-app-static-website/ --recursive
```

### Issue: CORS errors

```bash
# Verify S3 CORS configuration
aws s3api get-bucket-cors \
  --bucket n11817143-a2 \
  --region ap-southeast-2

# Check backend CORS environment variable
aws ecs describe-task-definition \
  --task-definition n11817143-app-video-api \
  --region ap-southeast-2 \
  --query 'taskDefinition.containerDefinitions[0].environment[?name==`CLIENT_ORIGINS`]'
```

### Issue: Authentication not working

```bash
# Verify Cognito User Pool
aws cognito-idp describe-user-pool \
  --user-pool-id ap-southeast-2_CdVnmKfrW \
  --region ap-southeast-2

# List Cognito users
aws cognito-idp list-users \
  --user-pool-id ap-southeast-2_CdVnmKfrW \
  --region ap-southeast-2
```

## Updating the Application

### Update Backend Services

```bash
# 1. Make code changes in server/services/{service-name}

# 2. Rebuild and push image
./scripts/build-and-push.sh {service-name}

# 3. Force new deployment
aws ecs update-service \
  --cluster n11817143-app-cluster \
  --service n11817143-app-{service-name} \
  --force-new-deployment \
  --region ap-southeast-2

# 4. Wait for deployment
# Monitor with: ./status.sh
```

### Update Frontend

```bash
# 1. Make code changes in client/src

# 2. Rebuild
cd client
npm run build

# 3. Deploy
aws s3 sync dist/ s3://n11817143-app-static-website/ --delete

# 4. Invalidate cache
aws cloudfront create-invalidation \
  --distribution-id E3MBOUQVWZEHJQ \
  --paths "/*"
```

### Update Infrastructure

```bash
# 1. Make changes to terraform files

# 2. Review changes
cd terraform
terraform plan

# 3. Apply changes
terraform apply
```

## Cleanup / Teardown

⚠️ **Warning**: This will delete all resources and data.

```bash
# 1. Delete frontend from S3
aws s3 rm s3://n11817143-app-static-website/ --recursive

# 2. Empty ECR repositories
for repo in video-api admin-service transcode-worker; do
  aws ecr batch-delete-image \
    --repository-name n11817143-app/$repo \
    --image-ids "$(aws ecr list-images --repository-name n11817143-app/$repo --query 'imageIds[*]' --output json)" \
    --region ap-southeast-2
done

# 3. Destroy infrastructure
cd terraform
terraform destroy

# Note: DynamoDB table, S3 video bucket, and Cognito User Pool
# are NOT managed by Terraform and must be deleted manually if needed
```

## Cost Estimation

### Monthly Costs (Approximate)

Running 24/7:
- ECS Fargate: 3 tasks × $0.04/hour × 730 hours = ~$88/month
- ALB: $22/month + data transfer
- CloudFront: $1-10/month (depends on traffic)
- S3: $1-5/month (depends on storage)
- DynamoDB: $1-10/month (on-demand)
- **Total**: ~$113-135/month

To reduce costs:
- Scale services to 0 when not in use
- Use dev environment only when testing

## Support

For issues or questions:
- Check [ARCHITECTURE.md](ARCHITECTURE.md) for details
- Review CloudWatch Logs (if access granted)
- Check AWS Console for resource status

---

**Deployment Time**: ~30-45 minutes  
**Skill Level**: Intermediate  
**Last Updated**: October 30, 2025
