# 🎉 Phase 4 Complete - Terraform Infrastructure

## Overview

Phase 4 is now **COMPLETE**! We've created comprehensive Terraform infrastructure for deploying the microservices architecture to AWS ECS Fargate.

---

## 📦 What We Created

### Terraform Modules (6 modules, 18 files)

| Module | Files | Description |
|--------|-------|-------------|
| **vpc** | 3 | VPC, subnets, NAT gateways, routing |
| **security-groups** | 3 | Security groups for all services |
| **alb** | 3 | Application Load Balancer with target groups |
| **ecs-cluster** | 3 | ECS cluster, IAM roles, CloudWatch |
| **ecs-service** | 3 | Reusable ECS service with auto-scaling |
| **ecr** | 3 | ECR repositories for Docker images |

### Main Configuration Files

| File | Lines | Description |
|------|-------|-------------|
| `main-microservices.tf` | 270+ | Main infrastructure configuration |
| `variables-microservices.tf` | 300+ | All variable definitions |
| `outputs-microservices.tf` | 130+ | Output values and commands |
| `terraform-microservices.tfvars.example` | 80+ | Example configuration |
| `TERRAFORM_DEPLOYMENT.md` | 800+ | Complete deployment guide |
| `scripts/build-and-push.sh` | 170+ | Image build automation |

**Total: ~1,950 lines of Terraform + documentation**

---

## 🏗️ Infrastructure Architecture

### Network Layer

```
┌─────────────────────────────────────────────────┐
│              VPC (10.0.0.0/16)                   │
│                                                  │
│  ┌──────────────────┐  ┌──────────────────┐    │
│  │  Public Subnet   │  │  Public Subnet   │    │
│  │  10.0.0.0/24     │  │  10.0.1.0/24     │    │
│  │   (AZ-1)         │  │   (AZ-2)         │    │
│  │                  │  │                  │    │
│  │  ┌───────┐       │  │       ┌───────┐ │    │
│  │  │  ALB  │       │  │       │  NAT  │ │    │
│  │  └───┬───┘       │  │       └───┬───┘ │    │
│  └──────┼───────────┘  └───────────┼─────┘    │
│         │                           │          │
│  ┌──────┼───────────┐  ┌───────────┼─────┐    │
│  │      ▼           │  │           ▼     │    │
│  │  Private Subnet  │  │  Private Subnet │    │
│  │  10.0.10.0/24    │  │  10.0.11.0/24   │    │
│  │   (AZ-1)         │  │   (AZ-2)        │    │
│  │                  │  │                  │    │
│  │  ┌─────────────┐ │  │ ┌─────────────┐ │    │
│  │  │ ECS Tasks   │ │  │ │ ECS Tasks   │ │    │
│  │  │ - Video API │ │  │ │ - Admin     │ │    │
│  │  │ - Worker    │ │  │ │ - Video API │ │    │
│  │  └─────────────┘ │  │ └─────────────┘ │    │
│  └──────────────────┘  └──────────────────┘    │
└─────────────────────────────────────────────────┘
```

### Service Layer

```
Internet
    │
    ▼
┌─────────────────┐
│ Application     │
│ Load Balancer   │
│ (ALB)           │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────┐ ┌──────────────┐
│Video API│ │Admin Service │
│  :8080  │ │    :8081     │
└────┬────┘ └──────┬───────┘
     │             │
     │    ┌────────┘
     │    │
     ▼    ▼
┌──────────────────┐
│ AWS Services     │
│ - DynamoDB       │
│ - S3             │
│ - SQS            │
│ - Cognito        │
│ - ElastiCache    │
└──────────────────┘
         │
         ▼
┌──────────────────┐
│Transcode Worker  │
│ (No port)        │
└──────────────────┘
```

---

## 🎯 Key Features

### 1. **Modular Design**
- ✅ Reusable modules for each component
- ✅ DRY principle throughout
- ✅ Easy to extend and maintain

### 2. **High Availability**
- ✅ Multi-AZ deployment (2 availability zones)
- ✅ Auto-scaling for all services
- ✅ Health checks with automatic recovery
- ✅ Circuit breaker pattern for deployments

### 3. **Security**
- ✅ Private subnets for ECS tasks
- ✅ Security groups with least privilege
- ✅ IAM roles with minimal permissions
- ✅ Secrets management via SSM/Secrets Manager
- ✅ Encryption at rest and in transit

### 4. **Scalability**
- ✅ Auto-scaling based on CPU/memory
- ✅ Application Load Balancer
- ✅ Configurable min/max capacities
- ✅ Target tracking scaling policies

### 5. **Monitoring**
- ✅ CloudWatch Container Insights
- ✅ CloudWatch alarms for all services
- ✅ Centralized logging
- ✅ VPC Flow Logs (optional)

### 6. **Cost Optimization**
- ✅ Optional NAT Gateways (can disable for dev)
- ✅ Scale to zero for workers
- ✅ Spot instances support
- ✅ Configurable log retention
- ✅ Image lifecycle policies

---

## 📊 Resources Created

### Core Infrastructure (50-60 resources)

| Category | Resources | Count |
|----------|-----------|-------|
| **Networking** | VPC, Subnets, IGW, NAT, Routes | 15 |
| **Security** | Security Groups, Rules | 6 |
| **Load Balancing** | ALB, Listeners, Target Groups | 5 |
| **Compute** | ECS Cluster, Services, Tasks | 7 |
| **Container Registry** | ECR Repositories | 4 |
| **IAM** | Roles, Policies | 6 |
| **Monitoring** | CloudWatch Logs, Alarms | 8+ |
| **Auto-scaling** | Targets, Policies | 6 |

**Total: ~55 resources**

---

## 🚀 Deployment Flow

### Step 1: Configure

```bash
# Copy example
cp terraform-microservices.tfvars.example terraform.tfvars

# Edit variables
nano terraform.tfvars
```

### Step 2: Create ECR Repositories

```bash
terraform init
terraform apply -target=module.ecr
```

### Step 3: Build and Push Images

```bash
# Run build script
./scripts/build-and-push.sh all

# Or build manually
docker build -t REPO_URL:latest ./path/to/service
docker push REPO_URL:latest
```

### Step 4: Deploy Infrastructure

```bash
# Plan
terraform plan

# Apply
terraform apply
```

### Step 5: Verify

```bash
# Check services
aws ecs list-services --cluster n11817143-videoapp-cluster

# Test health
curl http://$(terraform output -raw alb_dns_name)/healthz
```

---

## 💡 Configuration Highlights

### Auto-scaling Configuration

```hcl
# CPU-based scaling
resource "aws_appautoscaling_policy" "cpu" {
  target_tracking_scaling_policy_configuration {
    target_value = 70  # Target 70% CPU
    scale_in_cooldown  = 300   # 5 min
    scale_out_cooldown = 60    # 1 min
  }
}

# Memory-based scaling
resource "aws_appautoscaling_policy" "memory" {
  target_tracking_scaling_policy_configuration {
    target_value = 80  # Target 80% memory
  }
}
```

### Health Checks

```hcl
# ALB health check
health_check {
  path                = "/healthz"
  healthy_threshold   = 2
  unhealthy_threshold = 3
  timeout             = 5
  interval            = 30
}

# Container health check (worker)
healthCheck {
  command = ["CMD-SHELL", "ps aux | grep node || exit 1"]
  interval    = 30
  timeout     = 5
  retries     = 3
  startPeriod = 60
}
```

### Deployment Configuration

```hcl
deployment_configuration {
  maximum_percent         = 200  # Allow double capacity during deploy
  minimum_healthy_percent = 100  # Always maintain full capacity
  
  deployment_circuit_breaker {
    enable   = true   # Auto-rollback on failure
    rollback = true
  }
}
```

---

## 💰 Cost Breakdown

### Production Configuration (2 AZs)

| Resource | Configuration | Monthly Cost |
|----------|---------------|--------------|
| **Video API** | 2 tasks @ 0.5vCPU, 1GB | ~$20 |
| **Admin Service** | 1 task @ 0.25vCPU, 512MB | ~$5 |
| **Worker** | 1 task @ 1vCPU, 2GB | ~$15 |
| **ALB** | 1 load balancer | ~$20 |
| **NAT Gateway** | 2 gateways | ~$65 |
| **Data Transfer** | Moderate | ~$10 |
| **CloudWatch** | Logs + metrics | ~$5 |
| **ECR** | Image storage | ~$1 |
| **Total** | | **~$141/month** |

### Development Configuration (Cost Optimized)

```hcl
# terraform.tfvars
enable_nat_gateway = false  # Save $65/month
video_api_desired_count = 1
admin_service_desired_count = 1
transcode_worker_desired_count = 0
transcode_worker_min_capacity = 0

# Estimated: ~$55-65/month
```

---

## 🔧 Customization Options

### Service Sizing

```hcl
# Small (Dev)
video_api_cpu    = 256   # 0.25 vCPU
video_api_memory = 512   # 512 MB

# Medium (Staging)
video_api_cpu    = 512   # 0.5 vCPU
video_api_memory = 1024  # 1 GB

# Large (Production)
video_api_cpu    = 1024  # 1 vCPU
video_api_memory = 2048  # 2 GB
```

### Scaling Limits

```hcl
# Conservative
min_capacity = 1
max_capacity = 2

# Moderate
min_capacity = 1
max_capacity = 4

# Aggressive
min_capacity = 2
max_capacity = 10
```

### Monitoring

```hcl
# Development
enable_container_insights = false
enable_cloudwatch_alarms  = false
log_retention_days        = 3

# Production
enable_container_insights = true
enable_cloudwatch_alarms  = true
log_retention_days        = 30
```

---

## 📈 Monitoring and Alarms

### CloudWatch Alarms Created

1. **ALB Alarms:**
   - High response time (>1s)
   - Unhealthy hosts (>0)

2. **Service Alarms (per service):**
   - High CPU (>80%)
   - High memory (>80%)

3. **Auto-scaling Triggers:**
   - Scale out: CPU >70% or Memory >80%
   - Scale in: CPU <50% and Memory <60%

### Viewing Metrics

```bash
# Container Insights
AWS Console → CloudWatch → Container Insights

# Service metrics
AWS Console → ECS → Cluster → Service → Metrics

# Custom queries
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=video-api
```

---

## 🔄 Update Workflow

### Code Changes

```bash
# 1. Update code
vim server/services/video-api/src/index.js

# 2. Build new image
./scripts/build-and-push.sh video-api

# 3. Force update service
aws ecs update-service \
  --cluster n11817143-videoapp-cluster \
  --service n11817143-videoapp-video-api \
  --force-new-deployment

# 4. Watch deployment
aws ecs describe-services \
  --cluster n11817143-videoapp-cluster \
  --services n11817143-videoapp-video-api
```

### Infrastructure Changes

```bash
# 1. Update terraform.tfvars
vim terraform.tfvars

# 2. Plan changes
terraform plan

# 3. Apply changes
terraform apply

# 4. Verify
terraform output alb_dns_name
```

---

## 🛠️ Management Commands

### Service Operations

```bash
# List services
aws ecs list-services --cluster n11817143-videoapp-cluster

# Describe service
aws ecs describe-services \
  --cluster n11817143-videoapp-cluster \
  --services n11817143-videoapp-video-api

# Update desired count
aws ecs update-service \
  --cluster n11817143-videoapp-cluster \
  --service n11817143-videoapp-video-api \
  --desired-count 3

# Stop all tasks (for maintenance)
aws ecs update-service \
  --cluster n11817143-videoapp-cluster \
  --service n11817143-videoapp-video-api \
  --desired-count 0
```

### Task Operations

```bash
# List tasks
aws ecs list-tasks --cluster n11817143-videoapp-cluster

# Describe task
aws ecs describe-tasks \
  --cluster n11817143-videoapp-cluster \
  --tasks TASK_ARN

# Run one-off task
aws ecs run-task \
  --cluster n11817143-videoapp-cluster \
  --task-definition n11817143-videoapp-video-api:latest \
  --count 1
```

### Log Operations

```bash
# Tail logs
aws logs tail /ecs/n11817143-videoapp --follow

# Filter logs
aws logs tail /ecs/n11817143-videoapp --follow \
  --filter-pattern "ERROR"

# Get specific log stream
aws logs get-log-events \
  --log-group-name /ecs/n11817143-videoapp \
  --log-stream-name video-api/video-api/TASK_ID
```

---

## 📚 Files Summary

### Module Structure

```
terraform/
├── modules/
│   ├── vpc/                    # Network infrastructure
│   │   ├── main.tf            # VPC, subnets, NAT, routes
│   │   ├── variables.tf       # VPC configuration
│   │   └── outputs.tf         # Network outputs
│   ├── security-groups/        # Security groups
│   │   ├── main.tf            # All security groups
│   │   ├── variables.tf       # SG configuration
│   │   └── outputs.tf         # SG IDs
│   ├── alb/                    # Load balancer
│   │   ├── main.tf            # ALB, listeners, target groups
│   │   ├── variables.tf       # ALB configuration
│   │   └── outputs.tf         # ALB endpoints
│   ├── ecs-cluster/            # ECS cluster
│   │   ├── main.tf            # Cluster, IAM, CloudWatch
│   │   ├── variables.tf       # Cluster configuration
│   │   └── outputs.tf         # Cluster details
│   ├── ecs-service/            # Reusable service
│   │   ├── main.tf            # Service, tasks, auto-scaling
│   │   ├── variables.tf       # Service configuration
│   │   └── outputs.tf         # Service details
│   └── ecr/                    # Container registry
│       ├── main.tf            # ECR repositories
│       ├── variables.tf       # ECR configuration
│       └── outputs.tf         # Repository URLs
├── main-microservices.tf       # Main configuration ⭐
├── variables-microservices.tf  # All variables ⭐
├── outputs-microservices.tf    # All outputs ⭐
├── terraform-microservices.tfvars.example  # Example config ⭐
└── TERRAFORM_DEPLOYMENT.md     # Deployment guide ⭐

scripts/
└── build-and-push.sh           # Build automation ⭐
```

---

## 🎓 Best Practices Implemented

1. **Module Reusability** - Generic ECS service module used 3 times
2. **DRY Principle** - No repeated code
3. **Security First** - Private subnets, security groups, IAM roles
4. **Cost Optimization** - Optional resources, scale to zero
5. **Monitoring** - Built-in alarms and metrics
6. **High Availability** - Multi-AZ, auto-scaling, health checks
7. **Documentation** - Comprehensive guides and examples
8. **Automation** - Scripts for common tasks

---

## 🆘 Troubleshooting

See `TERRAFORM_DEPLOYMENT.md` for detailed troubleshooting, including:
- Services won't start
- ALB health checks failing
- Auto-scaling not working
- Costs higher than expected
- Deployment failures

---

## 📖 Next Steps

**Phase 4 is COMPLETE!** ✅

Ready for **Phase 5: CI/CD Pipeline**:
- GitHub Actions workflows
- Automated builds
- ECR pushes
- ECS deployments
- Blue-green strategy

---

**Status:** ✅ Phase 4 Complete  
**Date:** October 30, 2025  
**Next:** Phase 5 - CI/CD Pipeline  
**Student:** n11817143  
**Course:** CAB432 - Cloud Computing
