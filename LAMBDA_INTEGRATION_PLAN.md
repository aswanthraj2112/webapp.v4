# Lambda Integration Plan - Pre-Implementation Analysis

**Date**: October 30, 2025  
**Student**: n11817143@qut.edu.au  
**Purpose**: Add Lambda function to complete serverless architecture and enable video transcoding

---

## 🎯 Objectives

1. **Add Lambda function** to trigger on S3 video uploads
2. **Complete transcoding workflow** (currently videos upload but don't transcode)
3. **Meet assignment requirements** for serverless functions
4. **Maintain zero downtime** for existing functionality

---

## 📊 Current Architecture State

### ✅ What's Working Now

#### Deployed Services
1. **Frontend** (React SPA)
   - Location: S3 + CloudFront
   - URL: https://app.n11817143-videoapp.cab432.com
   - Status: ✅ WORKING

2. **Video API** (ECS Fargate)
   - Service: n11817143-app-video-api
   - Task Count: 1/1 desired
   - Status: ✅ WORKING
   - Functionality: User authentication, video metadata, presigned URLs

3. **Admin Service** (ECS Fargate)
   - Service: n11817143-app-admin-service
   - Task Count: 1/1 desired
   - Status: ✅ WORKING
   - Functionality: Admin dashboard, user management

4. **Transcode Worker** (ECS Fargate)
   - Service: n11817143-app-transcode-worker
   - Task Count: 1/1 desired
   - Status: ✅ RUNNING (but idle - no messages to process)
   - Functionality: Polls SQS queue, transcodes videos

#### Storage & Data
- **S3 Bucket**: n11817143-a2
  - Raw videos: `raw/userId/filename.mp4`
  - Transcoded videos: `transcoded/` (empty - nothing transcoded yet)
  - Thumbnails: `thumbs/` (generated on upload)
  - Status: ✅ WORKING

- **DynamoDB**: n11817143-a2
  - Video metadata stored
  - Status: ✅ WORKING

- **SQS Queue**: n11817143-a2-transcode-queue
  - Status: ✅ EXISTS (but empty - nothing sending messages)
  - ApproximateNumberOfMessages: 0

#### Authentication
- **Cognito User Pool**: n11817143-a2 (ap-southeast-2_CdVnmKfrW)
  - Users: 4 (username, ashilrvd, newuser, zoro)
  - Status: ✅ WORKING

### ❌ What's NOT Working

1. **Video Transcoding**
   - Videos upload to S3 ✅
   - Video metadata saved to DynamoDB ✅
   - **NO messages sent to SQS** ❌
   - Transcode Worker waits idle ❌
   - Videos never get transcoded ❌

2. **Lambda Function**
   - Code exists: `lambda/s3-to-sqs/index.js` ✅
   - **NOT deployed to AWS** ❌
   - **NO S3 event notification configured** ❌

### 🔍 Current Upload Flow

```
1. User clicks "Upload Video" in frontend
2. Frontend calls POST /api/videos/upload (Video API)
3. Video API generates presigned S3 URL for raw/userId/videoId-filename.mp4
4. Frontend uploads video directly to S3 using presigned URL
5. Video API saves metadata to DynamoDB (status: "uploaded")
6. ❌ FLOW STOPS HERE - Nothing triggers transcoding
```

### 🎯 Target Upload Flow (After Lambda)

```
1. User clicks "Upload Video" in frontend
2. Frontend calls POST /api/videos/upload (Video API)
3. Video API generates presigned S3 URL for raw/userId/videoId-filename.mp4
4. Frontend uploads video directly to S3 using presigned URL
5. ✨ S3 ObjectCreated event triggers Lambda function
6. ✨ Lambda sends transcode job to SQS queue
7. Transcode Worker picks message from SQS
8. Worker transcodes video (360p, 480p, 720p)
9. Worker saves transcoded files to S3
10. Worker updates DynamoDB (status: "transcoded")
```

---

## 📦 Lambda Function Details

### Existing Code Location
- **Path**: `lambda/s3-to-sqs/index.js`
- **Handler**: `handler` (ES6 export)
- **Runtime**: Node.js (will use Docker container)
- **Size**: ~4KB

### Function Logic
```javascript
1. Receives S3 event (ObjectCreated)
2. Validates:
   - Event is ObjectCreated:* type
   - Key starts with "raw/"
   - File has video extension (.mp4, .mov, .avi, etc)
3. Extracts:
   - userId from S3 key (raw/userId/filename)
   - videoId from filename or generates UUID
4. Creates transcode job message
5. Sends to SQS queue with attributes
6. Returns success/failure
```

### Environment Variables Required
- `AWS_REGION`: ap-southeast-2
- `TRANSCODE_QUEUE_URL`: (SQS queue URL)

### IAM Permissions Required
```json
{
  "S3": ["s3:GetObject"],
  "SQS": ["sqs:SendMessage"],
  "Logs": ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
}
```

---

## 🏗️ Implementation Plan

### Phase 1: Pre-Deployment Verification ✅ (Current)

**Tasks:**
1. ✅ Document current state
2. ⏳ Test current video upload (verify metadata saves)
3. ⏳ Check SQS queue is empty
4. ⏳ Verify no existing Lambda functions
5. ⏳ Backup current Terraform state
6. ⏳ Create rollback commands

**Testing:**
```bash
# Check ECS services
aws ecs describe-services --cluster n11817143-app-cluster \
  --services n11817143-app-video-api n11817143-app-admin-service n11817143-app-transcode-worker \
  --region ap-southeast-2 --query 'services[*].[serviceName,runningCount,desiredCount]'

# Check SQS queue
aws sqs get-queue-attributes --queue-url $(aws sqs get-queue-url --queue-name n11817143-a2-transcode-queue --region ap-southeast-2 --query 'QueueUrl' --output text) \
  --attribute-names ApproximateNumberOfMessages --region ap-southeast-2

# Check for existing Lambda functions
aws lambda list-functions --region ap-southeast-2 --query 'Functions[?starts_with(FunctionName, `n11817143`)]'

# Check S3 event notifications
aws s3api get-bucket-notification-configuration --bucket n11817143-a2 --region ap-southeast-2
```

### Phase 2: Backup & Rollback Preparation

**Tasks:**
1. Backup Terraform state file
2. Create rollback script
3. Document exact restoration steps

**Commands:**
```bash
# Backup Terraform state
cd /home/ubuntu/oct1/webapp.v5/terraform
cp terraform.tfstate terraform.tfstate.before-lambda.backup
cp terraform.tfstate.backup terraform.tfstate.backup.before-lambda

# Backup S3 notification config
aws s3api get-bucket-notification-configuration --bucket n11817143-a2 --region ap-southeast-2 > /tmp/s3-notification-backup.json
```

### Phase 3: Create Lambda Terraform Module

**Tasks:**
1. Create `terraform/modules/lambda/` directory
2. Create `main.tf`, `variables.tf`, `outputs.tf`
3. Define Lambda function resource
4. Define IAM role and policies
5. Define S3 event notification
6. Configure CloudWatch Logs

**Files to Create:**
- `terraform/modules/lambda/main.tf`
- `terraform/modules/lambda/variables.tf`
- `terraform/modules/lambda/outputs.tf`

### Phase 4: Update Main Terraform Configuration

**Tasks:**
1. Add Lambda module to `terraform/main.tf`
2. Pass required variables (SQS queue URL, S3 bucket)
3. Update outputs to include Lambda ARN
4. Run `terraform plan` (preview changes ONLY)

### Phase 5: Build and Deploy Lambda

**Tasks:**
1. Build Lambda Docker image
2. Push to ECR
3. Run `terraform apply`
4. Verify Lambda deployment
5. Check CloudWatch logs

**Commands:**
```bash
# Build Lambda image
cd /home/ubuntu/oct1/webapp.v5
docker build -t lambda-s3-to-sqs:latest -f lambda/s3-to-sqs/Dockerfile lambda/s3-to-sqs/

# Tag and push to ECR
docker tag lambda-s3-to-sqs:latest <ECR_URL>:latest
docker push <ECR_URL>:latest

# Apply Terraform
cd terraform
terraform plan -out=tfplan-lambda
# Review plan carefully
terraform apply tfplan-lambda
```

### Phase 6: Testing & Verification

**Tasks:**
1. Upload test video via frontend
2. Check CloudWatch Logs for Lambda execution
3. Check SQS queue for message
4. Verify Transcode Worker processes video
5. Check S3 for transcoded files
6. Verify DynamoDB status update

**Test Commands:**
```bash
# Check Lambda logs
aws logs tail /aws/lambda/n11817143-s3-to-sqs --follow --region ap-southeast-2

# Check SQS messages
aws sqs receive-message --queue-url $(aws sqs get-queue-url --queue-name n11817143-a2-transcode-queue --region ap-southeast-2 --query 'QueueUrl' --output text) \
  --region ap-southeast-2 --max-number-of-messages 1

# Check S3 for transcoded files
aws s3 ls s3://n11817143-a2/transcoded/ --recursive --region ap-southeast-2

# Check DynamoDB for video status
aws dynamodb scan --table-name n11817143-a2 --region ap-southeast-2 \
  --filter-expression "attribute_exists(transcodedFilename)"
```

### Phase 7: Documentation Update

**Tasks:**
1. Update `ARCHITECTURE.md` with Lambda
2. Update README.md with new architecture diagram
3. Add Lambda to `FILE_STRUCTURE.md`
4. Document troubleshooting steps

---

## 🔄 Rollback Plan

### If Lambda Doesn't Work

**Scenario 1: Lambda deployed but not triggering**
```bash
# Remove S3 event notification only
aws s3api put-bucket-notification-configuration --bucket n11817143-a2 \
  --notification-configuration '{}' --region ap-southeast-2

# Application continues working as before (no transcoding)
```

**Scenario 2: Lambda causing errors**
```bash
# Remove Lambda from Terraform
cd /home/ubuntu/oct1/webapp.v5/terraform
# Comment out Lambda module in main.tf
terraform apply

# Restore S3 notification config
aws s3api put-bucket-notification-configuration --bucket n11817143-a2 \
  --notification-configuration file:///tmp/s3-notification-backup.json --region ap-southeast-2
```

**Scenario 3: Complete rollback needed**
```bash
# Restore Terraform state
cd /home/ubuntu/oct1/webapp.v5/terraform
cp terraform.tfstate.before-lambda.backup terraform.tfstate

# Destroy Lambda resources
terraform destroy -target=module.lambda

# Application back to original state
```

### Rollback Safety Net
- ✅ Video uploads continue working (presigned URLs from Video API)
- ✅ Metadata continues saving to DynamoDB
- ✅ Existing videos remain accessible
- ✅ Frontend and backend services unaffected
- ✅ Only transcoding workflow affected

---

## ⚠️ Risk Assessment

### Low Risk Changes
- ✅ Adding Lambda function (isolated component)
- ✅ Adding S3 event notification (only triggers Lambda)
- ✅ Lambda sends to SQS (Worker already polling)

### Medium Risk
- ⚠️ S3 event notification misconfiguration (could cause errors in CloudWatch)
- ⚠️ IAM permission issues (Lambda can't access SQS)

### High Risk (NONE)
- ✅ No changes to existing services
- ✅ No changes to frontend
- ✅ No changes to Video API
- ✅ No changes to database schema

### Mitigation
1. **Test Lambda locally first** (optional)
2. **Use Terraform plan** before apply (preview changes)
3. **Monitor CloudWatch Logs** during first test
4. **Keep Terraform state backup** for instant rollback
5. **Deploy during low-traffic time** (if possible)

---

## ✅ Success Criteria

### Must Have (Critical)
1. Lambda function deploys successfully
2. S3 event triggers Lambda on video upload
3. Lambda sends message to SQS queue
4. Transcode Worker processes message
5. Video gets transcoded to multiple resolutions
6. DynamoDB updated with transcoded file paths
7. Frontend can play transcoded video

### Nice to Have (Optional)
1. CloudWatch dashboard for Lambda metrics
2. SNS notification on transcoding completion
3. Error handling for failed transcodes
4. Retry logic for Lambda failures

---

## 📝 Next Steps

**Before proceeding, we will:**
1. ✅ Run verification commands (check current state)
2. ✅ Create backups (Terraform state, S3 config)
3. ✅ Test current video upload (ensure baseline works)
4. ✅ Get user approval to proceed

**Then we will:**
1. Create Lambda Terraform module
2. Run `terraform plan` and review
3. Deploy Lambda
4. Test end-to-end transcoding
5. Update documentation

---

## 📞 Emergency Contacts

- **AWS Support**: N/A (student account)
- **Terraform State**: `/home/ubuntu/oct1/webapp.v5/terraform/terraform.tfstate`
- **Backup Location**: `/home/ubuntu/oct1/webapp.v5/terraform/terraform.tfstate.before-lambda.backup`
- **Documentation**: This file + ARCHITECTURE.md

---

**Status**: 📋 Planning Complete - Awaiting Verification & Approval

