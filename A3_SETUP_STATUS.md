# Assignment 3 - Setup Status & Verification

**Date:** October 30, 2025  
**Student:** n11817143 (Aswanth Raj)  
**AWS Account:** 901444280953  
**Region:** ap-southeast-2 (Sydney)

---

## ✅ COMPLETED SETUP

### 1. Terraform Infrastructure ✅
- **S3 State Bucket:** `n11817143-terraform-state` ✅
- **DynamoDB Lock Table:** `n11817143-terraform-locks` (Partition Key: `LockID` String) ✅
- **Status:** Ready for Terraform backend configuration

### 2. Amazon ECR Repositories ✅
All 4 microservice repositories created:

| Service | Repository Name | URI |
|---------|----------------|-----|
| Video API | `n11817143/video-api` | `901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143/video-api` ✅ |
| Admin Service | `n11817143/admin-service` | `901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143/admin-service` ✅ |
| Transcode Worker | `n11817143/transcode-worker` | `901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143/transcode-worker` ✅ |
| Lambda S3-to-SQS | `n11817143/s3-to-sqs-lambda` | `901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143/s3-to-sqs-lambda` ✅ |

**Status:** Ready to push Docker images

### 3. VPC & Networking ✅
- **VPC ID:** `vpc-007bab53289655834` (`aws-controltower-VPC`)
- **CIDR:** `172.31.0.0/16`
- **DNS Hostnames:** Enabled ✅
- **DNS Resolution:** Enabled ✅

**Public Subnets (for ALB):**
- `subnet-05a3b8177138c8b14` (aws-controltower-PublicSubnet1) ✅
- `subnet-075811427d5564cf9` (aws-controltower-PublicSubnet2) ✅
- `subnet-04ca053dcbe5f49cc` (aws-controltower-PublicSubnet3) ✅
- `subnet-07ea9e4f9cc9159ca` (Public-Subnet) ✅

**Private Subnets (for ECS Fargate):**
- `subnet-04cc288ea3b2e1e53` (aws-controltower-PrivateSubnet1A) ✅
- `subnet-08e89ff0d9b49c9ae` (aws-controltower-PrivateSubnet2A) ✅
- `subnet-05d0352bb15852524` (aws-controltower-PrivateSubnet3A) ✅

**Status:** VPC ready for deployment, covers 3 AZs ✅

### 4. Amazon Cognito ✅
- **User Pool Name:** `n11817143-a2`
- **User Pool ID:** `ap-southeast-2_CdVnmKfW` ✅
- **ARN:** `arn:aws:cognito-idp:ap-southeast-2:901444280953:userpool/ap-southeast-2_CdVnmKfW` ✅
- **Estimated Users:** 4
- **Feature Plan:** Essentials

### 5. Route 53 DNS ✅
- **Domain:** `n11817143-videoapp.cab432.com` ✅
- **Current Record:** CNAME → `ec2-3-27-210-9.ap-southeast-2.compute.amazonaws.com`
- **ACM Validation:** `_6feeb4fde811b73557b51eaa11468e9e.n11817143-videoapp.cab432.com` ✅

**Status:** Domain configured, ACM certificate validation in progress ✅

---

## ⚠️ MISSING INFORMATION - NEEDS VERIFICATION

Run these AWS CLI commands to gather the remaining information:

### 1. Cognito App Client ID ⚠️
**Why needed:** Required for user authentication flow in application configuration

```bash
aws cognito-idp list-user-pool-clients \
  --user-pool-id ap-southeast-2_CdVnmKfW \
  --region ap-southeast-2 \
  --query 'UserPoolClients[*].[ClientId,ClientName]' \
  --output table
```

**Expected Output:** App Client ID (e.g., `1a2b3c4d5e6f7g8h9i0j1k2l`)

---

### 2. Route 53 Hosted Zone ID ⚠️
**Why needed:** Required for Terraform to create DNS records (ALB, CloudFront)

```bash
aws route53 list-hosted-zones \
  --query "HostedZones[?Name=='cab432.com.'].{Name:Name,ID:Id}" \
  --output table
```

**Expected Output:** Hosted Zone ID (e.g., `/hostedzone/Z1234567890ABC`)

---

### 3. S3 Bucket Verification ⚠️
**Why needed:** Verify existing video storage bucket structure

```bash
# Check if bucket exists
aws s3api head-bucket --bucket n11817143-a2 --region ap-southeast-2

# List bucket structure
aws s3 ls s3://n11817143-a2/ --recursive | head -20

# Check bucket region
aws s3api get-bucket-location --bucket n11817143-a2
```

**Expected Output:** Bucket with folders: `raw/`, `processed/`, `thumbnails/`

---

### 4. DynamoDB Table Verification ⚠️
**Why needed:** Confirm video metadata table schema

```bash
aws dynamodb describe-table \
  --table-name n11817143-VideoApp \
  --region ap-southeast-2 \
  --query 'Table.{Name:TableName,Status:TableStatus,Keys:KeySchema,Attributes:AttributeDefinitions}' \
  --output json
```

**Expected Output:** Table with primary key structure

---

### 5. ElastiCache Cluster Endpoint ⚠️
**Why needed:** Required for application configuration to connect to cache

```bash
aws elasticache describe-cache-clusters \
  --cache-cluster-id n11817143-a2-cache \
  --region ap-southeast-2 \
  --show-cache-node-info \
  --query 'CacheClusters[0].{ClusterId:CacheClusterId,Endpoint:CacheNodes[0].Endpoint,Status:CacheClusterStatus}' \
  --output json
```

**Expected Output:** Endpoint like `n11817143-a2-cache.abc123.0001.apse2.cache.amazonaws.com:11211`

---

### 6. Secrets Manager Secret ARN ⚠️
**Why needed:** Required for ECS task definitions to access secrets

```bash
aws secretsmanager describe-secret \
  --secret-id n11817143-a2-secret \
  --region ap-southeast-2 \
  --query '{ARN:ARN,Name:Name,Description:Description}' \
  --output json
```

**Expected Output:** Secret ARN (e.g., `arn:aws:secretsmanager:ap-southeast-2:901444280953:secret:n11817143-a2-secret-AbCdEf`)

---

### 7. Parameter Store Parameters ⚠️
**Why needed:** Verify application configuration parameters

```bash
aws ssm get-parameters-by-path \
  --path "/n11817143/app" \
  --region ap-southeast-2 \
  --recursive \
  --query 'Parameters[*].[Name,Type,Value]' \
  --output table
```

**Expected Output:** List of configuration parameters

---

### 8. NAT Gateway Verification ⚠️
**Why needed:** Required for ECS tasks in private subnets to access internet (ECR, S3, etc.)

```bash
aws ec2 describe-nat-gateways \
  --filter "Name=vpc-id,Values=vpc-007bab53289655834" \
  --region ap-southeast-2 \
  --query 'NatGateways[*].{ID:NatGatewayId,State:State,SubnetId:SubnetId,PublicIp:NatGatewayAddresses[0].PublicIp}' \
  --output table
```

**Expected Output:** At least 1 NAT Gateway in available state

---

### 9. Internet Gateway Verification ⚠️
**Why needed:** Confirm public subnets have internet access for ALB

```bash
aws ec2 describe-internet-gateways \
  --filters "Name=attachment.vpc-id,Values=vpc-007bab53289655834" \
  --region ap-southeast-2 \
  --query 'InternetGateways[*].{ID:InternetGatewayId,State:Attachments[0].State}' \
  --output table
```

**Expected Output:** Internet Gateway attached to VPC

---

### 10. Security Groups Check ⚠️
**Why needed:** May need to create new security groups for ALB and ECS, but good to see existing ones

```bash
aws ec2 describe-security-groups \
  --filters "Name=vpc-id,Values=vpc-007bab53289655834" \
  --region ap-southeast-2 \
  --query 'SecurityGroups[*].{ID:GroupId,Name:GroupName,Description:Description}' \
  --output table
```

**Expected Output:** List of security groups in VPC

---

## 📋 RESOURCES THAT TERRAFORM WILL CREATE

These resources don't exist yet and will be created by our Terraform deployment:

### Infrastructure Resources (NEW)
- ✨ Application Load Balancer (ALB)
- ✨ ALB Target Groups (video-api, admin)
- ✨ ALB Listeners (HTTP:80, HTTPS:443)
- ✨ ACM Certificate (for HTTPS)
- ✨ Security Groups (ALB, ECS tasks)
- ✨ ECS Cluster (`n11817143-cluster`)
- ✨ ECS Task Definitions (3 services)
- ✨ ECS Services with auto-scaling
- ✨ SQS Queues (main + DLQ)
- ✨ SNS Topic
- ✨ Lambda Function (S3-to-SQS)
- ✨ CloudFront Distribution
- ✨ CloudWatch Alarms
- ✨ IAM Roles & Policies

---

## 🎯 IMMEDIATE NEXT STEPS

### Step 1: Run Information Gathering Script
Copy all the AWS CLI commands above and run them to collect missing information.

### Step 2: Save Results
Store the output in a file:

```bash
# Create results file
nano ~/A3_aws_info.txt

# Or run all commands and save output
{
  echo "=== COGNITO APP CLIENT ==="
  aws cognito-idp list-user-pool-clients --user-pool-id ap-southeast-2_CdVnmKfW --region ap-southeast-2 --query 'UserPoolClients[*].[ClientId,ClientName]' --output table
  
  echo -e "\n=== ROUTE 53 HOSTED ZONE ==="
  aws route53 list-hosted-zones --query "HostedZones[?Name=='cab432.com.'].{Name:Name,ID:Id}" --output table
  
  echo -e "\n=== S3 BUCKET ==="
  aws s3api head-bucket --bucket n11817143-a2 --region ap-southeast-2 && echo "Bucket exists"
  aws s3api get-bucket-location --bucket n11817143-a2
  
  echo -e "\n=== DYNAMODB TABLE ==="
  aws dynamodb describe-table --table-name n11817143-VideoApp --region ap-southeast-2 --query 'Table.{Name:TableName,Status:TableStatus,Keys:KeySchema}' --output json
  
  echo -e "\n=== ELASTICACHE ==="
  aws elasticache describe-cache-clusters --cache-cluster-id n11817143-a2-cache --region ap-southeast-2 --show-cache-node-info --query 'CacheClusters[0].{Endpoint:CacheNodes[0].Endpoint,Status:CacheClusterStatus}' --output json
  
  echo -e "\n=== SECRETS MANAGER ==="
  aws secretsmanager describe-secret --secret-id n11817143-a2-secret --region ap-southeast-2 --query '{ARN:ARN,Name:Name}' --output json
  
  echo -e "\n=== NAT GATEWAY ==="
  aws ec2 describe-nat-gateways --filter "Name=vpc-id,Values=vpc-007bab53289655834" --region ap-southeast-2 --query 'NatGateways[*].{ID:NatGatewayId,State:State}' --output table
  
  echo -e "\n=== INTERNET GATEWAY ==="
  aws ec2 describe-internet-gateways --filters "Name=attachment.vpc-id,Values=vpc-007bab53289655834" --region ap-southeast-2 --query 'InternetGateways[*].{ID:InternetGatewayId}' --output table
  
} > ~/A3_aws_info.txt 2>&1

cat ~/A3_aws_info.txt
```

### Step 3: Review & Confirm
Once you run these commands and provide the output, I'll:
1. ✅ Validate all prerequisites are met
2. ✅ Create the complete `terraform.tfvars` file with your actual values
3. ✅ Set up the initial Terraform configuration
4. ✅ Begin Phase 1: Microservices refactoring

---

## 🚦 READINESS STATUS

| Category | Status | Notes |
|----------|--------|-------|
| **AWS Account** | ✅ Ready | Account ID: 901444280953 |
| **Terraform Backend** | ✅ Ready | S3 + DynamoDB configured |
| **ECR Repositories** | ✅ Ready | All 4 repos created |
| **VPC & Networking** | ✅ Ready | 3 AZs, public/private subnets |
| **Cognito** | ⚠️ Partial | Need App Client ID |
| **Route 53** | ⚠️ Partial | Need Hosted Zone ID |
| **S3 Video Bucket** | ⚠️ Unknown | Need verification |
| **DynamoDB** | ⚠️ Unknown | Need verification |
| **ElastiCache** | ⚠️ Unknown | Need endpoint |
| **Secrets Manager** | ⚠️ Unknown | Need ARN |
| **NAT Gateway** | ⚠️ Unknown | Need verification |

**Overall Status:** 🟡 **70% Ready** - Need to verify 10 items before starting development

---

## 💡 RECOMMENDATIONS

### Priority 1: Critical (Must Have)
1. **NAT Gateway** - If missing, ECS tasks in private subnets cannot pull images from ECR
2. **Route 53 Hosted Zone ID** - Required for DNS automation
3. **Cognito App Client ID** - Required for authentication

### Priority 2: Important (Should Have)
4. **ElastiCache Endpoint** - Application configuration
5. **Secrets Manager ARN** - ECS task definitions
6. **S3 Bucket Structure** - Verify video storage paths

### Priority 3: Nice to Have
7. **Parameter Store values** - Can be recreated if needed
8. **Security Groups** - Can create new ones via Terraform

---

## 📞 WHAT TO DO NOW

**Run the information gathering script above and share the output.** I'll then:

1. ✅ Create your complete `terraform.tfvars` configuration
2. ✅ Set up the Terraform backend
3. ✅ Begin microservices development
4. ✅ Create Docker images
5. ✅ Deploy infrastructure

**Estimated Time:** 30 minutes to gather info, then we can start coding immediately! 🚀

---

*Document created: October 30, 2025*
