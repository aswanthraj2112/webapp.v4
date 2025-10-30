# 🚀 CI/CD Pipeline Documentation

Complete guide for the automated build, test, and deployment pipeline using GitHub Actions.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Workflows](#workflows)
3. [Setup Instructions](#setup-instructions)
4. [Workflow Details](#workflow-details)
5. [Secrets Configuration](#secrets-configuration)
6. [Usage](#usage)
7. [Deployment Strategies](#deployment-strategies)
8. [Monitoring & Rollback](#monitoring--rollback)
9. [Troubleshooting](#troubleshooting)

---

## Overview

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     GitHub Repository                        │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Video API │  │  Admin   │  │Transcode │  │S3 Lambda │   │
│  │          │  │ Service  │  │  Worker  │  │          │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
└───────┼─────────────┼─────────────┼─────────────┼──────────┘
        │             │             │             │
        │ Push/PR     │ Push/PR     │ Push/PR     │ Push/PR
        ▼             ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────┐
│                     GitHub Actions                           │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Test → Build → Push to ECR → Deploy to ECS/Lambda   │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────┬──────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
┌────────────────┐      ┌────────────────┐
│  Amazon ECR    │      │  AWS Services  │
│  (Images)      │      │  - ECS         │
│                │      │  - Lambda      │
└────────────────┘      └────────────────┘
```

### Workflows Created

| Workflow | File | Purpose |
|----------|------|---------|
| **Video API** | `video-api.yml` | Build, test, deploy video-api service |
| **Admin Service** | `admin-service.yml` | Build, test, deploy admin-service |
| **Transcode Worker** | `transcode-worker.yml` | Build, test, deploy transcode-worker |
| **S3 Lambda** | `s3-lambda.yml` | Build, test, deploy S3-to-SQS Lambda |
| **Deploy All** | `deploy-all.yml` | Orchestrate deployment of all services |

---

## Workflows

### Individual Service Workflows

Each service has its own workflow with the following stages:

```yaml
┌─────────┐
│  Test   │  Run linter, unit tests, code coverage
└────┬────┘
     │
     ▼
┌─────────┐
│  Build  │  Build Docker image, push to ECR
└────┬────┘
     │
     ▼
┌─────────┐
│ Deploy  │  Update ECS service or Lambda function
└────┬────┘
     │
     ▼
┌─────────┐
│ Verify  │  Check deployment status
└─────────┘
```

### Triggers

All workflows support:

1. **Automatic Triggers:**
   - Push to `main` or `develop` branches
   - Pull requests to `main` or `develop`
   - Path filters (only trigger when service code changes)

2. **Manual Triggers:**
   - `workflow_dispatch` with environment selection
   - Deploy on-demand from GitHub UI

### Path Filters

```yaml
# Video API triggers only on:
- 'server/services/video-api/**'
- 'server/shared/**'

# Admin Service triggers only on:
- 'server/services/admin-service/**'
- 'server/shared/**'

# Transcode Worker triggers only on:
- 'server/services/transcode-worker/**'
- 'server/shared/**'

# S3 Lambda triggers only on:
- 'server/services/s3-to-sqs-lambda/**'
```

---

## Setup Instructions

### 1. AWS Credentials

Create IAM user with permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:StartImageScan",
        "ecs:DescribeTaskDefinition",
        "ecs:DescribeServices",
        "ecs:UpdateService",
        "ecs:RegisterTaskDefinition",
        "lambda:UpdateFunctionCode",
        "lambda:GetFunction",
        "lambda:InvokeFunction",
        "iam:PassRole"
      ],
      "Resource": "*"
    }
  ]
}
```

### 2. GitHub Secrets

Add the following secrets to your GitHub repository:

**Settings → Secrets and variables → Actions → New repository secret**

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `AWS_ACCESS_KEY_ID` | `AKIA...` | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | `secret...` | AWS secret key |
| `AWS_REGION` | `ap-southeast-2` | AWS region (optional, defaults in workflows) |

### 3. Enable GitHub Actions

1. Go to **Settings → Actions → General**
2. Under **Actions permissions**, select:
   - ✅ Allow all actions and reusable workflows
3. Under **Workflow permissions**, select:
   - ✅ Read and write permissions
   - ✅ Allow GitHub Actions to create and approve pull requests

### 4. Verify Setup

Create a test commit:

```bash
# Make a small change
echo "# Test" >> server/services/video-api/README.md

# Commit and push
git add .
git commit -m "test: trigger CI/CD pipeline"
git push origin main
```

Check **Actions** tab to see workflows running.

---

## Workflow Details

### Video API Workflow

**File:** `.github/workflows/video-api.yml`

#### Jobs

1. **Test** (runs on PR and push)
   ```yaml
   - Checkout code
   - Setup Node.js 20
   - Install dependencies (npm ci)
   - Run linter (npm run lint)
   - Run tests (npm test)
   - Check coverage (npm run test:coverage)
   ```

2. **Build** (runs on push to main/develop)
   ```yaml
   - Checkout code
   - Configure AWS credentials
   - Login to ECR
   - Build Docker image
   - Tag with commit SHA and 'latest'
   - Push to ECR
   - Start vulnerability scan
   ```

3. **Deploy** (runs on push to main)
   ```yaml
   - Download current task definition
   - Update with new image
   - Deploy to ECS
   - Wait for stability (10 min timeout)
   - Verify deployment status
   ```

4. **Rollback** (runs if deploy fails)
   ```yaml
   - Find previous task definition
   - Rollback to previous version
   - Notify about failure
   ```

#### Environment Variables

```yaml
AWS_REGION: ap-southeast-2
ECR_REPOSITORY: n11817143-videoapp-video-api
ECS_CLUSTER: n11817143-videoapp-cluster
ECS_SERVICE: n11817143-videoapp-video-api
CONTAINER_NAME: video-api
```

### Admin Service Workflow

**File:** `.github/workflows/admin-service.yml`

Same structure as Video API, with different service names:

```yaml
ECR_REPOSITORY: n11817143-videoapp-admin-service
ECS_SERVICE: n11817143-videoapp-admin-service
CONTAINER_NAME: admin-service
```

### Transcode Worker Workflow

**File:** `.github/workflows/transcode-worker.yml`

Same structure as Video API, builds image with FFmpeg:

```yaml
ECR_REPOSITORY: n11817143-videoapp-transcode-worker
ECS_SERVICE: n11817143-videoapp-transcode-worker
CONTAINER_NAME: transcode-worker
```

### S3 Lambda Workflow

**File:** `.github/workflows/s3-lambda.yml`

Different deploy stage for Lambda:

```yaml
ECR_REPOSITORY: n11817143-videoapp-s3-to-sqs-lambda
LAMBDA_FUNCTION_NAME: n11817143-videoapp-s3-to-sqs
```

**Deploy Job:**
```yaml
- Update Lambda function code with new image URI
- Wait for function update to complete
- Verify deployment
- Test with sample S3 event
```

### Deploy All Workflow

**File:** `.github/workflows/deploy-all.yml`

Orchestrates deployment of multiple services:

1. **Determine Services** - Check which services changed
2. **Deploy Services** - Call individual workflows in parallel
3. **Notify** - Report overall deployment status

**Manual Trigger:**
```yaml
workflow_dispatch:
  inputs:
    services: 'all' or 'video-api,admin-service'
    environment: 'development|staging|production'
```

---

## Secrets Configuration

### Required Secrets

```bash
# GitHub Repository Secrets
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=wJa...
```

### Optional Secrets

```bash
# If using custom AWS region
AWS_REGION=ap-southeast-2

# If using Slack/Discord notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# If using SonarCloud for code quality
SONAR_TOKEN=...
```

### Adding Secrets

**Via GitHub UI:**
```
Repository → Settings → Secrets and variables → Actions → New repository secret
```

**Via GitHub CLI:**
```bash
gh secret set AWS_ACCESS_KEY_ID
gh secret set AWS_SECRET_ACCESS_KEY
```

---

## Usage

### Automatic Deployment

1. **Development Branch:**
   ```bash
   git checkout develop
   git add .
   git commit -m "feat: add new feature"
   git push origin develop
   ```
   - ✅ Tests run
   - ✅ Images built and pushed to ECR
   - ❌ **Not deployed** to production

2. **Production Deployment:**
   ```bash
   git checkout main
   git merge develop
   git push origin main
   ```
   - ✅ Tests run
   - ✅ Images built and pushed to ECR
   - ✅ **Deployed to ECS/Lambda**

### Manual Deployment

#### Deploy Single Service

1. Go to **Actions** tab
2. Select workflow (e.g., "Video API - Build and Deploy")
3. Click **Run workflow**
4. Select:
   - Branch: `main` or `develop`
   - Environment: `development`, `staging`, or `production`
5. Click **Run workflow**

#### Deploy All Services

1. Go to **Actions** tab
2. Select "Deploy All Services"
3. Click **Run workflow**
4. Configure:
   - Services: `all` or comma-separated list
   - Environment: `production`
5. Click **Run workflow**

### Pull Request Workflow

```bash
# Create feature branch
git checkout -b feature/new-api

# Make changes
vim server/services/video-api/src/index.js

# Commit
git add .
git commit -m "feat: add new endpoint"
git push origin feature/new-api
```

Then create PR on GitHub:
- ✅ Tests run automatically
- ✅ Must pass before merge
- ❌ No deployment until merged to main

---

## Deployment Strategies

### Current: Rolling Update

Default ECS deployment strategy:

```yaml
deployment_configuration:
  maximum_percent: 200         # Allow double capacity
  minimum_healthy_percent: 100 # Maintain full capacity
  
  deployment_circuit_breaker:
    enable: true    # Auto-rollback on failure
    rollback: true
```

**Process:**
1. Start new tasks with new image
2. Wait for health checks to pass
3. Stop old tasks
4. Repeat until all tasks updated

### Blue-Green Deployment

For zero-downtime deployments:

```yaml
# In task definition
deployment_configuration:
  deployment_controller:
    type: CODE_DEPLOY  # Use CodeDeploy for blue-green
```

**Setup CodeDeploy:**
```bash
# Create CodeDeploy application
aws deploy create-application \
  --application-name n11817143-videoapp \
  --compute-platform ECS

# Create deployment group
aws deploy create-deployment-group \
  --application-name n11817143-videoapp \
  --deployment-group-name video-api-prod \
  --service-role-arn arn:aws:iam::ACCOUNT:role/CodeDeployServiceRole \
  --blue-green-deployment-configuration \
    "terminateBlueInstancesOnDeploymentSuccess={
      action=TERMINATE,
      terminationWaitTimeInMinutes=5
    }" \
  --ecs-services "serviceName=n11817143-videoapp-video-api,clusterName=n11817143-videoapp-cluster"
```

### Canary Deployment

Gradual rollout strategy:

```yaml
# In CodeDeploy deployment config
traffic_routing_config:
  type: TimeBasedCanary
  time_based_canary:
    canary_percentage: 10  # Route 10% traffic first
    canary_interval: 5     # Wait 5 minutes
```

---

## Monitoring & Rollback

### Monitor Deployments

#### GitHub Actions UI

```
Actions → Select workflow run → View logs
```

#### AWS Console

**ECS Deployments:**
```
ECS → Clusters → n11817143-videoapp-cluster → Services → 
Select service → Deployments tab
```

**Lambda Versions:**
```
Lambda → Functions → n11817143-videoapp-s3-to-sqs → 
Versions tab
```

#### AWS CLI

**ECS Service Status:**
```bash
aws ecs describe-services \
  --cluster n11817143-videoapp-cluster \
  --services n11817143-videoapp-video-api \
  --region ap-southeast-2
```

**Lambda Function Status:**
```bash
aws lambda get-function \
  --function-name n11817143-videoapp-s3-to-sqs \
  --region ap-southeast-2
```

### Manual Rollback

#### ECS Service Rollback

```bash
# List task definition revisions
aws ecs list-task-definitions \
  --family-prefix n11817143-videoapp-video-api \
  --sort DESC

# Rollback to previous version
aws ecs update-service \
  --cluster n11817143-videoapp-cluster \
  --service n11817143-videoapp-video-api \
  --task-definition n11817143-videoapp-video-api:PREVIOUS_REVISION
```

#### Lambda Function Rollback

```bash
# List versions
aws lambda list-versions-by-function \
  --function-name n11817143-videoapp-s3-to-sqs

# Rollback to previous version
aws lambda update-alias \
  --function-name n11817143-videoapp-s3-to-sqs \
  --name PROD \
  --function-version PREVIOUS_VERSION
```

### Automatic Rollback

The workflows include automatic rollback on failure:

```yaml
rollback:
  needs: [build, deploy]
  if: failure()
  steps:
    - Get previous task definition/version
    - Rollback deployment
    - Notify team
```

---

## Troubleshooting

### Common Issues

#### 1. Authentication Failed

**Error:**
```
Error: The security token included in the request is invalid
```

**Solution:**
- Check AWS credentials in GitHub secrets
- Verify IAM user has required permissions
- Ensure credentials haven't expired

#### 2. ECR Push Failed

**Error:**
```
denied: Your authorization token has expired
```

**Solution:**
```bash
# Re-authenticate in workflow (done automatically)
- name: Login to Amazon ECR
  uses: aws-actions/amazon-ecr-login@v2
```

#### 3. ECS Deployment Timeout

**Error:**
```
Error: Service failed to stabilize within 10 minutes
```

**Solution:**
- Check ECS task logs in CloudWatch
- Verify health check endpoint
- Increase wait timeout:
  ```yaml
  wait-for-minutes: 15  # Increase from 10
  ```

#### 4. Task Definition Not Found

**Error:**
```
Task definition not found
```

**Solution:**
- Ensure ECS service exists
- Deploy infrastructure with Terraform first
- Verify service names match

#### 5. Lambda Update Failed

**Error:**
```
ResourceConflictException: The operation cannot be performed at this time
```

**Solution:**
- Wait for previous update to complete
- Check Lambda function state:
  ```bash
  aws lambda get-function \
    --function-name n11817143-videoapp-s3-to-sqs
  ```

### Debug Workflows

#### Enable Debug Logging

Add secrets to repository:
```
ACTIONS_RUNNER_DEBUG=true
ACTIONS_STEP_DEBUG=true
```

#### View Detailed Logs

```bash
# Download workflow logs
gh run download RUN_ID

# View specific job
gh run view RUN_ID --job JOB_ID --log
```

#### Test Workflows Locally

Using [act](https://github.com/nektos/act):

```bash
# Install act
brew install act  # macOS
# or
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Run workflow locally
act push -W .github/workflows/video-api.yml

# Run specific job
act -j test
```

### Health Check Issues

#### Failed Health Checks

**ECS:**
```bash
# Check task health
aws ecs describe-tasks \
  --cluster n11817143-videoapp-cluster \
  --tasks TASK_ARN \
  --query 'tasks[0].healthStatus'

# View task logs
aws logs tail /ecs/n11817143-videoapp --follow
```

**Fix health check endpoint:**
```javascript
// Ensure /healthz endpoint exists
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});
```

#### Slow Container Startup

Increase health check grace period in Terraform:

```hcl
health_check_grace_period_seconds = 120  # Default: 60
```

### Image Build Issues

#### Build Context Too Large

**Error:**
```
Error: failed to solve: context size too large
```

**Solution:**
Create/update `.dockerignore`:
```
node_modules
*.log
.git
.DS_Store
coverage
.env*
```

#### Multi-platform Builds

If deploying to ARM-based instances:
```yaml
- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v3

- name: Build multi-platform image
  run: |
    docker buildx build \
      --platform linux/amd64,linux/arm64 \
      --push \
      -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG \
      .
```

---

## Best Practices

### 1. Tag Images Properly

```yaml
# Always tag with both commit SHA and 'latest'
-t $ECR_REGISTRY/$ECR_REPOSITORY:${{ github.sha }}
-t $ECR_REGISTRY/$ECR_REPOSITORY:latest
```

### 2. Use Dependency Caching

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'  # Cache npm dependencies
    cache-dependency-path: server/services/*/package-lock.json
```

### 3. Run Tests in Parallel

```yaml
strategy:
  matrix:
    node-version: [18, 20]
    os: [ubuntu-latest, windows-latest]
```

### 4. Implement Quality Gates

```yaml
- name: Check code coverage
  run: |
    COVERAGE=$(npm run test:coverage | grep "All files" | awk '{print $4}')
    if (( $(echo "$COVERAGE < 80" | bc -l) )); then
      echo "Coverage $COVERAGE% is below 80%"
      exit 1
    fi
```

### 5. Secure Secrets

```yaml
# Never log secrets
- name: Configure AWS
  env:
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
  run: |
    # Don't echo secrets
    aws configure set aws_access_key_id $AWS_ACCESS_KEY_ID
```

### 6. Use Workflow Templates

For consistent workflows across services, create templates in `.github/workflows/templates/`.

### 7. Monitor Costs

```yaml
- name: Estimate deployment cost
  run: |
    # Calculate estimated costs based on resources
    echo "Estimated monthly cost: $$COST"
```

---

## Next Steps

After setting up CI/CD:

1. **✅ Deploy infrastructure:**
   ```bash
   cd terraform
   terraform init
   terraform apply
   ```

2. **✅ Push code to trigger pipeline:**
   ```bash
   git push origin main
   ```

3. **✅ Monitor deployments:**
   - GitHub Actions tab
   - AWS ECS console
   - CloudWatch logs

4. **✅ Test endpoints:**
   ```bash
   curl http://ALB_DNS/healthz
   curl http://ALB_DNS/api/videos
   ```

5. **✅ Set up monitoring:**
   - CloudWatch dashboards
   - Alarms for failed deployments
   - Slack/Discord notifications

---

## Additional Resources

### Documentation
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [AWS ECS Deployment](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-types.html)
- [AWS Lambda Container Images](https://docs.aws.amazon.com/lambda/latest/dg/images-create.html)

### Tools
- [act](https://github.com/nektos/act) - Run GitHub Actions locally
- [actionlint](https://github.com/rhysd/actionlint) - Lint workflow files
- [GitHub CLI](https://cli.github.com/) - Manage workflows from terminal

### Badges

Add to your README:

```markdown
![Video API](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/video-api.yml/badge.svg)
![Admin Service](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/admin-service.yml/badge.svg)
![Transcode Worker](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/transcode-worker.yml/badge.svg)
![S3 Lambda](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/s3-lambda.yml/badge.svg)
```

---

**Status:** ✅ CI/CD Pipeline Complete  
**Created:** October 30, 2025  
**Student:** n11817143  
**Course:** CAB432 - Cloud Computing
