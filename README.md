# 🎥 Video Platform - Microservices Architecture

[![AWS](https://img.shields.io/badge/AWS-ECS%20Fargate-FF9900?logo=amazon-aws)](https://aws.amazon.com/fargate/)
[![Terraform](https://img.shields.io/badge/Terraform-1.5%2B-7B42BC?logo=terraform)](https://www.terraform.io/)
[![Node.js](https://img.shields.io/badge/Node.js-18-339933?logo=node.js)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://reactjs.org/)

A production-ready, cloud-native video platform built with microservices architecture on AWS ECS Fargate. Features include user authentication, video upload, automated transcoding, and adaptive streaming playback.

**Student:** n11817143  
**Course:** CAB432 - Cloud Computing  
**Institution:** Queensland University of Technology

---

## 🚀 Live Application

- **Frontend**: [https://app.n11817143-videoapp.cab432.com](https://app.n11817143-videoapp.cab432.com)
- **Backend API**: [https://n11817143-videoapp.cab432.com/api](https://n11817143-videoapp.cab432.com/api)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Deployment](#-deployment)
- [API Documentation](#-api-documentation)
- [Monitoring](#-monitoring)
- [Documentation](#-documentation)

---

## 🎯 Overview

This project demonstrates a complete cloud-native microservices architecture for a video processing platform. Built as part of CAB432 Cloud Computing course, it showcases:

- **Microservices Architecture** - Three independent, scalable services
- **Containerization** - Docker containers orchestrated with AWS ECS Fargate
- **Infrastructure as Code** - Complete Terraform automation
- **Serverless Computing** - AWS Lambda for event-driven processing
- **Auto-scaling** - Dynamic scaling based on CPU and memory metrics
- **Monitoring & Observability** - CloudWatch metrics, logs, and alarms

---

## 🏗️ Architecture

### High-Level Overview

\`\`\`
Users
  │
  ├──► CloudFront (CDN) ──► S3 (React Frontend)
  │
  └──► Route53 (DNS) ──► ALB (HTTPS) ──┬──► Video API Service (ECS Fargate)
                                        ├──► Admin Service (ECS Fargate)
                                        └──► Transcode Worker (ECS Fargate)
                                                  │
                                        ┌─────────┴─────────┐
                                        │                   │
                                   DynamoDB    S3       Cognito    SQS
                                   (Metadata) (Videos)  (Auth)   (Queue)
\`\`\`

### Microservices

1. **Video API Service** - Main REST API for video operations and user authentication
   - **CPU**: 512 units (0.5 vCPU), **Memory**: 1024 MB
   - **Scaling**: 1-5 tasks, **Port**: 8080

2. **Admin Service** - Administrative operations and user management
   - **CPU**: 256 units (0.25 vCPU), **Memory**: 512 MB
   - **Scaling**: 1-3 tasks, **Port**: 8080

3. **Transcode Worker** - Background video processing with FFmpeg
   - **CPU**: 1024 units (1 vCPU), **Memory**: 2048 MB
   - **Scaling**: 0-10 tasks (can scale to zero)

4. **S3-to-SQS Lambda** - Event-driven job queue creation
   - **Memory**: 256 MB, **Timeout**: 30 seconds

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed documentation.

---

## ✨ Features

### Core Features

- ✅ **User Authentication** - JWT-based auth with AWS Cognito
- ✅ **Video Upload** - Direct upload to S3 with presigned URLs
- ✅ **Automatic Transcoding** - Background processing to 720p
- ✅ **Video Streaming** - Adaptive quality playback from S3
- ✅ **Admin Dashboard** - User and video management
- ✅ **RESTful API** - Complete REST API

### Cloud Features

- ✅ **Microservices** - 3 services + Lambda function
- ✅ **Auto-scaling** - 0-10 tasks based on CPU/Memory
- ✅ **Load Balancing** - ALB with path-based routing
- ✅ **High Availability** - Multi-AZ deployment
- ✅ **Monitoring** - CloudWatch metrics, logs, alarms
- ✅ **Infrastructure as Code** - Complete Terraform config
- ✅ **Security** - HTTPS, Cognito, IAM, security groups

---

## 🛠️ Tech Stack

**Frontend:** React 18, Vite, AWS Amplify, CloudFront, S3  
**Backend:** Node.js 18, Express.js, FFmpeg, AWS SDK v3  
**Infrastructure:** ECS Fargate, ALB, ECR, S3, DynamoDB, SQS, Lambda, Cognito, CloudWatch, Route53, ACM  
**DevOps:** Terraform 1.5+, Docker, GitHub

---

## 📁 Project Structure

\`\`\`
webapp.v5/
├── client/                   # React frontend
├── server/services/          # Backend microservices
│   ├── video-api/           # Video API service
│   ├── admin-service/       # Admin service
│   └── transcode-worker/    # Transcode worker
├── terraform/               # Infrastructure as Code
│   ├── main.tf             # Main configuration
│   ├── terraform.tfvars    # Variable values (source of truth)
│   └── modules/            # Reusable modules
├── lambda/s3-to-sqs/       # Lambda function
├── scripts/                # Utility scripts
├── tests/                  # Test scripts
└── docs/                   # Documentation
\`\`\`

---

## 📦 Prerequisites

1. **Node.js 18+** - JavaScript runtime
2. **Docker** - Container platform
3. **Terraform 1.5+** - Infrastructure as Code
4. **AWS CLI v2** - AWS command line
5. **Git** - Version control

### AWS Configuration

\`\`\`bash
aws configure --profile cab432
export AWS_PROFILE=cab432
export AWS_REGION=ap-southeast-2
\`\`\`

---

## 🚀 Deployment

### Quick Start

\`\`\`bash
# 1. Clone repository
git clone https://github.com/aswanthraj2112/webapp.v4.git
cd webapp.v4 && git checkout webapp.v5

# 2. Deploy infrastructure
cd terraform
terraform init
terraform apply

# 3. Build and push images
cd .. && ./scripts/build-and-push.sh all

# 4. Deploy frontend
cd client && npm install && npm run build
aws s3 sync dist/ s3://\$(terraform -chdir=../terraform output -raw s3_bucket_name)/ --delete

# 5. Verify
./tests/validate-aws.sh
\`\`\`

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed instructions.

---

## 📚 API Documentation

**Base URL:** \`https://n11817143-videoapp.cab432.com/api\`

### Key Endpoints

\`\`\`http
POST /api/auth/signup          # User registration
POST /api/auth/login           # User authentication
GET  /api/videos               # List all videos
GET  /api/videos/:id           # Get video details
POST /api/videos/upload        # Get upload URL
GET  /api/admin/users          # List users (admin)
GET  /api/admin/stats          # System stats (admin)
\`\`\`

All authenticated endpoints require: \`Authorization: Bearer <jwt_token>\`

See [API_REFERENCE.md](API_REFERENCE.md) for complete documentation.

---

## 📊 Monitoring

### CloudWatch Metrics

- **CPU Utilization** - Target: <70%
- **Memory Utilization** - Target: <80%
- **Task Count**, **Request Count**, **Response Time**

### View Logs

\`\`\`bash
# ECS logs
aws logs tail /ecs/n11817143-app --follow

# Lambda logs
aws logs tail /aws/lambda/n11817143-app-s3-to-sqs --follow
\`\`\`

### Alarms

- CPU > 80% for 10 minutes
- Memory > 80% for 10 minutes
- DLQ messages > 0 (failed jobs)

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [README.md](README.md) | Project overview (this file) |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Detailed architecture |
| [API_REFERENCE.md](API_REFERENCE.md) | API documentation |
| [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | Deployment guide |
| [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md) | Documentation index |

**Source of Truth:** \`terraform/terraform.tfvars\` contains all infrastructure settings.

---

## 💰 Cost Estimation

| Resource | Monthly Cost |
|----------|--------------|
| ECS Fargate (4-8 tasks) | ~$40-80 |
| Application Load Balancer | ~$20 |
| S3 + Data Transfer | ~$5-10 |
| DynamoDB + SQS + Lambda | ~$10 |
| CloudWatch + ECR | ~$7 |
| CloudFront | ~$5 |
| **Total** | **~$85-130/month** |

**Cost Optimization:** Transcode worker scales to 0 when idle, NAT Gateway disabled.

---

## 🚀 Quick Commands

\`\`\`bash
# Deploy
cd terraform && terraform apply

# Build images
./scripts/build-and-push.sh all

# Update service
aws ecs update-service --cluster n11817143-app-cluster \\
  --service n11817143-app-video-api --force-new-deployment

# View logs
aws logs tail /ecs/n11817143-app --follow

# Test
./tests/validate-aws.sh
curl https://n11817143-videoapp.cab432.com/api/health
\`\`\`

---

## 🎓 Project Evolution

**Assignment 2 (Monolithic):** Single EC2, monolithic app, manual deployment  
**Assignment 3 (Microservices):** ECS Fargate, 3 microservices, Terraform, auto-scaling

---

## 👤 Author

**Student ID:** n11817143
**Course:** CAB432 - Cloud Computing  
**Institution:** Queensland University of Technology  

---

**Built with for CAB432 - Cloud Computing**  
**Version:** 5.0 (Microservices Architecture)
