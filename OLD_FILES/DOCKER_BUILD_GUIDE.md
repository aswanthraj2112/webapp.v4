# 🐳 Docker Build & Push Guide

Quick guide to build and push Docker images to the ECR repositories we created.

---

## ✅ Prerequisites

- AWS CLI configured with SSO (already done ✅)
- ECR repositories created (already done ✅)
- Docker installed on EC2 instance

---

## 🔑 Step 1: Login to ECR

```bash
# Get ECR login token and login
aws ecr get-login-password --region ap-southeast-2 | \
  docker login --username AWS --password-stdin \
  901444280953.dkr.ecr.ap-southeast-2.amazonaws.com

# Expected output: "Login Succeeded"
```

---

## 🏗️ Step 2: Build & Push Video API

```bash
cd /home/ubuntu/oct1/webapp.v5/services/video-api

# Build
docker build -t n11817143-app/video-api:latest .

# Tag
docker tag n11817143-app/video-api:latest \
  901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-app/video-api:latest

# Push
docker push 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-app/video-api:latest
```

---

## 🏗️ Step 3: Build & Push Admin Service

```bash
cd /home/ubuntu/oct1/webapp.v5/services/admin-service

# Build
docker build -t n11817143-app/admin-service:latest .

# Tag
docker tag n11817143-app/admin-service:latest \
  901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-app/admin-service:latest

# Push
docker push 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-app/admin-service:latest
```

---

## 🏗️ Step 4: Build & Push Transcode Worker

```bash
cd /home/ubuntu/oct1/webapp.v5/services/transcode-worker

# Build
docker build -t n11817143-app/transcode-worker:latest .

# Tag
docker tag n11817143-app/transcode-worker:latest \
  901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-app/transcode-worker:latest

# Push
docker push 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-app/transcode-worker:latest
```

---

## 🏗️ Step 5: Build & Push S3 Lambda

```bash
cd /home/ubuntu/oct1/webapp.v5/services/s3-lambda

# Build
docker build -t n11817143-app/s3-lambda:latest .

# Tag
docker tag n11817143-app/s3-lambda:latest \
  901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-app/s3-to-sqs-lambda:latest

# Push
docker push 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-app/s3-to-sqs-lambda:latest
```

---

## 🚀 One-Command Build & Push Script

Create a script to build and push all images:

```bash
#!/bin/bash
# build-and-push-all.sh

set -e

echo "==================================="
echo "Building and Pushing All Services"
echo "==================================="

# ECR registry
REGISTRY="901444280953.dkr.ecr.ap-southeast-2.amazonaws.com"
REGION="ap-southeast-2"

# Login to ECR
echo ""
echo "Logging into ECR..."
aws ecr get-login-password --region $REGION | \
  docker login --username AWS --password-stdin $REGISTRY

# Services to build
SERVICES=(
  "video-api:video-api"
  "admin-service:admin-service"
  "transcode-worker:transcode-worker"
  "s3-lambda:s3-to-sqs-lambda"
)

cd /home/ubuntu/oct1/webapp.v5/services

for SERVICE in "${SERVICES[@]}"; do
  IFS=':' read -r DIR REPO <<< "$SERVICE"
  
  echo ""
  echo "==================================="
  echo "Building $DIR"
  echo "==================================="
  
  cd $DIR
  
  # Build
  docker build -t n11817143-app/$DIR:latest .
  
  # Tag
  docker tag n11817143-app/$DIR:latest $REGISTRY/n11817143-app/$REPO:latest
  
  # Push
  docker push $REGISTRY/n11817143-app/$REPO:latest
  
  echo "✅ $DIR complete"
  
  cd ..
done

echo ""
echo "==================================="
echo "All images built and pushed!"
echo "==================================="
echo ""
echo "Verify in AWS Console:"
echo "https://ap-southeast-2.console.aws.amazon.com/ecr/repositories?region=ap-southeast-2"
```

Save as `build-and-push-all.sh` and run:
```bash
chmod +x build-and-push-all.sh
./build-and-push-all.sh
```

---

## 🔍 Verify Images in ECR

```bash
# List images in each repository
aws ecr list-images --repository-name n11817143-app/video-api --region ap-southeast-2
aws ecr list-images --repository-name n11817143-app/admin-service --region ap-southeast-2
aws ecr list-images --repository-name n11817143-app/transcode-worker --region ap-southeast-2
aws ecr list-images --repository-name n11817143-app/s3-to-sqs-lambda --region ap-southeast-2
```

Or check in AWS Console:
```
https://ap-southeast-2.console.aws.amazon.com/ecr/repositories?region=ap-southeast-2
```

---

## 📊 Expected Output

After successful push, you should see:

```
The push refers to repository [901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-app/video-api]
abc123def456: Pushed
latest: digest: sha256:abc123... size: 1234
```

---

## ⚠️ Troubleshooting

### Issue: "no basic auth credentials"
**Solution:** Re-login to ECR
```bash
aws ecr get-login-password --region ap-southeast-2 | \
  docker login --username AWS --password-stdin \
  901444280953.dkr.ecr.ap-southeast-2.amazonaws.com
```

### Issue: "repository does not exist"
**Solution:** Verify repository name matches exactly:
```bash
aws ecr describe-repositories --region ap-southeast-2 | grep repositoryName
```

### Issue: AWS SSO session expired
**Solution:** Re-login to SSO
```bash
aws sso login --profile cab432
```

### Issue: Docker daemon not running
**Solution:** Start Docker
```bash
sudo systemctl start docker
sudo systemctl enable docker
```

---

## 🎯 Next Steps After Pushing Images

Even though we can't create ECS services with Terraform due to IAM restrictions, you can:

1. **Demonstrate Image Availability**
   - Show images in ECR
   - Verify image tags and digests

2. **Document for Assessment**
   - Screenshots of ECR repositories
   - Docker build logs
   - Image metadata

3. **Prepare for Manual Deployment** (if allowed)
   - Create ECS task definitions via AWS Console
   - Create ECS services via AWS Console
   - Configure ALB target groups via AWS Console

4. **Local Testing**
   ```bash
   cd /home/ubuntu/oct1/webapp.v5
   docker-compose up
   # Test all services locally
   ```

---

## 📝 Notes

- ECR repositories: ✅ Created successfully
- Images can be built: ✅ Ready
- Images can be pushed: ✅ Ready
- ECS deployment: ❌ Blocked by IAM

The Docker images are production-ready and can be deployed to ECS once IAM permissions allow or by an administrator.

---

**Last Updated:** October 30, 2025  
**Student:** n11817143  
**Status:** ECR Ready, Images Can Be Built & Pushed
