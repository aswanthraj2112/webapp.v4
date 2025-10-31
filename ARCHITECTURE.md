# 🏗️ Architecture Documentation

## Overview

This document provides a comprehensive overview of the video processing application's architecture, deployed on AWS using a microservices pattern with ECS Fargate and AWS Lambda. The application consists of **3 core microservices** (Video API, Admin Service, Transcode Worker) plus **1 Lambda function** (S3→SQS), with a React SPA frontend served via CloudFront/S3.

## Table of Contents

1. [Architecture Diagram](#architecture-diagram)
2. [Components](#components)
3. [Data Flow](#data-flow)
4. [Infrastructure](#infrastructure)
5. [Security](#security)
6. [Scalability](#scalability)
7. [Monitoring](#monitoring)

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                           USERS                                   │
│                  (Global / Australia)                             │
└────────────┬──────────────────────────────────┬──────────────────┘
             │                                   │
             │ HTTPS                             │ HTTPS
             ▼                                   ▼
    ┌────────────────┐                  ┌───────────────┐
    │   Route 53     │                  │   Route 53    │
    │   (DNS)        │                  │   (DNS)       │
    │ app.n11817143  │                  │  n11817143    │
    │ -videoapp...   │                  │  -videoapp... │
    └────────┬───────┘                  └───────┬───────┘
             │                                   │
             ▼                                   ▼
    ┌────────────────┐                  ┌───────────────────┐
    │  CloudFront    │                  │  ACM Certificate  │
    │  Distribution  │                  │  (Wildcard)       │
    │  E3MBOUQVWZE.. │                  │  *.n11817143-     │
    │  TLS 1.2+      │                  │  videoapp...      │
    └────────┬───────┘                  └───────┬───────────┘
             │                                   │
             ▼                                   ▼
    ┌────────────────┐                  ┌───────────────────┐
    │  S3 Bucket     │                  │  Application      │
    │  n11817143-    │                  │  Load Balancer    │
    │  app-static-   │                  │  n11817143-app-   │
    │  website       │                  │  alb              │
    │  (React SPA)   │                  │  HTTPS:443        │
    └────────────────┘                  └───────┬───────────┘
                                                 │
                         ┌───────────────────────┼──────────────────┐
                         │                       │                  │
                         ▼                       ▼                  ▼
              ┌──────────────────┐   ┌──────────────────┐  ┌──────────────────┐
              │  Video API       │   │  Admin Service   │  │  Transcode       │
              │  ECS Service     │   │  ECS Service     │  │  Worker          │
              │  Port: 8080      │   │  Port: 8080      │  │  ECS Service     │
              │  Path: /api/*    │   │  Path: /api/admin│  │  No ALB          │
              │  Tasks: 1-5      │   │  Tasks: 1-3      │  │  Tasks: 0-10     │
              └──────────┬───────┘   └──────────┬───────┘  └──────────┬───────┘
                         │                       │                     │
                         │   AWS Fargate (Serverless Container Platform)
                         │                       │                     │
    ┌────────────────────┴───────────────────────┴─────────────────────┴─────┐
    │                                                                          │
    │  ┌─────────────┐  ┌──────────────┐  ┌──────────┐  ┌────────┐  ┌─────┐│
    │  │  Amazon     │  │  Amazon      │  │ Amazon  │  │ Amazon │  │ ECR ││
    │  │  Cognito    │  │  DynamoDB    │  │   S3    │◄─┤ Lambda │  │     ││
    │  │  (Auth)     │  │  (Metadata)  │  │(Videos) │  │ (S3→   │  │     ││
    │  │             │  │              │  │         │  │  SQS)  │  │     ││
    │  │ User Pool:  │  │ Table:       │  │ Bucket: │  │Function│  │ 4   ││
    │  │ n11817143-a2│  │ n11817143-a2 │  │n11817143│  │ ✅NEW │  │repos││
    │  │             │  │              │  │   -a2   │  │        │  │     ││
    │  └─────────────┘  └──────────────┘  └────┬─────┘  └───┬────┘  └─────┘│
    │                                           │            │               │
    │                                           │ S3 Event   │ SQS Message   │
    │                                           └────────────┘               │
    │                                                 ↓                       │
    │                                          ┌────────────┐                │
    │                                          │  Amazon    │                │
    │                                          │    SQS     │                │
    │                                          │  (Queue)   │                │
    │                                          │            │                │
    │                                          │  Queue:    │                │
    │                                          │n11817143-A3│                │
    │                                          └──────┬─────┘                │
    │                                                 │                       │
    │                                                 │ Long Polling          │
    │                                                 └──────────────────────►│
    │                                              Transcode Worker           │
    └──────────────────────────────────────────────────────────────────────────┘

    🎯 3 Microservices + 1 Lambda: Video API | Admin Service | Transcode Worker | S3→SQS Lambda
```

## Components

### 1. Frontend Layer

#### CloudFront Distribution
- **ID**: E3MBOUQVWZEHJQ
- **Domain**: d39r13oq9jampl.cloudfront.net
- **Custom Domain**: app.n11817143-videoapp.cab432.com
- **Purpose**: Global CDN for React application
- **Features**:
  - TLS 1.2+ encryption
  - Automatic HTTPS redirect
  - SPA routing (403/404 → index.html)
  - Origin Access Control (OAC) to S3
  - Cache invalidation support

#### S3 Static Website
- **Bucket**: n11817143-app-static-website
- **Purpose**: Host React build files
- **Configuration**:
  - Website hosting enabled
  - Public access blocked (CloudFront only)
  - Versioning enabled
  - CORS configured

#### React Application
- **Framework**: React 18
- **Build Tool**: Vite
- **Features**:
  - AWS Amplify authentication
  - Video upload/playback
  - Responsive design
  - API integration

### 2. Backend Layer

#### Application Load Balancer
- **Name**: n11817143-app-alb
- **DNS**: n11817143-app-alb-1811658624.ap-southeast-2.elb.amazonaws.com
- **Custom Domain**: n11817143-videoapp.cab432.com
- **Listeners**:
  - HTTP:80 → Redirect to HTTPS
  - HTTPS:443 → Route to target groups
- **Routing Rules**:
  - `/api/admin/*` → Admin Service
  - `/api/*` → Video API
  - Default → Video API
- **Health Checks**:
  - Path: `/healthz`
  - Interval: 30s
  - Healthy threshold: 2
  - Unhealthy threshold: 3

#### ECS Cluster
- **Name**: n11817143-app-cluster
- **Launch Type**: FARGATE
- **Platform Version**: LATEST
- **Networking**: AWS VPC with public subnets

### 3. Microservices

#### Video API Service
```
Name: n11817143-app-video-api
Port: 8080
CPU: 512 (0.5 vCPU)
Memory: 1024 MB
Tasks: 2 (Desired), 1-5 (Auto-scaling)
Image: 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-app/video-api:latest
```

**Responsibilities**:
- User authentication (Cognito integration)
- Video metadata CRUD (DynamoDB)
- Generate presigned S3 URLs for upload
- Video listing and retrieval
- Health check endpoint

**Endpoints**:
- `GET /healthz` - Health check
- `GET /api/config` - Frontend configuration (Cognito details)
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User login
- `GET /api/videos` - List user videos
- `POST /api/videos` - Create video metadata
- `GET /api/videos/:id` - Get video details
- `DELETE /api/videos/:id` - Delete video

**Environment Variables**:
- `COGNITO_USER_POOL_ID`: ap-southeast-2_CdVnmKfW
- `COGNITO_CLIENT_ID`: 296uu7cjlfinpnspc04kp53p83
- `DYNAMODB_TABLE_NAME`: n11817143-VideoApp
- `S3_BUCKET_NAME`: n11817143-a2
- `SQS_QUEUE_URL`: https://sqs.ap-southeast-2.amazonaws.com/901444280953/n11817143-A3
- `CLIENT_ORIGINS`: CORS allowed origins

#### Admin Service
```
Name: n11817143-app-admin-service
Port: 8080
CPU: 256 (0.25 vCPU)
Memory: 512 MB
Tasks: 1 (Desired), 1-3 (Auto-scaling)
Image: 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-app/admin-service:latest
```

**Responsibilities**:
- Administrative operations
- User management
- System monitoring
- Analytics

**Endpoints**:
- `GET /healthz` - Health check
- `GET /api/admin/users` - List all users
- `GET /api/admin/stats` - System statistics

#### Transcode Worker
```
Name: n11817143-app-transcode-worker
CPU: 1024 (1 vCPU)
Memory: 2048 MB
Tasks: 1 (Desired), 0-10 (Auto-scaling, can scale to zero)
Image: 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-app/transcode-worker:latest
```

**Responsibilities**:
- Poll SQS queue for transcode jobs
- Download video from S3
- Transcode with FFmpeg (360p, 480p, 720p)
- Upload transcoded videos to S3
- Update DynamoDB metadata
- Delete SQS message on completion

**Process**:
1. Listen to SQS queue (long polling, 20 seconds)
2. Receive message with video metadata
3. Download raw video from S3
4. Transcode to 720p with FFmpeg
5. Upload to S3: `transcoded/{videoId}/720p.mp4`
6. Update DynamoDB with transcode status
7. Delete SQS message on completion

#### Lambda Function (S3 to SQS)
```
Name: n11817143-app-s3-to-sqs
Runtime: Container Image (Node.js 18)
Memory: 256 MB
Timeout: 30 seconds
Role: CAB432-Lambda-Role
Image: 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-app/s3-to-sqs-lambda:latest
```

**Responsibilities**:
- Listen for S3 ObjectCreated events
- Validate video file extensions
- Extract userId from S3 key pattern
- Generate/extract videoId
- Send transcode job message to SQS queue

**Trigger**:
- S3 Event: `s3:ObjectCreated:*`
- Prefix Filter: `raw/`
- Bucket: n11817143-a2

**Process**:
1. S3 triggers Lambda on file upload to `raw/` prefix
2. Lambda validates file is a video (.mp4, .mov, .avi, .mkv, .webm, .flv)
3. Extracts userId from S3 key: `raw/{userId}/{filename}`
4. Generates or extracts videoId from filename
5. Creates transcode job message:
   ```json
   {
     "userId": "user123",
     "videoId": "uuid",
     "originalS3Key": "raw/user123/video.mp4",
     "resolution": "720p",
     "bucket": "n11817143-a2",
     "fileSize": 83517,
     "timestamp": "2025-10-30T21:23:00.026Z",
     "eventName": "ObjectCreated:Put"
   }
   ```
6. Sends message to SQS queue (n11817143-A3)
7. Returns success/failure status

**Environment Variables**:
- `TRANSCODE_QUEUE_URL`: https://sqs.ap-southeast-2.amazonaws.com/901444280953/n11817143-A3
- `AWS_REGION`: Automatically set by Lambda runtime

**Benefits**:
- Event-driven architecture (no polling needed)
- Decouples upload from transcode queueing
- Serverless (no server management)
- Scales automatically with S3 events
- Cost-effective (pay only per execution)

### 4. Storage Layer

#### Amazon S3
- **Bucket**: n11817143-a2
- **Purpose**: Video storage
- **Structure**:
  ```
  n11817143-a2/
  ├── raw/{videoId}/original.{ext}           # Original uploads
  └── transcoded/{videoId}/
      ├── 360p.mp4                           # Low quality
      ├── 480p.mp4                           # Medium quality
      └── 720p.mp4                           # High quality
  ```
- **CORS Configuration**:
  ```json
  {
    "AllowedOrigins": [
      "https://app.n11817143-videoapp.cab432.com",
      "https://n11817143-videoapp.cab432.com",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
  ```

#### Amazon DynamoDB
- **Table**: n11817143-a2
- **Key Schema**:
  - Partition Key: `PK` (String) - Format: `USER#{username}`
  - Sort Key: `SK` (String) - Format: `VIDEO#{videoId}` or `METADATA#{username}`
- **Attributes**:
  - `videoId` - UUID
  - `title` - Video title
  - `description` - Video description
  - `status` - upload|processing|completed|failed
  - `uploadDate` - ISO timestamp
  - `rawS3Key` - Original video S3 key
  - `transcodedVersions` - Map of resolution → S3 key
  - `duration` - Video duration in seconds
  - `size` - File size in bytes

#### Amazon SQS
- **Queue**: n11817143-transcode-queue
- **Purpose**: Decouple video upload from transcoding
- **Message Format**:
  ```json
  {
    "videoId": "uuid",
    "userId": "username",
    "s3Key": "raw/{videoId}/original.mp4"
  }
  ```
- **Visibility Timeout**: 3600s (1 hour)
- **Message Retention**: 4 days

### 5. Authentication

#### Amazon Cognito
- **User Pool**: n11817143-a2
- **ID**: ap-southeast-2_CdVnmKfrW
- **Client**: n11817143-a2-public-client
- **Client ID**: 296uu7cjlfinpnspc04kp53p83
- **Features**:
  - Email-based authentication
  - MFA support (TOTP)
  - Password policy: 8+ chars, uppercase, lowercase, numbers, symbols
  - Account recovery via email

**Authentication Flow**:
1. Frontend calls `/api/config` to get Cognito details
2. User signs up/signs in via AWS Amplify
3. Cognito returns JWT tokens (ID, Access, Refresh)
4. Frontend includes ID token in API requests
5. Backend verifies JWT with Cognito public keys
6. Backend extracts user identity from token

### 6. Container Registry

#### Amazon ECR
- **Repositories**:
  1. `n11817143-app/video-api`
  2. `n11817143-app/admin-service`
  3. `n11817143-app/transcode-worker`
- **Image Tag Strategy**: `latest` for current production
- **Scan on Push**: Enabled
- **Lifecycle Policy**: Keep last 10 images

## Data Flow

### Video Upload Flow

```
1. User clicks "Upload Video" in React app
2. Frontend calls POST /api/videos with metadata
3. Video API:
   - Validates user authentication
   - Generates unique videoId
   - Creates DynamoDB record (status: uploading)
   - Generates S3 presigned URL (PUT)
   - Returns presigned URL to frontend
4. Frontend uploads video directly to S3 using presigned URL
5. S3 upload completes
6. Frontend calls PATCH /api/videos/:id (status: processing)
7. Video API:
   - Updates DynamoDB (status: processing)
   - Sends message to SQS queue
8. Transcode Worker:
   - Polls SQS, receives message
   - Downloads video from S3
   - Transcodes to 360p, 480p, 720p
   - Uploads transcoded versions to S3
   - Updates DynamoDB (status: completed, add transcode keys)
   - Deletes SQS message
```

### Video Playback Flow

```
1. User opens "My Videos" page
2. Frontend calls GET /api/videos
3. Video API:
   - Verifies authentication
   - Queries DynamoDB for user's videos
   - Returns list with metadata
4. User clicks on a video
5. Frontend calls GET /api/videos/:id
6. Video API:
   - Fetches video details from DynamoDB
   - Generates S3 presigned URLs (GET) for each quality
   - Returns video details + presigned URLs
7. Frontend displays video player with quality selector
8. User selects quality and plays video from S3
```

## Infrastructure

### AWS Regions
- **Primary**: ap-southeast-2 (Sydney)
- **CloudFront**: Global edge locations
- **ACM Certificates**:
  - ap-southeast-2: For ALB
  - us-east-1: For CloudFront (required)

### Networking

#### VPC
- **ID**: vpc-007bab53289655834
- **CIDR**: (QUT-managed)
- **Subnets**:
  - Public: subnet-05d0352bb15852524, subnet-04cc288ea3b2e1e53, subnet-075811427d5564cf9
  - Private: subnet-08e89ff0d9b49c9ae, subnet-07ea9e4f9cc9159ca
- **Availability Zones**: ap-southeast-2a, 2b, 2c

#### Security Groups
- **CAB432SG** (sg-032bd1ff8cf77dbb9):
  - Inbound: 8080 (HTTP from ALB)
  - Outbound: All traffic
- **ALB Security Group**:
  - Inbound: 80, 443 (from 0.0.0.0/0)
  - Outbound: 8080 (to ECS tasks)

### DNS Configuration

#### Route53 Records
- **Hosted Zone**: Z02680423BHWEVRU2JZDQ (cab432.com)
- **Records**:
  1. **A Record (Alias)**: `n11817143-videoapp.cab432.com` → ALB
  2. **A Record (Alias)**: `app.n11817143-videoapp.cab432.com` → CloudFront

### SSL/TLS Certificates

#### ACM Certificates
1. **ALB Certificate** (ap-southeast-2):
   - ARN: arn:aws:acm:ap-southeast-2:901444280953:certificate/287c529f-3514-4283-9752-9f716540ff03
   - Domain: *.n11817143-videoapp.cab432.com
   - Validation: DNS

2. **CloudFront Certificate** (us-east-1):
   - ARN: arn:aws:acm:us-east-1:901444280953:certificate/3e304793-a3b9-4d8d-9953-74f366cd3453
   - Domain: *.n11817143-videoapp.cab432.com
   - Validation: DNS

## Security

### Network Security
- All traffic encrypted (HTTPS/TLS 1.2+)
- Security groups restrict access to known ports
- ECS tasks in private subnets with NAT (optional)
- S3 buckets not publicly accessible (presigned URLs only)

### Application Security
- JWT-based authentication
- Token verification on every API request
- CORS configured for allowed origins only
- Input validation with Zod schemas
- SQL injection prevention (NoSQL database)

### Secrets Management
- JWT secrets in AWS Systems Manager Parameter Store
- Environment variables via ECS task definitions
- No secrets in code or Docker images

### IAM Roles
- **ECS Task Execution Role**: Pull images from ECR, write logs
- **ECS Task Role**: Access S3, DynamoDB, SQS, Cognito
- **Principle of Least Privilege**: Each service has minimal permissions

## Scalability

### Auto-Scaling Configuration

#### Video API
- **Min**: 1 task
- **Max**: 10 tasks
- **Metric**: CPU utilization > 70%
- **Scale-up**: Add 1 task when CPU > 70% for 2 minutes
- **Scale-down**: Remove 1 task when CPU < 50% for 5 minutes

#### Admin Service
- **Min**: 1 task
- **Max**: 5 tasks
- **Metric**: CPU utilization > 70%

#### Transcode Worker
- **Min**: 1 task
- **Max**: 5 tasks
- **Metric**: SQS queue depth > 10 messages

### Database Scalability
- DynamoDB on-demand capacity
- Automatic scaling based on traffic
- No capacity planning required

### Storage Scalability
- S3 unlimited storage
- CloudFront caching reduces S3 load

## Monitoring

### Health Checks
- **ALB Target Health**: Every 30s on `/healthz`
- **ECS Service Health**: Task status monitoring
- **Automatic Recovery**: Restart failed tasks

### Metrics (Available)
- ECS CPU/Memory utilization
- ALB request count, latency, HTTP codes
- DynamoDB read/write capacity
- S3 request metrics
- SQS queue depth

### Logging
- ECS tasks log to CloudWatch Logs
- Log groups: `/ecs/{service-name}`
- Retention: 7 days (configurable)

## Cost Optimization

### Current Costs
- **ECS Fargate**: ~$0.04/hour per task (based on CPU/memory)
- **ALB**: ~$0.025/hour + $0.008 per LCU
- **CloudFront**: $0.085/GB (first 10 TB)
- **S3**: $0.025/GB storage + requests
- **DynamoDB**: On-demand pricing

### Optimization Strategies
1. Scale services to 0 when not in use
2. Use S3 lifecycle policies (archive old videos)
3. Enable CloudFront caching (reduce S3 requests)
4. Use DynamoDB reserved capacity (if predictable)
5. Clean up old ECR images
6. Delete SQS messages promptly

## Deployment

### Infrastructure as Code
- **Tool**: Terraform 1.5+
- **State**: Local (terraform.tfstate)
- **Modules**:
  - `alb` - Application Load Balancer
  - `ecr` - Container registries
  - `ecs-cluster` - ECS cluster
  - `ecs-service` - Individual services
  - `s3-static-website` - Frontend hosting

### CI/CD (Manual)
1. Build Docker images locally
2. Push to ECR with `scripts/build-and-push.sh`
3. ECS auto-deploys new images
4. Frontend: Build + sync to S3 + invalidate CloudFront

## Disaster Recovery

### Backup Strategy
- DynamoDB: Point-in-time recovery enabled
- S3: Versioning enabled
- Terraform state: Regular backups

### High Availability
- Multi-AZ deployment (3 availability zones)
- ALB distributes traffic across AZs
- ECS Fargate automatically replaces failed tasks
- S3 and DynamoDB are multi-AZ by default

## Future Enhancements

1. **CI/CD Pipeline**: GitHub Actions for automated deployments
2. **Monitoring Dashboard**: CloudWatch dashboards
3. **Alerts**: SNS notifications for failures
4. **CDN Optimization**: CloudFront cache tuning
5. **Database Optimization**: DynamoDB indexes, streams
6. **Video Analytics**: Track views, popular videos
7. **Advanced Transcoding**: More formats, adaptive bitrate
8. **User Profiles**: Avatar upload, preferences
9. **Social Features**: Comments, likes, shares
10. **Admin Dashboard**: Real-time monitoring, user management

## Conclusion

This architecture provides a scalable, secure, and cost-effective solution for video processing on AWS. The use of managed services (Fargate, S3, DynamoDB, Cognito) reduces operational overhead, while the microservices pattern enables independent scaling and deployment of components.

---

**Last Updated**: October 30, 2025  
**Version**: 5.0  
**Author**: n11817143@qut.edu.au
