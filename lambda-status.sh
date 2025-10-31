#!/bin/bash
# Lambda Integration Quick Reference Commands
# Student: n11817143@qut.edu.au

echo "╔════════════════════════════════════════════════════════════╗"
echo "║        Lambda Integration - Quick Reference                ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Function to show Lambda status
show_lambda_status() {
    echo "📊 Lambda Function Status:"
    aws lambda get-function --function-name n11817143-app-s3-to-sqs \
        --region ap-southeast-2 \
        --query '{Name:Configuration.FunctionName,State:Configuration.State,Memory:Configuration.MemorySize,Timeout:Configuration.Timeout}' \
        --output table
    echo ""
}

# Function to show S3 notification
show_s3_notification() {
    echo "🔔 S3 Event Notification:"
    aws s3api get-bucket-notification-configuration \
        --bucket n11817143-a2 \
        --region ap-southeast-2 \
        --output json | jq '.LambdaFunctionConfigurations[] | {Lambda:.LambdaFunctionArn,Events:.Events,Prefix:.Filter.Key.FilterRules[0].Value}'
    echo ""
}

# Function to check SQS queue
show_sqs_queue() {
    echo "📬 SQS Queue Status:"
    aws sqs get-queue-attributes \
        --queue-url https://sqs.ap-southeast-2.amazonaws.com/901444280953/n11817143-A3 \
        --attribute-names ApproximateNumberOfMessages ApproximateNumberOfMessagesNotVisible \
        --region ap-southeast-2 \
        --output table
    echo ""
}

# Function to test Lambda
test_lambda() {
    echo "🧪 Testing Lambda with sample video upload..."
    echo ""
    
    # Generate test video
    echo "1. Generating test video..."
    ffmpeg -f lavfi -i testsrc=duration=5:size=640x480:rate=30 \
           -f lavfi -i sine=frequency=1000:duration=5 \
           -pix_fmt yuv420p -c:v libx264 -c:a aac \
           /tmp/lambda-test-$(date +%s).mp4 -y 2>&1 | grep -E "(Duration|Output)" | head -2
    
    # Upload to S3
    echo ""
    echo "2. Uploading to S3 raw/ prefix..."
    TEST_FILE=$(ls -t /tmp/lambda-test-*.mp4 | head -1)
    aws s3 cp $TEST_FILE s3://n11817143-a2/raw/testuser/lambda-test-$(date +%s).mp4 \
        --region ap-southeast-2
    
    echo ""
    echo "3. Waiting for Lambda to process (3 seconds)..."
    sleep 3
    
    echo ""
    echo "4. Checking SQS queue for new message..."
    show_sqs_queue
    
    echo "✅ Test complete! If message count increased, Lambda is working."
}

# Function to view Lambda logs (requires permissions)
view_lambda_logs() {
    echo "📋 Lambda Execution Logs (last 5 minutes):"
    aws logs tail /aws/lambda/n11817143-app-s3-to-sqs \
        --since 5m \
        --format short \
        --region ap-southeast-2 2>&1 || echo "⚠️  Log access denied (expected for student accounts)"
    echo ""
}

# Function to update Lambda code
update_lambda_code() {
    echo "🔄 Updating Lambda Function Code..."
    echo ""
    echo "1. Building new Docker image..."
    cd /home/ubuntu/oct1/webapp.v5/lambda/s3-to-sqs
    docker build -t 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-app/s3-to-sqs-lambda:latest . 
    
    echo ""
    echo "2. Pushing to ECR..."
    docker push 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-app/s3-to-sqs-lambda:latest
    
    echo ""
    echo "3. Updating Lambda function..."
    aws lambda update-function-code \
        --function-name n11817143-app-s3-to-sqs \
        --image-uri 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-app/s3-to-sqs-lambda:latest \
        --region ap-southeast-2 \
        --query '{FunctionName:FunctionName,State:State,LastModified:LastModified}' \
        --output table
    
    echo ""
    echo "✅ Lambda code updated!"
}

# Function to show architecture
show_architecture() {
    echo "🏗️  Current Architecture (5 Microservices):"
    echo ""
    echo "   1. Frontend (React SPA)"
    echo "      └─ https://app.n11817143-videoapp.cab432.com"
    echo ""
    echo "   2. Video API Service (ECS Fargate)"
    echo "      └─ https://n11817143-videoapp.cab432.com/api"
    echo ""
    echo "   3. Admin Service (ECS Fargate)"
    echo "      └─ https://n11817143-videoapp.cab432.com/api/admin"
    echo ""
    echo "   4. Lambda Function (S3 → SQS) ✅"
    echo "      └─ n11817143-app-s3-to-sqs"
    echo ""
    echo "   5. Transcode Worker (ECS Fargate)"
    echo "      └─ Polls SQS queue"
    echo ""
    echo "   Data Flow:"
    echo "   User → Upload → S3 → Lambda → SQS → Worker → Transcode"
    echo ""
}

# Main menu
case "${1:-}" in
    status)
        show_lambda_status
        ;;
    notification)
        show_s3_notification
        ;;
    queue)
        show_sqs_queue
        ;;
    test)
        test_lambda
        ;;
    logs)
        view_lambda_logs
        ;;
    update)
        update_lambda_code
        ;;
    architecture)
        show_architecture
        ;;
    all)
        show_architecture
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        show_lambda_status
        show_s3_notification
        show_sqs_queue
        ;;
    *)
        echo "Usage: $0 {status|notification|queue|test|logs|update|architecture|all}"
        echo ""
        echo "Commands:"
        echo "  status        - Show Lambda function status"
        echo "  notification  - Show S3 event notification configuration"
        echo "  queue         - Show SQS queue message count"
        echo "  test          - Run end-to-end test (upload video)"
        echo "  logs          - View Lambda execution logs"
        echo "  update        - Update Lambda function code"
        echo "  architecture  - Show architecture overview"
        echo "  all           - Show all status information"
        echo ""
        echo "Examples:"
        echo "  $0 status"
        echo "  $0 test"
        echo "  $0 all"
        ;;
esac
