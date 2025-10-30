#!/bin/bash

###############################################################################
# AWS Information Gathering Script for Assignment 3
# Student: n11817143
# Date: October 30, 2025
###############################################################################

set -e

AWS_REGION="ap-southeast-2"
VPC_ID="vpc-007bab53289655834"
USER_POOL_ID="ap-southeast-2_CdVnmKfW"
OUTPUT_FILE="$HOME/A3_aws_info.txt"

echo "======================================================================"
echo "  Assignment 3 - AWS Information Gathering"
echo "  Region: $AWS_REGION"
echo "  Output: $OUTPUT_FILE"
echo "======================================================================"
echo ""

# Clear previous output
> "$OUTPUT_FILE"

# Function to print section headers
print_section() {
    echo ""
    echo "========================================"
    echo "$1"
    echo "========================================"
    echo ""
}

###############################################################################
# 1. COGNITO APP CLIENT ID
###############################################################################
print_section "1. COGNITO APP CLIENT ID" | tee -a "$OUTPUT_FILE"
echo "User Pool ID: $USER_POOL_ID" | tee -a "$OUTPUT_FILE"
echo "" | tee -a "$OUTPUT_FILE"

aws cognito-idp list-user-pool-clients \
  --user-pool-id "$USER_POOL_ID" \
  --region "$AWS_REGION" \
  --query 'UserPoolClients[*].[ClientId,ClientName]' \
  --output table 2>&1 | tee -a "$OUTPUT_FILE"

###############################################################################
# 2. ROUTE 53 HOSTED ZONE ID
###############################################################################
print_section "2. ROUTE 53 HOSTED ZONE ID" | tee -a "$OUTPUT_FILE"

aws route53 list-hosted-zones \
  --query "HostedZones[?Name=='cab432.com.'].{Name:Name,ID:Id}" \
  --output table 2>&1 | tee -a "$OUTPUT_FILE"

###############################################################################
# 3. S3 BUCKET VERIFICATION
###############################################################################
print_section "3. S3 BUCKET (n11817143-a2)" | tee -a "$OUTPUT_FILE"

echo "Checking if bucket exists..." | tee -a "$OUTPUT_FILE"
if aws s3api head-bucket --bucket n11817143-a2 --region "$AWS_REGION" 2>/dev/null; then
    echo "✅ Bucket exists" | tee -a "$OUTPUT_FILE"
    echo "" | tee -a "$OUTPUT_FILE"
    
    echo "Bucket region:" | tee -a "$OUTPUT_FILE"
    aws s3api get-bucket-location --bucket n11817143-a2 2>&1 | tee -a "$OUTPUT_FILE"
    echo "" | tee -a "$OUTPUT_FILE"
    
    echo "Bucket structure (first 20 objects):" | tee -a "$OUTPUT_FILE"
    aws s3 ls s3://n11817143-a2/ --recursive 2>&1 | head -20 | tee -a "$OUTPUT_FILE"
else
    echo "❌ Bucket does not exist or is not accessible" | tee -a "$OUTPUT_FILE"
fi

###############################################################################
# 4. DYNAMODB TABLE
###############################################################################
print_section "4. DYNAMODB TABLE (n11817143-VideoApp)" | tee -a "$OUTPUT_FILE"

aws dynamodb describe-table \
  --table-name n11817143-VideoApp \
  --region "$AWS_REGION" \
  --query 'Table.{Name:TableName,Status:TableStatus,Keys:KeySchema,Attributes:AttributeDefinitions,ItemCount:ItemCount}' \
  --output json 2>&1 | tee -a "$OUTPUT_FILE"

###############################################################################
# 5. ELASTICACHE CLUSTER
###############################################################################
print_section "5. ELASTICACHE CLUSTER (n11817143-a2-cache)" | tee -a "$OUTPUT_FILE"

aws elasticache describe-cache-clusters \
  --cache-cluster-id n11817143-a2-cache \
  --region "$AWS_REGION" \
  --show-cache-node-info \
  --query 'CacheClusters[0].{ClusterId:CacheClusterId,Engine:Engine,Endpoint:CacheNodes[0].Endpoint,Status:CacheClusterStatus,NodeType:CacheNodeType}' \
  --output json 2>&1 | tee -a "$OUTPUT_FILE"

###############################################################################
# 6. SECRETS MANAGER
###############################################################################
print_section "6. SECRETS MANAGER (n11817143-a2-secret)" | tee -a "$OUTPUT_FILE"

aws secretsmanager describe-secret \
  --secret-id n11817143-a2-secret \
  --region "$AWS_REGION" \
  --query '{ARN:ARN,Name:Name,Description:Description,LastChangedDate:LastChangedDate}' \
  --output json 2>&1 | tee -a "$OUTPUT_FILE"

###############################################################################
# 7. PARAMETER STORE
###############################################################################
print_section "7. PARAMETER STORE (/n11817143/app/*)" | tee -a "$OUTPUT_FILE"

aws ssm get-parameters-by-path \
  --path "/n11817143/app" \
  --region "$AWS_REGION" \
  --recursive \
  --query 'Parameters[*].[Name,Type,LastModifiedDate]' \
  --output table 2>&1 | tee -a "$OUTPUT_FILE"

###############################################################################
# 8. NAT GATEWAY
###############################################################################
print_section "8. NAT GATEWAY" | tee -a "$OUTPUT_FILE"
echo "VPC ID: $VPC_ID" | tee -a "$OUTPUT_FILE"
echo "" | tee -a "$OUTPUT_FILE"

aws ec2 describe-nat-gateways \
  --filter "Name=vpc-id,Values=$VPC_ID" \
  --region "$AWS_REGION" \
  --query 'NatGateways[*].{ID:NatGatewayId,State:State,SubnetId:SubnetId,PublicIp:NatGatewayAddresses[0].PublicIp}' \
  --output table 2>&1 | tee -a "$OUTPUT_FILE"

###############################################################################
# 9. INTERNET GATEWAY
###############################################################################
print_section "9. INTERNET GATEWAY" | tee -a "$OUTPUT_FILE"
echo "VPC ID: $VPC_ID" | tee -a "$OUTPUT_FILE"
echo "" | tee -a "$OUTPUT_FILE"

aws ec2 describe-internet-gateways \
  --filters "Name=attachment.vpc-id,Values=$VPC_ID" \
  --region "$AWS_REGION" \
  --query 'InternetGateways[*].{ID:InternetGatewayId,State:Attachments[0].State,VpcId:Attachments[0].VpcId}' \
  --output table 2>&1 | tee -a "$OUTPUT_FILE"

###############################################################################
# 10. SECURITY GROUPS
###############################################################################
print_section "10. SECURITY GROUPS" | tee -a "$OUTPUT_FILE"
echo "VPC ID: $VPC_ID" | tee -a "$OUTPUT_FILE"
echo "" | tee -a "$OUTPUT_FILE"

aws ec2 describe-security-groups \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --region "$AWS_REGION" \
  --query 'SecurityGroups[*].{ID:GroupId,Name:GroupName,Description:Description}' \
  --output table 2>&1 | tee -a "$OUTPUT_FILE"

###############################################################################
# 11. CURRENT EC2 INSTANCES
###############################################################################
print_section "11. EC2 INSTANCES (Current Assignment 2)" | tee -a "$OUTPUT_FILE"

aws ec2 describe-instances \
  --filters "Name=instance-state-name,Values=running" "Name=vpc-id,Values=$VPC_ID" \
  --region "$AWS_REGION" \
  --query 'Reservations[*].Instances[*].{ID:InstanceId,Type:InstanceType,PublicIP:PublicIpAddress,PrivateIP:PrivateIpAddress,State:State.Name,Name:Tags[?Key==`Name`].Value|[0]}' \
  --output table 2>&1 | tee -a "$OUTPUT_FILE"

###############################################################################
# 12. AWS ACCOUNT INFORMATION
###############################################################################
print_section "12. AWS ACCOUNT INFORMATION" | tee -a "$OUTPUT_FILE"

aws sts get-caller-identity --output json 2>&1 | tee -a "$OUTPUT_FILE"

###############################################################################
# SUMMARY
###############################################################################
print_section "INFORMATION GATHERING COMPLETE" | tee -a "$OUTPUT_FILE"

echo "✅ Output saved to: $OUTPUT_FILE" | tee -a "$OUTPUT_FILE"
echo "" | tee -a "$OUTPUT_FILE"
echo "Next steps:" | tee -a "$OUTPUT_FILE"
echo "1. Review the output above" | tee -a "$OUTPUT_FILE"
echo "2. Share the results with the development team" | tee -a "$OUTPUT_FILE"
echo "3. Proceed with terraform.tfvars configuration" | tee -a "$OUTPUT_FILE"
echo "" | tee -a "$OUTPUT_FILE"

echo "======================================================================"
echo "  Script completed successfully!"
echo "======================================================================"
