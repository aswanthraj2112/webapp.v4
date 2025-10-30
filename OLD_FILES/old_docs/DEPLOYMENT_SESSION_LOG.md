# Deployment Session Log - October 30, 2025

## Summary
Working on deploying microservices architecture to AWS ECS with QUT compliance requirements. Successfully pushed Docker images to ECR but encountering issues with container startup.

---

## Infrastructure Overview

### AWS Resources
- **ECS Cluster**: n11817143-app-cluster
- **ALB DNS**: n11817143-app-alb-1811658624.ap-southeast-2.elb.amazonaws.com
- **Region**: ap-southeast-2
- **Account ID**: 901444280953

### ECR Repositories
1. `901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-app/video-api:latest`
2. `901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-app/admin-service:latest`
3. `901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-app/transcode-worker:latest`

### Services Configuration
- **video-api**: Port 8080, Desired: 1 task
- **admin-service**: Port 8081, Desired: 1 task
- **transcode-worker**: No port (worker), Desired: 1 task

---

## Issues Identified and Fixed

### 1. ✅ QUT Compliance Updates
**Location**: `/terraform/main.tf`, `/terraform/modules/ecs-service/`

**Changes Made**:
- Changed ECS tasks to use PUBLIC subnets instead of private subnets (QUT requirement)
- Added hardcoded unique subnet IDs for ALB (fixes AZ conflict):
  ```hcl
  unique_public_subnet_ids = [
    "subnet-04cc288ea3b2e1e53", # ap-southeast-2a
    "subnet-075811427d5564cf9", # ap-southeast-2b
    "subnet-05d0352bb15852524", # ap-southeast-2c
  ]
  ```
- Made CloudWatch logging conditional with `enable_logging` variable (default: false per QUT guidelines)
- Temporarily enabled logging for debugging: `enable_logging = true`

### 2. ✅ NPM Install Command Fix
**Location**: All service Dockerfiles

**Changed**: `npm ci --only=production` → `npm install --omit=dev`
**Reason**: `npm ci` requires package-lock.json which may not exist

### 3. ✅ Cognito User Pool ID Typo
**Location**: `/server/shared/config/index.js`, `/server/shared/utils/parameterStore.js`

**Fixed**:
- Changed `'ap-southeast-2_CdVnmKfrW'` → `process.env.COGNITO_USER_POOL_ID || 'ap-southeast-2_CdVnmKfW'`
- Made it read from environment variable (correctly set in Terraform)

### 4. ✅ DynamoDB Table Name Mismatch
**Location**: `/terraform/terraform.tfvars`

**Fixed**:
- Changed `dynamodb_table_name = "n11817143-videos"` → `"n11817143-VideoApp"`
- Actual AWS table is `n11817143-VideoApp` (verified with AWS CLI)

### 5. ✅ Docker Import Path Issues
**Location**: All service Dockerfiles

**Problem**: Source code uses relative imports like `../../../shared/config` but Dockerfile was copying files flat
**Solution**: Maintained source directory structure in Docker container:

```dockerfile
# Before:
COPY server/shared ./shared
COPY server/services/video-api/src ./src

# After:
COPY server/shared ./server/shared
COPY server/services/video-api/src ./server/services/video-api/src
WORKDIR /app/server/services/video-api
```

### 6. ✅ Missing Shared Dependencies
**Location**: All service Dockerfiles

**Problem**: Shared module has its own dependencies but they weren't being installed
**Solution**: Added shared dependency installation:

```dockerfile
# Install shared dependencies
COPY server/shared/package*.json ./server/shared/
RUN cd server/shared && npm install --omit=dev
```

### 7. ⚠️ Admin Service Port Configuration
**Location**: `/server/services/admin-service/Dockerfile`

**Issue**: 
- Dockerfile had PORT=8080 and EXPOSE 8080
- Terraform sets PORT=8081 and container_port=8081
- Health check was checking port 8080

**Fixed**: Changed Dockerfile to use port 8081:
```dockerfile
ENV PORT=8081
EXPOSE 8081
HEALTHCHECK ... CMD node -e "require('http').get('http://localhost:8081/healthz', ..."
```

---

## Current Status

### Service Deployment Status (as of last check)
```
Service                  | Running | Desired | Status
-------------------------|---------|---------|------------------
video-api               | 0       | 1       | ❌ Crash Loop
admin-service           | 1       | 1       | ⚠️ Unhealthy
transcode-worker        | 0       | 1       | ❌ Crash Loop
```

### Admin Service Details
- **Task Running**: Yes (1/1)
- **Private IP**: 172.31.98.41
- **Health Status**: Unhealthy (failing health checks)
- **Target Group**: Registering/Initial state
- **Issue**: Container appears to be running but not responding to health checks

---

## Commands Used

### ECR Login
```bash
aws ecr get-login-password --region ap-southeast-2 | \
  docker login --username AWS --password-stdin \
  901444280953.dkr.ecr.ap-southeast-2.amazonaws.com
```

### Build and Push Images
```bash
# Build
cd /home/ubuntu/oct1/webapp.v5
docker build -f server/services/video-api/Dockerfile \
  -t 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-app/video-api:latest .
docker build -f server/services/admin-service/Dockerfile \
  -t 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-app/admin-service:latest .
docker build -f server/services/transcode-worker/Dockerfile \
  -t 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-app/transcode-worker:latest .

# Push
docker push 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-app/video-api:latest
docker push 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-app/admin-service:latest
docker push 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-app/transcode-worker:latest
```

### Check Service Status
```bash
# List services
aws ecs list-services --cluster n11817143-app-cluster --region ap-southeast-2

# Service details
aws ecs describe-services --cluster n11817143-app-cluster \
  --services n11817143-app-video-api n11817143-app-admin-service n11817143-app-transcode-worker \
  --region ap-southeast-2 --query 'services[*].[serviceName,runningCount,desiredCount]' --output table

# List running tasks
aws ecs list-tasks --cluster n11817143-app-cluster --region ap-southeast-2

# Task details
aws ecs describe-tasks --cluster n11817143-app-cluster --tasks <task-arn> --region ap-southeast-2
```

### Force Service Redeployment
```bash
aws ecs update-service --cluster n11817143-app-cluster \
  --service n11817143-app-video-api --force-new-deployment --region ap-southeast-2

aws ecs update-service --cluster n11817143-app-cluster \
  --service n11817143-app-admin-service --force-new-deployment --region ap-southeast-2

aws ecs update-service --cluster n11817143-app-cluster \
  --service n11817143-app-transcode-worker --force-new-deployment --region ap-southeast-2
```

### Check Target Groups
```bash
# List target groups
aws elbv2 describe-target-groups --region ap-southeast-2 \
  --query 'TargetGroups[?contains(TargetGroupName, `n11817143`)].TargetGroupArn' --output text

# Check target health
aws elbv2 describe-target-health --target-group-arn <tg-arn> --region ap-southeast-2
```

### Docker Cleanup (freed 3.7GB)
```bash
docker system prune -a -f --volumes
```

### Test Health Endpoints
```bash
# Through ALB
curl http://n11817143-app-alb-1811658624.ap-southeast-2.elb.amazonaws.com/api/admin/healthz
curl http://n11817143-app-alb-1811658624.ap-southeast-2.elb.amazonaws.com/healthz

# Direct to task (if you have the private IP)
curl http://172.31.98.41:8081/healthz
```

### Terraform Operations
```bash
cd /home/ubuntu/oct1/webapp.v5/terraform

# Plan
terraform plan -out=tfplan

# Apply
terraform apply tfplan

# Apply specific modules
terraform apply -auto-approve -target=module.video_api_service \
  -target=module.admin_service -target=module.transcode_worker

# Outputs
terraform output
terraform output -raw alb_dns_name
```

---

## Current Issues to Resolve

### 1. ⚠️ Admin Service Not Responding to Health Checks
**Symptoms**:
- Task is running (1/1)
- Container shows as running
- Health checks timing out
- curl to `http://172.31.98.41:8081/healthz` hangs

**Next Steps**:
- [ ] Rebuild admin-service with --no-cache to ensure port fix is applied
- [ ] Test Docker image locally: `docker run -p 8081:8081 <image>`
- [ ] Check if app is actually listening on 0.0.0.0 vs 127.0.0.1
- [ ] Verify admin-service code starts express server properly

### 2. ❌ Video-API Service Crash Loop
**Symptoms**:
- Tasks start but immediately exit with code 1
- Continuous restart loop

**Possible Causes**:
- Missing environment variables
- Import path issues (should be fixed)
- Database connection issues
- Missing dependencies

**Next Steps**:
- [ ] Test Docker image locally to see startup logs
- [ ] Verify all environment variables are set correctly
- [ ] Check if it's trying to connect to ElastiCache and failing

### 3. ❌ Transcode Worker Crash Loop
**Similar to video-api**, needs investigation

---

## Environment Variables Being Set

### Video-API Service
```
NODE_ENV=prod
PORT=8080
AWS_REGION=ap-southeast-2
DYNAMODB_TABLE_NAME=n11817143-VideoApp
S3_BUCKET_NAME=n11817143-a2
SQS_QUEUE_URL=https://sqs.ap-southeast-2.amazonaws.com/901444280953/n11817143-transcode-queue
COGNITO_USER_POOL_ID=ap-southeast-2_CdVnmKfW
COGNITO_CLIENT_ID=1dnnr9c18vuk983t8iojkgd8e
COGNITO_REGION=ap-southeast-2
ELASTICACHE_ENDPOINT=
CACHE_TTL=300
USE_PARAMETER_STORE=false
```

### Admin Service
```
NODE_ENV=prod
PORT=8081
AWS_REGION=ap-southeast-2
DYNAMODB_TABLE_NAME=n11817143-VideoApp
S3_BUCKET_NAME=n11817143-a2
COGNITO_USER_POOL_ID=ap-southeast-2_CdVnmKfW
COGNITO_CLIENT_ID=1dnnr9c18vuk983t8iojkgd8e
COGNITO_REGION=ap-southeast-2
USE_PARAMETER_STORE=false
```

### Transcode Worker
```
AWS_REGION=ap-southeast-2
DYNAMODB_TABLE_NAME=n11817143-VideoApp
S3_BUCKET_NAME=n11817143-a2
SQS_QUEUE_URL=https://sqs.ap-southeast-2.amazonaws.com/901444280953/n11817143-transcode-queue
SQS_WAIT_TIME_SECONDS=20
SQS_VISIBILITY_TIMEOUT=600
SQS_MAX_MESSAGES=1
MAX_FILE_SIZE=524288000
TEMP_DIR=/tmp/transcode
USE_PARAMETER_STORE=false
```

---

## Important Configuration Files

### Modified Files
1. `/terraform/main.tf` - ECS service configurations
2. `/terraform/terraform.tfvars` - DynamoDB table name fix
3. `/terraform/modules/ecs-service/main.tf` - Conditional logging
4. `/terraform/modules/ecs-service/variables.tf` - Added enable_logging variable
5. `/server/shared/config/index.js` - Cognito pool ID fix
6. `/server/shared/utils/parameterStore.js` - Cognito pool ID fix
7. `/server/services/video-api/Dockerfile` - Directory structure and dependencies
8. `/server/services/admin-service/Dockerfile` - Directory structure, dependencies, port fix
9. `/server/services/transcode-worker/Dockerfile` - Directory structure and dependencies

### Key Configuration Values
- **VPC**: vpc-007bab53289655834 (aws-controltower-VPC)
- **Security Group**: sg-032bd1ff8cf77dbb9 (CAB432SG)
- **S3 Bucket**: n11817143-a2
- **DynamoDB Table**: n11817143-VideoApp
- **SQS Queue**: n11817143-transcode-queue
- **Cognito Pool**: ap-southeast-2_CdVnmKfW
- **Cognito Client**: 1dnnr9c18vuk983t8iojkgd8e

---

## Next Steps to Continue

1. **Rebuild Admin Service** with no-cache to ensure port fix:
   ```bash
   cd /home/ubuntu/oct1/webapp.v5
   docker build --no-cache -f server/services/admin-service/Dockerfile \
     -t 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-app/admin-service:latest .
   docker push 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-app/admin-service:latest
   aws ecs update-service --cluster n11817143-app-cluster \
     --service n11817143-app-admin-service --force-new-deployment --region ap-southeast-2
   ```

2. **Test Docker Images Locally** to see startup logs:
   ```bash
   docker run --rm -it -p 8080:8080 \
     -e NODE_ENV=prod -e PORT=8080 -e AWS_REGION=ap-southeast-2 \
     901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-app/video-api:latest
   ```

3. **Check Why Apps Aren't Starting**:
   - Verify config initialization doesn't require Parameter Store access
   - Check if missing AWS credentials is causing startup failures
   - Verify shared module dependencies are all installed

4. **Consider Disabling Parameter Store/Secrets Manager** completely:
   - Modify config to skip initialization if USE_PARAMETER_STORE=false
   - Use only environment variables

5. **Alternative: Enable CloudWatch Logs Temporarily**:
   - Already enabled in Terraform with `enable_logging = true`
   - Need IAM permissions to read logs (currently getting AccessDeniedException)
   - Could request CloudWatch access from QUT admins for debugging

---

## Debugging Tips

### Check if Container is Actually Starting
```bash
# Get task ARN
TASK_ARN=$(aws ecs list-tasks --cluster n11817143-app-cluster \
  --service-name n11817143-app-admin-service --region ap-southeast-2 \
  --query 'taskArns[0]' --output text)

# Get task details including IP
aws ecs describe-tasks --cluster n11817143-app-cluster \
  --tasks $TASK_ARN --region ap-southeast-2 \
  --query 'tasks[0].containers[0].[name,lastStatus,networkInterfaces[0].privateIpv4Address]'

# Try to connect
TASK_IP=<ip-from-above>
curl -v http://$TASK_IP:8081/healthz
```

### Check Security Group Rules
```bash
aws ec2 describe-security-groups --group-ids sg-032bd1ff8cf77dbb9 \
  --region ap-southeast-2 --query 'SecurityGroups[0].IpPermissions'
```

### Check Service Events for Errors
```bash
aws ecs describe-services --cluster n11817143-app-cluster \
  --services n11817143-app-admin-service --region ap-southeast-2 \
  --query 'services[0].events[0:10].[createdAt,message]' --output table
```

---

## Known Limitations

1. **CloudWatch Logs**: Access denied due to IAM permissions
2. **Container Exec**: Could try `aws ecs execute-command` if enabled (needs AWS CLI v2)
3. **Parameter Store**: Services try to load config but have fallbacks
4. **Secrets Manager**: JWT secret loading may fail but has environment variable fallback

---

## References

- **Terraform State**: `/home/ubuntu/oct1/webapp.v5/terraform/terraform.tfstate`
- **Terraform Variables**: `/home/ubuntu/oct1/webapp.v5/terraform/terraform.tfvars`
- **Source Code**: `/home/ubuntu/oct1/webapp.v5/server/services/`
- **Documentation**: Various markdown files in project root

---

**Last Updated**: October 30, 2025
**Session Status**: In Progress - Services deployed but not healthy
**Next Action**: Rebuild admin-service and investigate why health checks are failing
