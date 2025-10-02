# AI Coding Agent Instructions

## Architecture Overview

This is a **cloud-native video transcoding application** with React frontend + Express backend, built for AWS infrastructure. The app handles video upload, storage, transcoding (720p/1080p), and streaming using AWS managed services.

### Core Components
- **Frontend**: React (Vite) with AWS Amplify for Cognito auth, served via Nginx
- **Backend**: Express API with JWT validation, S3 presigned URLs, DynamoDB metadata, Memcached caching
- **Infrastructure**: AWS Cognito, S3, DynamoDB, ElastiCache, Parameter Store, Secrets Manager
- **Transcoding**: FFmpeg-based service with background processing

## Critical Development Patterns

### 1. Configuration Management
All runtime config loads from AWS Parameter Store (`/n11817143/app/`) + Secrets Manager:
```javascript
// server/src/config.js - Dynamic config loading with fallbacks
const config = await loadAppConfig(); // Parameter Store
const jwtSecret = await getJWTSecret(); // Secrets Manager
```

### 2. Repository Pattern with Dynamic Loading
```javascript
// server/src/videos/video.repo.js - Abstraction layer
async function loadRepo() {
  if (!repoPromise) {
    repoPromise = import('./video.repo.dynamo.js'); // Lazy load implementation
  }
  return repoPromise;
}
```

### 3. S3 Presigned URL Flow
Two-phase upload: frontend gets presigned URL → uploads directly to S3 → notifies backend:
```javascript
// Client: api.initiateUpload() → api.finalizeUpload()
// Server: createPresignedUpload() → finalizeUploadedVideo()
```

### 4. Authentication Pattern
Cognito JWT validation with dual token support (access/id tokens):
```javascript
// server/src/auth/auth.middleware.js
async function verifyWithFallback(token) {
  try {
    return await getAccessTokenVerifier().verify(token);
  } catch {
    return await getIdTokenVerifier().verify(token); // Fallback
  }
}
```

### 5. Error Handling Convention
Structured errors with async handler wrapper:
```javascript
// Always use asyncHandler for route handlers
router.post('/videos', asyncHandler(createVideo));

// Custom error classes with status codes
throw new AppError('Message', 400, 'ERROR_CODE');
```

### 6. DynamoDB Schema Requirements
**Critical**: All DynamoDB keys must be strings to avoid ValidationException:
```javascript
// ALWAYS convert to string in repo operations
Key: { ownerId: String(userId), videoId: String(videoId) }
```

## Development Workflows

### Local Development
```bash
# Full stack with containers (recommended)
docker-compose up --build

# Frontend only (for UI iterations)
npm --prefix client run dev # Ensure backend runs separately
```

### Configuration Testing
```bash
# Verify Parameter Store connectivity
npm --prefix server run params:status

# Check DynamoDB/cache connectivity  
npm --prefix server run params:validate
```

### Transcoding Development
- FFmpeg runs in backend container (`fluent-ffmpeg` package)
- Background processing pattern: start job → return 202 → update DB with progress
- S3 structure: `raw/` → `transcoded/{resolution}/` → `thumbs/`

## Integration Points

### AWS Service Boundaries
- **Cognito**: User auth, JWT issuance (reuses existing User Pool)
- **S3**: Direct upload/download via presigned URLs, organized by user folders
- **DynamoDB**: Video metadata with owner-based partitioning
- **ElastiCache**: Video listing cache with versioned invalidation
- **Parameter Store**: Runtime configuration centralization

### Frontend-Backend API Contract
```javascript
// Key endpoints requiring authentication
POST /api/videos/presign     // Get upload URL
POST /api/videos/finalize    // Complete upload
POST /api/videos/:id/transcode // Start transcoding
GET  /api/videos/:id/stream  // Get streaming URL (original|transcoded|thumbnail)
```

### Cache Invalidation Strategy
User-scoped versioned caching in `video.controller.js`:
```javascript
const cacheKey = `videos:${userId}:v${version}:p${page}:l${limit}`;
// Invalidate by bumping version, not deleting keys
```

## Project-Specific Conventions

### File Naming
- Services: `*.service.js` (business logic)
- Controllers: `*.controller.js` (HTTP handlers)  
- Repositories: `*.repo.js` (data access abstraction)
- Routes: `*.routes.js` (Express routing)

### Import Patterns
```javascript
// Always use relative imports for local modules
import config from '../config.js';
import { AppError } from '../utils/errors.js';

// Destructured AWS SDK imports
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
```

### Environment Variables
Hardcoded defaults matching assignment specs, override via environment:
```javascript
S3_BUCKET: 'n11817143-a2',           // Assignment-specific
COGNITO_USER_POOL_ID: 'ap-southeast-2_CdVnmKfrW',
DOMAIN_NAME: 'n11817143-videoapp.cab432.com'
```