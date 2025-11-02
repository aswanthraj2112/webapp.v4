# Video Transcoding Application - Architecture Diagram (Text Format)

## Network Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                   INTERNET                                           │
│                          (Global Users - Australia & Worldwide)                      │
└────────────────────────────┬──────────────────────────┬─────────────────────────────┘
                             │ HTTPS                    │ HTTPS/DNS
                             │                          │
                             ▼                          ▼
              ┌──────────────────────────┐   ┌──────────────────────────┐
              │     CloudFront CDN       │   │      Route53 DNS         │
              │   (Edge Distribution)    │   │   (Domain Resolution)    │
              │  Distribution: E3MBOUQ   │   │  Domain: cab432.com      │
              └────────────┬─────────────┘   └─────────────┬────────────┘
                           │ Origin Fetch                   │ A Record
                           │                                │
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│                            AWS CLOUD (ap-southeast-2)                               │
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│
│  ┌──────────────────────────────────────────────────────────────────────────────┐
│  │                         PUBLIC SUBNET (Internet Gateway)                      │
│  │                                                                               │
│  │   ┌────────────────┐              ┌─────────────────────────────────────┐    │
│  │   │  S3 Bucket     │              │  Application Load Balancer (ALB)    │    │
│  │   │  (Static Web)  │              │  HTTPS:443 (SSL Termination)       │    │
│  │   │                │              │  DNS: n11817143-app-alb-*.com      │    │
│  │   │  React SPA     │◄─────────────│                                     │    │
│  │   │  HTML/CSS/JS   │  OAC Access  │  Routing Rules:                    │    │
│  │   └────────────────┘              │  • /api/admin/* → Admin Service     │    │
│  │                                    │  • /api/*       → Video API         │    │
│  │                                    │                                     │    │
│  │                                    │  Health Checks: /healthz (3 checks) │    │
│  │                                    └─────────┬───────────────────────────┘    │
│  └──────────────────────────────────────────────┼──────────────────────────────┘
│                                                  │ HTTP:8080
│                                                  │
│  ┌──────────────────────────────────────────────┼──────────────────────────────┐
│  │                    PRIVATE SUBNET - ECS FARGATE CLUSTER                      │
│  │                         (n11817143-app-cluster)                              │
│  │                                                                               │
│  │   ┌─────────────────┐    ┌──────────────────┐    ┌────────────────────┐    │
│  │   │   Video API     │    │  Admin Service   │    │  Transcode Worker  │    │
│  │   │   Service       │    │                  │    │                    │    │
│  │   │                 │    │                  │    │                    │    │
│  │   │  Tasks: 2-5     │    │  Tasks: 1-3      │    │  Tasks: 0-10       │    │
│  │   │  vCPU: 0.5      │    │  vCPU: 0.25      │    │  vCPU: 1.0         │    │
│  │   │  RAM: 1GB       │    │  RAM: 512MB      │    │  RAM: 2GB          │    │
│  │   │  Port: 8080     │    │  Port: 8080      │    │  (No ALB)          │    │
│  │   │                 │    │                  │    │  Scale-to-Zero ✓   │    │
│  │   │  • Auth (JWT)   │    │  • User Mgmt     │    │  • FFmpeg          │    │
│  │   │  • Metadata     │    │  • Statistics    │    │  • Video Transcode │    │
│  │   │  • Presigned S3 │    │  • Dashboard     │    │  • SQS Polling     │    │
│  │   │  • Submit Jobs  │    │  • Admin Ops     │    │  • S3 Upload/DL    │    │
│  │   └────┬────────────┘    └────┬─────────────┘    └──────┬─────────────┘    │
│  └────────┼──────────────────────┼────────────────────────┼──────────────────┘
│           │                      │                        │
│           │                      │                        │
│  ┌────────┼──────────────────────┼────────────────────────┼──────────────────┐
│  │        │   PRIVATE SUBNET - DATA & MESSAGING LAYER    │                  │
│  │        │                      │                        │                  │
│  │        ▼                      ▼                        ▼                  │
│  │  ┌──────────────┐   ┌──────────────┐         ┌──────────────────┐      │
│  │  │  DynamoDB    │   │ ElastiCache  │         │   Amazon SQS     │      │
│  │  │              │   │ (Memcached)  │         │                  │      │
│  │  │  Table:      │   │              │         │  Main Queue:     │      │
│  │  │  n11817143-  │   │  Endpoint:   │         │  n11817143-A3    │      │
│  │  │  VideoApp    │   │  11211       │         │                  │      │
│  │  │              │   │  TTL: 300s   │         │  • Visibility:   │      │
│  │  │  Keys:       │   │              │         │    600s          │      │
│  │  │  • USER#id   │   │  Cache:      │         │  • Long Poll:    │      │
│  │  │  • VIDEO#id  │   │  • Metadata  │         │    20s           │      │
│  │  │              │   │  • Hit: 80%  │         │                  │      │
│  │  │  Data:       │   └──────────────┘         │  DLQ:            │      │
│  │  │  • Video     │            ▲               │  n11817143-A3-dlq│      │
│  │  │    metadata  │            │               │  • 14d retention │      │
│  │  │  • User info │            │ Cache         │  • 3 max retries │      │
│  │  │  • Status    │            │ Miss          └────────┬─────────┘      │
│  │  └──────┬───────┘            │                        │                │
│  │         │                    │                        │ Poll Jobs      │
│  │         │ Read/Write         │                        │ (Worker)       │
│  │         │                    │                        │                │
│  │         ▼                    ▼                        ▼                │
│  │  ┌──────────────────────────────────────────────────────────────┐    │
│  │  │                    Amazon S3 Video Storage                    │    │
│  │  │                 Bucket: n11817143-a2                          │    │
│  │  │                                                               │    │
│  │  │  Structure:                                                   │    │
│  │  │  • raw/                   (Raw uploaded videos)               │    │
│  │  │    └─ {userId}/{videoId}.{ext}                               │    │
│  │  │                                                               │    │
│  │  │  • transcoded/            (Converted videos)                 │    │
│  │  │    ├─ 720p/{userId}/{videoId}_720p.mp4                       │    │
│  │  │    └─ 1080p/{userId}/{videoId}_1080p.mp4                     │    │
│  │  │                                                               │    │
│  │  │  Features: Versioning ✓, Encryption (SSE-S3) ✓              │    │
│  │  └───────────────────────┬──────────────────────────────────────┘    │
│  │                          │ S3 Event (ObjectCreated:raw/*)            │
│  │                          │                                            │
│  │                          ▼                                            │
│  │                  ┌──────────────────┐                                │
│  │                  │  Lambda Function │                                │
│  │                  │  (S3→SQS Bridge) │                                │
│  │                  │                  │                                │
│  │                  │  Runtime:        │                                │
│  │                  │  • Container     │                                │
│  │                  │  • Node.js 18    │                                │
│  │                  │  • 256MB RAM     │                                │
│  │                  │  • 30s timeout   │                                │
│  │                  │                  │                                │
│  │                  │  Actions:        │                                │
│  │                  │  • Validate ext  │                                │
│  │                  │  • Extract meta  │                                │
│  │                  │  • Send to SQS   │                                │
│  │                  └────────┬─────────┘                                │
│  │                           │ SendMessage                               │
│  │                           │                                           │
│  └───────────────────────────┼───────────────────────────────────────┘
│                               │
│  ┌────────────────────────────┼───────────────────────────────────────┐
│  │              AWS MANAGED SERVICES LAYER                            │
│  │                            │                                        │
│  │   ┌──────────────┐   ┌────┴──────────┐   ┌────────────────────┐  │
│  │   │   Cognito    │   │  Parameter    │   │    CloudWatch      │  │
│  │   │  User Pool   │   │     Store     │   │                    │  │
│  │   │              │   │               │   │  Logs:             │  │
│  │   │  ap-south-2  │   │  Secrets:     │   │  • /ecs/n11817143  │  │
│  │   │  _CdVnmKfW   │   │  • JWT Keys   │   │  • 7d retention    │  │
│  │   │              │   │  • API Keys   │   │                    │  │
│  │   │  Auth:       │   │  • Encrypted  │   │  Metrics:          │  │
│  │   │  • Sign Up   │   │    (KMS)      │   │  • CPU/Memory      │  │
│  │   │  • Sign In   │   │               │   │  • Queue Depth     │  │
│  │   │  • JWT Gen   │   │  Access:      │   │  • Cache Hits      │  │
│  │   │  • MFA Ready │   │  • Task Role  │   │                    │  │
│  │   └──────────────┘   │    Based      │   │  Alarms:           │  │
│  │                      └───────────────┘   │  • DLQ Messages    │  │
│  │                                          │  • High CPU        │  │
│  │   ┌──────────────────────────────────┐  │  • Unhealthy Tgt   │  │
│  │   │   ECR (Container Registry)       │  └────────────────────┘  │
│  │   │                                  │                          │
│  │   │  Repositories:                   │                          │
│  │   │  • video-api                     │                          │
│  │   │  • admin-service                 │                          │
│  │   │  • transcode-worker              │                          │
│  │   │  • s3-to-sqs-lambda              │                          │
│  │   │                                  │                          │
│  │   │  Features:                       │                          │
│  │   │  • Image Scanning ✓              │                          │
│  │   │  • Lifecycle Policy (10 images)  │                          │
│  │   └──────────────────────────────────┘                          │
│  └─────────────────────────────────────────────────────────────────┘
│
└─────────────────────────────────────────────────────────────────────────

════════════════════════════════════════════════════════════════════════════
                              LEGEND / KEY
════════════════════════════════════════════════════════════════════════════

Connection Types:
  ──►   Synchronous HTTP/HTTPS Request
  ═══►  Asynchronous Event / Message Queue
  ···►  Configuration / Authentication
  ◄──►  Bidirectional Communication

Network Zones:
  🌐  PUBLIC SUBNET     - Internet-accessible (ALB, S3 Static)
  🔒  PRIVATE SUBNET    - Internal only (ECS, DynamoDB, SQS, S3 Videos)
  ☁️   MANAGED SERVICES - AWS-managed (Cognito, CloudWatch, ECR)

Scaling Indicators:
  ↕️  Auto-scaling enabled (CPU/Memory based)
  🔽  Scale-to-zero capable (Queue depth based)
  
Security:
  🔐  Encryption at rest
  🔒  Encryption in transit (TLS/SSL)
  🔑  IAM Role-based access

════════════════════════════════════════════════════════════════════════════
                           DATA FLOW PATHS
════════════════════════════════════════════════════════════════════════════

Path 1: User Access Frontend (Static Content)
  User → CloudFront → S3 Static Website → React App → User

Path 2: API Request (Video Operations)
  User → Route53 → ALB → Video API (ECS) → DynamoDB/S3 → Response

Path 3: Admin Operations
  User → Route53 → ALB → Admin Service (ECS) → Cognito/DynamoDB → Response

Path 4: Video Upload & Transcode Job Creation
  User → Video API → S3 (raw/) → Lambda → SQS Queue

Path 5: Video Transcoding (Async)
  SQS Queue → Transcode Worker (ECS) → S3 (download raw) 
  → FFmpeg Processing → S3 (upload transcoded/) → Update DynamoDB

Path 6: Caching Flow
  Video API → ElastiCache (check) → Cache Hit? Yes: Return
                                  → Cache Miss? → DynamoDB → Cache Update

Path 7: Authentication
  User → Video API → Cognito (JWT Validation) → Allow/Deny

Path 8: Error Handling
  SQS Main Queue → Failed (3x) → SQS DLQ → CloudWatch Alarm → Admin Alert

════════════════════════════════════════════════════════════════════════════
                        KEY ARCHITECTURAL DECISIONS
════════════════════════════════════════════════════════════════════════════

1. Microservices Separation
   • Video API: Public-facing, lightweight (0.5 vCPU)
   • Admin Service: Isolated admin ops (0.25 vCPU)
   • Transcode Worker: CPU-intensive, scales independently (1 vCPU)

2. Communication Patterns
   • Synchronous: ALB → ECS (HTTP REST APIs)
   • Asynchronous: S3 → Lambda → SQS → Worker (Event-driven)
   • Caching: ElastiCache → 80% reduction in DB reads

3. Scaling Strategy
   • Video API: 2-5 tasks (CPU/Memory target tracking)
   • Admin Service: 1-3 tasks (CPU/Memory target tracking)
   • Worker: 0-10 tasks (SQS queue depth + scale-to-zero)

4. Security Layers
   • CloudFront: DDoS protection, edge caching
   • ALB: SSL termination, path-based routing, health checks
   • Security Groups: Network-level firewall
   • IAM Roles: Resource-level permissions
   • Cognito: User authentication + JWT tokens

5. Cost Optimization
   • Scale-to-zero for workers: Saves ~$1,315/month
   • Lambda for events: $0.00 (free tier) vs. $45/month ECS
   • ElastiCache: Reduces DynamoDB reads (cost + latency)

════════════════════════════════════════════════════════════════════════════
