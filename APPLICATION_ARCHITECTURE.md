# Application Architecture

## Architecture Diagram and Service Overview

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          GLOBAL USERS                                    │
│                     (Australia & Worldwide)                              │
└──────────┬────────────────────────────────────┬─────────────────────────┘
           │ HTTPS                               │ HTTPS
           │                                     │
           ▼                                     ▼
    ┌──────────────┐                     ┌──────────────────┐
    │  CloudFront  │                     │   Route 53 DNS   │
    │  CDN         │                     │   cab432.com     │
    │  (Frontend)  │                     │                  │
    │  Edge Cache  │                     │  A Record:       │
    └──────┬───────┘                     │  n11817143-      │
           │                             │  videoapp...     │
           ▼                             └────────┬─────────┘
    ┌──────────────┐                              │
    │  S3 Bucket   │                              ▼
    │  (Static     │                     ┌────────────────────┐
    │   Website)   │                     │  Application       │
    │  React SPA   │                     │  Load Balancer     │
    └──────────────┘                     │  (ALB)             │
                                         │  HTTPS:443         │
                                         │                    │
                                         │  Path Routing:     │
                                         │  /api/admin/*  →   │
                                         │  /api/*        →   │
                                         └────────┬───────────┘
                                                  │
                 ┌────────────────────────────────┼─────────────────┐
                 │                                │                 │
                 ▼                                ▼                 ▼
        ┌────────────────┐             ┌─────────────────┐  ┌──────────────┐
        │   Video API    │             │  Admin Service  │  │  Transcode   │
        │   Service      │             │                 │  │  Worker      │
        │                │             │                 │  │              │
        │  ECS Fargate   │             │  ECS Fargate    │  │  ECS Fargate │
        │  Tasks: 2-5    │             │  Tasks: 1-3     │  │  Tasks: 0-10 │
        │  CPU: 512      │             │  CPU: 256       │  │  CPU: 1024   │
        │  Memory: 1GB   │             │  Memory: 512MB  │  │  Memory: 2GB │
        │  Port: 8080    │             │  Port: 8080     │  │  (No Port)   │
        └────────┬───────┘             └────────┬────────┘  └──────┬───────┘
                 │                              │                  │
                 │                              │                  │
    ┌────────────┴──────────────────────────────┴──────────────────┴─────────┐
    │                          AWS CLOUD SERVICES                             │
    │                                                                          │
    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
    │  │ ElastiCache  │  │  Parameter   │  │   Cognito    │  │ CloudWatch │ │
    │  │ (Memcached)  │  │   Store      │  │  User Pool   │  │ Logs &     │ │
    │  │              │  │              │  │              │  │ Metrics    │ │
    │  │ Cache Layer  │  │ JWT Secrets  │  │ Auth + JWT   │  │            │ │
    │  │ Port: 11211  │  │ (Encrypted)  │  │ Tokens       │  │ Monitoring │ │
    │  │ TTL: 300s    │  │              │  │              │  │ & Alarms   │ │
    │  └──────┬───────┘  └──────────────┘  └──────────────┘  └────────────┘ │
    │         │                                                               │
    │         ▼                                                               │
    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────────┐ │
    │  │  DynamoDB    │  │  Amazon S3   │  │      Amazon SQS              │ │
    │  │  (Metadata)  │  │  (Videos)    │  │                              │ │
    │  │              │  │              │  │  Main Queue: n11817143-A3    │ │
    │  │  Table:      │  │  Bucket:     │  │  - Visibility: 600s          │ │
    │  │  n11817143-  │  │  n11817143-  │  │  - Long Polling: 20s         │ │
    │  │  VideoApp    │  │  a2          │  │                              │ │
    │  │              │  │              │  │  Dead Letter Queue (DLQ):    │ │
    │  │  Stores:     │  │  Structure:  │  │  n11817143-A3-dlq            │ │
    │  │  - Video     │  │  - raw/      │  │  - Max Retries: 3            │ │
    │  │    metadata  │  │  - transcoded│  │  - Retention: 14 days        │ │
    │  │  - User info │  │    /720p/    │  │  - CloudWatch Alarm on msg   │ │
    │  │  - Status    │  │    /1080p/   │  │                              │ │
    │  └──────────────┘  └──────┬───────┘  └───────┬──────────────────────┘ │
    │                           │                   ▲                        │
    │                           │ S3 Event          │ Poll Jobs              │
    │                           │ (ObjectCreated)   │ (Long Polling)         │
    │                           │ Prefix: raw/      │                        │
    │                           ▼                   │                        │
    │                    ┌──────────────┐           │                        │
    │                    │   Lambda     │───────────┘                        │
    │                    │  (S3→SQS)    │  Send transcode job                │
    │                    │              │  to SQS queue                      │
    │                    │  Runtime:    │                                    │
    │                    │  Container   │                                    │
    │                    │  Node.js 18  │                                    │
    │                    │  Memory:256MB│                                    │
    │                    │  Timeout:30s │                                    │
    │                    └──────────────┘                                    │
    │                                                                         │
    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │
    │  │    ECR       │  │ Auto Scaling │  │   Security   │                │
    │  │ (Container   │  │   Policies   │  │   Groups     │                │
    │  │  Registry)   │  │              │  │              │                │
    │  │              │  │ CPU: 70%     │  │ CAB432SG     │                │
    │  │ 4 Repos:     │  │ Memory: 80%  │  │ ALB SG       │                │
    │  │ - video-api  │  │ Cooldown:5min│  │ Memcached SG │                │
    │  │ - admin      │  │              │  │              │                │
    │  │ - worker     │  │ Scale:       │  │ HTTPS Only   │                │
    │  │ - lambda     │  │ Up: +1 task  │  │ Port 8080    │                │
    │  │              │  │ Down: -1 task│  │              │                │
    │  └──────────────┘  └──────────────┘  └──────────────┘                │
    │                                                                         │
    └─────────────────────────────────────────────────────────────────────────┘

    Legend:
    ──► Data flow / Request path
    ═══ Container communication
    ┄┄► Event trigger
    
    Key: 3 Microservices + 1 Lambda + ElastiCache + Load Balancer + Auto-Scaling
```

---

## Services Overview

Here's a breakdown of each AWS service and what it does in my application:

### **Frontend & Content Delivery**
- **CloudFront CDN**: Caches and serves the React frontend globally with low latency. Users anywhere in the world get the app loaded fast from the nearest edge location instead of fetching from Sydney every time.

- **S3 (Static Website)**: Hosts all the React build files (HTML, CSS, JavaScript). It's configured as a static website and only CloudFront can access it (using Origin Access Control), so it's secure and cost-effective.

- **Route53 DNS**: Maps my custom domain (`n11817143-videoapp.cab432.com`) to the load balancer and CloudFront distribution. Basically makes the app accessible via a proper URL instead of ugly AWS DNS names.

### **Backend Services (Microservices on ECS Fargate)**

- **Video API Service**: This is the main workhorse that handles everything users do—logging in, uploading videos, requesting conversions, listing their library, and streaming videos. It talks to Cognito for authentication, DynamoDB for metadata storage, S3 for video files, ElastiCache for performance, and SQS to queue up conversion jobs. Runs 2-5 containers depending on traffic.

- **Admin Service**: Separate service just for admin operations like viewing all users, getting system stats, and managing the platform. I isolated this from the Video API so admin operations don't slow down regular user requests. Runs 1-3 containers since admin traffic is way lower.

- **Transcode Worker**: The heavy lifter that does the actual FFmpeg video conversion work. It polls the SQS queue for jobs, downloads the raw video from S3, transcodes it to 720p or 1080p (based on user selection), uploads the converted file back to S3, and updates the database. The cool part? It can scale to zero when there's no work and spin up to 10 workers when there's a conversion backlog. This saves a ton of money.

### **Load Distribution & Routing**

- **Application Load Balancer (ALB)**: Sits in front of the Video API and Admin Service, distributing incoming HTTPS requests across multiple containers. Uses path-based routing—requests to `/api/admin/*` go to Admin Service, everything else goes to Video API. Also handles SSL termination (so my backend doesn't have to deal with certificates) and automatically removes unhealthy containers from rotation.

### **Storage & Data**

- **S3 (Video Storage)**: Stores all the video files—both raw uploads (in the `raw/` folder) and converted videos (in `transcoded/720p/` and `transcoded/1080p/`). Users upload directly to S3 using presigned URLs (bypassing the API for better performance), and videos are streamed from S3 via presigned URLs too. Versioning is enabled so nothing gets accidentally deleted.

- **DynamoDB**: NoSQL database that stores all the video metadata (title, description, status, file paths, user info, upload dates, etc.). Uses a single-table design with partition key `USER#username` and sort key `VIDEO#videoId`. On-demand capacity mode means I only pay for what I use. ElastiCache sits in front of it to reduce read costs.

- **ElastiCache (Memcached)**: Caching layer that speeds up the Video API by caching frequently accessed video metadata and user data. When you request video details, it checks the cache first (super fast, ~20ms) before hitting DynamoDB (~200ms). Cache entries expire after 5 minutes. This reduces DynamoDB costs by about 80% and makes the API feel way snappier.

### **Job Queue & Event Processing**

- **SQS (Main Queue)**: Holds all the video conversion jobs waiting to be processed. When a user clicks "convert to 720p", the Video API sends a message to this queue with the video details. Transcode Workers poll this queue (using long polling to reduce API calls) and grab jobs to process. Visibility timeout is 10 minutes, so if a worker crashes mid-job, the message reappears for another worker to retry.

- **SQS Dead Letter Queue (DLQ)**: Safety net for failed conversion jobs. If a video fails to convert three times (maybe the file is corrupted or incompatible), the message gets moved here instead of being retried forever. I have a CloudWatch alarm that alerts me when messages land in the DLQ so I can investigate manually. Messages are kept for 14 days.

- **Lambda Function (S3→SQS)**: Serverless function that automatically triggers when a video file is uploaded to the `raw/` folder in S3. It validates the file is a video (checks extension), extracts the userId and videoId from the file path, and sends a conversion job message to SQS. This happens instantly (sub-second) and costs almost nothing since it only runs when files are uploaded. Using Lambda here instead of a full container makes total sense—it's event-driven, stateless, and finishes in under 1 second.

### **Authentication & Secrets**

- **AWS Cognito**: Manages all user authentication—sign up, sign in, password resets, token generation. Users get JWT tokens (ID token, access token, refresh token) after logging in. The Video API and Admin Service verify these tokens on every request to make sure the user is legit. Supports MFA (TOTP) and email-based account recovery.

- **Parameter Store**: Securely stores sensitive configuration like JWT secrets. The secrets are encrypted with AWS KMS and injected into ECS containers at runtime (not as environment variables visible in the console, but as actual secrets). This way API keys and secrets never appear in my code or Docker images.

### **Container Infrastructure**

- **ECS Fargate**: Serverless container platform that runs all three microservices. I define what CPU and memory each service needs, and AWS handles provisioning servers, patching, security, networking—all of it. No SSH access, no server management. Just deploy containers and they run.

- **ECR (Elastic Container Registry)**: Private Docker registry where I store all my container images. Four repositories: `video-api`, `admin-service`, `transcode-worker`, and `s3-to-sqs-lambda`. Images are scanned for vulnerabilities on push, and I keep the last 10 versions (auto-cleanup for old images).

### **Monitoring & Observability**

- **CloudWatch Logs**: Every container sends its logs here. All stdout/stderr from the microservices goes to `/ecs/n11817143-app` log group with 7-day retention. Super helpful for debugging issues—I can see exactly what happened when a conversion fails or a user gets an error.

- **CloudWatch Metrics**: Tracks CPU, memory, request count, response times, queue depth, cache hit rates—basically everything. The auto-scaling policies use these metrics to decide when to add or remove containers.

- **CloudWatch Alarms**: Alerts me when something goes wrong. I've got alarms for high CPU (>80%), high memory (>80%), DLQ messages (>0), and unhealthy ALB targets. Alarms can trigger SNS notifications (email/SMS) or auto-remediation actions.

### **Networking & Security**

- **VPC**: All my ECS containers and ElastiCache run inside a Virtual Private Cloud with public and private subnets across multiple availability zones (ap-southeast-2a and 2b for high availability). NAT Gateway is disabled to save costs—containers in public subnets use an Internet Gateway instead.

- **Security Groups**: Virtual firewalls controlling traffic. The ALB security group allows HTTPS (443) from anywhere. The ECS security group allows traffic from the ALB on port 8080. The Memcached security group only allows connections from ECS tasks on port 11211. Nothing else gets through.

- **ACM (Certificate Manager)**: Provides free SSL/TLS certificates for my custom domains. One certificate for the ALB (`n11817143-videoapp.cab432.com`) and one for CloudFront (`app.n11817143-videoapp.cab432.com`). Auto-renews before expiration so I never have to worry about expired HTTPS certificates.

---

## Architecture Justification

Alright, let me walk you through why I built the architecture this way instead of other options I considered.

### **Division into Microservices**

**Why three separate services instead of one monolithic app?**

The core reasoning comes down to **resource requirements** and **scaling patterns**. Let me explain each service:

1. **Video API (0.5 vCPU, 1GB RAM)**: Handles user requests like login, list videos, get video details, generate presigned URLs. These are all **lightweight, stateless operations** that complete in milliseconds. The bottleneck here is request volume, not CPU. When 100 users are browsing their video libraries simultaneously, I need more API containers to handle the concurrent requests, but each request uses minimal resources.

2. **Transcode Worker (1 vCPU, 2GB RAM)**: Does heavy **CPU-intensive FFmpeg transcoding**. Converting a 10-minute 1080p video to 720p can take 3-5 minutes and **maxes out a CPU core** during that time. If I bundled this into the Video API, transcoding jobs would **block API requests** and make the entire app unresponsive. Users would see timeouts when trying to list videos because all the CPU is busy transcoding someone else's video. Terrible user experience.

3. **Admin Service (0.25 vCPU, 512MB RAM)**: Handles privileged operations like viewing all users and system stats. Admin traffic is **infrequent** (maybe a few requests per hour) and doesn't need to scale. By isolating this, I prevent admin operations from competing with user traffic, and I can lock it down with tighter security rules without affecting the main API.

**Alternative I considered**: Putting everything in one service with multiple container instances. Why this doesn't work:
- The Video API would need 1+ vCPU to handle occasional transcode jobs, **wasting 0.5 vCPU per container** 99% of the time when users are just browsing (costly!)
- Transcoding would still block API requests on that specific container, causing random slowness
- I'd have to run many containers just to absorb transcode work, even when API traffic is low
- No independent scaling—API load and transcode load don't correlate at all

**The microservices approach gives me**:
- **Independent scaling**: API scales with user count (HTTP requests), Worker scales with queue depth (conversion jobs)
- **Resource efficiency**: API uses small containers, Worker uses larger containers only when needed (scales to zero!)
- **Fault isolation**: If FFmpeg crashes processing a corrupted video, only that Worker container dies—API keeps serving users just fine
- **Security isolation**: Admin operations are in a separate service with stricter IAM permissions

---

### **Choice of Compute (ECS Fargate vs. EC2 vs. Lambda)**

**Why ECS Fargate for all three microservices?**

Here's how I evaluated each option:

**For Video API and Admin Service:**

| Factor | EC2 | ECS Fargate | Lambda |
|--------|-----|-------------|--------|
| **Server management** | Must patch, secure, monitor OS | None—AWS handles it | None |
| **Scaling** | Manual or ASG (slow) | Automatic, task-level | Automatic, instant |
| **Cost (low traffic)** | Pay 24/7 even when idle | Pay per second of container uptime | Pay per request |
| **Cold starts** | N/A | ~10s (acceptable for API) | 1-5s (noticeable!) |
| **Request duration** | Unlimited | Unlimited | 15 min max |
| **Containerized** | Yes (requires Docker setup) | Yes (native) | Limited (custom runtime) |

**Why NOT Lambda for the APIs:**
- **Cold starts would hurt user experience**. If no requests come for a few minutes, Lambda goes cold. The next user waits 2-5 seconds for the function to initialize, download libraries, connect to DynamoDB/Cognito, etc. That's an eternity when someone just wants to see their video list. With ECS, containers stay warm and respond in ~50ms consistently.
- **State and connections**: Lambda reinitializes database connections, cache connections, and Cognito JWK keys on every cold start. ECS containers keep these connections open, making subsequent requests faster and cheaper (fewer DynamoDB connection setups).
- **Cost at scale**: With 500,000 API requests per month (Assignment 3 estimate), Lambda costs ~$50/month. ECS Fargate costs ~$1,314/month for 2 containers running 24/7 (Video API: 2 tasks × 0.5 vCPU × 1GB = $1,314.42/month). However, Fargate provides consistent performance with no cold starts, which is critical for user-facing APIs. Lambda only wins if traffic is super sporadic (it's not—video streaming apps have consistent baseline traffic).

**Why NOT EC2:**
- **Undifferentiated heavy lifting**: I'd spend hours managing OS updates, security patches, Docker daemon configs, monitoring, networking, load balancer integration, auto-scaling group setup, etc. None of that adds value to my actual application. Fargate abstracts all of it away.
- **Scaling complexity**: Auto Scaling Groups take 3-5 minutes to launch new EC2 instances. Fargate tasks spin up in 30-60 seconds. When traffic spikes, I want fast response.
- **Cost at small scale**: For 2-5 containers, EC2 instances would need to be over-provisioned (can't run 0.5 vCPU on EC2—you pay for whole cores). Fargate lets me specify exactly 512 CPU units (0.5 vCPU) and 1GB RAM. More cost-efficient for small workloads.

**Why Fargate WINS for APIs**:
✅ No cold starts (containers stay warm)
✅ Fast scaling (30-60 seconds)
✅ Zero server management
✅ Task-level IAM roles (better security)
✅ Pay per second (cost-efficient)

---

**For Transcode Worker:**

| Factor | EC2 | ECS Fargate | Lambda |
|--------|-----|-------------|--------|
| **Max duration** | Unlimited | Unlimited | 15 min (TOO SHORT!) |
| **CPU needs** | High (1+ vCPU) | High (1+ vCPU) | Limited |
| **Scale to zero** | No (pay 24/7) | Yes! (0-10 tasks) | Yes |
| **FFmpeg support** | Full control | Full control (Dockerized) | Requires custom layers |
| **Job processing** | SQS polling | SQS polling | SQS event trigger |

**Why NOT Lambda for transcoding:**
- **15-minute timeout is a dealbreaker**. A 10-minute 1080p video can take 5-10 minutes to transcode. A 30-minute video would fail every time. Users would be frustrated with failed conversions. Lambda is fundamentally not designed for long-running CPU-intensive work.
- **Memory/CPU limits**: Lambda maxes out at 10GB RAM and ~6 vCPUs (not guaranteed). For serious transcoding, I want dedicated CPU allocation, not shared/throttled compute.
- **Complexity**: FFmpeg needs to be compiled and packaged as a Lambda layer (pain to maintain). With Docker, I just `apt-get install ffmpeg` in my Dockerfile. Done.

**Why NOT EC2:**
- **Idle cost is killer**. Conversion jobs are sporadic—maybe 100 per month in Assignment 3 scenario. That's an average of **3 jobs per day**. An EC2 instance (even t3.medium) costs ~$30/month running 24/7 but is **idle 90% of the time**. With Fargate scale-to-zero, I pay $0 when there are no jobs and only spin up workers when the queue has messages. A single Transcode Worker task (1 vCPU × 2GB) costs $1,314.63/month running 24/7, but with scale-to-zero capability, actual cost is only ~$131/month (10% utilization). **Saves ~$1,183/month** compared to always-on deployment.

**Why Fargate WINS for Worker**:
✅ **Can scale to zero** (huge cost savings)
✅ No 15-minute timeout (handles long conversions)
✅ Dedicated CPU for FFmpeg
✅ Dockerized environment (easy FFmpeg setup)
✅ SQS long polling reduces costs

---

**For Lambda (S3→SQS function):**

This is the **one place where Lambda is perfect**:

- **Event-driven**: Triggered by S3 ObjectCreated events (only runs when files are uploaded)
- **Stateless**: Takes an S3 event, validates the file, creates an SQS message. No database connections or state needed.
- **Fast execution**: Completes in <1 second (well under the 15-min limit)
- **Cost-effective**: 100 uploads/month = 100 Lambda invocations = **$0.00/month** (within free tier of 1 million requests/month). Running a dedicated ECS container 24/7 just to listen for S3 events would cost **$328.66/month** (Admin Service equivalent: 0.25 vCPU × 0.5GB). Lambda saves $328.66/month here.
- **No cold start impact**: Since this runs asynchronously (not in the user's request path), a 1-second cold start doesn't matter. The user has already gotten the S3 presigned URL response and is uploading—they don't wait for Lambda.

**Lambda WINS for event-driven, short tasks**:
✅ Serverless (no containers to manage)
✅ Only pay for execution time (<1s)
✅ Scales automatically with S3 events
✅ Perfect fit for the workload

---

### **Communication Mechanisms and Load Distribution**

I use **three different patterns** for different types of communication:

#### **1. Application Load Balancer (ALB) for synchronous HTTP requests**

**Why ALB instead of API Gateway?**

API Gateway is great for serverless (Lambda) backends, but for containerized services, ALB is way better:

- **Path-based routing**: ALB can route `/api/admin/*` to Admin Service and `/api/*` to Video API using a single load balancer. API Gateway would require separate stages/resources and more complex configuration.
- **WebSocket support**: If I wanted to add real-time status updates (like "your video is 50% transcoded"), ALB supports WebSockets. API Gateway WebSockets are harder to integrate with containers.
- **Cost**: ALB costs ~$76.80/month ($24.53 fixed + $52.27 LCU charges). API Gateway charges **$3.50 per million requests** plus $0.09/GB data transfer. At 500,000 requests/month, API Gateway would cost ~$1.75 for requests + data transfer fees = ~$25-30/month total. However, ALB provides better integration with ECS, WebSocket support, and simpler path-based routing, making the extra cost worthwhile for containerized microservices.
- **Health checks**: ALB automatically removes unhealthy containers from the target group. If a container crashes or fails health checks, ALB stops sending it traffic within 30 seconds. Users never see errors.
- **SSL termination**: ALB handles HTTPS with ACM certificates. My backend containers only need to listen on plain HTTP (port 8080), simplifying the code.
- **Native ECS integration**: ALB target groups directly integrate with ECS services. When new containers launch, they're automatically registered. When they shut down, they're de-registered. Zero manual work.

**How load distribution works:**
- Incoming requests hit the ALB at `n11817143-videoapp.cab432.com`
- ALB checks the path: `/api/admin/users` → routes to Admin Service target group
- Admin Service has 1-3 containers registered. ALB picks one using **round-robin** distribution.
- The request goes to that container (e.g., `10.0.1.45:8080`)
- Container processes the request and sends response back through ALB
- If that container is already handling 100 requests and is slow, ALB's **least outstanding requests** algorithm routes the next request to a less busy container

**Why this makes sense:**
- Synchronous operations (login, list videos, get video details) need **immediate responses**. ALB provides low-latency routing (<5ms overhead).
- User experience depends on fast API responses. ALB health checks ensure only healthy containers receive traffic.

---

#### **2. SQS Queue for asynchronous job processing**

**Why SQS instead of direct API calls or database polling?**

When a user clicks "convert to 720p", I could have:
- **Option A**: Video API directly calls Transcode Worker HTTP endpoint → **bad idea** (what if no workers are running? What if it's busy? Tight coupling)
- **Option B**: Video API writes to a DynamoDB jobs table, Worker polls the table → **expensive and slow** (DynamoDB reads cost money, polling adds latency)
- **Option C**: Video API sends message to SQS queue, Worker polls queue → **this is what I do**

**Why SQS wins:**

- **Decoupling**: Video API doesn't care if workers exist or not. It puts the job in the queue and returns immediately (200 OK response to user in <100ms). The user sees "Conversion started!" even if no workers are running yet. The job will be processed when a worker spins up.
- **Buffering**: If 10 users request conversions simultaneously, the queue holds all 10 jobs. Workers process them one by one (or in parallel if multiple workers are running). No job gets lost.
- **At-least-once delivery**: If a worker crashes mid-conversion (EC2 instance failure, out of memory, etc.), the SQS message becomes visible again after the visibility timeout (10 minutes). Another worker picks it up and retries. The user's job eventually completes without manual intervention.
- **Long polling reduces costs**: Instead of calling `ReceiveMessage` every second (3,600 API calls/hour = expensive!), my Worker uses 20-second long polling. One API call waits up to 20 seconds for a message. This reduces SQS API calls by **95%** and saves money.
- **Dead Letter Queue (DLQ) for failures**: After 3 failed attempts (maybe corrupted video, unsupported codec, etc.), the message moves to the DLQ. I get a CloudWatch alarm and can manually investigate. This prevents infinite retry loops.

**How job distribution works across multiple workers:**
1. Worker 1 calls `ReceiveMessage` → gets Job A (becomes invisible for 10 min)
2. Worker 2 calls `ReceiveMessage` → gets Job B (different message)
3. Worker 3 calls `ReceiveMessage` → gets Job C
4. All three workers process jobs in parallel (horizontal scaling!)
5. Worker 1 finishes Job A → calls `DeleteMessage` (removed from queue)
6. Worker 1 polls again → gets Job D (if any)

**Why this makes sense:**
- Asynchronous operations (video transcoding) take **minutes**, not milliseconds. Users shouldn't wait. SQS lets the API respond instantly while workers churn through jobs in the background.
- Transcode jobs are **expensive** (CPU-intensive). The queue acts as a buffer, preventing workers from being overwhelmed. If 100 jobs come in at once, workers process them steadily instead of crashing from overload.

---

#### **3. S3 Event Notifications for Lambda trigger**

**Why S3 Events instead of API polling?**

When a user uploads a video, I need to know about it so I can queue a transcode job. I could:
- **Option A**: Video API polls S3 every few seconds looking for new files → **terrible! Expensive, slow, unreliable**
- **Option B**: Video API triggers Lambda after the user uploads → **tight coupling, adds latency to user response**
- **Option C**: S3 automatically triggers Lambda when files appear → **this is what I do**

**Why S3 Events win:**

- **Real-time**: Lambda triggers within **milliseconds** of the file being uploaded. No polling delay.
- **Event-driven architecture**: S3 is the source of truth. When a file exists at `raw/userId/videoId.mp4`, the event fires. Lambda doesn't need to query anything.
- **Cost-effective**: $0 for S3 event notifications (free feature). Lambda only runs when uploads happen (~100 times/month = $0.20). Polling S3 every 10 seconds would cost ~$15/month in API calls.
- **Scalability**: If 10 users upload simultaneously, S3 triggers 10 Lambda instances in parallel. No queuing, no coordination needed.

**How it works:**
1. User gets presigned URL from Video API: `PUT https://n11817143-a2.s3.amazonaws.com/raw/user123/video456.mp4`
2. User's browser uploads directly to S3 (bypasses API)
3. S3 upload completes → S3 emits `s3:ObjectCreated:Put` event
4. Event matches filter rule (prefix: `raw/`)
5. S3 invokes Lambda function with event payload (bucket, key, size, etc.)
6. Lambda validates file extension (`.mp4`, `.mov`, etc.)
7. Lambda extracts `userId` and `videoId` from the key
8. Lambda sends message to SQS queue: `{"bucket": "...", "key": "...", "userId": "...", "videoId": "...", "quality": "720p"}`
9. Transcode Worker eventually picks up the message and processes it

**Why this makes sense:**
- Completely **decouples upload from transcoding**. The user's upload request doesn't wait for any backend processing—it just uploads to S3 and done.
- **Serverless event processing** (Lambda) is perfect for this—it's a short-lived, stateless task (validate + send SQS message).

---

### **Service Abstractions (ALB, Parameter Store, ElastiCache)**

#### **Why use an Application Load Balancer?**

I could have:
- **Option A**: Each ECS service gets a public IP, users hit services directly → **no redundancy, no health checks, SSL termination complexity**
- **Option B**: NGINX reverse proxy in a container → **I'd have to manage it, scales poorly, single point of failure**
- **Option C**: Application Load Balancer → **managed, highly available, automatic scaling**

**ALB benefits:**
- **High availability**: ALB runs across multiple availability zones (ap-southeast-2a, 2b, 2c). If one AZ goes down, ALB routes to healthy AZs automatically.
- **Zero-downtime deployments**: When I update the Video API, ECS launches new containers, waits for health checks to pass, adds them to ALB, drains connections from old containers, then shuts them down. Users never see errors.
- **SSL/TLS termination**: ALB handles HTTPS with ACM certificates. My backend doesn't need SSL libraries or certificate management.
- **Path-based routing**: One ALB routes to multiple services based on URL path. Saves cost (no need for multiple load balancers) and simplifies DNS (one domain, multiple backends).

**Ease of implementation**: Terraform module creates the ALB, target groups, listener rules, and ECS service integration in ~50 lines of code. Managing NGINX or HAProxy manually would be 10x more work.

---

#### **Why use ElastiCache?**

I could have:
- **Option A**: No cache, query DynamoDB every time → **slow (~200ms per request), expensive (DynamoDB read costs add up)**
- **Option B**: In-memory cache in each ECS container (Node.js Map) → **duplicated data across containers, cache invalidation nightmare, wasted memory**
- **Option C**: Centralized Memcached cluster (ElastiCache) → **shared cache, fast, consistent**

**ElastiCache benefits:**
- **Performance**: Memcached lookups take ~20ms vs ~200ms for DynamoDB. **10x faster** response times for cached data.
- **Cost savings**: 80% of my API requests hit the cache (video metadata doesn't change often). That's 400,000 DynamoDB reads saved per month = ~$5-8/month in DynamoDB costs saved. ElastiCache (cache.m5.xlarge) costs $283.97/month for production deployment, or cache.t3.micro at $12.41/month for development. The **user experience improvement justifies the cost** through dramatically faster response times.
- **Consistency**: All Video API containers share the same cache. User makes a request to container A, gets cached data. Next request goes to container B (via ALB load balancing), still gets cached data. No stale data issues.

**Ease of implementation**: 5 lines in my Terraform config (use existing ElastiCache cluster). Application code uses `memcached` library (15 lines for get/set). Super simple.

---

#### **Why use Parameter Store for secrets?**

I could have:
- **Option A**: Hardcode secrets in code → **terrible security, secrets in Git history**
- **Option B**: Environment variables in ECS task definition → **visible in AWS console, logged in CloudWatch, not encrypted**
- **Option C**: Parameter Store with ECS secrets → **encrypted, access-controlled, audit-logged**

**Parameter Store benefits:**
- **Encryption at rest**: Secrets are encrypted with AWS KMS. Even if someone gains read access to Parameter Store, they can't decrypt without KMS permissions.
- **IAM access control**: Only ECS tasks with specific IAM role permissions can read the secrets. Developers can't accidentally leak them.
- **Audit trail**: CloudWatch logs every access to secrets (who, when, from where). If credentials leak, I can trace it.
- **No code changes to rotate secrets**: Update the parameter in AWS, restart ECS tasks. New containers get new secrets. No redeployment needed.

**Ease of implementation**: One Terraform resource creates the parameter. ECS task definition references it with `valueFrom` (not `value`). Application code reads from environment variable normally.

---

## Summary

My architecture choices boil down to:

1. **Microservices division**: Separate services for different resource requirements (lightweight API vs heavy transcoding) and scaling patterns (request-driven vs queue-driven).

2. **Compute choices**: ECS Fargate for services that need **consistent performance and no cold starts** (Video API, Admin, Transcode Worker). Lambda for **event-driven, short-lived tasks** (S3→SQS). Not EC2 (too much management) or Lambda for APIs (cold starts hurt UX).

3. **Communication mechanisms**: ALB for **synchronous, low-latency HTTP routing** to APIs. SQS for **asynchronous, reliable job distribution** to workers. S3 Events for **real-time, event-driven triggers** to Lambda.

4. **Service abstractions**: ALB provides **high availability and zero-downtime deployments**. ElastiCache adds **performance and cost optimization**. Parameter Store gives **secure secret management**. All are managed services (no maintenance burden) and integrate seamlessly with ECS.

**The architecture is optimized for**:
- ✅ **Functionality**: Each service does one thing well (single responsibility)
- ✅ **Resource efficiency**: Right-sized compute, scale-to-zero where possible
- ✅ **User experience**: Fast API responses, no blocking, reliable conversions
- ✅ **Cost**: ~$3,372/month for production (or ~$1,127/month with scale-to-zero optimizations). Could be $5,000+ with poor architecture choices (always-on workers, no caching, oversized instances).
- ✅ **Maintainability**: Managed services, infrastructure as code, clear separation of concerns
- ✅ **Scalability**: Horizontal scaling, auto-scaling policies, queue-based buffering

It's not just "because AWS says so"—every choice has a concrete reason tied to how the application actually works.
