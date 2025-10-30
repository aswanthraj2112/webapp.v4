# Video-API Service

The main API service that handles user authentication and video operations.

## Features

- **Authentication**: User signup, signin, token refresh using AWS Cognito
- **Video Management**: Upload, list, view, delete videos
- **Video Streaming**: Generate presigned URLs for video streaming
- **Transcoding**: Trigger video transcoding to different resolutions (720p, 1080p)
- **Thumbnail Generation**: Automatic thumbnail generation on upload
- **Caching**: ElastiCache (Memcached) for improved performance
- **Database**: DynamoDB for video metadata storage
- **Storage**: S3 for video file storage

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/signin` - Sign in user
- `POST /api/auth/confirm` - Confirm user signup
- `POST /api/auth/resend` - Resend confirmation code
- `POST /api/auth/challenge` - Respond to auth challenge
- `POST /api/auth/refresh` - Refresh authentication tokens
- `GET /api/auth/me` - Get current user info (requires auth)

### Videos
- `POST /api/videos/presign` - Get presigned URL for upload (requires auth)
- `POST /api/videos/finalize` - Finalize video upload (requires auth)
- `GET /api/videos` - List user's videos (requires auth)
- `GET /api/videos/:id` - Get video metadata (requires auth)
- `GET /api/videos/:id/stream` - Get video stream URL (requires auth)
- `DELETE /api/videos/:id` - Delete video (requires auth)

### Transcoding
- `GET /api/videos/transcoding/resolutions` - Get available resolutions (requires auth)
- `POST /api/videos/:id/transcode` - Start video transcoding (requires auth)
- `GET /api/videos/:id/transcoding-status` - Get transcoding status (requires auth)

### Health
- `GET /healthz` - Health check endpoint

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `8080` |
| `AWS_REGION` | AWS region | `ap-southeast-2` |
| `SERVICE_NAME` | Service name | `video-api` |
| `NODE_ENV` | Environment | `development` |
| `COGNITO_CLIENT_ID` | Cognito client ID | From Parameter Store |
| `CACHE_ENABLED` | Enable caching | `true` |
| `METRICS_ENABLED` | Enable metrics | `true` |

## Configuration

Configuration is loaded from:
1. **AWS Parameter Store**: `/n11817143/app/*`
2. **AWS Secrets Manager**: `n11817143-a2-secret`
3. **Environment Variables**: Fallback values

## Dependencies

- **express** - Web framework
- **aws-sdk** - AWS services integration
- **aws-jwt-verify** - Cognito JWT verification
- **fluent-ffmpeg** - Video transcoding
- **memjs** - ElastiCache client
- **zod** - Request validation
- **cors** - CORS middleware
- **morgan** - HTTP logging

## Running Locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start
```

## Docker

```bash
# Build image
docker build -t video-api:latest .

# Run container
docker run -p 8080:8080 \
  -e AWS_REGION=ap-southeast-2 \
  -e COGNITO_CLIENT_ID=your-client-id \
  video-api:latest
```

## Architecture

```
video-api/
├── src/
│   ├── index.js              # Express app entry point
│   ├── auth/                 # Authentication module
│   │   ├── auth.routes.js
│   │   ├── auth.controller.js
│   │   └── cognito.service.js
│   ├── videos/               # Video module
│   │   ├── video.routes.js
│   │   ├── video.controller.js
│   │   ├── video.service.js
│   │   ├── video.repo.js
│   │   ├── video.repo.dynamo.js
│   │   ├── transcoding.controller.js
│   │   └── transcoding.service.js
│   ├── cache/                # Cache module
│   │   └── cache.client.js
│   └── config/               # Configuration
│       └── config.dynamo.js
├── tests/                    # Test files
├── package.json
├── Dockerfile
└── README.md
```

## Shared Utilities

The service uses shared utilities from `../../../shared/`:
- **config** - Centralized configuration
- **auth/middleware** - JWT authentication
- **utils/errors** - Error handling
- **utils/asyncHandler** - Async route wrapper
- **utils/validate** - Request validation
- **utils/parameterStore** - AWS Parameter Store
- **utils/secrets** - AWS Secrets Manager

## Testing

```bash
# Run tests (not yet implemented)
npm test

# Run linter
npm run lint
```

## Health Checks

The service exposes a `/healthz` endpoint that returns:
```json
{
  "status": "healthy",
  "service": "video-api",
  "timestamp": "2025-10-30T12:00:00.000Z",
  "uptime": 123.456
}
```

## Error Handling

All errors are handled centrally and return standardized responses:
```json
{
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": []
  }
}
```

## Logging

The service uses structured logging with Morgan for HTTP requests and console logs for application events.

## Security

- JWT token validation using AWS Cognito
- CORS configuration for allowed origins
- Request validation using Zod schemas
- Presigned URLs for secure S3 access
- IAM roles for AWS service access

## Performance

- ElastiCache for video list caching
- Cache invalidation on video upload/delete
- Optimized DynamoDB queries
- Connection pooling for database
- Async/await for non-blocking operations

## Monitoring

The service is designed to integrate with:
- **CloudWatch Logs** - Application logs
- **CloudWatch Metrics** - Custom metrics
- **X-Ray** - Distributed tracing (future)
- **Container Insights** - ECS metrics

## Deployment

This service is designed to run on AWS ECS Fargate with:
- Application Load Balancer
- Auto-scaling based on CPU/memory
- Health checks for container management
- Blue-green deployment strategy
