#!/bin/bash

# LocalStack initialization script
# This script runs when LocalStack is ready

set -e

echo "========================================="
echo "LocalStack Initialization Started"
echo "========================================="

# Configuration
REGION="ap-southeast-2"
BUCKET_NAME="n11817143-a2"
TABLE_NAME="n11817143-videos"
QUEUE_NAME="n11817143-transcode-queue"
DLQ_NAME="n11817143-transcode-dlq"

# Wait for LocalStack to be fully ready
echo "Waiting for LocalStack services..."
sleep 5

# ==========================================
# S3 Bucket Setup
# ==========================================
echo "Creating S3 bucket: $BUCKET_NAME"
awslocal s3 mb s3://$BUCKET_NAME --region $REGION 2>/dev/null || echo "Bucket already exists"

echo "Creating S3 folder structure..."
awslocal s3api put-object --bucket $BUCKET_NAME --key raw/ --region $REGION
awslocal s3api put-object --bucket $BUCKET_NAME --key transcoded/ --region $REGION
awslocal s3api put-object --bucket $BUCKET_NAME --key thumbs/ --region $REGION

echo "Enabling S3 versioning..."
awslocal s3api put-bucket-versioning \
  --bucket $BUCKET_NAME \
  --versioning-configuration Status=Enabled \
  --region $REGION

echo "Setting S3 CORS configuration..."
awslocal s3api put-bucket-cors \
  --bucket $BUCKET_NAME \
  --cors-configuration '{
    "CORSRules": [
      {
        "AllowedOrigins": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
        "AllowedHeaders": ["*"],
        "ExposeHeaders": ["ETag", "x-amz-version-id"],
        "MaxAgeSeconds": 3000
      }
    ]
  }' \
  --region $REGION

# ==========================================
# DynamoDB Table Setup
# ==========================================
echo "Creating DynamoDB table: $TABLE_NAME"
awslocal dynamodb create-table \
  --table-name $TABLE_NAME \
  --attribute-definitions \
    AttributeName=videoId,AttributeType=S \
    AttributeName=userId,AttributeType=S \
    AttributeName=uploadDate,AttributeType=S \
  --key-schema \
    AttributeName=videoId,KeyType=HASH \
  --global-secondary-indexes \
    '[
      {
        "IndexName": "userId-uploadDate-index",
        "KeySchema": [
          {"AttributeName": "userId", "KeyType": "HASH"},
          {"AttributeName": "uploadDate", "KeyType": "RANGE"}
        ],
        "Projection": {"ProjectionType": "ALL"},
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]' \
  --billing-mode PAY_PER_REQUEST \
  --region $REGION \
  2>/dev/null || echo "Table already exists"

# Wait for table to be active
echo "Waiting for table to be active..."
sleep 3

# ==========================================
# SQS Queue Setup
# ==========================================
echo "Creating SQS Dead Letter Queue: $DLQ_NAME"
DLQ_URL=$(awslocal sqs create-queue \
  --queue-name $DLQ_NAME \
  --attributes MessageRetentionPeriod=1209600 \
  --region $REGION \
  --output text \
  --query 'QueueUrl' 2>/dev/null || awslocal sqs get-queue-url --queue-name $DLQ_NAME --region $REGION --output text --query 'QueueUrl')

echo "Dead Letter Queue URL: $DLQ_URL"

# Get DLQ ARN
DLQ_ARN=$(awslocal sqs get-queue-attributes \
  --queue-url $DLQ_URL \
  --attribute-names QueueArn \
  --region $REGION \
  --output text \
  --query 'Attributes.QueueArn')

echo "Dead Letter Queue ARN: $DLQ_ARN"

echo "Creating SQS Queue: $QUEUE_NAME"
QUEUE_URL=$(awslocal sqs create-queue \
  --queue-name $QUEUE_NAME \
  --attributes \
    VisibilityTimeout=600 \
    MessageRetentionPeriod=1209600 \
    ReceiveMessageWaitTimeSeconds=20 \
    RedrivePolicy="{\"deadLetterTargetArn\":\"$DLQ_ARN\",\"maxReceiveCount\":3}" \
  --region $REGION \
  --output text \
  --query 'QueueUrl' 2>/dev/null || awslocal sqs get-queue-url --queue-name $QUEUE_NAME --region $REGION --output text --query 'QueueUrl')

echo "Queue URL: $QUEUE_URL"

# ==========================================
# S3 Event Notification Setup
# ==========================================
echo "Setting up S3 event notification..."

# Create Lambda function (mock for LocalStack)
awslocal lambda create-function \
  --function-name s3-to-sqs-handler \
  --runtime nodejs18.x \
  --role arn:aws:iam::000000000000:role/lambda-role \
  --handler index.handler \
  --zip-file fileb:///dev/null \
  --region $REGION \
  2>/dev/null || echo "Lambda function already exists"

# Configure S3 event notification to SQS directly (simpler for LocalStack)
awslocal s3api put-bucket-notification-configuration \
  --bucket $BUCKET_NAME \
  --notification-configuration '{
    "QueueConfigurations": [
      {
        "Id": "VideoUploadNotification",
        "QueueArn": "arn:aws:sqs:'"$REGION"':000000000000:'"$QUEUE_NAME"'",
        "Events": ["s3:ObjectCreated:*"],
        "Filter": {
          "Key": {
            "FilterRules": [
              {"Name": "prefix", "Value": "raw/"},
              {"Name": "suffix", "Value": ".mp4"}
            ]
          }
        }
      }
    ]
  }' \
  --region $REGION || echo "Failed to set notification (this is okay for basic testing)"

# ==========================================
# Parameter Store Setup
# ==========================================
echo "Creating SSM Parameter Store parameters..."

awslocal ssm put-parameter \
  --name "/videoapp/dev/jwt-secret" \
  --value "dev-jwt-secret-change-in-production" \
  --type "SecureString" \
  --region $REGION \
  --overwrite 2>/dev/null || echo "Parameter already exists"

awslocal ssm put-parameter \
  --name "/videoapp/dev/s3-bucket" \
  --value "$BUCKET_NAME" \
  --type "String" \
  --region $REGION \
  --overwrite 2>/dev/null || echo "Parameter already exists"

awslocal ssm put-parameter \
  --name "/videoapp/dev/dynamodb-table" \
  --value "$TABLE_NAME" \
  --type "String" \
  --region $REGION \
  --overwrite 2>/dev/null || echo "Parameter already exists"

awslocal ssm put-parameter \
  --name "/videoapp/dev/sqs-queue-url" \
  --value "$QUEUE_URL" \
  --type "String" \
  --region $REGION \
  --overwrite 2>/dev/null || echo "Parameter already exists"

# ==========================================
# Secrets Manager Setup
# ==========================================
echo "Creating Secrets Manager secrets..."

awslocal secretsmanager create-secret \
  --name "/videoapp/dev/cognito-credentials" \
  --secret-string '{"userPoolId":"CHANGE_ME","clientId":"CHANGE_ME","clientSecret":"CHANGE_ME"}' \
  --region $REGION \
  2>/dev/null || echo "Secret already exists"

# ==========================================
# Insert Sample Data
# ==========================================
echo "Inserting sample video data..."

awslocal dynamodb put-item \
  --table-name $TABLE_NAME \
  --item '{
    "videoId": {"S": "sample-video-123"},
    "userId": {"S": "test-user"},
    "title": {"S": "Sample Video"},
    "description": {"S": "This is a sample video for testing"},
    "originalFilename": {"S": "sample.mp4"},
    "s3Key": {"S": "raw/test-user/sample.mp4"},
    "uploadDate": {"S": "2025-10-30T00:00:00.000Z"},
    "status": {"S": "uploaded"},
    "fileSize": {"N": "1048576"},
    "duration": {"N": "60"},
    "mimeType": {"S": "video/mp4"}
  }' \
  --region $REGION \
  2>/dev/null || echo "Sample data already exists"

# ==========================================
# Verification
# ==========================================
echo ""
echo "========================================="
echo "Verifying Resource Creation"
echo "========================================="

echo "S3 Buckets:"
awslocal s3 ls

echo ""
echo "DynamoDB Tables:"
awslocal dynamodb list-tables --region $REGION

echo ""
echo "SQS Queues:"
awslocal sqs list-queues --region $REGION

echo ""
echo "SSM Parameters:"
awslocal ssm describe-parameters --region $REGION | grep Name

echo ""
echo "========================================="
echo "LocalStack Initialization Complete!"
echo "========================================="
echo "S3 Bucket: $BUCKET_NAME"
echo "DynamoDB Table: $TABLE_NAME"
echo "SQS Queue URL: $QUEUE_URL"
echo "DLQ URL: $DLQ_URL"
echo "========================================="
