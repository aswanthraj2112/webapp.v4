# QUT AWS Environment Compliance Updates

## Changes Made to Match QUT Practical Guidelines

### ✅ 1. ECS Task Networking (CRITICAL FIX)
**QUT Requirement:** ECS tasks must use PUBLIC subnets with public IP enabled

**Changes:**
- Updated all ECS services to use `data.aws_subnets.public.ids` instead of private subnets
- Services affected:
  - `video_api_service`
  - `admin_service`
  - `transcode_worker`

**Files Modified:**
- `/terraform/main.tf` - Changed subnet_ids for all ECS service modules

### ✅ 2. ECS Task Logging (QUT GUIDELINE)
**QUT Requirement:** Log collection should be disabled ("Uncheck 'Use log collection'")

**Changes:**
- Added `enable_logging` variable (default: `false`) to ECS service module
- Made `logConfiguration` conditional - only included if `enable_logging = true`
- Current configuration: Logging is **DISABLED** by default

**Files Modified:**
- `/terraform/modules/ecs-service/variables.tf` - Added `enable_logging` variable
- `/terraform/modules/ecs-service/main.tf` - Made logConfiguration conditional

### ✅ 3. Security Groups
**QUT Requirement:** Must use existing `CAB432SG` security group

**Current Configuration:**
- ✅ Using `CAB432SG` (sg-032bd1ff8cf77dbb9) for all ECS services
- ✅ Using `CAB432SG` for Application Load Balancer
- ✅ Variable defined: `cab432_security_group_id`

### ✅ 4. IAM Roles
**QUT Requirement:** Must use existing pre-configured roles

**Current Configuration:**
- ✅ Task Execution Role: `Execution-Role-CAB432-ECS`
- ✅ Task Role: `Task-Role-CAB432-ECS`
- ✅ Using data sources (not creating new roles)

### ✅ 5. VPC and Subnets
**QUT Requirement:** Must use existing `aws-controltower-VPC`

**Current Configuration:**
- ✅ VPC: `vpc-007bab53289655834` (aws-controltower-VPC)
- ✅ Public Subnets: Auto-detected via data source
- ✅ Using data sources (not creating new VPC)

### ✅ 6. Application Load Balancer
**QUT Requirements:**
- Must be Internet-facing ✅
- Must use public subnets ✅
- Must use CAB432SG security group ✅
- Must have HTTP listener on port 80 ✅

**Current Configuration:**
- All requirements met in `/terraform/modules/alb/main.tf`

### ✅ 7. ECS Cluster
**QUT Requirement:** Create with no namespace

**Current Configuration:**
- ✅ Cluster created without namespace
- ✅ Using AWS Fargate (serverless)

### ✅ 8. Tagging
**QUT Requirement:** All resources must have `qut-username` tag

**Current Configuration:**
- ✅ Provider default_tags includes `qut-username = n11817143@qut.edu.au`
- ✅ All resources automatically inherit this tag

---

## Summary of QUT-Compliant Infrastructure

### What We're Using (Existing Resources):
- ✅ VPC: `vpc-007bab53289655834`
- ✅ Security Group: `CAB432SG` (sg-032bd1ff8cf77dbb9)
- ✅ IAM Roles: `Execution-Role-CAB432-ECS`, `Task-Role-CAB432-ECS`
- ✅ Public Subnets: Auto-detected from VPC

### What We're Creating:
- ✅ ECS Cluster (n11817143-app-cluster)
- ✅ ECR Repositories (4 repos)
- ✅ Application Load Balancer
- ✅ ALB Target Groups
- ✅ ECS Services (3 services)
- ✅ ECS Task Definitions (3 tasks)
- ✅ Auto-scaling Policies
- ✅ CloudWatch Alarms

### What We're NOT Creating (QUT Restrictions):
- ❌ VPC (must use existing)
- ❌ Security Groups (must use existing CAB432SG)
- ❌ IAM Roles (must use existing ECS roles)
- ❌ CloudWatch Log Groups with tags (created manually without tags)

---

## Key Configuration Settings

### ECS Task Definition Settings:
```hcl
network_mode             = "awsvpc"
requires_compatibilities = ["FARGATE"]
execution_role_arn       = "arn:aws:iam::901444280953:role/Execution-Role-CAB432-ECS"
task_role_arn            = "arn:aws:iam::901444280953:role/Task-Role-CAB432-ECS"
```

### ECS Service Networking:
```hcl
network_configuration {
  subnets          = data.aws_subnets.public.ids  # PUBLIC subnets (QUT requirement)
  security_groups  = [data.aws_security_group.cab432_sg.id]  # CAB432SG
  assign_public_ip = true  # MUST be true for public subnets
}
```

### Container Configuration:
```hcl
portMappings = [
  {
    containerPort = 8080  # video-api
    protocol      = "tcp"
  }
]

# Logging DISABLED by default (QUT guideline)
logConfiguration = var.enable_logging ? {...} : null
```

---

## Next Steps

1. **Deploy Infrastructure:**
   ```bash
   cd /home/ubuntu/oct1/webapp.v5/terraform
   terraform plan -out=tfplan
   terraform apply tfplan
   ```

2. **Build and Push Docker Images:**
   ```bash
   # Login to ECR
   aws ecr get-login-password --region ap-southeast-2 | \
     docker login --username AWS --password-stdin \
     901444280953.dkr.ecr.ap-southeast-2.amazonaws.com
   
   # Build and push (example)
   docker build -t 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-app/video-api:latest ./server
   docker push 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-app/video-api:latest
   ```

3. **Verify Deployment:**
   ```bash
   # Check ECS services
   aws ecs list-services --cluster n11817143-app-cluster
   
   # Get ALB DNS
   terraform output alb_dns_name
   
   # Test endpoint
   curl http://<ALB-DNS>/healthz
   ```

---

## Important Notes

- **Public IP Required:** Since ECS tasks are in public subnets without NAT Gateway, they MUST have `assign_public_ip = true` to access the internet (for pulling container images)
- **Logging Disabled:** As per QUT guidelines, CloudWatch logging is disabled by default. Enable only for debugging if needed.
- **Security Group Ports:** CAB432SG allows ports 80, 443, 8080, 5000, 3000-3010 from internet
- **Task Roles:** Pre-configured with S3, DynamoDB, SQS, Cognito permissions

---

## Compliance Checklist

- [x] Using existing VPC (vpc-007bab53289655834)
- [x] Using existing security group (CAB432SG)
- [x] Using existing IAM roles (Execution-Role-CAB432-ECS, Task-Role-CAB432-ECS)
- [x] ECS tasks in PUBLIC subnets
- [x] ECS tasks have public IP enabled
- [x] ALB is internet-facing
- [x] ALB uses public subnets
- [x] ALB uses CAB432SG
- [x] HTTP listener on port 80
- [x] All resources tagged with qut-username
- [x] Log collection disabled (QUT guideline)
- [x] ECS cluster without namespace
- [x] Using AWS Fargate

**Configuration is now fully QUT-compliant!** ✅
