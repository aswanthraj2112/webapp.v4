# Eraser.io Architecture Diagram Prompt

## Video Transcoding Application - AWS Cloud Architecture

Create a clean, professional AWS architecture diagram with the following structure:

### Layout Structure (Top to Bottom):

**TIER 1 - CLIENT LAYER (Top)**
- Global Users (icon: users group)
- Connected via HTTPS to CloudFront and Route53

**TIER 2 - EDGE & DNS LAYER**
- CloudFront CDN (left side) - for static content delivery
- Route53 DNS (right side) - for domain resolution
- Both use AWS service icons

**TIER 3 - PUBLIC-FACING LAYER**
Group these in a box labeled "PUBLIC SUBNET":
- Application Load Balancer (ALB) - center position
- S3 Static Website Bucket - connected to CloudFront
- Label: "Internet-facing resources"

**TIER 4 - COMPUTE LAYER (ECS Fargate)**
Group in a box labeled "PRIVATE SUBNET - ECS CLUSTER":
- Video API Service (ECS Fargate) - left position
  - Label: "2-5 tasks, 0.5 vCPU, 1GB RAM"
  - Port 8080
- Admin Service (ECS Fargate) - center position  
  - Label: "1-3 tasks, 0.25 vCPU, 512MB RAM"
  - Port 8080
- Transcode Worker (ECS Fargate) - right position
  - Label: "0-10 tasks, 1 vCPU, 2GB RAM"
  - Scales to zero
  - No public port

**TIER 5 - DATA & MESSAGING LAYER**
Group in a box labeled "PRIVATE SUBNET - DATA SERVICES":

Left section - "Storage":
- S3 Video Bucket
  - Show folders: raw/, transcoded/720p/, transcoded/1080p/
- DynamoDB Table
  - Label: "Video metadata, user data"

Center section - "Caching & Queue":
- ElastiCache (Memcached)
  - Label: "Port 11211, 300s TTL"
- SQS Main Queue
  - Label: "n11817143-A3, 600s visibility"
- SQS Dead Letter Queue (DLQ)
  - Label: "14-day retention, 3 max retries"

Right section - "Serverless":
- Lambda Function (S3→SQS)
  - Label: "Node.js 18, 256MB, 30s timeout"
  - Triggered by S3 events

**TIER 6 - SUPPORTING SERVICES LAYER**
Group in a box labeled "AWS MANAGED SERVICES":
- Cognito User Pool (left) - Authentication
- Parameter Store (center-left) - Secrets management
- CloudWatch (center-right) - Logging & Monitoring
- ECR (right) - Container Registry (4 repos)

---

### Connections (Draw as Arrows):

**External to Edge:**
1. Users → CloudFront (HTTPS)
2. Users → Route53 (DNS query)

**Edge to Public:**
3. CloudFront ← S3 Static Website (Origin fetch)
4. Route53 → ALB (DNS resolution)

**Public to Compute:**
5. ALB → Video API Service (path: /api/*, HTTPS:443 → HTTP:8080)
6. ALB → Admin Service (path: /api/admin/*, HTTPS:443 → HTTP:8080)

**Compute to Data:**
7. Video API → DynamoDB (read/write metadata)
8. Video API → ElastiCache (cache queries)
9. Video API → S3 Video Bucket (presigned URLs)
10. Video API → SQS Main Queue (send transcode jobs)
11. Admin Service → DynamoDB (read user data)
12. Admin Service → Cognito (list users)
13. Transcode Worker → SQS Main Queue (poll for jobs, long polling 20s)
14. Transcode Worker → S3 Video Bucket (download raw, upload transcoded)

**Event-Driven:**
15. S3 Video Bucket → Lambda (S3 Event: ObjectCreated on raw/* prefix)
16. Lambda → SQS Main Queue (send validated transcode job message)

**Error Handling:**
17. SQS Main Queue → SQS DLQ (failed messages after 3 retries)
18. SQS DLQ → CloudWatch Alarm (alert on message count > 0)

**Authentication & Config:**
19. Video API → Cognito (JWT validation)
20. Admin Service → Cognito (user management)
21. All ECS Services → Parameter Store (fetch secrets at startup)
22. All ECS Services → CloudWatch (send logs)
23. All ECS Services → ECR (pull container images)

**Caching:**
24. Video API → ElastiCache (cache read, on miss → DynamoDB)
25. ElastiCache → DynamoDB (cache miss, fetch data)

---

### Styling Guidelines:

**Colors:**
- Public Subnet box: Light blue background (#E3F2FD)
- Private Subnet - ECS: Light green background (#E8F5E9)
- Private Subnet - Data: Light yellow background (#FFF9C4)
- AWS Managed Services: Light gray background (#F5F5F5)

**Icons:**
- Use official AWS service icons
- Size: Medium (consistent across all services)

**Arrow Types:**
- Solid arrows: Synchronous requests (HTTP, direct calls)
- Dashed arrows: Asynchronous events (S3 Events, SQS polling)
- Dotted arrows: Authentication/Configuration (Cognito, Parameter Store)

**Labels:**
- Service names: Bold, 14pt
- Technical details: Regular, 10pt
- Connection labels: Italic, 9pt (show protocol/path when relevant)

**Grouping:**
- Use rounded rectangles for subnet groups
- Add small lock icons to private subnets
- Add globe icon to public subnet

---

### Key/Legend (Bottom Right):

**Connection Types:**
- Solid line → Synchronous HTTP/HTTPS
- Dashed line ⇢ Asynchronous Events
- Dotted line ··→ Config/Auth

**Network Zones:**
- 🌐 Public Subnet (Internet-accessible)
- 🔒 Private Subnet (Internal only)
- ☁️ AWS Managed Services

**Scaling Behavior:**
- ↕️ Auto-scaling enabled
- ⬇️ Scale-to-zero capable

---

### Additional Notes for AI:

1. Keep vertical spacing consistent between tiers
2. Align services horizontally within each tier
3. Route arrows cleanly - avoid overlapping
4. Group related services visually close together
5. Show bidirectional arrows where applicable (e.g., ALB ↔ ECS)
6. Emphasize the main data flow: User → CloudFront/ALB → ECS → Data Services
7. Make the event-driven path clear: S3 → Lambda → SQS → Worker
8. Highlight the authentication flow: User → Cognito → JWT → Video API

---

## Simplified Version (If Above is Too Complex):

If the diagram becomes cluttered, create two diagrams:

**Diagram 1: Request Flow**
- Focus on: Users → CloudFront/ALB → ECS Services → DynamoDB/S3
- Show only main synchronous paths

**Diagram 2: Event-Driven Processing**
- Focus on: S3 Upload → Lambda → SQS → Transcode Worker → S3
- Show async job processing flow

This keeps each diagram focused and easier to read.
