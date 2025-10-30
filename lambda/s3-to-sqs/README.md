# S3-to-SQS Lambda Function

AWS Lambda function that triggers on S3 ObjectCreated events and queues video transcoding jobs to SQS.

## Overview

This Lambda function:
1. Listens for S3 upload events (ObjectCreated)
2. Filters for video files in the `raw/` prefix
3. Extracts user ID and video ID from the S3 key
4. Sends a transcode job message to SQS queue
5. Returns processing results

## Event Flow

```
S3 Upload → S3 Event Notification → Lambda → SQS Queue → Transcode Worker
```

## S3 Event Trigger

Configure S3 bucket notification:
- **Event Type**: `s3:ObjectCreated:*`
- **Prefix**: `raw/`
- **Suffix**: `.mp4`, `.mov`, `.avi`, `.mkv`, `.webm`, `.flv`

## Expected S3 Key Format

```
raw/{userId}/{timestamp}-{uuid}-{filename}.mp4
```

Example:
```
raw/user-123/1730304000000-a1b2c3d4-e5f6-4789-0abc-def123456789-myvideo.mp4
```

## SQS Message Format

The Lambda sends messages to SQS in this format:

```json
{
  "userId": "user-123",
  "videoId": "a1b2c3d4-e5f6-4789-0abc-def123456789",
  "originalS3Key": "raw/user-123/1730304000000-...-myvideo.mp4",
  "resolution": "720p",
  "bucket": "n11817143-a2",
  "fileSize": 12345678,
  "timestamp": "2025-10-30T12:00:00.000Z",
  "eventName": "ObjectCreated:Put"
}
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `TRANSCODE_QUEUE_URL` | SQS queue URL | **Yes** |
| `AWS_REGION` | AWS region | No (auto-detected) |

## IAM Permissions Required

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage",
        "sqs:GetQueueAttributes"
      ],
      "Resource": "arn:aws:sqs:*:*:transcode-queue"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

## Container Image Deployment

This Lambda uses a container image for deployment:

### Build Image

```bash
# Build for Lambda runtime
docker build -t s3-to-sqs-lambda:latest -f lambda/s3-to-sqs/Dockerfile .

# Tag for ECR
docker tag s3-to-sqs-lambda:latest \
  901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143/s3-to-sqs-lambda:latest

# Push to ECR
docker push 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143/s3-to-sqs-lambda:latest
```

### Lambda Configuration

- **Memory**: 256 MB (sufficient for message processing)
- **Timeout**: 60 seconds
- **Architecture**: x86_64
- **Runtime**: Container image (Node.js 18)

## Testing Locally

```bash
# Install dependencies
cd lambda/s3-to-sqs
npm install

# Create test event
cat > test-event.json << 'EOF'
{
  "Records": [
    {
      "eventName": "ObjectCreated:Put",
      "s3": {
        "bucket": {
          "name": "n11817143-a2"
        },
        "object": {
          "key": "raw/user-123/1730304000000-a1b2c3d4-e5f6-4789-0abc-def123456789-test.mp4",
          "size": 12345678
        }
      }
    }
  ]
}
EOF

# Test locally (requires AWS credentials)
export TRANSCODE_QUEUE_URL="https://sqs.ap-southeast-2.amazonaws.com/901444280953/n11817143-transcode-queue"
node -e "import('./index.js').then(m => m.handler(require('./test-event.json')))"
```

## Monitoring

### CloudWatch Logs
- S3 event details
- Message sent confirmations
- Error stack traces

### CloudWatch Metrics
- **Invocations**: Number of times Lambda is triggered
- **Duration**: Execution time
- **Errors**: Failed invocations
- **Throttles**: Rate limit hits

### Custom Metrics (via logs)
- Videos processed per minute
- Queue message count
- File size distribution

## Error Handling

### Invalid S3 Key Format
- Logs error
- Continues processing other records
- Does not retry

### SQS Send Failure
- Logs error
- Lambda will retry automatically (configured retry policy)
- Failed events can be sent to DLQ

### Non-Video Files
- Silently skipped
- Logged for debugging

## Filtering Logic

The Lambda will **only** queue transcoding for files that:
1. ✅ Are in the `raw/` prefix
2. ✅ Have video file extensions (`.mp4`, `.mov`, `.avi`, `.mkv`, `.webm`, `.flv`)
3. ✅ Have ObjectCreated event type
4. ✅ Follow the expected S3 key format

## Deployment with Terraform

```hcl
resource "aws_lambda_function" "s3_to_sqs" {
  function_name = "n11817143-s3-to-sqs"
  package_type  = "Image"
  image_uri     = "901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143/s3-to-sqs-lambda:latest"
  role          = aws_iam_role.lambda_role.arn
  
  timeout     = 60
  memory_size = 256
  
  environment {
    variables = {
      TRANSCODE_QUEUE_URL = aws_sqs_queue.transcode_queue.url
    }
  }
}

resource "aws_lambda_permission" "allow_s3" {
  statement_id  = "AllowS3Invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.s3_to_sqs.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.videos.arn
}

resource "aws_s3_bucket_notification" "video_upload" {
  bucket = aws_s3_bucket.videos.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.s3_to_sqs.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "raw/"
    filter_suffix       = ".mp4"
  }
}
```

## Cost Optimization

- **Memory**: 256 MB (minimum needed)
- **Timeout**: 60s (more than sufficient)
- **Concurrent Executions**: Limited to prevent SQS throttling
- **Reserved Concurrency**: Consider for predictable workloads

## Security Best Practices

1. **Least Privilege IAM**: Only SQS SendMessage permission
2. **VPC**: Not required (public Lambda)
3. **Environment Variables**: Use for queue URL
4. **Encryption**: SQS messages encrypted at rest
5. **Logging**: CloudWatch logs for audit trail

## Troubleshooting

### Lambda not triggering
- Check S3 event notification configuration
- Verify Lambda has S3 invoke permission
- Check CloudWatch logs for errors

### Messages not in SQS
- Verify `TRANSCODE_QUEUE_URL` is correct
- Check IAM permissions for SQS
- Review CloudWatch logs for errors

### Duplicate processing
- SQS FIFO queue for deduplication
- Check S3 versioning settings
- Review Lambda retry configuration

## Future Enhancements

- [ ] Support multiple resolutions from S3 metadata
- [ ] Priority queue for premium users
- [ ] Batch message sending for efficiency
- [ ] SNS notification on processing start
- [ ] DynamoDB direct write (bypass SQS)
- [ ] Support for S3 batch operations
