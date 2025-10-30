# 🏗️ Architecture Overview

Complete architecture documentation for the Video Platform microservices.

---

## Table of Contents
1. [High-Level Architecture](#high-level-architecture)
2. [Service Communication](#service-communication)
3. [Data Flow](#data-flow)
4. [Infrastructure Components](#infrastructure-components)
5. [Security Architecture](#security-architecture)
6. [Scaling Strategy](#scaling-strategy)
7. [Disaster Recovery](#disaster-recovery)

---

## High-Level Architecture

```
                                    USERS
                                      │
                                      ▼
                          ┌───────────────────────┐
                          │   Internet Gateway    │
                          └───────────┬───────────┘
                                      │
                                      ▼
                          ┌───────────────────────┐
                          │ Application Load      │
                          │ Balancer (ALB)        │
                          │  - Port 80 routing    │
                          │  - Health checks      │
                          │  - SSL termination    │
                          └──────────┬────────────┘
                                     │
               ┌─────────────────────┼─────────────────────┐
               │                     │                     │
               ▼                     ▼                     ▼
    ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
    │  Video API       │  │  Admin Service   │  │  Client (React)  │
    │  ECS Service     │  │  ECS Service     │  │  ECS Service     │
    │  - Auth          │  │  - User mgmt     │  │  - Vite build    │
    │  - Video CRUD    │  │  - System stats  │  │  - Nginx serve   │
    │  - Upload        │  │  - Monitoring    │  │  - SPA routing   │
    │  1-5 tasks       │  │  1-3 tasks       │  │  1-2 tasks       │
    └────────┬─────────┘  └────────┬─────────┘  └──────────────────┘
             │                     │
             └──────────┬──────────┘
                        │
                        ▼
              ┌─────────────────┐
              │   Amazon SQS    │
              │ transcode-queue │
              │  - FIFO order   │
              │  - Dead letter  │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │ Transcode Worker│
              │  ECS Service    │
              │  - FFmpeg       │
              │  - Thumbnails   │
              │  1-10 tasks     │
              └────────┬────────┘
                       │
         ┌─────────────┼─────────────┬────────────┐
         ▼             ▼             ▼            ▼
    ┌────────┐   ┌──────────┐  ┌────────┐  ┌──────────┐
    │   S3   │   │ DynamoDB │  │  ECR   │  │CloudWatch│
    │ Videos │   │  Tables  │  │ Images │  │   Logs   │
    │Thumbs  │   │ - videos │  │ x5     │  │ Metrics  │
    └────┬───┘   │ - users  │  └────────┘  └──────────┘
         │       └──────────┘
         │
         ▼
    ┌────────────┐
    │  Lambda    │
    │ S3-Event   │
    │ Processor  │
    └────────────┘
```

---

## Service Communication

### 1. Client → Video API
**Protocol:** HTTP/HTTPS  
**Port:** 80 (ALB) → 4000 (container)  
**Authentication:** JWT Bearer Token  

```
Client → ALB → Video API
  POST /api/auth/login
  GET  /api/videos
  POST /api/videos/upload
  GET  /api/videos/:id
  DELETE /api/videos/:id
```

### 2. Client → Admin Service
**Protocol:** HTTP/HTTPS  
**Port:** 80 (ALB) → 5000 (container)  
**Authentication:** JWT Bearer Token (Admin only)  

```
Client → ALB → Admin Service
  GET  /api/admin/users
  GET  /api/admin/users/:id
  DELETE /api/admin/users/:id
  GET  /api/admin/stats
```

### 3. Video API → SQS
**Protocol:** AWS SDK (HTTPS)  
**Queue:** transcode-queue.fifo  
**Message Format:** JSON  

```javascript
{
  "videoId": "video123",
  "s3Key": "videos/original/video123.mp4",
  "userId": "user123",
  "metadata": {
    "title": "My Video",
    "resolution": "1920x1080"
  }
}
```

### 4. Transcode Worker → SQS
**Protocol:** AWS SDK (HTTPS)  
**Polling:** Long polling (20s wait time)  
**Batch Size:** 1 message at a time  
**Visibility Timeout:** 600s (10 minutes)

### 5. S3 → Lambda → SQS
**Trigger:** S3 ObjectCreated:* events  
**Protocol:** S3 Event Notification → Lambda → SQS SDK  

```javascript
S3 Event → Lambda Handler → Parse Event → Validate → Queue to SQS
```

### 6. Services → DynamoDB
**Protocol:** AWS SDK (HTTPS)  
**Tables:** videos, users  
**Access Pattern:** Point lookups, scans, queries  

```
Video API ←→ DynamoDB (videos, users)
Admin Service ←→ DynamoDB (users, stats)
Transcode Worker ←→ DynamoDB (videos - update status)
```

---

## Data Flow

### Video Upload Flow

```
1. User authenticates
   Client → Video API: POST /api/auth/login
   Response: JWT token

2. User uploads video
   Client → Video API: POST /api/videos/upload (multipart/form-data)
   Video API → S3: Upload original video
   Video API → DynamoDB: Create video record (status: "processing")
   Response: { videoId, status: "processing" }

3. S3 triggers Lambda
   S3 → Lambda: ObjectCreated event
   Lambda → SQS: Queue transcode job

4. Worker processes video
   Transcode Worker → SQS: Poll for messages
   Transcode Worker → S3: Download original video
   Transcode Worker: FFmpeg transcoding (720p, 480p, 360p)
   Transcode Worker: FFmpeg thumbnail extraction
   Transcode Worker → S3: Upload transcoded videos + thumbnail
   Transcode Worker → DynamoDB: Update status to "completed"

5. User retrieves video
   Client → Video API: GET /api/videos/:id
   Video API → DynamoDB: Fetch video metadata
   Response: { videoId, status: "completed", urls: {...} }

6. User plays video
   Client → S3: Direct video stream (presigned URL or public)
```

### Authentication Flow

```
1. User signup
   Client → Video API: POST /api/auth/signup
   Video API → Cognito: Create user (or DynamoDB)
   Video API → DynamoDB: Store user metadata
   Response: { userId, email }

2. User login
   Client → Video API: POST /api/auth/login
   Video API → Cognito: Authenticate (or DynamoDB + bcrypt)
   Video API: Generate JWT token
   Response: { token, user }

3. Authenticated request
   Client → Video API: GET /api/videos (Authorization: Bearer <token>)
   Video API: Validate JWT (auth.middleware.js)
   Video API: Extract userId from token
   Video API → DynamoDB: Fetch videos
   Response: { videos: [...] }
```

### Admin Operations Flow

```
1. Admin login
   Client → Admin Service: POST /api/admin/login
   Admin Service: Validate admin credentials
   Response: { token, adminUser }

2. List all users
   Client → Admin Service: GET /api/admin/users
   Admin Service: Validate admin token
   Admin Service → DynamoDB: Scan users table
   Response: { users: [...], total }

3. View system stats
   Client → Admin Service: GET /api/admin/stats
   Admin Service → DynamoDB: Query videos, users
   Admin Service → CloudWatch: Fetch metrics (optional)
   Response: { users: {...}, videos: {...}, system: {...} }
```

---

## Infrastructure Components

### Amazon ECS (Elastic Container Service)

**Cluster:** `webapp-cluster`

**Services:**
1. **video-api-service**
   - Task Definition: video-api:latest
   - Desired Count: 1-5 (auto-scaling)
   - CPU: 256 (.25 vCPU)
   - Memory: 512 MB
   - Port: 4000
   - Health Check: GET /healthz

2. **admin-service**
   - Task Definition: admin-service:latest
   - Desired Count: 1-3 (auto-scaling)
   - CPU: 256 (.25 vCPU)
   - Memory: 512 MB
   - Port: 5000
   - Health Check: GET /api/admin/health

3. **transcode-worker**
   - Task Definition: transcode-worker:latest
   - Desired Count: 1-10 (auto-scaling)
   - CPU: 1024 (1 vCPU)
   - Memory: 2048 MB (2 GB)
   - No exposed ports (SQS consumer)

4. **client-service**
   - Task Definition: client:latest
   - Desired Count: 1-2 (auto-scaling)
   - CPU: 256 (.25 vCPU)
   - Memory: 512 MB
   - Port: 80 (Nginx)
   - Health Check: GET /index.html

### Application Load Balancer

**Name:** `webapp-alb`

**Listeners:**
- Port 80 (HTTP)
  - Default: Forward to client-target-group
  - Path `/api/videos/*` → video-api-target-group
  - Path `/api/auth/*` → video-api-target-group
  - Path `/api/admin/*` → admin-target-group

**Target Groups:**
1. **video-api-target-group**
   - Protocol: HTTP
   - Port: 4000
   - Health Check: /healthz
   - Deregistration Delay: 30s

2. **admin-target-group**
   - Protocol: HTTP
   - Port: 5000
   - Health Check: /api/admin/health
   - Deregistration Delay: 30s

3. **client-target-group**
   - Protocol: HTTP
   - Port: 80
   - Health Check: /index.html
   - Deregistration Delay: 10s

### Amazon DynamoDB

**Tables:**

1. **videos**
   - Partition Key: `id` (String)
   - Attributes: title, description, status, uploadedBy, urls, metadata, createdAt, updatedAt
   - Billing: On-Demand
   - Indexes: GSI on `uploadedBy`, GSI on `status`

2. **users**
   - Partition Key: `id` (String)
   - Attributes: email, name, role, passwordHash, createdAt, lastLogin
   - Billing: On-Demand
   - Indexes: GSI on `email`

### Amazon S3

**Buckets:**

1. **webapp-videos-bucket**
   - Purpose: Video storage
   - Structure:
     ```
     /videos/
       /original/      - Original uploads
       /transcoded/
         /720p/        - 720p versions
         /480p/        - 480p versions
         /360p/        - 360p versions
       /thumbs/        - Thumbnail images
     ```
   - Lifecycle: Glacier after 90 days (optional)
   - Versioning: Enabled
   - Encryption: AES-256

2. **webapp-terraform-state**
   - Purpose: Terraform state storage
   - Versioning: Enabled
   - Encryption: AES-256

### Amazon SQS

**Queue:** `transcode-queue.fifo`
- Type: FIFO (First-In-First-Out)
- Visibility Timeout: 600s
- Message Retention: 4 days
- Dead Letter Queue: `transcode-dlq.fifo`
- Max Receive Count: 3

### AWS Lambda

**Function:** `s3-event-processor`
- Runtime: Node.js 20.x (Container)
- Memory: 256 MB
- Timeout: 60s
- Trigger: S3 ObjectCreated events
- Environment: QUEUE_URL, AWS_REGION
- IAM Role: s3:GetObject, sqs:SendMessage

### Amazon ECR

**Repositories:**
1. video-api
2. admin-service
3. transcode-worker
4. s3-lambda
5. client

Image Scanning: Enabled  
Tag Immutability: Enabled

### Amazon CloudWatch

**Log Groups:**
- /ecs/video-api
- /ecs/admin-service
- /ecs/transcode-worker
- /ecs/client
- /aws/lambda/s3-event-processor

**Metrics:**
- ECS: CPU, Memory, Network
- ALB: RequestCount, TargetResponseTime, HTTPCode_Target_5XX
- SQS: ApproximateNumberOfMessagesVisible, NumberOfMessagesSent
- Lambda: Invocations, Duration, Errors

**Alarms:**
- High CPU (>80%)
- High Memory (>80%)
- High 5XX errors (>10 in 5 min)
- Queue depth (>100 messages)
- Lambda errors (>5 in 5 min)

---

## Security Architecture

### Network Security

```
Internet
    │
    ▼
┌─────────────────┐
│  Public Subnet  │
│  - ALB          │  ← Public IP, Security Group: Allow 80/443 from 0.0.0.0/0
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Private Subnet  │
│  - ECS Tasks    │  ← No public IP, Security Group: Allow 4000/5000/80 from ALB
│  - Lambda       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  AWS Services   │
│  - DynamoDB     │  ← VPC Endpoints (optional)
│  - S3           │  ← IAM roles, no direct access
│  - SQS          │
└─────────────────┘
```

### IAM Roles

**ECS Task Execution Role:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "*"
    }
  ]
}
```

**Video API Task Role:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/videos"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::webapp-videos-bucket/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage"
      ],
      "Resource": "arn:aws:sqs:*:*:transcode-queue.fifo"
    }
  ]
}
```

**Transcode Worker Task Role:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes"
      ],
      "Resource": "arn:aws:sqs:*:*:transcode-queue.fifo"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::webapp-videos-bucket/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:UpdateItem"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/videos"
    }
  ]
}
```

### Application Security

**Authentication:**
- JWT tokens (HS256 algorithm)
- Token expiration: 24 hours
- Refresh tokens: Not implemented (future)
- Password hashing: bcrypt (10 rounds)

**Authorization:**
- Middleware: `requireAuth`, `requireAdmin`
- Role-based access control (RBAC)
- Resource ownership validation

**Input Validation:**
- Express Validator
- File type validation (video uploads)
- Size limits: 500MB per video
- SQL injection prevention (NoSQL, parameterized)
- XSS prevention (input sanitization)

**CORS:**
```javascript
{
  origin: ['http://localhost:3000', 'http://<ALB_DNS>:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Authorization', 'Content-Type']
}
```

---

## Scaling Strategy

### Auto-Scaling Policies

**Video API Service:**
1. **CPU-based scaling**
   - Target: 70% CPU utilization
   - Scale out: +1 task if CPU >70% for 2 minutes
   - Scale in: -1 task if CPU <30% for 5 minutes
   - Min: 1, Max: 5

2. **Memory-based scaling**
   - Target: 80% memory utilization
   - Scale out: +1 task if Memory >80% for 2 minutes
   - Scale in: -1 task if Memory <40% for 5 minutes

**Admin Service:**
1. **CPU-based scaling**
   - Target: 70% CPU utilization
   - Min: 1, Max: 3

**Transcode Worker:**
1. **Queue depth scaling**
   - Target: 5 messages per task
   - Scale out: +1 task if queue depth >10
   - Scale in: -1 task if queue depth <2
   - Min: 1, Max: 10

2. **CPU-based scaling**
   - Target: 80% CPU utilization (transcoding is CPU-intensive)

### Capacity Planning

| Load Level | Users | Videos/Day | Tasks Needed | Est. Cost |
|------------|-------|------------|--------------|-----------|
| **Light** | 0-100 | 0-10 | 1-2 per service | $65/mo |
| **Medium** | 100-1000 | 10-100 | 2-5 per service | $143/mo |
| **Heavy** | 1000-10000 | 100-1000 | 5-10 per service | $350/mo |
| **Very Heavy** | 10000+ | 1000+ | 10-20 per service | $700+/mo |

---

## Disaster Recovery

### Backup Strategy

**DynamoDB:**
- Point-in-time recovery: Enabled (last 35 days)
- On-demand backups: Weekly (manual)
- Cross-region replication: Not implemented (future)

**S3:**
- Versioning: Enabled
- Cross-region replication: Not implemented (future)
- Lifecycle: Transition to Glacier after 90 days

**ECR:**
- Image retention: Keep last 10 images
- Backup: Images can be re-built from Git

### Recovery Objectives

| Metric | Target | Strategy |
|--------|--------|----------|
| **RTO** (Recovery Time) | <1 hour | Multi-AZ, auto-scaling, ALB health checks |
| **RPO** (Recovery Point) | <5 minutes | DynamoDB PITR, S3 versioning |
| **Availability** | 99.9% | Multi-AZ deployment |

### Failure Scenarios

**1. Single Task Failure:**
- Detection: ALB health check fails
- Response: ECS automatically replaces task
- Impact: No downtime (other tasks handle traffic)

**2. Service Degradation:**
- Detection: CloudWatch CPU/Memory alarms
- Response: Auto-scaling adds capacity
- Impact: Slight latency increase

**3. AZ Failure:**
- Detection: Multiple health check failures
- Response: ALB routes to healthy AZ
- Impact: Reduced capacity, auto-scaling compensates

**4. Database Failure:**
- Detection: DynamoDB API errors
- Response: AWS automatically fails over (Multi-AZ)
- Impact: Brief interruption (<30s)

**5. Complete Region Failure:**
- Detection: Manual monitoring
- Response: Terraform deploy to new region
- Impact: Full outage until recovery (1-2 hours)

### Monitoring & Alerting

**Critical Alarms:**
- 5XX errors >10 in 5 minutes → PagerDuty/Email
- Service CPU >90% for 10 minutes → Email
- Queue depth >100 messages → Email
- Lambda errors >5 in 5 minutes → Email

**Dashboards:**
- CloudWatch: Service health, metrics
- Container Insights: Task-level details
- ALB Dashboard: Request rates, latencies

---

## Future Enhancements

### 1. Multi-Region Deployment
- Active-active setup in 2+ regions
- Route53 latency-based routing
- Cross-region DynamoDB global tables
- S3 cross-region replication

### 2. Content Delivery Network (CDN)
- CloudFront distribution for videos
- Edge caching (reduces S3 costs)
- Faster video delivery globally

### 3. Advanced Caching
- ElastiCache Redis for sessions
- API response caching
- Video metadata caching

### 4. Observability Improvements
- AWS X-Ray distributed tracing
- Custom CloudWatch metrics
- APM tools (DataDog, New Relic)

### 5. Enhanced Security
- AWS WAF (Web Application Firewall)
- AWS Shield (DDoS protection)
- Secrets Manager for credentials
- VPC Endpoints for AWS services

---

**Last Updated:** October 30, 2025  
**Version:** 1.0  
**Student:** n11817143
