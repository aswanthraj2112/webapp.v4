# 🎥 Video Platform - Microservices Architecture# n11817143 Video Transcoder



A scalable, cloud-native video platform built with microservices architecture, deployed on AWS ECS Fargate with automated CI/CD.This repository contains a stateless, cloud-native video transcoder application that aligns with the CAB432 assignment requirements. The stack comprises a React frontend, an Express backend, and AWS managed services for authentication, storage, caching, and persistence.



[![Video API](https://img.shields.io/badge/video--api-active-green)](https://github.com/aswanthraj2112/webapp.v4)## 🚀 Quick Start (Automated)

[![Admin Service](https://img.shields.io/badge/admin--service-active-green)](https://github.com/aswanthraj2112/webapp.v4)

[![Transcode Worker](https://img.shields.io/badge/transcode--worker-active-green)](https://github.com/aswanthraj2112/webapp.v4)The application now features **fully automated configuration** that detects your EC2 instance information at startup:

[![AWS ECS](https://img.shields.io/badge/AWS-ECS%20Fargate-orange)](https://aws.amazon.com/ecs/)

[![Terraform](https://img.shields.io/badge/IaC-Terraform-purple)](https://www.terraform.io/)```bash

# Simple one-command startup

---./start.sh

```

## 📋 Table of Contents

This automatically:

- [Overview](#overview)- ✅ Detects your EC2 instance ID, IP, and DNS

- [Architecture](#architecture)- ✅ Generates configuration files

- [Features](#features)- ✅ Starts all Docker containers

- [Microservices](#microservices)

- [Tech Stack](#tech-stack)For more details, see [AUTOMATED_STARTUP.md](AUTOMATED_STARTUP.md)

- [Getting Started](#getting-started)

- [Deployment](#deployment)## 📋 Configuration

- [API Documentation](#api-documentation)

- [Monitoring](#monitoring)All infrastructure and application code are pre-configured for the following university-issued resources:

- [Testing](#testing)

- [Documentation](#documentation)- **Region:** `ap-southeast-2`

- **EC2 Instance:** `i-0aaedfc6a70038409` (auto-detected at startup)

---- **Cognito User Pool:** `n11817143-a2` (`ap-southeast-2_CdVnmKfrW`)

- **S3 Bucket:** `n11817143-a2`

## 🎯 Overview- **DynamoDB Table:** `n11817143-VideoApp`

- **ElastiCache Cluster:** `n11817143-a2-cache` (`n11817143-a2-cache.km2jzi.cfg.apse2.cache.amazonaws.com`)

This project demonstrates a complete migration from monolithic to microservices architecture for a video platform. It showcases modern cloud-native development practices including:- **Parameter Store Prefix:** `/n11817143/app/`

- **Secrets Manager Secret:** `n11817143-a2-secret`

- **Microservices Architecture** - Independent, scalable services- **Domain Name:** `n11817143-videoapp.cab432.com`

- **Containerization** - Docker containers for all services

- **Orchestration** - AWS ECS Fargate for container management## Repository Layout

- **Infrastructure as Code** - Terraform for AWS resources

- **CI/CD** - GitHub Actions for automated deployments| Path | Description |

- **Auto-scaling** - Dynamic scaling based on load| ---- | ----------- |

- **Monitoring** - CloudWatch metrics and logs| `client/` | React application served by Nginx and configured with AWS Amplify for Cognito auth and S3 uploads. |

| `server/` | Express API that validates Cognito JWTs, issues S3 presigned URLs, stores metadata in DynamoDB, and caches listings in Memcached. |

**Student:** n11817143  | `docker-compose.yml` | Local orchestration of the frontend and backend services. |

**Course:** CAB432 - Cloud Computing  | `terraform/` | Terraform configuration that provisions the AWS resources listed above and writes runtime configuration to SSM & Secrets Manager. |

**University:** Queensland University of Technology| `Dockerfile` | Legacy single-image build (unused once docker-compose is adopted). |



---## Prerequisites



## 🏗️ ArchitectureBefore deploying, install and configure the following tools on your workstation or CI environment:



### High-Level Architecture1. **Node.js 22.0+ and npm 10+** – required if you need to lint or run either service directly.

2. **Docker Engine & Docker Compose Plugin** – required for local development and for building the container images.

```3. **Terraform 1.5+** – used to provision cloud infrastructure.

                                    ┌─────────────────┐4. **AWS CLI v2** – configure it with an IAM user/role that has permission to manage S3, DynamoDB, Cognito, ElastiCache, Secrets Manager, SSM Parameter Store, and Route 53 in account `901444280953`.

                                    │   Internet      │

                                    └────────┬────────┘> **Tip:** Run `aws configure --profile cab432` to create a dedicated named profile, then export `AWS_PROFILE=cab432` before invoking Terraform or Docker builds that rely on the CLI.

                                             │

                                    ┌────────▼────────┐## Bootstrap AWS Infrastructure

                                    │  Application    │

                                    │  Load Balancer  │Terraform is the single source of truth for infrastructure. It creates or reuses the named AWS services and writes application configuration parameters.

                                    └────────┬────────┘

                                             │```bash

                    ┌────────────────────────┼────────────────────────┐cd terraform

                    │                        │                        │terraform init

           ┌────────▼────────┐    ┌─────────▼────────┐    ┌─────────▼────────┐terraform validate

           │   Video API     │    │  Admin Service   │    │ Transcode Worker │terraform plan -out tfplan

           │   (ECS Fargate) │    │  (ECS Fargate)   │    │  (ECS Fargate)   │terraform apply tfplan

           └────────┬────────┘    └─────────┬────────┘    └─────────┬────────┘```

                    │                       │                        │

                    └───────────────────────┼────────────────────────┘Key behaviour:

                                            │

                    ┌───────────────────────┴────────────────────────┐- The module **reuses** the existing Cognito User Pool (`ap-southeast-2_CdVnmKfrW`) and creates a new app client; the client ID is exported and written to SSM.

                    │                                                 │- A **private S3 bucket** (`n11817143-a2`) is created with versioning and SSE enabled.

         ┌──────────▼──────────┐                        ┌────────────▼────────┐- A **DynamoDB table** (`n11817143-VideoApp`) is created with PAY_PER_REQUEST billing.

         │   AWS Services      │                        │  S3 + Lambda        │- A **Memcached ElastiCache cluster** (`n11817143-a2-cache`) is provisioned when subnet and security group IDs are provided via `-var` or `.tfvars`.

         │  • DynamoDB         │                        │  • Video Storage    │- Application configuration is stored beneath `/n11817143/app/` in Parameter Store, and the Cognito client secret is stored in Secrets Manager (`n11817143-a2-secret`).

         │  • S3               │                        │  • Event Trigger    │- A public CNAME record `n11817143-videoapp.cab432.com` is pointed at `ec2-3-107-100-58.ap-southeast-2.compute.amazonaws.com`.

         │  • SQS              │                        │  • SQS Queue        │

         │  • Cognito          │                        └─────────────────────┘> **Optional inputs:** Provide `cache_subnet_ids` and `cache_security_group_ids` if the default VPC does not meet assignment requirements. All variables have defaults that match the assignment specification, but they can be overridden via `terraform.tfvars` or `-var` flags.

         └─────────────────────┘

```After `terraform apply` completes, the application will automatically load configuration from Parameter Store and Secrets Manager. You can verify the configuration is accessible:



### Service Communication```bash

# Verify Parameter Store configuration

```npm --prefix server run params:status

User Request → ALB → Video API → DynamoDB/S3/Cognito

                  ↓# Optional: View all parameters (for troubleshooting)

              Admin Service → DynamoDB/Cognitoaws ssm get-parameters-by-path \

                  ↓  --path /n11817143/app/ \

        S3 Upload → Lambda → SQS → Transcode Worker → S3  --with-decryption \

```  --profile cab432



---# Optional: View JWT secret (for troubleshooting)

aws secretsmanager get-secret-value \

## ✨ Features  --secret-id n11817143-a2-secret \

  --profile cab432

### Core Features```

- ✅ **User Authentication** - JWT-based with AWS Cognito

- ✅ **Video Upload** - Direct upload to S3 with metadata storageNo manual configuration is required - the application loads all settings dynamically.

- ✅ **Video Transcoding** - Automatic background processing with FFmpeg

- ✅ **Video Streaming** - Serve transcoded videos from S3## Local Development

- ✅ **Admin Dashboard** - User and video management

- ✅ **RESTful API** - Complete API for all operationsThe application uses **AWS Parameter Store** and **Secrets Manager** for configuration, eliminating the need for manual .env file management. All configuration is loaded dynamically at runtime.



### Cloud Features### Quick Start

- ✅ **Microservices** - 3 independent services + 1 Lambda function

- ✅ **Auto-scaling** - Scale based on CPU/Memory (1-4 tasks)1. **Ensure AWS credentials are configured** for your environment:

- ✅ **Load Balancing** - ALB with path-based routing   ```bash

- ✅ **High Availability** - Multi-AZ deployment   aws configure --profile cab432

- ✅ **Monitoring** - CloudWatch metrics, logs, and alarms   export AWS_PROFILE=cab432

- ✅ **CI/CD** - Automated builds and deployments   ```

- ✅ **IaC** - Complete infrastructure as code with Terraform

2. **Start both services via Docker** (recommended):

---   ```bash

   docker compose up --build

## 🔧 Microservices   ```

   - Backend available at `https://n11817143-videoapp.cab432.com:8080/api` (using domain with updated DNS)

### 1. Video API Service   - Frontend served at `https://n11817143-videoapp.cab432.com:3000` (using domain with updated DNS)

**Port:** 8080     

**Purpose:** Main API for video operations and authentication     **Note**: The application now uses instance ID `i-0aaedfc6a70038409` to automatically resolve the public DNS and IP addresses. The Route53 DNS record will be updated automatically via Terraform to point to the correct EC2 instance.

**Technology:** Node.js + Express

### Configuration Details

**Endpoints:**

- `GET /healthz` - Health checkThe application automatically loads configuration from:

- `POST /api/auth/signup` - User registration- **Parameter Store**: `/n11817143/app/*` parameters

- `POST /api/auth/login` - User authentication- **Secrets Manager**: `n11817143-a2-secret` for JWT secret

- `GET /api/videos` - List all videos- **Environment Variables**: For local overrides (optional)

- `GET /api/videos/:id` - Get video details

- `POST /api/videos/upload` - Upload new videoCurrent configuration defaults (can be overridden via environment variables):

- **AWS Region**: `ap-southeast-2`

**Scaling:** 1-4 tasks (CPU-based)  - **Cognito User Pool**: `ap-southeast-2_CdVnmKfrW`

**Resources:** 0.5 vCPU, 1GB RAM- **S3 Bucket**: `n11817143-a2` 

- **DynamoDB Table**: `n11817143-VideoApp`

### 2. Admin Service- **ElastiCache Endpoint**: `n11817143-a2-cache.km2jzi.cfg.apse2.cache.amazonaws.com:11211`

**Port:** 8081  - **Domain**: `n11817143-videoapp.cab432.com`

**Purpose:** Administrative operations  

**Technology:** Node.js + Express### Alternative Development Options



**Endpoints:**1. **Install dependencies** (optional when using Docker):

- `GET /api/admin/health` - Health check   ```bash

- `GET /api/admin/users` - List all users   npm --prefix server install

- `GET /api/admin/stats` - System statistics   npm --prefix client install

   ```

**Scaling:** 1-2 tasks (CPU-based)  

**Resources:** 0.25 vCPU, 512MB RAM2. **For local .env override** (optional), create `server/.env` with minimal config:

   ```ini

### 3. Transcode Worker   PORT=8080

**Port:** N/A (background worker)     CLIENT_ORIGINS=http://localhost:3000,http://n11817143-videoapp.cab432.com:3000

**Purpose:** Process video transcoding jobs from SQS     AWS_REGION=ap-southeast-2

**Technology:** Node.js + FFmpeg   ```



**Functions:**3. **For iterative frontend development** without containers:

- Poll SQS for transcode jobs   ```bash

- Download original video from S3   # Start backend via Docker (recommended)

- Transcode to multiple resolutions   docker compose up backend -d

- Upload transcoded videos to S3   

   # Or start backend directly (requires AWS credentials)

**Scaling:** 0-4 tasks (Queue-based)     npm --prefix server run dev

**Resources:** 1 vCPU, 2GB RAM   

   # Start frontend development server  

### 4. S3-to-SQS Lambda   npm --prefix client run dev

**Trigger:** S3 Object Created events     ```

**Purpose:** Create SQS messages for new video uploads  

**Technology:** Node.js (Container Image)### Troubleshooting Configuration



**Resources:** 256MB RAM, 30s timeoutIf you encounter configuration issues:



---```bash

# Check Parameter Store connectivity

## 🛠️ Tech Stacknpm --prefix server run params:status



### Backend# View Docker logs for configuration loading

- **Runtime:** Node.js 20docker compose logs backend | grep -E "(Configuration|Parameter|Secret)"

- **Framework:** Express.js

- **Video Processing:** FFmpeg# Test AWS credentials

- **Authentication:** JWT + AWS Cognitoaws sts get-caller-identity --profile cab432

- **Database:** DynamoDB```



### Cloud Infrastructure## Deploying to EC2

- **Compute:** AWS ECS Fargate

- **Container Registry:** Amazon ECR1. **Build production images** on your workstation or CI runner:

- **Load Balancer:** Application Load Balancer   ```bash

- **Storage:** Amazon S3   docker compose build

- **Queue:** Amazon SQS   ```

- **Serverless:** AWS Lambda   Tag and push the images to your registry of choice (e.g., Amazon ECR).

- **Monitoring:** CloudWatch

- **IaC:** Terraform 1.5+2. **Provision the host** using Terraform outputs:

   - Ensure the EC2 instance has Docker and Docker Compose installed

### DevOps   - Configure AWS credentials on the instance (IAM role or AWS CLI)

- **Containerization:** Docker   - Copy the `docker-compose.yml` and source directories to the instance

- **CI/CD:** GitHub Actions

- **Version Control:** Git + GitHub3. **Deploy the application**:

- **Local Testing:** Docker Compose   ```bash

   # Clone or copy the application

---   git clone <repository-url>

   cd webapp.v1

## 🚀 Getting Started   

   # Launch the stack (no manual .env needed)

### Prerequisites   docker compose up --build -d

   ```

- **Node.js** 20 or higher

- **Docker** & Docker Compose4. **Verify deployment**:

- **AWS CLI** configured   ```bash

- **Terraform** 1.5 or higher   # Check application health

- **Git**   curl -I http://localhost:8080/api/health

   curl -I http://localhost:3000

### Local Development   

   # Verify configuration loading

#### 1. Clone Repository   docker compose logs backend | grep "Configuration loaded"

   ```

```bash

git clone https://github.com/aswanthraj2112/webapp.v4.git5. **Domain access**:

cd webapp.v4   - Frontend: `http://13.210.12.3:3000` (current working URL)

git checkout webapp.v5   - Backend API: `http://13.210.12.3:8080/api` (current working URL)

```   - Domain `http://n11817143-videoapp.cab432.com:3000` (requires DNS update to work)



#### 2. Run with Docker ComposeThe application automatically loads all configuration from AWS services - no manual environment setup required.



```bash## Operations & Maintenance

# Start all services

docker-compose up -d- **Invalidate video cache:** call `POST /api/videos/cache/invalidate` after bulk updates, or restart the backend container.

- **Admin features:** authenticated administrators (users in the `admins` Cognito group) can manage users via `/admin` in the frontend, which proxies to the backend's `/api/admin/users` endpoints.

# View logs- **Linting:** `npm --prefix server run lint` and `npm --prefix client run lint`.

docker-compose logs -f- **Troubleshooting parameters:** run `npm --prefix server run params:status` to verify Parameter Store reachability.



# Test endpoints## Support

curl http://localhost:8080/healthz

curl http://localhost:8081/api/admin/healthFor grading or operational issues, raise a ticket through th


# Stop services
docker-compose down
```

---

## 🌐 Deployment

### AWS Deployment

Complete deployment guide: [TERRAFORM_DEPLOYMENT.md](terraform/TERRAFORM_DEPLOYMENT.md)

#### Quick Start

```bash
# 1. Configure Terraform
cd terraform
cp terraform-microservices.tfvars.example terraform.tfvars
vim terraform.tfvars  # Edit with your values

# 2. Deploy infrastructure
terraform init
terraform plan
terraform apply

# 3. Get ALB DNS
ALB_DNS=$(terraform output -raw alb_dns_name)
echo "Application URL: http://$ALB_DNS"

# 4. Build and push Docker images
cd ..
./scripts/build-and-push.sh all

# 5. Verify deployment
./tests/validate-aws.sh

# 6. Test endpoints
ALB_DNS=$ALB_DNS ./tests/test-endpoints.sh
```

### CI/CD Deployment

Complete CI/CD guide: [CICD_PIPELINE.md](CICD_PIPELINE.md)

#### Setup GitHub Actions

```bash
# 1. Add GitHub Secrets
# Go to: Settings → Secrets and variables → Actions
# Add: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY

# 2. Push to main branch
git push origin main

# 3. Monitor deployment in Actions tab

# 4. Verify deployment
curl http://$(terraform output -raw alb_dns_name)/healthz
```

---

## 📚 API Documentation

### Base URL

```
Production: http://<ALB_DNS>
Local: http://localhost:8080
```

### Authentication

All authenticated endpoints require JWT token:

```
Authorization: Bearer <your_jwt_token>
```

### Key Endpoints

**Authentication**
```http
POST /api/auth/signup
POST /api/auth/login
```

**Videos**
```http
GET /api/videos
GET /api/videos/:id
POST /api/videos/upload
DELETE /api/videos/:id
```

**Admin**
```http
GET /api/admin/users
GET /api/admin/stats
```

For complete API documentation, see examples in [TESTING_GUIDE.md](TESTING_GUIDE.md).

---

## 📊 Monitoring

### CloudWatch Metrics

- CPU Utilization (target: <70%)
- Memory Utilization (target: <80%)
- Task Count (min: 1, max: 4)
- Request count
- Response time (target: <500ms)

### CloudWatch Logs

```bash
# View ECS logs
aws logs tail /ecs/n11817143-videoapp --follow

# View Lambda logs
aws logs tail /aws/lambda/n11817143-videoapp-s3-to-sqs --follow
```

### Container Insights

Access via AWS Console:
```
CloudWatch → Container Insights → n11817143-videoapp-cluster
```

---

## 🧪 Testing

### Test Scripts

```bash
# Validate AWS infrastructure
./tests/validate-aws.sh

# Test all API endpoints
ALB_DNS=<your-alb-dns> ./tests/test-endpoints.sh

# Run load tests
ALB_DNS=<your-alb-dns> ./tests/load-test.sh
```

### Manual Testing

```bash
# Health check
curl http://$ALB_DNS/healthz

# User signup
curl -X POST http://$ALB_DNS/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","name":"Test"}'

# List videos
curl http://$ALB_DNS/api/videos \
  -H "Authorization: Bearer <token>"
```

---

## 📖 Documentation

### Available Guides

| Document | Description |
|----------|-------------|
| [README.md](README.md) | Project overview (this file) |
| [TERRAFORM_DEPLOYMENT.md](terraform/TERRAFORM_DEPLOYMENT.md) | Deployment guide |
| [CICD_PIPELINE.md](CICD_PIPELINE.md) | CI/CD setup |
| [TESTING_GUIDE.md](TESTING_GUIDE.md) | Testing procedures |
| [VALIDATION_CHECKLIST.md](VALIDATION_CHECKLIST.md) | Deployment checklist |
| [DOCKER_COMPOSE.md](DOCKER_COMPOSE.md) | Local development |

---

## 💰 Cost

### Monthly Cost Estimate

| Resource | Monthly Cost |
|----------|--------------|
| ECS Fargate | ~$40 |
| Application Load Balancer | ~$20 |
| NAT Gateway (2 AZs) | ~$65 |
| S3 + Data Transfer | ~$7 |
| CloudWatch + ECR | ~$6 |
| DynamoDB + SQS + Lambda | ~$5 |
| **Total** | **~$143/month** |

### Cost Optimization

Development environment:
```hcl
enable_nat_gateway = false              # Save $65/month
video_api_desired_count = 1
transcode_worker_desired_count = 0

# Estimated: ~$55-65/month
```

---

## 🚀 Quick Commands

```bash
# Local development
docker-compose up -d
docker-compose logs -f
docker-compose down

# Deploy to AWS
cd terraform && terraform apply
./scripts/build-and-push.sh all

# Test deployment
./tests/validate-aws.sh
ALB_DNS=<dns> ./tests/test-endpoints.sh

# Monitor services
aws ecs describe-services --cluster n11817143-videoapp-cluster
aws logs tail /ecs/n11817143-videoapp --follow
```

---

## 🎓 Project Evolution

### Version 4 (Monolithic)
- Single Node.js application
- Deployed on single EC2 instance
- Manual deployments

### Version 5 (Microservices) ← Current
- 3 independent microservices
- Container-based deployment
- AWS ECS Fargate orchestration
- Automated CI/CD
- Infrastructure as Code
- Auto-scaling and monitoring

---

**Built with ❤️ for CAB432 - Cloud Computing**  
**Last Updated:** October 30, 2025  
**Version:** 5.0 (Microservices Architecture)  
**Student:** n11817143
