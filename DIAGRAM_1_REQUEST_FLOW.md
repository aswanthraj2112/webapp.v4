# Diagram 1: Request Flow Architecture
## Video Transcoding App - Synchronous User Request Handling

### Purpose
Show how user requests flow through the application for normal operations (viewing videos, authentication, metadata queries)

---

## Layout Structure (Left to Right Flow)

### LAYER 1 - USERS (Left)
- Icon: User group (3-4 people)
- Label: "Global Users"
- Subtitle: "Web Browsers / Mobile Apps"

### LAYER 2 - EDGE & DNS (Center-Left)
**Top path (Static Content):**
- CloudFront CDN
  - Label: "CDN Distribution"
  - "ID: E3MBOUQVWZEHJQ"
  - Icon: AWS CloudFront

**Bottom path (API Requests):**
- Route53 DNS
  - Label: "DNS Resolution"
  - "Domain: n11817143-videoapp.cab432.com"
  - Icon: AWS Route53

### LAYER 3 - ORIGIN & GATEWAY (Center)
**Top path (Static):**
- S3 Static Website Bucket
  - Label: "Static Website"
  - "React SPA (HTML/CSS/JS)"
  - Icon: AWS S3

**Bottom path (API):**
- Application Load Balancer (ALB)
  - Label: "Load Balancer"
  - "HTTPS:443 → HTTP:8080"
  - "SSL Termination"
  - Show two target groups inside:
    - "Video API TG"
    - "Admin Service TG"
  - Icon: AWS ALB

### LAYER 4 - COMPUTE (Center-Right)

**Group in box labeled "ECS FARGATE CLUSTER (Private Subnet)":**

**Top service:**
- Video API Service
  - Label: "Video API"
  - "Tasks: 2-5 (Auto-scaling)"
  - "0.5 vCPU, 1GB RAM"
  - "Port: 8080"
  - Operations:
    - "• JWT Auth"
    - "• Video Metadata"
    - "• Presigned S3 URLs"
    - "• Submit Transcode Jobs"
  - Icon: AWS ECS (orange)

**Bottom service:**
- Admin Service
  - Label: "Admin Service"
  - "Tasks: 1-3 (Auto-scaling)"
  - "0.25 vCPU, 512MB RAM"
  - "Port: 8080"
  - Operations:
    - "• User Management"
    - "• System Statistics"
    - "• Monitoring Dashboard"
  - Icon: AWS ECS (orange)

### LAYER 5 - DATA SERVICES (Right)

**Group in box labeled "DATA LAYER (Private Subnet)":**

**Top section:**
- ElastiCache (Memcached)
  - Label: "Cache Layer"
  - "Port: 11211"
  - "TTL: 300s"
  - "80% Hit Rate"
  - Icon: AWS ElastiCache

- DynamoDB
  - Label: "Video Metadata DB"
  - "Table: n11817143-VideoApp"
  - "Keys: USER#id, VIDEO#id"
  - Icon: AWS DynamoDB

**Middle section:**
- S3 Video Bucket
  - Label: "Video Storage"
  - "Bucket: n11817143-a2"
  - "Folders: raw/, transcoded/"
  - Icon: AWS S3

**Bottom section:**
- Cognito User Pool
  - Label: "Authentication"
  - "User Pool: ap-southeast-2_CdVnmKfW"
  - "JWT Token Generation"
  - Icon: AWS Cognito

---

## Connections (Draw as Arrows)

### Path 1: Static Content Delivery (Top Flow)
1. User → CloudFront
   - Label: "HTTPS Request"
   - Type: Solid blue arrow
   
2. CloudFront → S3 Static Bucket
   - Label: "Origin Fetch (cache miss)"
   - Type: Dashed orange arrow
   
3. S3 Static Bucket → CloudFront
   - Label: "Return files"
   - Type: Solid green arrow
   
4. CloudFront → User
   - Label: "Cached content"
   - Type: Solid green arrow

### Path 2: API Request - Video Operations (Middle Flow)
5. User → Route53
   - Label: "DNS Query"
   - Type: Solid blue arrow
   
6. Route53 → ALB
   - Label: "Resolve to ALB IP"
   - Type: Dotted gray arrow
   
7. User → ALB
   - Label: "HTTPS:443 /api/*"
   - Type: Solid blue arrow, thick
   
8. ALB → Video API Service
   - Label: "HTTP:8080 (path: /api/*)"
   - Type: Solid orange arrow
   
9. Video API → Cognito
   - Label: "Validate JWT Token"
   - Type: Dotted purple arrow
   
10. Cognito → Video API
    - Label: "Auth result"
    - Type: Dotted purple arrow

### Path 3: Data Access with Caching (Right Flow)
11. Video API → ElastiCache
    - Label: "1. Check cache"
    - Type: Solid teal arrow
    
12. ElastiCache → Video API (Cache Hit)
    - Label: "2a. Cache HIT (80%)"
    - Type: Solid green arrow, thick
    
13. ElastiCache → DynamoDB (Cache Miss)
    - Label: "2b. Cache MISS (20%)"
    - Type: Dashed yellow arrow
    
14. DynamoDB → ElastiCache
    - Label: "3. Return data"
    - Type: Solid yellow arrow
    
15. ElastiCache → Video API
    - Label: "4. Cached data"
    - Type: Solid green arrow

### Path 4: S3 Video Access
16. Video API → S3 Video Bucket
    - Label: "Generate Presigned URL"
    - Type: Dashed blue arrow
    
17. S3 Video Bucket → User (direct)
    - Label: "Direct download (presigned URL)"
    - Type: Solid green arrow, bypasses API

### Path 5: Admin Operations (Bottom Flow)
18. User → ALB
    - Label: "HTTPS:443 /api/admin/*"
    - Type: Solid blue arrow
    
19. ALB → Admin Service
    - Label: "HTTP:8080 (path: /api/admin/*)"
    - Type: Solid red arrow
    
20. Admin Service → Cognito
    - Label: "List users, validate admin JWT"
    - Type: Dotted purple arrow
    
21. Admin Service → DynamoDB
    - Label: "Query statistics"
    - Type: Solid orange arrow

---

## Styling

### Colors by Layer
- **Users:** Gray (#757575)
- **Edge/DNS:** Purple (#9C27B0)
- **Origin/Gateway:** Blue (#2196F3)
- **Compute (ECS):** Light Green background (#E8F5E9), Orange icons
- **Data Services:** Light Yellow background (#FFF9C4)

### Arrow Colors by Type
- **HTTPS/User requests:** Blue (#1976D2)
- **API responses:** Green (#4CAF50)
- **Cache operations:** Teal (#00897B)
- **Authentication:** Purple (#7B1FA2)
- **Cache miss/fallback:** Yellow (#FBC02D)
- **Admin operations:** Red (#D32F2F)

### Box Styles
- ECS Cluster box: Rounded rectangle, light green (#E8F5E9), dashed border
- Data Layer box: Rounded rectangle, light yellow (#FFF9C4), dashed border
- Add 🔒 lock icon to private subnet boxes

### Arrow Styles
- Solid arrows: Direct synchronous calls
- Dashed arrows: Conditional/on-miss operations
- Dotted arrows: Authentication/authorization checks
- Arrow thickness: Thicker for high-traffic paths

---

## Annotations (Add as Text Boxes)

### Performance Stats
Position near ElastiCache:
```
⚡ Performance Optimization
• Cache Hit: 80% (20ms response)
• Cache Miss: 20% (200ms response)
• 10x faster with caching
```

### Load Balancer Rules
Position near ALB:
```
📋 Routing Rules
• /api/admin/* → Admin Service
• /api/* → Video API
• Health check: /healthz every 30s
```

### Auto-Scaling
Position near ECS services:
```
↕️ Auto-Scaling Triggers
• CPU > 70% → Scale UP
• CPU < 50% → Scale DOWN
• Cooldown: 5 minutes
```

---

## Legend (Bottom Right)

```
Connection Types:
━━━ Synchronous request/response
┄┄┄ Conditional (cache miss, etc.)
···· Authentication/Authorization

Performance:
━━━ High traffic path (thick line)
─── Normal traffic (thin line)

Network Zones:
🌐 Public Internet
🔒 Private Subnet (VPC)
```

---

## Key User Flows to Highlight

### Flow A: View Video List (Most Common)
Highlight in **blue**:
User → CloudFront → React App (Frontend renders)
User → ALB → Video API → ElastiCache (hit) → Return JSON

### Flow B: Watch Video (Streaming)
Highlight in **green**:
User → ALB → Video API → S3 (generate presigned URL)
User → S3 directly (stream video)

### Flow C: Admin Dashboard
Highlight in **red**:
Admin → ALB → Admin Service → Cognito + DynamoDB → Dashboard data

---

## Title and Description

**Main Title:** "User Request Flow Architecture"

**Subtitle:** "Synchronous HTTP request handling for frontend delivery and API operations"

**Description box (top):**
```
This diagram shows the path of user HTTP requests through the application.
Static content (HTML/JS/CSS) is served via CloudFront CDN from S3.
API requests are routed through ALB to ECS Fargate microservices.
Caching with ElastiCache reduces database load by 80%.
```

---

## Simplified Message
This diagram answers: **"What happens when a user opens the app and views a video?"**

Keep it focused on the **request-response cycle**, not background job processing.
