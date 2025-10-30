# Transcode Worker

Background worker service that processes video transcoding jobs from an SQS queue.

## Overview

The Transcode Worker is a **headless service** (no HTTP server) that continuously polls an SQS queue for video transcoding jobs. When a job is received, it:

1. Downloads the video from S3
2. Transcodes to the requested resolution (720p or 1080p)
3. Generates a thumbnail
4. Uploads transcoded files back to S3
5. Updates DynamoDB with the results

## Features

- **SQS Consumer**: Long polling for efficient message processing
- **FFmpeg Processing**: Video transcoding with configurable presets
- **Thumbnail Generation**: Automatic thumbnail creation
- **DynamoDB Updates**: Status tracking during transcoding
- **Graceful Shutdown**: Proper cleanup on SIGTERM/SIGINT
- **Error Handling**: Failed jobs remain in queue for retry/DLQ
- **CloudWatch Integration**: Structured logging for monitoring

## Message Format

The worker expects SQS messages in the following JSON format:

```json
{
  "userId": "user-sub-id",
  "videoId": "video-uuid",
  "originalS3Key": "raw/userId/video.mp4",
  "resolution": "720p"
}
```

## Supported Resolutions

| Resolution | Dimensions | Video Bitrate | Audio Bitrate |
|------------|------------|---------------|---------------|
| 720p       | 1280x720   | 2500k         | 128k          |
| 1080p      | 1920x1080  | 4000k         | 192k          |

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `TRANSCODE_QUEUE_URL` | SQS queue URL | **Yes** | - |
| `AWS_REGION` | AWS region | No | `ap-southeast-2` |
| `S3_BUCKET` | S3 bucket name | Yes | From Parameter Store |
| `DYNAMO_TABLE` | DynamoDB table | Yes | From Parameter Store |
| `NODE_ENV` | Environment | No | `development` |

## Configuration

Configuration is loaded from:
1. **AWS Parameter Store**: `/n11817143/app/*`
2. **Environment Variables**: Queue URL and overrides

## Dependencies

- **@aws-sdk/client-sqs** - SQS message handling
- **@aws-sdk/client-s3** - S3 file operations
- **@aws-sdk/client-dynamodb** - Status updates
- **fluent-ffmpeg** - Video transcoding
- **ffmpeg** (system) - Video processing binary

## Running Locally

```bash
# Install dependencies
npm install

# Set required environment variables
export TRANSCODE_QUEUE_URL="https://sqs.ap-southeast-2.amazonaws.com/123456789/transcode-queue"
export AWS_REGION="ap-southeast-2"

# Start worker
npm start

# Development mode with auto-restart
npm run dev
```

## Docker

```bash
# Build image
docker build -t transcode-worker:latest .

# Run container
docker run \
  -e TRANSCODE_QUEUE_URL="https://sqs.ap-southeast-2.amazonaws.com/123456789/transcode-queue" \
  -e AWS_REGION="ap-southeast-2" \
  transcode-worker:latest
```

## Architecture

```
transcode-worker/
├── src/
│   ├── index.js              # Worker entry point
│   ├── queue/
│   │   └── sqs-consumer.js   # SQS polling & message handling
│   ├── video/
│   │   ├── video.repo.js     # DynamoDB operations
│   │   └── transcode.service.js # FFmpeg transcoding logic
│   └── config/
│       └── config.dynamo.js  # DynamoDB configuration
├── package.json
├── Dockerfile
└── README.md
```

## Process Flow

```
1. Poll SQS Queue (long polling, 20s)
2. Receive Message
3. Parse Job Details
4. Update Status → "transcoding"
5. Download Video from S3
6. Extract Metadata
7. Transcode Video (FFmpeg)
8. Generate Thumbnail
9. Upload to S3
10. Update Status → "transcoded"
11. Delete Message from Queue
```

## Error Handling

- **Invalid Message**: Deleted immediately (prevents reprocessing)
- **Transcoding Failure**: Status updated to "failed", message remains in queue
- **Visibility Timeout**: 10 minutes (allows time for transcoding)
- **Dead Letter Queue**: Configure on SQS for repeated failures

## Monitoring

### CloudWatch Logs
- Message received events
- Transcoding progress
- Upload confirmations
- Error stack traces

### CloudWatch Metrics (via logs)
- Transcoding duration
- File sizes
- Resolution outputs
- Error rates

### Health Checks
The Docker health check verifies the Node.js process is running:
```bash
ps aux | grep -v grep | grep -q node || exit 1
```

## Scaling

### Horizontal Scaling
- Run multiple worker instances
- Each instance processes jobs independently
- SQS ensures message deduplication

### Vertical Scaling
- Increase CPU/Memory for faster transcoding
- Adjust FFmpeg presets for quality vs speed

## Performance Considerations

1. **FFmpeg Preset**: Using "fast" preset (balance of speed/quality)
2. **Temp Storage**: Uses `/tmp` directory (ephemeral in ECS)
3. **Cleanup**: Always cleans up temp files after processing
4. **Sequential Processing**: One job at a time per worker
5. **Long Polling**: Reduces empty polls and API calls

## Deployment

This worker is designed to run on AWS ECS Fargate:
- No exposed ports (not accessible via internet)
- IAM role for AWS service access
- Auto-scaling based on queue depth
- Spot instances for cost savings

## Security

- No HTTP server (not exposed to internet)
- IAM role for S3/DynamoDB/SQS access
- No secrets in environment variables
- Parameter Store for configuration
- VPC private subnets (optional)

## Troubleshooting

### Worker not processing messages
- Check `TRANSCODE_QUEUE_URL` is correct
- Verify IAM permissions for SQS
- Check queue visibility timeout settings

### Transcoding fails
- Verify ffmpeg is installed (`ffmpeg -version`)
- Check video format is supported
- Verify sufficient disk space in `/tmp`
- Review CloudWatch logs for FFmpeg errors

### S3 upload fails
- Verify IAM permissions for S3
- Check bucket exists and is accessible
- Verify S3 key paths are correct

## Testing

```bash
# Send test message to queue (AWS CLI)
aws sqs send-message \
  --queue-url "$TRANSCODE_QUEUE_URL" \
  --message-body '{
    "userId": "test-user",
    "videoId": "test-video-id",
    "originalS3Key": "raw/test-user/test-video.mp4",
    "resolution": "720p"
  }'
```

## Future Enhancements

- [ ] Parallel processing (multiple jobs per worker)
- [ ] Progress reporting via WebSocket
- [ ] Support for more resolutions (480p, 4K)
- [ ] Audio-only transcoding
- [ ] Adaptive bitrate (HLS) output
- [ ] GPU-accelerated encoding
- [ ] Watermark support
- [ ] Advanced filters (rotate, crop, etc.)
