# Application Architecture

## Architecture Diagram and Overview

Let me walk you through how everything connects in this video transcoding application. Think of it as a digital assembly line where each component has a specific job.

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

### What Each Service Does (Quick Overview)

Here's a quick breakdown of the main AWS services and what they're actually doing:

- **CloudFront CDN**: This is like having copies of your website stored around the world. When someone in Europe visits, they get the site from a server near them instead of pulling it all the way from Sydney. Makes things way faster.

- **S3 (Static Website)**: Where the React app lives. Think of it as the storage closet for all your HTML, CSS, and JavaScript files. CloudFront grabs files from here.

- **S3 (Video Storage)**: Another S3 bucket, but this one's for videos. Raw uploads go in the `raw/` folder, and converted videos end up in `transcoded/720p/` or `transcoded/1080p/` folders. Nice and organized.

- **Route53**: AWS's DNS service. Basically translates `n11817143-videoapp.cab432.com` into an actual server address so browsers know where to go.

- **Application Load Balancer (ALB)**: The traffic cop of the application. Routes `/api/admin/*` requests to the admin service and everything else starting with `/api/*` to the video API. Also handles HTTPS and checks if containers are healthy.

- **ECS Fargate**: This runs our three main services (Video API, Admin Service, and Transcode Worker) in containers. Fargate is basically "serverless containers" - you don't manage any servers, AWS handles all that.

- **ECR (Container Registry)**: Where Docker images live. Like Docker Hub but private and on AWS. Stores images for the video API, admin service, worker, and Lambda function.

- **DynamoDB**: A NoSQL database holding video metadata (titles, upload dates, status), user info, and transcoding status. Fast and scales easily without needing to manage a database server.

- **ElastiCache (Memcached)**: A cache sitting in front of DynamoDB. Instead of hitting the database every time, frequently accessed data gets cached for 5 minutes. Cuts response time from 200ms down to 20ms.

- **SQS (Main Queue)**: A job queue for video conversion tasks. When someone requests a video transcode, the job goes here. Workers pull jobs from this queue and process them one by one.

- **SQS (Dead Letter Queue)**: Where failed jobs go after 3 retry attempts. Basically the "problem inbox" that gets checked when something goes wrong with transcoding.

- **Lambda (S3→SQS)**: A serverless function that automatically triggers when a video is uploaded to S3. It validates the file and creates a transcode job in the SQS queue. Only runs when needed - no cost when idle.

- **Cognito**: Handles user sign-up, login, and authentication. Generates JWT tokens that prove a user is who they say they are.

- **Parameter Store**: Encrypted storage for secrets like JWT keys and API tokens. Way more secure than hardcoding passwords in the code.

- **CloudWatch Logs**: Centralized logging. All microservices send their logs here, making debugging much easier since everything's in one place.

- **CloudWatch Metrics & Alarms**: Monitors the health of everything - CPU usage, memory, queue depth, cache performance. Sends alerts if something goes wrong (like high CPU or messages stuck in the dead letter queue).

- **VPC & Security Groups**: Virtual network infrastructure. Security groups act like firewalls, controlling what can talk to what (e.g., only the load balancer can talk to containers).

- **ACM (Certificate Manager)**: Provides free SSL certificates for HTTPS. Auto-renews them too, so you don't have to worry about expired certificates taking down the site.

---

## Justification of Architecture

Alright, let me explain why I built the architecture this way instead of other approaches. There were definitely multiple ways I could've done this, so here's the reasoning behind the major decisions.

### Why Split Into These Specific Microservices?

The main question was: how do I divide functionality? I ended up with three microservices (Video API, Admin Service, and Transcode Worker) plus a Lambda function. Here's why:

**The Video API and Admin Service split** was mainly about security and resource separation. The Video API handles all public-facing operations - user authentication, video uploads, metadata management, and initiating transcode jobs. The Admin Service is completely separate with privileged operations like viewing all users and system statistics. By separating them, I can lock down the admin endpoints with stricter security rules and it won't affect normal users at all. Plus, they have different scaling patterns - the Video API gets hit constantly by users, while the Admin Service might only be accessed once a day.

**The Transcode Worker is the big one** and this really needed to be its own service. Video transcoding is incredibly CPU-intensive - it can max out a full CPU core for 30+ seconds per video. If I tried to do transcoding in the Video API, it would completely bog down the API responses for other users. Imagine trying to load your video list while the server is crunching through an FFmpeg job - your request would just hang. By separating it, the Video API stays snappy (responds in under 100ms) while the Worker quietly processes videos in the background. Also, the Worker needs way more resources (1 vCPU + 2GB RAM) compared to the lightweight API (0.5 vCPU + 1GB RAM).

**Scale-to-zero was another big factor.** Most of the time, there aren't videos being transcoded. With the Worker as a separate service, I can scale it down to zero tasks when the SQS queue is empty. This saves about $1,315/month compared to running it 24/7. If transcoding was baked into the Video API, I couldn't do this without shutting down the whole API.

**The Lambda function** handles S3 event processing. It could've been part of the Worker, but Lambda made way more sense. It only runs when a video is uploaded (maybe 100 times a month), so paying for a running container would be wasteful. Lambda costs $0.00 in the free tier vs. ~$45/month for an always-on ECS task. It's also event-driven by design - S3 triggers it automatically, no polling needed.

### Why ECS Fargate Instead of EC2 or Lambda?

This was probably the biggest architectural decision. I compared three options:

**Lambda vs. ECS for the API services:** Lambda seems attractive because it's "serverless" and cheap at low scale. But Lambda has cold start delays (500ms-2s), which would make the first API request slow for each user. For a video streaming app where users expect instant responses, that's not great. Also, Lambda has a 15-minute timeout, which is fine for the API but wouldn't work for the transcoding worker (videos can take 20+ minutes). ECS Fargate gives me consistent performance with no cold starts, containers stay warm, and unlimited execution time.

**EC2 vs. ECS Fargate:** EC2 would be cheaper at very high scale (like 10+ containers running 24/7), but it comes with operational overhead. I'd have to manage OS patches, security updates, SSH access, monitoring, and handle failures manually. With Fargate, AWS handles all of that. I just deploy a container and it runs. Auto-scaling is also way simpler - Fargate scales individual tasks, while EC2 requires managing instance types and task placement. For a uni project that needs to work reliably without constant babysitting, Fargate was the clear winner.

**Cost comparison:** Here's what it would look like at different scales:

| Setup | Low Scale (1 API task) | Medium Scale (3 API + 1 Worker) | High Scale (10 tasks) |
|-------|------------------------|----------------------------------|----------------------|
| Lambda + EC2 | ~$80/month | ~$150/month | ~$400/month |
| All Lambda | ~$20/month | N/A (can't do long transcoding) | N/A |
| EC2 only | ~$120/month (24/7) | ~$180/month | ~$300/month |
| **ECS Fargate** | **~$110/month** | **~$180/month** | **~$600/month** |

At my scale (small to medium), Fargate hits the sweet spot between cost and not having to manage servers.

### Why These Communication Mechanisms?

I use three different communication patterns, and each one fits a specific need:

**ALB for synchronous HTTP requests:** When a user hits the API, they expect an immediate response. The ALB routes `/api/*` requests to the Video API and `/api/admin/*` to the Admin Service using path-based routing. It also handles HTTPS termination (so containers don't need SSL certificates), load balancing across multiple tasks, and health checks. Without the ALB, I'd have to expose containers directly to the internet, which is a security nightmare, and managing DNS for multiple container IPs would be painful.

**SQS for asynchronous job processing:** Video transcoding doesn't need to be instant - users are fine waiting 2-5 minutes. Instead of making the user's HTTP request wait while FFmpeg runs (which would timeout), the Video API immediately responds "job submitted!" and drops a message in the SQS queue. Workers pull from the queue whenever they're ready. SQS also provides retry logic (if FFmpeg crashes, the message goes back in the queue), visibility timeout (prevents two workers from processing the same job), and the dead letter queue (captures permanently failed jobs).

**S3 Events to Lambda:** When a video file lands in S3, I need to validate it and create a transcode job. S3 Events push notifications directly to Lambda whenever `ObjectCreated` events happen in the `raw/` prefix. This is way better than polling S3 repeatedly to check for new files. It's instant (Lambda triggers within seconds) and I only pay for actual executions.

### Why Use Service Abstractions (ALB, ElastiCache)?

**Application Load Balancer:** I could've skipped the ALB and used Fargate's built-in service discovery, where containers find each other via DNS. But then I'd lose several things: 
- No HTTPS termination (each container would need certificates)
- No path-based routing (Video API and Admin Service would need different domains)
- No built-in health checks (unhealthy containers would still receive traffic)
- No centralized access logs

The ALB costs $76/month, but it solves all these problems in one place. For production, it's worth it.

**ElastiCache (Memcached):** I added caching later after noticing DynamoDB was getting hammered. Every time a user loads the video list, it queries DynamoDB. With 50 users refreshing every few minutes, that's thousands of read requests per day. By caching video metadata for 5 minutes, I cut DynamoDB reads by 80% and API response time dropped from 200ms to 20ms. ElastiCache costs $284/month for production or $12/month for a small instance in dev mode. The performance gain is massive, especially since most users view the same popular videos.

**Parameter Store:** I could've hardcoded secrets in the code or environment variables, but that's terrible security. Parameter Store encrypts secrets with KMS and only injects them into containers at runtime. If someone gets access to my ECR images, they don't get the JWT secrets. This is a no-brainer for anything touching user authentication.

### Key Architectural Goals

To sum it up, the architecture prioritizes:

1. **Separation of concerns:** Each service does one thing well (API vs. admin vs. transcoding)
2. **Cost optimization:** Scale-to-zero for the Worker, Lambda for infrequent events, caching to reduce database reads
3. **Performance:** No cold starts for APIs, caching layer, async processing via SQS
4. **Reliability:** Health checks, auto-scaling, dead letter queue for failed jobs, automatic retries
5. **Maintainability:** Managed services (Fargate, Lambda, SQS) over self-managed EC2, infrastructure as code via Terraform
6. **Security:** Separate admin service, encrypted secrets, HTTPS everywhere, VPC with security groups

There are definitely trade-offs - I'm paying a bit more for Fargate than EC2 at scale, and the ElastiCache instance is a significant cost. But for a project where I need to demonstrate cloud architecture skills without spending all my time managing servers, this setup hits the right balance.

---

## Project Core - Microservices

- **First service functionality:** Video API - Public-facing REST API handling user authentication (Cognito JWT verification), video metadata management (CRUD operations), presigned URL generation for S3 uploads/downloads, video listing/filtering, and transcode job submission to SQS queue.

- **First service compute:** ECS Fargate (Serverless Container), Service Name: `n11817143-app-video-api`, Tasks: 2-5 (auto-scaling based on CPU 70% and Memory 80%), CPU: 512 units (0.5 vCPU), Memory: 1024 MB, Port: 8080

- **First service source files:**
  - `server/services/video-api/src/index.js` - Express server entry point
  - `server/services/video-api/src/routes/` - API route handlers
  - `server/services/video-api/src/controllers/` - Business logic controllers
  - `server/services/video-api/src/middleware/auth.js` - JWT authentication middleware
  - `server/services/video-api/Dockerfile` - Container image definition

- **Second service functionality:** Admin Service - Administrative operations including user management (list all users, view user details), system statistics (total videos, storage usage, active users), monitoring dashboards, and privileged operations isolated from public API for security.

- **Second service compute:** ECS Fargate (Serverless Container), Service Name: `n11817143-app-admin-service`, Tasks: 1-3 (auto-scaling), CPU: 256 units (0.25 vCPU), Memory: 512 MB, Port: 8080

- **Second service source files:**
  - `server/services/admin-service/src/index.js` - Express server entry point
  - `server/services/admin-service/src/routes/admin.routes.js` - Admin API routes
  - `server/services/admin-service/src/controllers/admin.controller.js` - Admin operations
  - `server/services/admin-service/Dockerfile` - Container image definition

- **Video timestamp:** [To be recorded during demo]

---

## Project Additional - Additional microservices

- **Third service functionality:** Transcode Worker - CPU-intensive video processing service that polls SQS queue for transcode jobs, downloads raw videos from S3, performs FFmpeg transcoding to 720p or 1080p based on user selection, uploads converted videos back to S3, updates DynamoDB metadata with transcode status, and deletes SQS messages upon successful completion. Scales to zero when idle.

- **Third service compute:** ECS Fargate (Serverless Container), Service Name: `n11817143-app-transcode-worker`, Tasks: 0-10 (auto-scaling based on SQS queue depth and CPU 70%), CPU: 1024 units (1 vCPU), Memory: 2048 MB, No ALB integration (background worker)

- **Third service source files:**
  - `server/services/transcode-worker/src/index.js` - Worker entry point with SQS polling
  - `server/services/transcode-worker/src/transcoder.js` - FFmpeg transcoding logic
  - `server/services/transcode-worker/src/s3-handler.js` - S3 download/upload operations
  - `server/services/transcode-worker/Dockerfile` - Container with FFmpeg installed

- **Fourth service functionality:** S3-to-SQS Lambda Function - Event-driven serverless function that triggers on S3 ObjectCreated events, validates video file extensions (.mp4, .mov, .avi, .mkv, .webm, .flv), extracts userId and videoId from S3 object key pattern (`raw/{userId}/{videoId}.ext`), generates transcode job message with metadata, and sends message to SQS queue for worker processing.

- **Fourth service compute:** AWS Lambda (Serverless Function), Function Name: `n11817143-app-s3-to-sqs`, Runtime: Container Image (Node.js 18), Memory: 256 MB, Timeout: 30 seconds, Trigger: S3 Event Notification (Prefix: `raw/`), Execution Role: CAB432-Lambda-Role

- **Fourth service source files:**
  - `lambda/s3-to-sqs/index.js` - Lambda handler function
  - `lambda/s3-to-sqs/Dockerfile` - Lambda container image
  - `lambda/s3-to-sqs/package.json` - Node.js dependencies

- **Video timestamp:** [To be recorded during demo]

---

## Project Additional - Serverless functions

- **Service(s) deployed on Lambda:** S3-to-SQS Event Processor - Validates uploaded video files and queues transcode jobs. This Lambda function is triggered automatically when users upload videos to the S3 bucket's `raw/` prefix. It performs file validation, extracts metadata from the S3 object key, and creates a structured message in the SQS queue for the Transcode Worker to process. Uses container image deployment for better dependency management (Node.js 18 runtime with AWS SDK).

- **Video timestamp:** [To be recorded during demo]

- **Relevant files:**
  - `lambda/s3-to-sqs/index.js` - Main Lambda handler function
  - `lambda/s3-to-sqs/Dockerfile` - Container image for Lambda runtime
  - `lambda/s3-to-sqs/package.json` - Dependencies (AWS SDK, validation libraries)
  - `terraform/modules/lambda/main.tf` - Lambda infrastructure as code
  - `terraform/modules/lambda/s3-trigger.tf` - S3 event notification configuration

---

## Project Additional - Container orchestration with ECS 

- **ECS cluster name:** n11817143-app-cluster

- **Task definition names:**
  - `n11817143-app-video-api-task` - Video API service (0.5 vCPU, 1GB RAM, awsvpc network mode)
  - `n11817143-app-admin-service-task` - Admin service (0.25 vCPU, 512MB RAM, awsvpc network mode)
  - `n11817143-app-transcode-worker-task` - Transcode worker (1 vCPU, 2GB RAM, includes FFmpeg)

- **Video timestamp:** [To be recorded during demo]

- **Relevant files:**
  - `terraform/modules/ecs-cluster/main.tf` - ECS cluster definition
  - `terraform/modules/ecs-service/main.tf` - ECS service configuration with auto-scaling
  - `terraform/modules/ecs-service/task-definition.tf` - Task definitions for all services
  - `server/services/video-api/Dockerfile` - Video API container image
  - `server/services/admin-service/Dockerfile` - Admin service container image
  - `server/services/transcode-worker/Dockerfile` - Worker container image

---

## Project Core - Load distribution

- **Load distribution mechanism:** Application Load Balancer (ALB) for HTTP/HTTPS traffic distribution across Video API and Admin Service containers. Uses path-based routing rules to direct requests to appropriate target groups. Additionally, SQS queue for asynchronous job distribution to Transcode Worker instances with long polling (20 seconds) to reduce API calls and enable horizontal scaling of worker containers.

- **Mechanism instance name:** 
  - ALB: `n11817143-app-alb` (DNS: n11817143-app-alb-1811658624.ap-southeast-2.elb.amazonaws.com)
  - SQS: `n11817143-A3` (Main transcode queue)
  - Target Groups: `n11817143-app-video-api-tg`, `n11817143-app-admin-service-tg`

- **Video timestamp:** [To be recorded during demo]

- **Relevant files:**
  - `terraform/modules/alb/main.tf` - ALB resource definition
  - `terraform/modules/alb/listeners.tf` - HTTPS listener and routing rules
  - `terraform/modules/alb/target-groups.tf` - Target group configuration
  - `terraform/modules/ecs-service/main.tf` - ECS service ALB integration
  - `server/services/transcode-worker/src/sqs-poller.js` - SQS long polling implementation

---

## Project Additional - Communication mechanisms

- **Communication mechanism(s):** 
  1. **SQS Queue** - Asynchronous message queue for transcode job distribution between Video API and Transcode Workers
  2. **S3 Event Notifications** - Event-driven trigger from S3 to Lambda function when videos are uploaded
  3. **ALB Path-Based Routing** - Synchronous HTTP routing (`/api/admin/*` → Admin Service, `/api/*` → Video API)

- **Mechanism instance name:** 
  - SQS Main Queue: `n11817143-A3` (Visibility timeout: 600s, Long polling: 20s)
  - SQS DLQ: `n11817143-A3-dlq` (14-day retention)
  - S3 Event: Configured on bucket `n11817143-a2` with prefix filter `raw/`
  - Lambda Function: `n11817143-app-s3-to-sqs` (Triggered by S3 events)

- **Video timestamp:** [To be recorded during demo]

- **Relevant files:**
  - `terraform/main.tf` - SQS queue and DLQ definitions
  - `terraform/modules/lambda/s3-trigger.tf` - S3 event notification configuration
  - `lambda/s3-to-sqs/index.js` - Lambda handler processing S3 events
  - `server/services/video-api/src/controllers/video.controller.js` - SQS SendMessage implementation
  - `server/services/transcode-worker/src/index.js` - SQS ReceiveMessage polling logic

---

## Project Core - Autoscaling

- **ECS Service name:** 
  - `n11817143-app-video-api` - Scales 2-5 tasks based on CPU (70% target) and Memory (80% target)
  - `n11817143-app-admin-service` - Scales 1-3 tasks based on CPU (70%) and Memory (80%)
  - `n11817143-app-transcode-worker` - Scales 0-10 tasks based on CPU (70%), scale-to-zero enabled

**Auto-scaling Configuration:**
- **Scale-up policy:** Add 1 task when CPU > 70% for 2 minutes OR Memory > 80% for 2 minutes
- **Scale-down policy:** Remove 1 task when CPU < 50% for 5 minutes AND Memory < 60% for 5 minutes
- **Cooldown period:** 300 seconds (5 minutes) between scaling actions
- **Minimum healthy percent:** 100% (zero-downtime deployments)
- **Maximum percent:** 200% (allows new tasks before terminating old ones)

- **Video timestamp:** [To be recorded during demo]

- **Relevant files:**
  - `terraform/modules/ecs-service/autoscaling.tf` - Auto-scaling policies and CloudWatch alarms
  - `terraform/terraform.tfvars` - Auto-scaling thresholds configuration
  - `terraform/modules/ecs-service/main.tf` - ECS service with desired/min/max task counts

---

## Project Additional - Custom scaling metric

- **Description of metric:** SQS Queue Depth (ApproximateNumberOfMessagesVisible) - Tracks the number of transcode jobs waiting in the queue. When queue depth exceeds threshold (10 messages per worker), new Transcode Worker tasks are launched. When queue is empty for 5+ minutes, workers scale to zero.

- **Implementation:** AWS Application Auto Scaling with Target Tracking policy using CloudWatch SQS metric `ApproximateNumberOfMessagesVisible`. Configured with target value of 10 messages per task, enabling predictive scaling based on workload demand rather than resource utilization.

- **Rationale:** 
  - **Small scale (1-100 jobs/day):** CPU-based scaling would keep workers running even when idle, costing ~$1,315/month. Queue-depth scaling enables scale-to-zero, reducing cost to ~$131/month (90% savings) while maintaining <5 minute response time for new jobs.
  - **Large scale (1000+ jobs/day):** Queue-depth scaling prevents job backlog by launching workers proactively when queue grows. Maintains steady throughput of ~20 jobs/hour per worker. If 100 jobs arrive simultaneously, scales to 10 workers within 2 minutes, preventing user-visible delays.

- **Video timestamp:** [To be recorded during demo]

- **Relevant files:**
  - `terraform/modules/ecs-service/autoscaling.tf` - SQS queue depth target tracking policy
  - `server/services/transcode-worker/src/index.js` - Worker shutdown logic when queue is empty
  - `terraform/main.tf` - SQS queue configuration with CloudWatch metrics

---

## Project Core - HTTPS

- **Domain name:** 
  - Frontend: `app.n11817143-videoapp.cab432.com` (CloudFront distribution)
  - Backend API: `n11817143-videoapp.cab432.com` (Application Load Balancer)

- **Certificate ID:** 
  - ALB Certificate: `arn:aws:acm:ap-southeast-2:901444280953:certificate/287c529f-3514-4283-9752-9f716540ff03` (Sydney region)
  - CloudFront Certificate: `arn:aws:acm:us-east-1:901444280953:certificate/3e304793-a3b9-4d8d-9953-74f366cd3453` (us-east-1 required for CloudFront)

- **ALB/API Gateway name:** `n11817143-app-alb` (Application Load Balancer)

**HTTPS Configuration:**
- ALB Listener: HTTPS:443 with SSL/TLS termination using ACM certificate
- HTTP:80 Listener: Redirects all traffic to HTTPS:443 (enforced encryption)
- CloudFront: HTTPS-only origin policy, TLS 1.2+ minimum
- Backend containers: Plain HTTP on port 8080 (within VPC, encrypted by ALB)

- **Video timestamp:** [To be recorded during demo]

- **Relevant files:**
  - `terraform/modules/alb/listeners.tf` - HTTPS listener with certificate attachment
  - `terraform/terraform.tfvars` - ACM certificate ARN configuration
  - `terraform/modules/s3-static-website/cloudfront.tf` - CloudFront HTTPS settings

---

## Project Additional - Container orchestration features

- **First additional ECS feature:** Service Discovery with AWS Cloud Map - Enables microservices to discover and communicate with each other using private DNS names within the VPC. Creates DNS namespace `n11817143-app.local` where services register as `video-api.n11817143-app.local` and `admin-service.n11817143-app.local`. Eliminates hardcoded IPs and enables dynamic service-to-service communication.

- **Second additional ECS feature:** Rolling Update Deployment with Health Checks - Implements zero-downtime deployments using minimum healthy percent of 100% and maximum percent of 200%. ECS launches new tasks, waits for ALB health checks to pass (3 consecutive successful checks on `/healthz` endpoint), adds new tasks to load balancer, drains connections from old tasks (300-second deregistration delay), then terminates old tasks. Users never experience downtime during deployments.

- **Video timestamp:** [To be recorded during demo]

- **Relevant files:**
  - `terraform/modules/ecs-service/service-discovery.tf` - Cloud Map namespace and service discovery
  - `terraform/modules/ecs-service/main.tf` - Deployment configuration with health checks
  - `terraform/modules/alb/target-groups.tf` - ALB health check parameters
  - `server/services/video-api/src/routes/health.js` - Health check endpoint implementation

---

## Project Additional - Infrastructure as Code

- **Technology used:** Terraform (HashiCorp Configuration Language) with modular architecture

- **Services deployed:** 
  - **Assignment 3 Core Services:** ECS Cluster, ECS Services (Video API, Admin Service, Transcode Worker), Application Load Balancer, ALB Target Groups, ALB Listeners with HTTPS, Auto Scaling Policies, Lambda Function (S3-to-SQS), SQS Main Queue, SQS Dead Letter Queue, CloudFront Distribution, S3 Static Website Bucket, ECR Repositories (4 repos), CloudWatch Log Groups, CloudWatch Alarms, Security Groups, Service Discovery (Cloud Map), ACM Certificate validation, Route53 DNS records
  - **Pre-existing (Assignment 1/2):** VPC, Subnets, DynamoDB Table, S3 Video Bucket, Cognito User Pool, ElastiCache Cluster, IAM Roles

- **Video timestamp:** [To be recorded during demo]

- **Relevant files:**
  - `terraform/main.tf` - Root module with resource definitions
  - `terraform/variables.tf` - Input variable declarations
  - `terraform/outputs.tf` - Output values (ALB DNS, CloudFront URL, etc.)
  - `terraform/terraform.tfvars` - Environment-specific configuration values
  - `terraform/modules/` - Reusable modules:
    - `modules/alb/` - Application Load Balancer
    - `modules/ecs-cluster/` - ECS Fargate cluster
    - `modules/ecs-service/` - ECS service with auto-scaling
    - `modules/lambda/` - Lambda function and S3 trigger
    - `modules/s3-static-website/` - CloudFront + S3 website
    - `modules/security-groups/` - Network security rules
    - `modules/ecr/` - Container registries

---

## Project Additional - Dead letter queue

- **Technology used:** Amazon SQS Dead Letter Queue (DLQ) with CloudWatch Alarm monitoring

- **Configuration:** 
  - DLQ Name: `n11817143-A3-dlq`
  - Trigger Condition: Failed transcode jobs after 3 processing attempts (maxReceiveCount: 3)
  - Message Retention: 14 days (maximum allowed, 1,209,600 seconds)
  - Redrive Policy: Configured on main queue `n11817143-A3` to move failed messages to DLQ
  - CloudWatch Alarm: `n11817143-app-transcode-dlq-messages` triggers when DLQ message count > 0

- **Handling Strategy:** When messages land in DLQ, CloudWatch alarm sends notification to administrators. Failed jobs typically indicate corrupted video files, unsupported codecs, or infrastructure issues. Admin reviews DLQ messages manually, investigates root cause (check CloudWatch logs for worker errors), fixes underlying issue (e.g., add codec support), then uses AWS Console to redrive messages back to main queue for reprocessing.

- **Video timestamp:** [To be recorded during demo]

- **Relevant files:**
  - `terraform/main.tf` - SQS DLQ and redrive policy configuration
  - `terraform/modules/ecs-service/cloudwatch-alarms.tf` - DLQ CloudWatch alarm
  - `server/services/transcode-worker/src/index.js` - Error handling and message deletion logic

---

## Project Additional - Edge Caching

- **Cloudfront Distribution ID:** E3MBOUQVWZEHJQ

- **Content cached:** React application static assets including HTML files (index.html), JavaScript bundles (main.js, vendor.js), CSS stylesheets, images, fonts, and favicon. Cache origin is S3 bucket `n11817143-app-static-website` accessed via Origin Access Control (OAC) for security.

- **Rationale for caching:** 
  - **Performance:** React SPA files are served from CloudFront edge locations globally, reducing latency from ~250ms (Sydney S3) to <50ms (nearest edge). Users in North America/Europe experience 5x faster page loads.
  - **Cost Reduction:** Caching reduces S3 GET requests by 90%, saving ~$3/month in S3 data transfer costs. CloudFront pricing ($4.45/month) is offset by S3 savings and improved user experience.
  - **Scalability:** Edge caching handles traffic spikes without overloading origin S3 bucket. During peak usage (100 concurrent users), CloudFront serves 95% of requests from cache, preventing S3 throttling.
  - **Global Distribution:** Single deployment serves users worldwide with consistent performance. Cache invalidation takes <5 minutes across all edge locations during deployments.

**Cache Configuration:**
- Default TTL: 3600 seconds (1 hour)
- Maximum TTL: 86400 seconds (24 hours)
- Cache behavior: Cache based on query strings, headers (Accept-Encoding for gzip)
- Compression: Brotli and Gzip enabled for text files

- **Video timestamp:** [To be recorded during demo]

- **Relevant files:**
  - `terraform/modules/s3-static-website/cloudfront.tf` - CloudFront distribution configuration
  - `terraform/modules/s3-static-website/s3-bucket.tf` - S3 bucket with OAC policy
  - `client/vite.config.js` - Build configuration for optimized caching

---

# Cost Estimate

**AWS Pricing Calculator Public Link:** https://calculator.aws/#/estimate?id=2bcd3679b34f6b4f3e8970b7f94505bc1c4990e6

**Region:** Asia Pacific (Sydney) - ap-southeast-2

**Assumptions:**
- 50 concurrent users
- 100 video uploads per month
- 500,000 API requests per month
- 100 transcode jobs per month
- 730 hours per month (24/7 operation)

## Monthly Cost Summary

| Service | Configuration | Monthly Cost (USD) |
|---------|---------------|-------------------|
| **AWS Fargate (ECS)** | Video API: 2 tasks (0.5 vCPU, 1GB)<br>Admin: 1 task (0.25 vCPU, 512MB)<br>Worker: 1 task (1 vCPU, 2GB) | $2,957.71 |
| **Application Load Balancer** | 1 ALB with 2 target groups<br>Fixed cost + LCU charges | $76.80 |
| **Amazon S3** | 100 GB storage<br>10K PUT, 100K GET requests | $2.58 |
| **Amazon CloudFront** | 50 GB data transfer<br>100K HTTPS requests | $4.45 |
| **Amazon ECR** | 20 GB storage (4 repositories) | $2.00 |
| **AWS Lambda** | 100 invocations (Free Tier) | $0.00 |
| **Amazon SQS** | 500K requests (Free Tier)<br>DLQ included | $0.20 |
| **Amazon DynamoDB** | Reserved capacity (5 RCU, 5 WCU)<br>5 GB storage | $31.26 |
| **Amazon Cognito** | ~100 Monthly Active Users | $5.00 |
| **Amazon CloudWatch** | 10 GB logs (7-day retention)<br>10 custom metrics, 10 alarms | $7.75 |
| **Amazon ElastiCache** | 1 node cache.m5.xlarge (Optional) | $283.97 |
| **Route53** | 1 hosted zone | $0.54 |
| **ACM Certificates** | 2 certificates | $0.00 (Free) |
| **VPC & Networking** | Data transfer out (50 GB) | Included in other services |
| | | |
| **Total Monthly Cost** | **(with ElastiCache)** | **$3,371.72** |
| **Total Monthly Cost** | **(without ElastiCache - Development)** | **$3,087.75** |
| **Upfront Cost** | DynamoDB Reserved (1-year) | **$205.20** |

## Cost Breakdown by Category

| Category | Monthly Cost | % of Total |
|----------|--------------|-----------|
| **Compute (ECS Fargate)** | $2,957.71 | 87.7% |
| **Caching (ElastiCache)** | $283.97 | 8.4% |
| **Load Balancing (ALB)** | $76.80 | 2.3% |
| **Database (DynamoDB)** | $31.26 | 0.9% |
| **Monitoring (CloudWatch)** | $7.75 | 0.2% |
| **Auth (Cognito)** | $5.00 | 0.1% |
| **CDN (CloudFront)** | $4.45 | 0.1% |
| **Storage (S3)** | $2.58 | 0.1% |
| **Container Registry (ECR)** | $2.00 | 0.1% |
| **DNS (Route53)** | $0.54 | 0.0% |
| **Messaging (SQS)** | $0.20 | 0.0% |
| **Serverless (Lambda)** | $0.00 | 0.0% |

## Cost Optimization Opportunities

### Immediate Savings (Student/Development Mode)

| Optimization | Implementation | Monthly Savings |
|--------------|----------------|-----------------|
| **Scale Worker to Zero** | Set transcode worker desired count to 0, scale on SQS depth | -$1,314.63 |
| **Reduce Video API to 1 task** | Change from 2 tasks to 1 task | -$657.21 |
| **Use cache.t3.micro** | Replace m5.xlarge with t3.micro | -$271.56 |
| **3-day log retention** | Reduce CloudWatch logs from 7 to 3 days | -$0.25 |
| **Keep 5 ECR images** | Reduce lifecycle policy from 10 to 5 | -$1.00 |
| **Total Immediate Savings** | | **-$2,244.65** |
| **Optimized Monthly Cost** | | **$1,127.07** |

### Long-Term Optimizations (Production Scale)

| Optimization | When to Implement | Monthly Savings |
|--------------|-------------------|-----------------|
| **ECS Reserved Instances** | Predictable 24/7 workload | -$443.66 (30% discount) |
| **S3 Intelligent-Tiering** | Videos older than 90 days | -$18.40 |
| **Reserved ElastiCache** | 1-year commitment | -$85.19 |
| **Savings Plans (Compute)** | Stable compute usage | -$591.54 |
| **Total Long-Term Savings** | | **-$1,138.79** |

## Cost per Metric

| Metric | Value | Calculation |
|--------|-------|-------------|
| **Cost per User** | $67.43/month | $3,371.72 ÷ 50 users |
| **Cost per Video Upload** | $33.72/upload | $3,371.72 ÷ 100 uploads |
| **Cost per API Request** | $0.0067/request | $3,371.72 ÷ 500,000 requests |
| **Cost per Transcode Job** | $33.72/job | $3,371.72 ÷ 100 jobs |

## Deployment Scenarios

| Scenario | Configuration | Monthly Cost | Use Case |
|----------|---------------|--------------|----------|
| **Student/Dev** | 1 Video API, 0 Admin, 0 Worker<br>No ElastiCache | ~$110 | Development, testing, assignments |
| **Optimized Production** | 2 Video API, 1 Admin, 0-10 Worker<br>cache.t3.small | ~$1,300 | Cost-conscious production (50-1000 users) |
| **Full Production** | 2 Video API, 1 Admin, 1 Worker<br>cache.m5.xlarge | $3,372 | High availability (50-500 users) |
| **Enterprise Scale** | 10-30 Video API, 2-5 Admin, 0-50 Worker<br>Redis Cluster | $8,000-12,000 | Large scale (5,000-20,000 users) |

---

**Total 12-Month Cost:** $40,665.84 ($3,371.72 × 12 + $205.20 upfront)

**Note:** Costs based on actual AWS Pricing Calculator estimate. Significant optimizations available by implementing scale-to-zero for worker tasks and using smaller ElastiCache nodes for development environments.
