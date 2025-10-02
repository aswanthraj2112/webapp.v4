# Terraform Deployment Status

## Issue Resolved ✅

The original Cognito User Pool access permission error has been resolved by removing the data source dependency and using the User Pool ID directly from variables.

## Infrastructure Successfully Deployed

The following AWS resources have been successfully created/updated via Terraform:

### ✅ Completed Resources:
- **S3 Bucket**: `n11817143-a2` (imported existing + configured)
  - Public access blocked
  - Versioning enabled  
  - Server-side encryption configured (AES256)
- **DynamoDB Table**: `n11817143-VideoApp` (imported existing + updated tags)
  - PAY_PER_REQUEST billing mode
  - Hash key: `ownerId`, Range key: `videoId`
  - Updated with proper tags

### ⚠️ Resources Requiring Manual Setup (IAM Permission Constraints):

Due to limited IAM permissions on the `CAB432-Instance-Role`, the following resources need to be created manually or with elevated permissions:

1. **Cognito User Pool Client**
   - Required permission: `cognito-idp:CreateUserPoolClient`
   - Manual creation needed in AWS Console
   - Name: `n11817143-web-client`
   - User Pool ID: `ap-southeast-2_CdVnmKfrW`

2. **Secrets Manager Secret**
   - Required permission: `secretsmanager:CreateSecret`
   - Manual creation needed in AWS Console  
   - Name: `n11817143-a2-secret`
   - Store Cognito client secret

3. **SSM Parameters**
   - Required permission: `ssm:PutParameter`
   - Manual creation needed under path: `/n11817143/app/`
   - Required parameters:
     - `cognitoClientId`
     - `cognitoUserPoolId`: `ap-southeast-2_CdVnmKfrW`
     - `domainName`: `n11817143-videoapp.cab432.com`
     - `dynamoTable`: `n11817143-VideoApp`
     - `s3Bucket`: `n11817143-a2`

4. **Route53 DNS Record**
   - Required permission: `route53:ChangeResourceRecordSets`
   - Manual creation needed in AWS Console
   - Record: `n11817143-videoapp.cab432.com` CNAME → `ec2-3-27-210-9.ap-southeast-2.compute.amazonaws.com`

5. **ElastiCache Cluster**
   - **Status**: Not created (conditional resource)
   - **Reason**: Requires `cache_subnet_ids` variable to be provided
   - **Default**: `cache_subnet_ids = []` (empty list)
   - **Current Result**: `elasticache_endpoint = ""` (empty)
   - **To Enable**: Provide subnet IDs via terraform.tfvars or -var flags
   - **Required Permissions**: 
     - `ec2:DescribeSubnets` (to validate subnet IDs)
     - `ec2:DescribeSecurityGroups` (to validate security group IDs)
     - `elasticache:CreateCacheSubnetGroup`
     - `elasticache:CreateCacheCluster`

## Next Steps

### Option 1: Manual Resource Creation
Create the missing resources manually via AWS Console using the specifications above.

### Option 2: Use Elevated Permissions
Re-run Terraform with an IAM user/role that has broader permissions including:
- `cognito-idp:CreateUserPoolClient`
- `secretsmanager:CreateSecret`
- `ssm:PutParameter`
- `route53:ChangeResourceRecordSets`

### Option 3: Update IAM Role
Request updates to the `CAB432-Instance-Role` to include the missing permissions.

## Terraform State

Current Terraform state includes:
- `aws_s3_bucket.video`
- `aws_dynamodb_table.videos`
- `aws_s3_bucket_public_access_block.video`
- `aws_s3_bucket_server_side_encryption_configuration.video`
- `aws_s3_bucket_versioning.video`

## ElastiCache Configuration

### Why is elasticache_endpoint empty?

The ElastiCache cluster is a **conditional resource** that only gets created when subnet IDs are provided:

```hcl
locals {
  cache_enabled = length(var.cache_subnet_ids) > 0
}
```

**Current state:**
- `cache_subnet_ids = []` (empty list - default)
- `cache_enabled = false`
- ElastiCache cluster **not created**
- `elasticache_endpoint = ""` (empty)

### To Enable ElastiCache:

1. **Get VPC Information** (requires elevated permissions):
   ```bash
   # Get subnet IDs in default VPC
   aws ec2 describe-subnets --filters "Name=default-for-az,Values=true" --query 'Subnets[].SubnetId'
   
   # Get default security group ID
   aws ec2 describe-security-groups --filters "Name=group-name,Values=default" --query 'SecurityGroups[].GroupId'
   ```

2. **Create terraform.tfvars**:
   ```hcl
   cache_subnet_ids = ["subnet-xxxxxxxxx", "subnet-yyyyyyyyy"]
   cache_security_group_ids = ["sg-xxxxxxxxx"]
   ```

3. **Re-run Terraform**:
   ```bash
   terraform plan -out tfplan
   terraform apply tfplan
   ```

**Note**: Current IAM role lacks EC2 permissions to query VPC resources. ElastiCache is optional for development but may be required for production performance.