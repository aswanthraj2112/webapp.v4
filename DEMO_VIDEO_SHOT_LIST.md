# 📸 Demo Video Shot List
**Visual checklist for each scene - tick off as you record**

---

## Scene 1: Introduction [0:00-0:30]
- [ ] Show title slide: "CAB432 Assignment 3 - Aswanth Raj (n11817143)"
- [ ] Optional: Show your face/webcam
- [ ] Say: Name, student ID, assignment title

---

## Scene 2: Architecture Overview [0:30-2:00]

### Shot 1: ECS Cluster
- [ ] AWS Console → ECS → Clusters
- [ ] Click: `n11817143-app-cluster`
- [ ] Show: Cluster overview page
- [ ] Point out: "3 services running"

### Shot 2: Service List
- [ ] Click: Services tab
- [ ] Show list with 3 services:
  - [ ] `video-api` - Desired: 2, Running: 2
  - [ ] `admin-service` - Desired: 1, Running: 1
  - [ ] `transcode-worker` - Desired: 0, Running: 0 ⭐
- [ ] Say: "Notice Worker is at zero"

### Shot 3: Video API Service Details
- [ ] Click: `video-api`
- [ ] Show:
  - [ ] Task definition (0.5 vCPU, 1GB RAM)
  - [ ] Health status (green checkmarks)
  - [ ] Auto-scaling enabled

### Shot 4: Admin Service Details
- [ ] Click back, then click: `admin-service`
- [ ] Show:
  - [ ] Task definition (0.25 vCPU, 512MB RAM)
  - [ ] Running tasks: 1

### Shot 5: Transcode Worker Details
- [ ] Click back, then click: `transcode-worker`
- [ ] Show:
  - [ ] Task definition (1 vCPU, 2GB RAM)
  - [ ] Desired count: **0** ⭐ (important!)
  - [ ] Auto-scaling policy visible

---

## Scene 3: Load Balancer & HTTPS [2:00-3:30]

### Shot 1: Load Balancer List
- [ ] AWS Console → EC2 → Load Balancers
- [ ] Show: `n11817143-app-alb`
- [ ] Click it

### Shot 2: Listeners Tab
- [ ] Click: Listeners tab
- [ ] Show:
  - [ ] Listener 1: HTTP:80 → Redirect to HTTPS ✅
  - [ ] Listener 2: HTTPS:443 → Forward to target groups ✅

### Shot 3: HTTPS Listener Rules
- [ ] Click: "HTTPS:443" listener
- [ ] Click: "View/edit rules"
- [ ] Show routing rules:
  - [ ] Rule 1: Path `/api/admin/*` → Admin Service TG
  - [ ] Rule 2: Path `/api/*` → Video API TG
  - [ ] Default: Fixed response (404)

### Shot 4: Target Groups
- [ ] Go back to ALB
- [ ] Click: "Target groups" tab
- [ ] Click: `video-api-tg`
- [ ] Show:
  - [ ] Targets: 2-5 healthy ✅
  - [ ] Health check: `/healthz`
- [ ] Click: `admin-service-tg`
- [ ] Show:
  - [ ] Targets: 1-3 healthy ✅

### Shot 5: HTTPS Test (Terminal)
- [ ] Open terminal (split screen or switch)
- [ ] Run:
  ```bash
  curl -I https://n11817143-videoapp.cab432.com/api/config
  ```
- [ ] Show output:
  ```
  HTTP/2 200
  content-type: application/json
  ```
- [ ] Say: "HTTPS is working, certificate validated"

---

## Scene 4: Frontend Demo [3:30-5:00]

### Shot 1: Login Page
- [ ] Open browser: https://app.n11817143-videoapp.cab432.com
- [ ] Show: Login page loads (CloudFront cached)
- [ ] Say: "This is served via CloudFront CDN"

### Shot 2: Login
- [ ] Enter credentials:
  - [ ] Email: `aswanth@example.com`
  - [ ] Password: (your test password)
- [ ] Click: Login button
- [ ] Show: Redirect to dashboard

### Shot 3: Dashboard (Before Upload)
- [ ] Show: Video list (empty or existing videos)
- [ ] Point out: Status badges (completed vs processing)
- [ ] Say: "Let me upload a new video"

### Shot 4: Upload Form
- [ ] Click: "Upload Video" button
- [ ] Show: Upload modal/page
- [ ] Select file: `demo-video.mp4` (100-500MB)
- [ ] Fill in:
  - [ ] Title: "Auto-Scaling Demo Video"
  - [ ] Description: "Testing microservices architecture"

### Shot 5: Upload Progress
- [ ] Click: "Upload" button
- [ ] Show: Progress bar (if visible)
- [ ] Show: Success message: "Video uploaded successfully!" ✅
- [ ] Show: New video card with status: **"processing"** 🟡

### Shot 6: Note the Upload
- [ ] Say: "Upload is complete on the frontend"
- [ ] Say: "Behind the scenes, S3 triggered a Lambda function"
- [ ] Say: "Let's see what's happening in AWS"

---

## Scene 5: Serverless Processing [5:00-7:00]

### Shot 1: Lambda Function List
- [ ] AWS Console → Lambda → Functions
- [ ] Show: `n11817143-s3-to-sqs-lambda`
- [ ] Click it

### Shot 2: Lambda Configuration
- [ ] Show configuration tab:
  - [ ] Runtime: Container image (Node.js 18) ✅
  - [ ] Memory: 256MB
  - [ ] Timeout: 30s
- [ ] Show triggers:
  - [ ] S3 bucket: `n11817143-a2` ✅
  - [ ] Event type: ObjectCreated
  - [ ] Prefix: `raw/`

### Shot 3: CloudWatch Logs
- [ ] Click: "Monitor" tab
- [ ] Click: "View CloudWatch logs"
- [ ] Show: Latest log stream (most recent)
- [ ] Click: Log stream
- [ ] Show log lines:
  ```
  START RequestId: abc123...
  Video uploaded: raw/USER#123/2025-11-01-video.mp4
  Sending message to SQS queue: n11817143-A3
  Message sent successfully
  END RequestId: abc123...
  ```
- [ ] Say: "Lambda processed the S3 event in milliseconds"

### Shot 4: SQS Main Queue
- [ ] AWS Console → SQS → Queues
- [ ] Show list of queues:
  - [ ] `n11817143-A3` (main queue)
  - [ ] `n11817143-A3-dlq` (dead letter queue)
- [ ] Click: `n11817143-A3`

### Shot 5: Queue Details
- [ ] Show queue overview:
  - [ ] Messages available: **1** ✅
  - [ ] Messages in flight: 0
- [ ] Say: "There's our transcode job waiting"

### Shot 6: View Message
- [ ] Click: "Send and receive messages" button
- [ ] Click: "Poll for messages"
- [ ] Wait 2-3 seconds
- [ ] Show: Message appears
- [ ] Click: Message to expand
- [ ] Show message body (JSON):
  ```json
  {
    "videoId": "abc123",
    "userId": "USER#123",
    "s3Key": "raw/USER#123/2025-11-01-video.mp4",
    "timestamp": "2025-11-01T10:00:00.000Z"
  }
  ```
- [ ] **Important:** Don't delete the message! Let worker process it
- [ ] Say: "The worker will pick this up automatically"

---

## Scene 6: Auto-Scaling Demo [7:00-9:00] ⭐ MOST IMPORTANT

### Shot 1: Check Worker (Before)
- [ ] AWS Console → ECS → Clusters → n11817143-app-cluster
- [ ] Click: Services tab
- [ ] Click: `transcode-worker`
- [ ] Show:
  - [ ] Desired count: **0** ✅
  - [ ] Running count: **0** ✅
- [ ] Say: "Currently zero tasks running"

### Shot 2: Wait for Auto-Scaling (30-60 seconds)
- [ ] Say: "Let's wait for auto-scaling to detect the SQS message"
- [ ] Keep refreshing the service page every 10 seconds
- [ ] Show: Desired count changing from 0 → 1 ✅
- [ ] Say: "There it is! Auto-scaling kicked in based on queue depth"

### Shot 3: Task Starting
- [ ] Click: "Tasks" tab
- [ ] Show: New task appearing
- [ ] Show task status:
  - [ ] PROVISIONING → PENDING → RUNNING ✅
- [ ] Point out: Task ID and start time
- [ ] Say: "The container is spinning up"

### Shot 4: Task Logs (Processing)
- [ ] Click: Task ID
- [ ] Click: "Logs" tab
- [ ] Show log output (refresh if needed):
  ```
  Starting transcode worker...
  Polling SQS queue: n11817143-A3
  Received message: videoId=abc123
  Downloading video from S3: raw/USER#123/2025-11-01-video.mp4
  Download complete: 256MB
  Starting FFmpeg transcoding to 720p...
  Progress: 10%... 25%... 50%... 75%... 100%
  Transcoding complete!
  Uploading to S3: transcoded/720p/abc123.mp4
  Upload complete
  Updating DynamoDB: status=completed
  Deleting SQS message
  Job complete!
  ```
- [ ] Say: "The worker is processing the video using FFmpeg"
- [ ] **Note:** This takes 2-5 minutes - you can speed up in editing

### Shot 5: CloudWatch Metrics (Optional)
- [ ] Split screen or picture-in-picture
- [ ] AWS Console → CloudWatch → Metrics
- [ ] Select: ECS → transcode-worker
- [ ] Show:
  - [ ] CPU Utilization: Spiking to 70-80% ✅
  - [ ] Memory Utilization: 50-60%
- [ ] Say: "High CPU usage during transcoding"

### Shot 6: SQS Queue (After Processing)
- [ ] Go back to: AWS Console → SQS → n11817143-A3
- [ ] Show:
  - [ ] Messages available: **0** ✅
  - [ ] Messages in flight: 0
- [ ] Say: "Worker deleted the message after successful processing"

### Shot 7: Worker Scaling Down (Mention)
- [ ] Go back to: ECS → transcode-worker service
- [ ] Show: Desired count still 1 (cooldown period)
- [ ] Say: "After 5 minutes with no messages, it will scale back to zero automatically"
- [ ] Say: "This saves costs when there's no work to do"

---

## Scene 7: Dead Letter Queue [9:00-10:00]

### Shot 1: DLQ Overview
- [ ] AWS Console → SQS → Queues
- [ ] Click: `n11817143-A3-dlq`
- [ ] Show:
  - [ ] Messages available: **0** ✅ (no failures)
  - [ ] Retention period: **14 days**
- [ ] Say: "This captures failed jobs after 3 retry attempts"

### Shot 2: Main Queue Redrive Policy
- [ ] Go back to: `n11817143-A3` (main queue)
- [ ] Click: "Dead-letter queue" tab
- [ ] Show configuration:
  - [ ] Redrive policy: **Enabled** ✅
  - [ ] Maximum receives: **3**
  - [ ] Dead-letter queue: `n11817143-A3-dlq`
- [ ] Say: "After 3 failed processing attempts, messages move to DLQ"

### Shot 3: CloudWatch Alarm
- [ ] AWS Console → CloudWatch → Alarms
- [ ] Show alarm: `n11817143-app-transcode-dlq-messages`
- [ ] Click it
- [ ] Show configuration:
  - [ ] Metric: ApproximateNumberOfMessagesVisible
  - [ ] Threshold: > 0
  - [ ] State: **OK** ✅ (green, no failures)
- [ ] Say: "I get notified immediately when messages appear in the DLQ"

---

## Scene 8: Video Playback [10:00-11:00]

### Shot 1: Refresh Frontend
- [ ] Go back to browser: https://app.n11817143-videoapp.cab432.com
- [ ] Refresh the page (F5)
- [ ] Show: Video list

### Shot 2: Completed Video
- [ ] Show video card:
  - [ ] Title: "Auto-Scaling Demo Video"
  - [ ] Status: **"completed"** 🟢 (changed from "processing")
  - [ ] Transcoded versions: 720p available
- [ ] Say: "Processing is complete!"

### Shot 3: Video Details
- [ ] Click: Video card
- [ ] Show: Video player page
- [ ] Show details:
  - [ ] Original size: 256MB
  - [ ] Transcoded size: 180MB (smaller)
  - [ ] Resolution: 720p
  - [ ] Upload date
  - [ ] Processing time: ~3 minutes

### Shot 4: Play Video
- [ ] Click: "Play" button or video thumbnail
- [ ] Show: Video playing ✅
- [ ] Show: Streaming from S3 (presigned URL)
- [ ] Say: "Video streams directly from S3 without hitting the API"

---

## Scene 9: Infrastructure as Code [11:00-11:45]

### Shot 1: Terraform Directory
- [ ] Terminal: SSH to EC2 or local terminal
- [ ] Run:
  ```bash
  cd ~/oct1/webapp.v5/terraform
  ls -la
  ```
- [ ] Show files:
  ```
  main.tf
  variables.tf
  outputs.tf
  terraform.tfvars
  modules/
  terraform.tfstate
  ```

### Shot 2: Terraform State
- [ ] Run:
  ```bash
  terraform state list | head -20
  ```
- [ ] Show resources:
  ```
  aws_ecs_cluster.main
  aws_ecs_service.video_api
  aws_ecs_service.admin_service
  aws_ecs_service.transcode_worker
  aws_lb.main
  aws_lambda_function.s3_to_sqs
  aws_sqs_queue.main
  aws_sqs_queue.dlq
  ...
  ```

### Shot 3: Resource Count
- [ ] Run:
  ```bash
  terraform state list | wc -l
  ```
- [ ] Show output: **~35-40 resources**
- [ ] Say: "35 resources managed by Terraform"

### Shot 4: Module Structure
- [ ] Run:
  ```bash
  tree modules/ -L 2 -d
  ```
- [ ] Show:
  ```
  modules/
  ├── alb/
  ├── cognito/
  ├── ecr/
  ├── ecs-cluster/
  ├── ecs-service/
  ├── lambda/
  ├── s3-static-website/
  ├── security-groups/
  └── vpc/
  ```
- [ ] Say: "Nine reusable modules for infrastructure components"

### Shot 5: Terraform Apply (Optional - Don't Actually Run!)
- [ ] Show command (don't execute):
  ```bash
  terraform plan  # Shows what would be created
  # terraform apply  # Would recreate everything
  ```
- [ ] Say: "Everything can be recreated with terraform apply"

---

## Scene 10: Edge Caching [11:45-12:30]

### Shot 1: CloudFront Distribution List
- [ ] AWS Console → CloudFront → Distributions
- [ ] Show: Distribution `E3MBOUQVWZEHJQ`
- [ ] Show:
  - [ ] Status: **Deployed** ✅
  - [ ] State: **Enabled** ✅
  - [ ] Domain: `d1234abcd.cloudfront.net`
- [ ] Click: Distribution

### Shot 2: Origins
- [ ] Click: "Origins" tab
- [ ] Show:
  - [ ] Origin: S3 static website bucket
  - [ ] Origin access: OAC (Origin Access Control) ✅
- [ ] Say: "Serves React app from S3 with CloudFront CDN"

### Shot 3: Behaviors
- [ ] Click: "Behaviors" tab
- [ ] Show:
  - [ ] Path pattern: Default (*)
  - [ ] Cache policy: CachingOptimized
  - [ ] Compress: Yes ✅
- [ ] Say: "Caches HTML, CSS, JavaScript at edge locations globally"

### Shot 4: CNAME (Alternate Domain)
- [ ] Click: "General" tab
- [ ] Show:
  - [ ] Alternate domain names: `app.n11817143-videoapp.cab432.com` ✅
  - [ ] SSL certificate: ACM certificate ✅
- [ ] Say: "Custom domain with HTTPS certificate"

### Shot 5: Monitoring (Optional)
- [ ] Click: "Monitoring" tab
- [ ] Show metrics (if available):
  - [ ] Requests
  - [ ] Bytes downloaded
  - [ ] Cache hit rate: 80-90% ✅
- [ ] Say: "90% of requests served from cache, reducing S3 load"

### Shot 6: Cache Test (Terminal)
- [ ] Terminal:
  ```bash
  curl -I https://app.n11817143-videoapp.cab432.com
  ```
- [ ] Show headers:
  ```
  HTTP/2 200
  x-cache: Hit from cloudfront
  x-amz-cf-pop: SYD62-C1
  ```
- [ ] Say: "Cache hit from Sydney edge location - fast for local users"

---

## Scene 11: Conclusion [12:30-13:00]

### Shot 1: Summary Slide (Optional)
- [ ] Show slide with bullet points:
  ```
  ✅ 3 Microservices on ECS Fargate
  ✅ Auto-scaling (0-10 tasks)
  ✅ Load Balancer with HTTPS
  ✅ Serverless Lambda processing
  ✅ Dead Letter Queue
  ✅ CloudFront CDN
  ✅ Infrastructure as Code (Terraform)
  ✅ Production-ready architecture
  ```

### Shot 2: Closing Statement
- [ ] Say final script:
> "To summarize, I demonstrated three microservices with independent scaling, load distribution via ALB, auto-scaling from zero to ten based on queue depth, HTTPS enforcement, serverless event processing with Lambda, dead letter queue for error handling, global edge caching with CloudFront, and Infrastructure as Code with Terraform managing 35+ resources. The application is production-ready, cost-optimized, and demonstrates all core and additional marking criteria. Thank you for watching."

### Shot 3: End
- [ ] Show: Your name and student ID one more time
- [ ] Optional: "Questions? Email: n11817143@qut.edu.au"
- [ ] Stop recording

---

## ✅ Post-Recording Checklist

- [ ] All 11 scenes recorded
- [ ] Auto-scaling demonstrated (0→1) ✅
- [ ] All 24 marks worth of evidence shown
- [ ] Audio is clear throughout
- [ ] Screen is readable (1080p)
- [ ] No sensitive info visible (credentials, passwords)
- [ ] Duration: 8-13 minutes

---

## 📝 Timestamp Notes

After recording, note actual timestamps:

- [ ] Scene 1: ___:___ - ___:___
- [ ] Scene 2: ___:___ - ___:___
- [ ] Scene 3: ___:___ - ___:___
- [ ] Scene 4: ___:___ - ___:___
- [ ] Scene 5: ___:___ - ___:___
- [ ] Scene 6: ___:___ - ___:___ ⭐
- [ ] Scene 7: ___:___ - ___:___
- [ ] Scene 8: ___:___ - ___:___
- [ ] Scene 9: ___:___ - ___:___
- [ ] Scene 10: ___:___ - ___:___
- [ ] Scene 11: ___:___ - ___:___

**Total duration: _____**

---

**Print this checklist and tick off each shot as you record! 📹**

**Remember: Scene 6 (Auto-Scaling) is worth 3 marks - don't rush it! ⭐**
