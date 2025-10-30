# Assignment 3 Migration Plan - CAB432 Cloud Computing

**Student:** n11817143 (Aswanth Raj)  
**Application:** n11817143 Video Transcoder  
**Date:** October 28, 2025  
**Migration From:** Assignment 2 (Monolithic) → Assignment 3 (Microservices + Cloud-Native)

> **⚠️ CRITICAL ARCHITECTURE DECISIONS:**
> - **Container Orchestration:** ECS Fargate ONLY (no EC2 ASG)
> - **Auto-scaling:** ECS Service level (not instance level)
> - **CloudFront:** S3 static assets only (/thumbnails/*, /static/*) - NOT fronting ALB
> - **Domains:** `n11817143-videoapp.cab432.com` → ALB | `static.n11817143-videoapp.cab432.com` → CloudFront
> - **HTTPS:** ACM certificate in ap-southeast-2, attached to ALB
> - **Lambda:** Container images with ffmpeg binary (not fluent-ffmpeg zip)

---

## 📊 Current Application Architecture (Assignment 2)

### Current Build Summary

#### ✅ Deployed Services
- **Frontend:** React SPA (Nginx container) - Port 3000
- **Backend:** Express.js monolithic API - Port 8080
- **Deployment:** Single EC2 instance with Docker Compose
- **Protocol:** HTTP only

#### ✅ AWS Services in Use
| Service | Purpose | Resource Name |
|---------|---------|---------------|
| **S3** | Video storage (raw, transcoded, thumbnails) | `n11817143-a2` |
| **DynamoDB** | Video metadata persistence | `n11817143-VideoApp` |
| **ElastiCache** | Memcached caching layer | `n11817143-a2-cache` |
| **Cognito** | User authentication & authorization | `ap-southeast-2_CdVnmKfrW` |
| **Parameter Store** | Application configuration | `/n11817143/app/*` |
| **Secrets Manager** | JWT & Cognito secrets | `n11817143-a2-secret` |
| **Route 53** | DNS management | `n11817143-videoapp.cab432.com` |
| **ECR** | Container registry | `n11817143-a2-backend/frontend` |

#### Current Architecture Diagram
```
┌─────────────────────────────────────────────────────────────┐
│                    Current Architecture                       │
└─────────────────────────────────────────────────────────────┘

                         Internet
                            │
                            ▼
                  ┌──────────────────┐
                  │   Route 53 DNS   │
                  │  cab432.com      │
                  └────────┬─────────┘
                           │
                           ▼
                  ┌──────────────────┐
                  │   EC2 Instance   │
                  │  13.210.12.3     │
                  └────────┬─────────┘
                           │
            ┌──────────────┴──────────────┐
            │                             │
            ▼                             ▼
    ┌──────────────┐            ┌──────────────┐
    │  Frontend    │            │   Backend    │
    │  (Nginx)     │            │  (Express)   │
    │  Port 3000   │◄───────────┤  Port 8080   │
    └──────────────┘            └──────┬───────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
                    ▼                  ▼                  ▼
            ┌──────────────┐   ┌──────────────┐  ┌──────────────┐
            │      S3      │   │   DynamoDB   │  │ ElastiCache  │
            │   Storage    │   │   Metadata   │  │    Cache     │
            └──────────────┘   └──────────────┘  └──────────────┘
```

#### Current File Structure
```
webapp.v5/
├── client/                    # React frontend
│   ├── src/
│   ├── Dockerfile
│   └── nginx.conf
├── server/                    # Express backend (MONOLITHIC)
│   ├── src/
│   │   ├── index.js          # Main server
│   │   ├── config.js         # Configuration
│   │   ├── auth/             # Auth routes
│   │   ├── videos/           # Video routes
│   │   ├── admin/            # Admin routes
│   │   └── cache/            # Cache routes
│   ├── Dockerfile
│   └── package.json
├── terraform/                 # Basic IaC
│   ├── main.tf
│   ├── variables.tf
│   └── terraform.tfvars
├── docker-compose.yml         # Container orchestration
└── scripts/                   # Deployment scripts
```

---

## 🎯 Assignment 3 Requirements Analysis

### Core Criteria (10 Marks - MANDATORY)

#### 1. Microservices Architecture (3 marks) ⭐ CRITICAL
**Current:** Single monolithic Express.js application  
**Required:** Split into multiple independent microservices

**Changes Needed:**
- **Auth Service** - Authentication & authorization (merged into video-api)
- **Video-API Service** - Video upload/download/metadata + auth endpoints
- **Transcoding Worker** - Background video processing with FFmpeg (no HTTP port)
- **Admin Service** - User & video management dashboard

**Implementation Details:**
```
Services Architecture (ECS Fargate):
┌─────────────────────────────────────────────────────────────┐
│                      Microservices                           │
├─────────────────────────────────────────────────────────────┤
│  Video-API Service  │  Port 8080  │  /api/* (includes auth) │
│  Admin Service      │  Port 8080  │  /admin/*               │
│  Transcode Worker   │  No port    │  SQS consumer           │
└─────────────────────────────────────────────────────────────┘
```

**Files to Create:**
```
server/services/
├── video-api/
│   ├── src/
│   │   ├── index.js
│   │   ├── healthz.js           # Health check endpoint
│   │   ├── auth/                # Auth routes integrated
│   │   ├── videos/              # Video routes
│   │   └── middleware/
│   ├── Dockerfile
│   └── package.json
├── admin-service/
│   ├── src/
│   │   ├── index.js
│   │   ├── healthz.js           # Health check endpoint
│   │   ├── controllers/
│   │   └── routes/
│   ├── Dockerfile
│   └── package.json
└── transcode-worker/
    ├── src/
    │   ├── worker.js            # SQS consumer
    │   ├── transcoder.js        # FFmpeg processing
    │   └── queue.js
    ├── Dockerfile
    └── package.json
```

---

#### 2. Load Distribution (2 marks) ⭐ CRITICAL
**Current:** Single EC2 instance, no load balancing  
**Required:** Application Load Balancer distributing traffic across ECS Fargate tasks

**AWS Resources Needed:**
- **Application Load Balancer (ALB)** in public subnets
- **Target Groups** (tg-video-api, tg-admin)
- **ALB Listeners** (HTTP:80 → redirect, HTTPS:443)
- **Health Check Endpoints** `/healthz` on each service

**Terraform Configuration:**
```hcl
# terraform/modules/alb/main.tf (NEW MODULE)
resource "aws_lb" "main" {
  name               = "n11817143-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids
  
  tags = {
    Name = "n11817143-alb"
  }
}

resource "aws_lb_target_group" "video_api" {
  name        = "n11817143-video-api-tg"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"  # Required for Fargate
  
  health_check {
    path                = "/healthz"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }
}

resource "aws_lb_target_group" "admin" {
  name        = "n11817143-admin-tg"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"
  
  health_check {
    path                = "/healthz"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"
  
  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = var.acm_certificate_arn
  
  # Default action: forward to video-api
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.video_api.arn
  }
}

# Path-based routing
resource "aws_lb_listener_rule" "admin" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 100
  
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.admin.arn
  }
  
  condition {
    path_pattern {
      values = ["/admin/*"]
    }
  }
}

resource "aws_lb_listener_rule" "api" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 200
  
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.video_api.arn
  }
  
  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }
}
```

**Architecture After ALB:**
```
                         Internet
                            │
                            ▼
                  ┌──────────────────┐
                  │  Application LB  │
                  │   (ALB)          │
                  └────────┬─────────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
            ▼              ▼              ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │ ECS Task    │ │ ECS Task    │ │ ECS Task    │
    │ video-api   │ │ video-api   │ │   admin     │
    └─────────────┘ └─────────────┘ └─────────────┘
```

---

#### 3. Auto Scaling (3 marks) ⭐ CRITICAL
**Current:** Fixed single instance  
**Required:** ECS Service Auto Scaling with dynamic scaling policies

**AWS Resources Needed:**
- **ECS Cluster** (Fargate)
- **ECS Services** with auto-scaling
- **Application Auto Scaling Targets**
- **Scaling Policies** (Target Tracking + Step Scaling)
- **CloudWatch Alarms**

**Terraform Configuration:**
```hcl
# terraform/modules/ecs/autoscaling.tf (NEW MODULE)

# Video-API Service Autoscaling (CPU-based)
resource "aws_appautoscaling_target" "video_api" {
  max_capacity       = 10
  min_capacity       = 1
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.video_api.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "video_api_cpu" {
  name               = "n11817143-video-api-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.video_api.resource_id
  scalable_dimension = aws_appautoscaling_target.video_api.scalable_dimension
  service_namespace  = aws_appautoscaling_target.video_api.service_namespace
  
  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 50.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# Admin Service Autoscaling (CPU-based)
resource "aws_appautoscaling_target" "admin" {
  max_capacity       = 5
  min_capacity       = 1
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.admin.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "admin_cpu" {
  name               = "n11817143-admin-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.admin.resource_id
  scalable_dimension = aws_appautoscaling_target.admin.scalable_dimension
  service_namespace  = aws_appautoscaling_target.admin.service_namespace
  
  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 50.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# Transcode Worker Autoscaling (SQS Queue Depth)
resource "aws_appautoscaling_target" "transcode_worker" {
  max_capacity       = 10
  min_capacity       = 0  # Can scale to zero when no messages
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.transcode_worker.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "transcode_worker_queue" {
  name               = "n11817143-transcode-queue-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.transcode_worker.resource_id
  scalable_dimension = aws_appautoscaling_target.transcode_worker.scalable_dimension
  service_namespace  = aws_appautoscaling_target.transcode_worker.service_namespace
  
  target_tracking_scaling_policy_configuration {
    customized_metric_specification {
      metric_name = "ApproximateNumberOfMessagesVisible"
      namespace   = "AWS/SQS"
      statistic   = "Average"
      
      dimensions {
        name  = "QueueName"
        value = var.transcode_queue_name
      }
    }
    target_value       = 5.0  # Target 5 messages per worker
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}
```

**Scaling Triggers:**
- **video-api:** CPU > 50% → Scale up (1 → 10 tasks)
- **admin:** CPU > 50% → Scale up (1 → 5 tasks)
- **transcode-worker:** Queue depth > 5 messages/task → Scale up (0 → 10 tasks)
- Automatic scale-down when metrics decrease

**Evidence Required:**
```bash
# Prove autoscaling works
# 1. Video-API CPU scaling
aws ecs describe-services --cluster n11817143-cluster --services video-api \
  --query 'services[0].desiredCount'

# 2. Load test to trigger scaling
ab -n 10000 -c 100 https://n11817143-videoapp.cab432.com/api/videos

# 3. Watch tasks scale: 1 → 3 → 5
watch -n 5 'aws ecs list-tasks --cluster n11817143-cluster --service video-api'

# 4. Queue depth scaling for transcode-worker
aws sqs send-message-batch --queue-url $QUEUE_URL --entries file://messages.json
# Watch workers scale: 0 → 5 → 10
```

---

#### 4. HTTPS/TLS (2 marks) ⭐ CRITICAL
**Current:** HTTP only (ports 3000, 8080)  
**Required:** HTTPS with valid SSL certificate attached to ALB

**AWS Resources Needed:**
- **ACM Certificate** (issued in ap-southeast-2 region)
- **Route 53 DNS validation**
- **ALB HTTPS Listener** on port 443
- **HTTP → HTTPS redirect**

**Terraform Configuration:**
```hcl
# terraform/modules/acm/main.tf (NEW MODULE)
resource "aws_acm_certificate" "main" {
  domain_name       = "n11817143-videoapp.cab432.com"
  validation_method = "DNS"
  
  subject_alternative_names = [
    "*.n11817143-videoapp.cab432.com"  # For static subdomain
  ]
  
  lifecycle {
    create_before_destroy = true
  }
  
  tags = {
    Name = "n11817143-videoapp-cert"
  }
}

# Automatic DNS validation
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }
  
  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main.zone_id
}

resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# Route 53 ALIAS to ALB
resource "aws_route53_record" "alb" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "n11817143-videoapp.cab432.com"
  type    = "A"
  
  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

# Separate CNAME for CloudFront (static assets)
resource "aws_route53_record" "cloudfront" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "static.n11817143-videoapp.cab432.com"
  type    = "CNAME"
  ttl     = 300
  records = [var.cloudfront_domain_name]
}
```

**Domain Strategy:**
- **n11817143-videoapp.cab432.com** → ALB (API traffic via HTTPS)
- **static.n11817143-videoapp.cab432.com** → CloudFront (S3 static assets)

**Application Changes:**
```javascript
// client/src/config.js
const config = {
  API_BASE_URL: 'https://n11817143-videoapp.cab432.com/api',
  ADMIN_BASE_URL: 'https://n11817143-videoapp.cab432.com/admin',
  CDN_BASE_URL: 'https://static.n11817143-videoapp.cab432.com',
  
  // Use CDN for thumbnails
  getThumbnailUrl: (videoId) => 
    `${config.CDN_BASE_URL}/thumbnails/${videoId}_thumb.jpg`
};
```

**CRITICAL:** ACM certificate MUST be in ap-southeast-2 (same region as ALB)

---

### Additional Criteria (Choose 7 for 14 Marks)

#### Recommended Selection Strategy
✅ **Easy Wins:** Serverless, SQS/SNS, CloudFront, DLQ  
✅ **Medium Effort:** ECS, Custom Metrics, Enhanced IaC  
❌ **Skip:** EKS (too complex), Additional Microservices (covered in core)

---

#### ✅ SELECTED: 1. Serverless Functions (2 marks)
**Purpose:** S3-to-SQS trigger using Lambda container image with ffmpeg

**Implementation:**
- **Lambda Function:** S3 event handler → pushes to SQS queue
- **Container Image:** Custom Docker image with ffmpeg binary
- **S3 Event Trigger:** raw-videos bucket ObjectCreated
- **SQS Integration:** Sends transcode job to queue

**Terraform Configuration:**
```hcl
# terraform/modules/lambda/main.tf (NEW MODULE)
resource "aws_lambda_function" "s3_to_sqs" {
  function_name = "n11817143-s3-to-sqs"
  role          = aws_iam_role.lambda_exec.arn
  package_type  = "Image"
  image_uri     = "${var.ecr_repo_url}:latest"
  timeout       = 60
  memory_size   = 512
  
  environment {
    variables = {
      QUEUE_URL = var.transcode_queue_url
      AWS_REGION = var.aws_region
    }
  }
}

resource "aws_iam_role" "lambda_exec" {
  name = "n11817143-lambda-exec-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "lambda_policy" {
  name = "n11817143-lambda-policy"
  role = aws_iam_role.lambda_exec.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage"
        ]
        Resource = var.transcode_queue_arn
      }
    ]
  })
}

resource "aws_s3_bucket_notification" "raw_videos" {
  bucket = var.raw_videos_bucket_id
  
  lambda_function {
    lambda_function_arn = aws_lambda_function.s3_to_sqs.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "raw/"
    filter_suffix       = ".mp4"
  }
}

resource "aws_lambda_permission" "allow_s3" {
  statement_id  = "AllowS3Invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.s3_to_sqs.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = var.raw_videos_bucket_arn
}
```

**Lambda Container Image (Dockerfile):**
```dockerfile
# lambda/s3-to-sqs/Dockerfile (NEW FILE)
FROM public.ecr.aws/lambda/nodejs:18

# Install ffmpeg (for future thumbnail generation if needed)
RUN yum install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-7.noarch.rpm && \
    yum install -y ffmpeg && \
    yum clean all

# Copy function code
COPY package*.json ${LAMBDA_TASK_ROOT}/
RUN npm ci --production

COPY index.js ${LAMBDA_TASK_ROOT}/

CMD [ "index.handler" ]
```

**Lambda Function Code:**
```javascript
// lambda/s3-to-sqs/index.js (NEW FILE)
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const sqsClient = new SQSClient({ region: process.env.AWS_REGION });

export const handler = async (event) => {
  console.log('S3 event received:', JSON.stringify(event, null, 2));
  
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    
    // Extract video ID from key: raw/{uuid}.mp4
    const videoId = key.split('/').pop().replace('.mp4', '');
    
    // Send message to SQS transcode queue
    const message = {
      videoId,
      bucket,
      key,
      timestamp: new Date().toISOString()
    };
    
    await sqsClient.send(new SendMessageCommand({
      QueueUrl: process.env.QUEUE_URL,
      MessageBody: JSON.stringify(message),
      MessageAttributes: {
        videoId: { DataType: 'String', StringValue: videoId }
      }
    }));
    
    console.log(`Sent transcode job for ${videoId} to SQS`);
  }
  
  return { statusCode: 200, body: 'Success' };
};
```

**CRITICAL:** Lambda uses container image, NOT zip with fluent-ffmpeg

---

#### ✅ SELECTED: 2. Communication Mechanisms - SQS/SNS (2 marks)
**Purpose:** Asynchronous service-to-service communication with DLQ

**AWS Resources:**
- **SQS Queue:** transcode-jobs (main queue)
- **SQS Queue:** transcode-jobs-dlq (dead letter queue)
- **SNS Topic:** video-events (notifications)
- **Redrive Policy:** maxReceiveCount=3

**Architecture:**
```
S3 raw-videos → Lambda → SQS transcode-jobs → ECS Worker → Process
                                    │
                                    ├─→ Success → SNS video-events
                                    └─→ Failed (3x) → DLQ → CloudWatch Alarm
```

**Terraform Configuration:**
```hcl
# terraform/modules/messaging/main.tf (NEW MODULE)
resource "aws_sqs_queue" "transcode_jobs_dlq" {
  name                      = "n11817143-transcode-jobs-dlq"
  message_retention_seconds = 1209600  # 14 days
  
  tags = {
    Name = "n11817143-transcode-dlq"
  }
}

resource "aws_sqs_queue" "transcode_jobs" {
  name                       = "n11817143-transcode-jobs"
  visibility_timeout_seconds = 900  # 15 minutes for transcoding
  message_retention_seconds  = 1209600  # 14 days
  receive_wait_time_seconds  = 20  # Long polling
  
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.transcode_jobs_dlq.arn
    maxReceiveCount     = 3
  })
  
  tags = {
    Name = "n11817143-transcode-queue"
  }
}

resource "aws_sns_topic" "video_events" {
  name = "n11817143-video-events"
  
  tags = {
    Name = "n11817143-video-events"
  }
}

resource "aws_sns_topic_subscription" "email_alerts" {
  topic_arn = aws_sns_topic.video_events.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# CloudWatch Alarm for DLQ
resource "aws_cloudwatch_metric_alarm" "dlq_messages" {
  alarm_name          = "n11817143-dlq-messages"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = "300"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "Alert when messages appear in DLQ"
  alarm_actions       = [aws_sns_topic.video_events.arn]
  
  dimensions = {
    QueueName = aws_sqs_queue.transcode_jobs_dlq.name
  }
}
```

**Worker Code (SQS Consumer):**
```javascript
// server/services/transcode-worker/src/worker.js (NEW)
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { transcodeVideo } from './transcoder.js';
import { publishEvent } from './sns.js';

const sqsClient = new SQSClient({ region: process.env.AWS_REGION });
const QUEUE_URL = process.env.QUEUE_URL;

async function pollQueue() {
  while (true) {
    try {
      const response = await sqsClient.send(new ReceiveMessageCommand({
        QueueUrl: QUEUE_URL,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 20,
        VisibilityTimeout: 900
      }));
      
      if (response.Messages && response.Messages.length > 0) {
        const message = response.Messages[0];
        const job = JSON.parse(message.Body);
        
        console.log('Processing job:', job.videoId);
        
        // Transcode video
        await transcodeVideo(job);
        
        // Delete message from queue
        await sqsClient.send(new DeleteMessageCommand({
          QueueUrl: QUEUE_URL,
          ReceiptHandle: message.ReceiptHandle
        }));
        
        // Publish success event
        await publishEvent('video.transcoded', job);
        
        console.log('Job completed:', job.videoId);
      }
    } catch (error) {
      console.error('Worker error:', error);
      // Message will return to queue and retry (up to 3 times, then DLQ)
    }
  }
}

pollQueue();
```

---

#### ✅ SELECTED: 3. Container Orchestration - ECS (2 marks)
**Purpose:** Run microservices on ECS Fargate (serverless containers)

**Migration Path:**
- Convert `docker-compose.yml` → ECS Task Definitions
- Create ECS Cluster (Fargate only)
- Define ECS Services for each microservice
- Configure service discovery (optional)
- Set up ECS service auto-scaling

**Terraform Configuration:**
```hcl
# terraform/modules/ecs/main.tf (NEW MODULE)
resource "aws_ecs_cluster" "main" {
  name = "n11817143-cluster"
  
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
  
  tags = {
    Name = "n11817143-ecs-cluster"
  }
}

# IAM Roles
resource "aws_iam_role" "ecs_execution" {
  name = "n11817143-ecs-execution-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "video_api_task" {
  name = "n11817143-video-api-task-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "video_api_task" {
  name = "n11817143-video-api-policy"
  role = aws_iam_role.video_api_task.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject"
        ]
        Resource = "${var.raw_videos_bucket_arn}/raw/*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:UpdateItem"
        ]
        Resource = var.dynamodb_table_arn
      }
    ]
  })
}

resource "aws_iam_role" "transcode_worker_task" {
  name = "n11817143-transcode-worker-task-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "transcode_worker_task" {
  name = "n11817143-transcode-worker-policy"
  role = aws_iam_role.transcode_worker_task.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject"
        ]
        Resource = "${var.raw_videos_bucket_arn}/raw/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject"
        ]
        Resource = "${var.processed_videos_bucket_arn}/transcoded/*"
      },
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = var.transcode_queue_arn
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = var.video_events_topic_arn
      }
    ]
  })
}

# Video-API Task Definition
resource "aws_ecs_task_definition" "video_api" {
  family                   = "n11817143-video-api"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.video_api_task.arn
  
  container_definitions = jsonencode([{
    name  = "video-api"
    image = "${var.ecr_video_api_repo_url}:latest"
    
    portMappings = [{
      containerPort = 8080
      protocol      = "tcp"
    }]
    
    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "AWS_REGION", value = var.aws_region },
      { name = "S3_BUCKET", value = var.raw_videos_bucket_name },
      { name = "DYNAMODB_TABLE", value = var.dynamodb_table_name }
    ]
    
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/n11817143-video-api"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }
    
    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost:8080/healthz || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60
    }
  }])
}

# Video-API Service
resource "aws_ecs_service" "video_api" {
  name            = "n11817143-video-api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.video_api.arn
  desired_count   = 1
  launch_type     = "FARGATE"
  
  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }
  
  load_balancer {
    target_group_arn = var.video_api_target_group_arn
    container_name   = "video-api"
    container_port   = 8080
  }
  
  depends_on = [var.alb_listener_https]
}

# Admin Task Definition & Service (similar structure)
resource "aws_ecs_task_definition" "admin" {
  family                   = "n11817143-admin"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_execution.arn  # Read-only
  
  container_definitions = jsonencode([{
    name  = "admin"
    image = "${var.ecr_admin_repo_url}:latest"
    portMappings = [{ containerPort = 8080, protocol = "tcp" }]
    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "AWS_REGION", value = var.aws_region }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/n11817143-admin"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }
    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost:8080/healthz || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60
    }
  }])
}

resource "aws_ecs_service" "admin" {
  name            = "n11817143-admin"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.admin.arn
  desired_count   = 1
  launch_type     = "FARGATE"
  
  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }
  
  load_balancer {
    target_group_arn = var.admin_target_group_arn
    container_name   = "admin"
    container_port   = 8080
  }
  
  depends_on = [var.alb_listener_https]
}

# Transcode Worker Task Definition (no load balancer)
resource "aws_ecs_task_definition" "transcode_worker" {
  family                   = "n11817143-transcode-worker"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.transcode_worker_task.arn
  
  container_definitions = jsonencode([{
    name  = "transcode-worker"
    image = "${var.ecr_transcode_worker_repo_url}:latest"
    
    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "AWS_REGION", value = var.aws_region },
      { name = "QUEUE_URL", value = var.transcode_queue_url },
      { name = "S3_BUCKET", value = var.processed_videos_bucket_name },
      { name = "OUTPUT_PREFIX", value = "transcoded/" },
      { name = "SNS_TOPIC_ARN", value = var.video_events_topic_arn }
    ]
    
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/n11817143-transcode-worker"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])
}

resource "aws_ecs_service" "transcode_worker" {
  name            = "n11817143-transcode-worker"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.transcode_worker.arn
  desired_count   = 0  # Scale to zero when no messages
  launch_type     = "FARGATE"
  
  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }
  
  # No load balancer - background worker
}
```

**CRITICAL:** ECS Fargate only. No EC2 ASG. Separate execution vs task roles with least privilege.

---

#### ✅ SELECTED: 4. Custom Scaling Metric (2 marks)
**Purpose:** Scale based on application-specific metrics

**Custom Metrics:**
- Video processing queue depth
- Active transcoding jobs
- Failed upload rate
- Average response time

**CloudWatch Custom Metrics:**
```javascript
// server/services/video-service/src/metrics.js (NEW)
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

export async function publishQueueDepth(depth) {
  const client = new CloudWatchClient({ region: 'ap-southeast-2' });
  
  await client.send(new PutMetricDataCommand({
    Namespace: 'n11817143/VideoApp',
    MetricData: [{
      MetricName: 'ProcessingQueueDepth',
      Value: depth,
      Unit: 'Count',
      Timestamp: new Date()
    }]
  }));
}
```

**Terraform Scaling Policy:**
```hcl
resource "aws_appautoscaling_policy" "ecs_queue_depth" {
  name               = "n11817143-queue-depth-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_target.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target.service_namespace
  
  target_tracking_scaling_policy_configuration {
    customized_metric_specification {
      metric_name = "ProcessingQueueDepth"
      namespace   = "n11817143/VideoApp"
      statistic   = "Average"
    }
    target_value = 10.0
  }
}
```

---

#### ✅ SELECTED: 5. Enhanced Infrastructure as Code (2 marks)
**Purpose:** Complete, modular, production-ready IaC

**Improvements:**
- **Terraform Modules:** Reusable components
- **Multiple Environments:** dev, staging, prod
- **Remote State:** S3 + DynamoDB locking
- **Outputs:** Export important values
- **Variables:** Parameterized configuration

**New Structure:**
```
terraform/
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   ├── terraform.tfvars
│   │   └── backend.tf
│   ├── staging/
│   └── prod/
├── modules/
│   ├── alb/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── asg/
│   ├── ecs/
│   ├── lambda/
│   ├── networking/
│   └── storage/
├── main.tf
├── variables.tf
├── outputs.tf
└── backend.tf
```

**Remote State Configuration:**
```hcl
# terraform/backend.tf (NEW)
terraform {
  backend "s3" {
    bucket         = "n11817143-terraform-state"
    key            = "assignment3/terraform.tfstate"
    region         = "ap-southeast-2"
    dynamodb_table = "n11817143-terraform-locks"
    encrypt        = true
  }
}
```

---

#### ✅ SELECTED: 6. Dead Letter Queue (2 marks)
**Purpose:** Handle failed message processing

**Implementation:**
- DLQ for video processing queue
- DLQ for notification queue
- Monitoring and alerting on DLQ depth
- Retry mechanism with exponential backoff

**Already included in SQS setup above** - See messaging.tf

**Monitoring:**
```hcl
resource "aws_cloudwatch_metric_alarm" "dlq_messages" {
  alarm_name          = "n11817143-dlq-messages"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "Alert when messages in DLQ"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  
  dimensions = {
    QueueName = aws_sqs_queue.video_processing_dlq.name
  }
}
```

---

#### ✅ SELECTED: 7. Edge Caching - CloudFront (2 marks)
**Purpose:** Cache S3 static assets and thumbnails at edge locations (NOT fronting ALB)

**CloudFront Configuration:**
- **Origin 1:** S3 static-frontend bucket (index.html, JS, CSS)
- **Origin 2:** S3 processed-videos bucket (thumbnails)
- **Domain:** static.n11817143-videoapp.cab432.com
- **DO NOT** front the ALB with CloudFront

**Terraform Configuration:**
```hcl
# terraform/modules/cloudfront/main.tf (NEW MODULE)

# Origin Access Control for S3
resource "aws_cloudfront_origin_access_control" "s3_oac" {
  name                              = "n11817143-s3-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "n11817143 Static Assets CDN"
  default_root_object = "index.html"
  aliases             = ["static.n11817143-videoapp.cab432.com"]
  
  # Origin 1: Frontend static files
  origin {
    domain_name              = var.static_frontend_bucket_regional_domain_name
    origin_id                = "S3-static-frontend"
    origin_access_control_id = aws_cloudfront_origin_access_control.s3_oac.id
  }
  
  # Origin 2: Processed videos (thumbnails)
  origin {
    domain_name              = var.processed_videos_bucket_regional_domain_name
    origin_id                = "S3-processed-videos"
    origin_access_control_id = aws_cloudfront_origin_access_control.s3_oac.id
  }
  
  # Default behavior: Frontend static files
  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    target_origin_id       = "S3-static-frontend"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    
    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
    
    min_ttl     = 0
    default_ttl = 86400   # 1 day
    max_ttl     = 31536000  # 1 year
  }
  
  # Behavior: Thumbnails
  ordered_cache_behavior {
    path_pattern           = "/thumbnails/*"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    target_origin_id       = "S3-processed-videos"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    
    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
    
    min_ttl     = 0
    default_ttl = 604800    # 7 days
    max_ttl     = 31536000  # 1 year
  }
  
  # Behavior: Static assets (JS, CSS, images)
  ordered_cache_behavior {
    path_pattern           = "/static/*"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    target_origin_id       = "S3-static-frontend"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    
    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
    
    min_ttl     = 0
    default_ttl = 2592000   # 30 days
    max_ttl     = 31536000  # 1 year
  }
  
  # SSL Certificate (CloudFront uses us-east-1 certs, or you can use CloudFront default cert)
  viewer_certificate {
    cloudfront_default_certificate = true  # Use CloudFront domain, or add ACM cert in us-east-1
    minimum_protocol_version       = "TLSv1.2_2021"
  }
  
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  
  tags = {
    Name = "n11817143-cdn"
  }
}

# S3 Bucket Policy to allow CloudFront OAC access
resource "aws_s3_bucket_policy" "static_frontend_cloudfront" {
  bucket = var.static_frontend_bucket_id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "AllowCloudFrontOAC"
      Effect = "Allow"
      Principal = {
        Service = "cloudfront.amazonaws.com"
      }
      Action   = "s3:GetObject"
      Resource = "${var.static_frontend_bucket_arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.main.arn
        }
      }
    }]
  })
}

resource "aws_s3_bucket_policy" "processed_videos_cloudfront" {
  bucket = var.processed_videos_bucket_id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "AllowCloudFrontOAC"
      Effect = "Allow"
      Principal = {
        Service = "cloudfront.amazonaws.com"
      }
      Action   = "s3:GetObject"
      Resource = "${var.processed_videos_bucket_arn}/thumbnails/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.main.arn
        }
      }
    }]
  })
}

output "cloudfront_domain_name" {
  value = aws_cloudfront_distribution.main.domain_name
}
```

**Route 53 CNAME (from acm module):**
```hcl
resource "aws_route53_record" "cloudfront" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "static.n11817143-videoapp.cab432.com"
  type    = "CNAME"
  ttl     = 300
  records = [var.cloudfront_domain_name]
}
```

**CRITICAL:** 
- CloudFront only for S3 static assets (/static/*, /thumbnails/*)
- DO NOT front the ALB
- Use separate subdomain: static.n11817143-videoapp.cab432.com
- API stays on n11817143-videoapp.cab432.com → ALB

---

### NOT SELECTED (Skip These)

#### ❌ Additional Microservices (2 marks)
**Reason:** Core microservices (4) already cover this requirement

#### ❌ Advanced Container Orchestration - EKS (2 marks)
**Reason:** ECS is sufficient and less complex. EKS requires:
- Kubernetes knowledge
- Complex networking
- More expensive
- Longer setup time

#### ❌ Upon Request (2 marks)
**Reason:** Requires instructor approval, uncertain criteria

---

## 📋 Complete Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] **1.1** Create microservices directory structure
- [ ] **1.2** Split monolithic backend into 3 services (video-api, admin, transcode-worker)
- [ ] **1.3** Add `/healthz` endpoints to video-api and admin
- [ ] **1.4** Create individual Dockerfiles for each service
- [ ] **1.5** Create Lambda container image with ffmpeg
- [ ] **1.6** Test services locally with docker-compose
- [ ] **1.7** Push Docker images to ECR

### Phase 2: Infrastructure - Networking (Week 1)
- [ ] **2.1** Create VPC with 2 public + 2 private subnets
- [ ] **2.2** Set up NAT Gateway for private subnets
- [ ] **2.3** Configure security groups (ALB, ECS tasks)
- [ ] **2.4** Create S3 buckets (raw-videos, processed-videos, static-frontend)
- [ ] **2.5** Enable S3 encryption and block public access
- [ ] **2.6** Set up Terraform remote state (S3 + DynamoDB locking)

### Phase 3: HTTPS & Load Balancing (Week 1-2)
- [ ] **3.1** Request ACM certificate in ap-southeast-2
- [ ] **3.2** Validate certificate via Route 53 DNS
- [ ] **3.3** Create Application Load Balancer in public subnets
- [ ] **3.4** Create target groups (tg-video-api, tg-admin) with /healthz checks
- [ ] **3.5** Configure ALB listeners (HTTP→HTTPS redirect, HTTPS:443)
- [ ] **3.6** Set up path-based routing (/api/* → video-api, /admin/* → admin)
- [ ] **3.7** Create Route 53 ALIAS: n11817143-videoapp.cab432.com → ALB

### Phase 4: ECS Fargate (Week 2)
- [ ] **4.1** Create ECS Cluster (Fargate)
- [ ] **4.2** Create IAM execution role (AmazonECSTaskExecutionRolePolicy)
- [ ] **4.3** Create IAM task roles with least privilege per service
- [ ] **4.4** Define ECS task definitions (video-api, admin, transcode-worker)
- [ ] **4.5** Create ECS services (video-api + admin with ALB, worker without)
- [ ] **4.6** Verify health checks pass and tasks are healthy

### Phase 5: ECS Auto-Scaling (Week 2)
- [ ] **5.1** Create Application Auto Scaling targets for all services
- [ ] **5.2** Configure video-api CPU target tracking (50%, min 1, max 10)
- [ ] **5.3** Configure admin CPU target tracking (50%, min 1, max 5)
- [ ] **5.4** Configure transcode-worker SQS queue depth scaling (min 0, max 10)
- [ ] **5.5** Test auto-scaling: load test video-api to trigger CPU scaling
- [ ] **5.6** Test queue scaling: flood SQS to scale workers

### Phase 6: Messaging & Serverless (Week 2-3)
- [ ] **6.1** Create SQS queue: transcode-jobs with DLQ (maxReceiveCount=3)
- [ ] **6.2** Create SNS topic: video-events
- [ ] **6.3** Subscribe email to SNS for demo alerts
- [ ] **6.4** Deploy Lambda container function (s3-to-sqs)
- [ ] **6.5** Configure S3 event notification: raw-videos → Lambda
- [ ] **6.6** Grant Lambda permissions to write to SQS
- [ ] **6.7** Test: upload video → Lambda → SQS → Worker processes

### Phase 7: CloudFront CDN (Week 3)
- [ ] **7.1** Create CloudFront distribution with S3 origins
- [ ] **7.2** Configure Origin Access Control (OAC)
- [ ] **7.3** Set up cache behaviors (/thumbnails/*, /static/*)
- [ ] **7.4** Update S3 bucket policies for CloudFront access
- [ ] **7.5** Create Route 53 CNAME: static.n11817143-videoapp.cab432.com → CloudFront
- [ ] **7.6** Test cache hits for thumbnails

### Phase 8: Monitoring & Alerting (Week 3)
- [ ] **8.1** Create CloudWatch dashboards (ECS CPU, ALB metrics, SQS depth)
- [ ] **8.2** Configure DLQ CloudWatch alarm → SNS
- [ ] **8.3** Set up CloudWatch Logs for ECS tasks
- [ ] **8.4** Test DLQ: force bad message to trigger alarm
- [ ] **8.5** Verify SNS email notifications work

### Phase 9: Testing & Documentation (Week 4)
- [ ] **9.1** Load testing: Apache Bench on /api/videos
- [ ] **9.2** Prove ECS auto-scaling: 1 → 3 → 1 tasks
- [ ] **9.3** Prove queue-based scaling for transcode-worker
- [ ] **9.4** Security testing: verify HTTPS, no public S3 access
- [ ] **9.5** Capture screenshots: ALB health checks, ECS services, scaling events
- [ ] **9.6** Create architecture diagrams
- [ ] **9.7** Write deployment guide
- [ ] **9.8** Document design decisions
- [ ] **9.9** Cost analysis report
- [ ] **9.10** Final A3_response_to_criteria.md

---

## 🏗️ Target Architecture (Assignment 3)

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Assignment 3 Architecture                      │
│                         (ECS Fargate + CloudFront)                      │
└────────────────────────────────────────────────────────────────────────┘

                              Internet
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
          ┌──────────────────┐      ┌──────────────────┐
          │   CloudFront     │      │   Route 53 DNS   │
          │  (Edge Cache)    │      │  n11817143...    │
          │  static.* only   │      │  → ALB ALIAS     │
          └────────┬─────────┘      └────────┬─────────┘
                   │                         │
                   │                         ▼
                   │              ┌──────────────────────┐
                   │              │  Application LB      │
                   │              │  (ALB - HTTPS:443)   │
                   │              └─────────┬────────────┘
                   │                        │
                   │      ┌─────────────────┼─────────────────┐
                   │      │                 │                 │
                   │      ▼                 ▼                 ▼
                   │  ┌─────────┐      ┌─────────┐      ┌─────────┐
                   │  │video-api│      │video-api│      │  admin  │
                   │  │  Task   │      │  Task   │      │  Task   │
                   │  └─────────┘      └─────────┘      └─────────┘
                   │       ECS Fargate (Auto-scales on CPU)
                   │
                   ▼
         ┌────────────────────┐
         │  S3 Buckets        │
         ├────────────────────┤
         │  static-frontend/  │◄─── CloudFront Origin 1
         │  thumbnails/       │◄─── CloudFront Origin 2
         └────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                   Background Processing Pipeline                  │
└──────────────────────────────────────────────────────────────────┘

  S3 raw-videos/      Lambda Container        SQS Queue
  ObjectCreated   →   (s3-to-sqs)        →   transcode-jobs
      event               ↓                        ↓
                    Sends message           ECS Worker Tasks
                                            (Auto-scales on
                                             queue depth)
                                                  ↓
                                            Transcode video
                                                  ↓
                                        S3 processed-videos/
                                                  ↓
                                            SNS Publish
                                            (video-events)

                    DLQ (after 3 retries)
                          ↓
                    CloudWatch Alarm
                          ↓
                    SNS Email Alert

┌──────────────────────────────────────────────────────────────────┐
│                         Data Layer                                │
└──────────────────────────────────────────────────────────────────┘

  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │    S3    │  │ DynamoDB │  │ElastiCache│  │ Cognito  │
  │ Storage  │  │ Metadata │  │   Cache   │  │   Auth   │
  └──────────┘  └──────────┘  └──────────┘  └──────────┘
```

**Key Differences from A2:**
- ❌ No EC2 instances, no ASG
- ✅ ECS Fargate tasks (serverless containers)
- ✅ ECS Service auto-scaling (CPU + queue depth)
- ✅ ALB with path-based routing + HTTPS
- ✅ CloudFront for S3 static assets only (NOT fronting ALB)
- ✅ Lambda container with ffmpeg → SQS → ECS worker
- ✅ Separate domains: API on ALB, static on CloudFront

---

## 📁 Complete File Structure (After Migration)

```
webapp.v5/
├── client/                          # React frontend
│   ├── src/
│   │   ├── api.js                   # Update: use CDN for thumbnails
│   │   └── config.js                # API: ALB domain, CDN: CloudFront domain
│   ├── Dockerfile
│   └── nginx.conf
│
├── server/
│   ├── services/                    # NEW: Microservices (3 services)
│   │   ├── video-api/
│   │   │   ├── src/
│   │   │   │   ├── index.js
│   │   │   │   ├── healthz.js       # NEW: Health check endpoint
│   │   │   │   ├── auth/            # Integrated auth routes
│   │   │   │   │   ├── auth.controller.js
│   │   │   │   │   ├── auth.routes.js
│   │   │   │   │   └── cognito.service.js
│   │   │   │   ├── videos/          # Video routes
│   │   │   │   │   ├── video.controller.js
│   │   │   │   │   ├── video.routes.js
│   │   │   │   │   └── video.service.js
│   │   │   │   └── middleware/
│   │   │   ├── Dockerfile
│   │   │   └── package.json
│   │   │
│   │   ├── admin-service/
│   │   │   ├── src/
│   │   │   │   ├── index.js
│   │   │   │   ├── healthz.js       # NEW: Health check endpoint
│   │   │   │   ├── controllers/
│   │   │   │   └── routes/
│   │   │   ├── Dockerfile
│   │   │   └── package.json
│   │   │
│   │   └── transcode-worker/       # Background worker (no HTTP port)
│   │       ├── src/
│   │       │   ├── worker.js        # SQS consumer main loop
│   │       │   ├── transcoder.js    # FFmpeg processing
│   │       │   ├── queue.js         # SQS helpers
│   │       │   └── sns.js           # SNS publisher
│   │       ├── Dockerfile           # Includes ffmpeg binary
│   │       └── package.json
│   │
│   └── shared/                      # NEW: Shared utilities
│       ├── config/
│       ├── auth/
│       └── utils/
│
├── lambda/                          # NEW: Lambda functions
│   └── s3-to-sqs/
│       ├── index.js                 # S3 event → SQS
│       ├── Dockerfile               # Container image with ffmpeg
│       └── package.json
│
├── terraform/                       # ENHANCED: Modular IaC (ECS-focused)
│   ├── environments/                # NEW: Multi-environment
│   │   ├── dev/
│   │   │   ├── main.tf
│   │   │   ├── terraform.tfvars
│   │   │   └── backend.tf
│   │   └── prod/
│   │
│   ├── modules/                     # NEW: Reusable modules
│   │   ├── networking/              # VPC, subnets, NAT, IGW
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   ├── alb/                     # ALB, TG, listeners, rules
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   ├── ecs/                     # Cluster, task defs, services, autoscaling
│   │   │   ├── main.tf
│   │   │   ├── autoscaling.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   ├── iam/                     # All IAM roles and policies
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   ├── messaging/               # SQS, SNS, DLQ, alarms
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   ├── lambda/                  # Lambda functions, triggers
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   ├── acm/                     # ACM cert, Route 53 validation
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   ├── cloudfront/              # CDN, OAC, S3 policies
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   └── storage/                 # S3 buckets, DynamoDB
│   │       ├── main.tf
│   │       ├── variables.tf
│   │       └── outputs.tf
│   │
│   ├── main.tf                      # Root module (calls all modules)
│   ├── variables.tf                 # Global variables
│   ├── outputs.tf                   # Exported values
│   ├── backend.tf                   # NEW: S3 + DynamoDB remote state
│   └── terraform.tfvars.example     # Example configuration
│
├── docker-compose.yml               # UPDATED: Local dev (3 services)
├── scripts/
│   ├── build-images.sh              # NEW: Build all Docker images
│   ├── push-to-ecr.sh               # NEW: Push to ECR
│   ├── deploy-ecs.sh                # NEW: Deploy to ECS
│   └── health-check.sh              # NEW: Check all services
│
├── docs/                            # NEW: Documentation
│   ├── architecture.md
│   ├── deployment-guide.md
│   ├── evidence.md                  # Screenshots and proof
│   └── api-documentation.md
│
├── A2_response_to_criteria.md       # EXISTING
├── A3_response_to_criteria.md       # NEW: Assignment 3 responses
├── A3_MIGRATION_PLAN.md             # THIS FILE
└── README.md                        # UPDATED: New architecture
```

**Key Changes:**
- ❌ Removed: auth-service (merged into video-api)
- ✅ Added: healthz.js in API services
- ✅ Added: Lambda container with ffmpeg
- ✅ Added: Comprehensive Terraform modules (9 modules)
- ✅ Added: ECS autoscaling configurations
- ✅ Added: Evidence documentation folder

---

## ⏱️ Estimated Timeline

### Week 1: Foundation & Infrastructure (20 hours)
- **Days 1-2:** Microservices refactoring (8h)
- **Days 3-4:** Terraform modules & ALB setup (8h)
- **Day 5:** ACM certificate & HTTPS (4h)

### Week 2: Scaling & Orchestration (20 hours)
- **Days 1-2:** Auto Scaling Group configuration (6h)
- **Days 3-4:** ECS migration (10h)
- **Day 5:** Testing and debugging (4h)

### Week 3: Advanced Features (18 hours)
- **Days 1-2:** Lambda functions & S3 triggers (8h)
- **Days 3-4:** SQS/SNS messaging (6h)
- **Day 5:** CloudFront & custom metrics (4h)

### Week 4: Testing & Documentation (12 hours)
- **Days 1-2:** Load testing & monitoring (4h)
- **Days 3-4:** Documentation & diagrams (6h)
- **Day 5:** Final report & submission (2h)

**TOTAL: ~70 hours over 4 weeks**

---

## 💰 Cost Estimation

### Monthly Costs (Estimated - ECS Fargate Architecture)

| Service | Configuration | Estimated Cost |
|---------|--------------|----------------|
| **ECS Fargate** | 3 tasks avg (video-api, admin, worker) @ 0.5 vCPU, 1GB | ~$35 |
| **ALB** | 1x Application LB | ~$20 |
| **Lambda** | 10K invocations/month (container) | ~$5 |
| **S3** | 100GB storage + transfer | ~$15 |
| **DynamoDB** | On-demand, low usage | ~$5 |
| **ElastiCache** | t3.micro | ~$15 |
| **CloudFront** | 100GB transfer (static only) | ~$8 |
| **SQS/SNS** | 1M requests | ~$1 |
| **ACM** | Certificate | Free |
| **Route 53** | Hosted zone + queries | ~$1 |
| **CloudWatch** | Logs + metrics | ~$10 |
| **NAT Gateway** | For private subnets (1 NAT) | ~$32 |
| **Data Transfer** | Outbound | ~$15 |
| **TOTAL** | | **~$162/month** |

### Cost Comparison
- **Assignment 2 (Single EC2):** ~$52/month
- **Assignment 3 (ECS Fargate):** ~$162/month
- **Increase:** ~$110/month (3.1x)

### Cost Optimization Tips:
- **Use Fargate Spot:** Save up to 70% for transcode-worker
- **Scale to zero:** transcode-worker can scale to 0 when idle
- **S3 Intelligent-Tiering:** Move old videos to cheaper storage
- **Reserved capacity:** If usage is predictable (not typical for students)
- **CloudWatch Logs retention:** Set to 7 days instead of indefinite
- **Single NAT Gateway:** Use one NAT instead of multi-AZ (dev environment)

### Cost by Phase (4-week timeline)
- **Week 1-2 (Dev/Testing):** ~$80 (partial month, lower usage)
- **Week 3 (Full deployment):** ~$120
- **Week 4 (Demo period):** ~$162
- **Total for assignment:** ~$362

---

## 🧪 Testing Strategy

### 1. Unit Testing
```bash
# Test individual microservices
cd server/services/video-service
npm test
```

### 2. Integration Testing
```bash
# Test service-to-service communication
npm run test:integration
```

### 3. Load Testing
```bash
# Apache Bench
ab -n 10000 -c 100 https://n11817143-videoapp.cab432.com/api/videos

# Artillery
artillery quick --count 100 --num 10 https://n11817143-videoapp.cab432.com/
```

### 4. Auto-Scaling Testing
```bash
# Simulate high load
for i in {1..1000}; do
  curl https://n11817143-videoapp.cab432.com/api/videos &
done

# Watch ASG scale up
watch -n 5 'aws autoscaling describe-auto-scaling-groups \
  --auto-scaling-group-names n11817143-asg \
  --query "AutoScalingGroups[0].Instances[*].[InstanceId,LifecycleState]"'
```

### 5. Failover Testing
- Terminate random EC2 instance
- Verify ALB redirects traffic
- Check new instance launches
- Confirm zero downtime

---

## 📊 Monitoring Dashboard

### CloudWatch Metrics to Track
- **ALB:** Request count, latency, HTTP errors
- **ECS:** CPU, memory, task count
- **ASG:** Instance count, scaling activities
- **Lambda:** Invocations, errors, duration
- **SQS:** Messages visible, messages in DLQ
- **Custom:** Queue depth, processing rate

### Alerts to Configure
1. ALB 5XX errors > 10 in 5 minutes
2. ECS task unhealthy
3. ASG scaling failures
4. Lambda errors > 5%
5. DLQ messages > 0
6. Custom queue depth > 50

---

## 🚀 Deployment Process

### Initial Deployment
```bash
# 1. Build and push images
./scripts/build-images.sh
./scripts/push-to-ecr.sh

# 2. Deploy infrastructure
cd terraform
terraform init
terraform plan -out=tfplan
terraform apply tfplan

# 3. Deploy ECS services
aws ecs update-service --cluster n11817143-cluster \
  --service video-service --force-new-deployment

# 4. Verify deployment
./scripts/health-check.sh
```

### Update Deployment (CI/CD)
```bash
# GitHub Actions workflow
name: Deploy to ECS
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build images
        run: docker-compose build
      - name: Push to ECR
        run: ./scripts/push-to-ecr.sh
      - name: Update ECS
        run: ./scripts/deploy-ecs.sh
```

---

## ✅ Acceptance Criteria

### Core Requirements
- ✅ At least 4 microservices running independently
- ✅ ALB distributing traffic to multiple instances
- ✅ ASG scales up/down based on load
- ✅ HTTPS working with valid certificate
- ✅ All services accessible via domain

### Additional Requirements (7 selected)
- ✅ Lambda functions triggered by S3 events
- ✅ SQS/SNS for async communication
- ✅ ECS cluster running all services
- ✅ Custom CloudWatch metrics published
- ✅ Complete Terraform IaC with modules
- ✅ DLQ configured and monitored
- ✅ CloudFront caching static assets

### Documentation
- ✅ Architecture diagram created
- ✅ Deployment guide written
- ✅ Design decisions documented
- ✅ Cost analysis completed
- ✅ Performance testing results included

---

## 🎓 Submission Checklist

### Code Submission
- [ ] All source code pushed to repository
- [ ] Git tags for Assignment 3 version
- [ ] Clean commit history
- [ ] No sensitive credentials in code

### Terraform
- [ ] All .tf files included
- [ ] terraform.tfvars.example provided
- [ ] README with deployment instructions
- [ ] State file location documented

### Documentation
- [ ] `A3_response_to_criteria.md` completed
- [ ] Architecture diagrams included
- [ ] Deployment guide provided
- [ ] API documentation updated
- [ ] Cost analysis report

### Video Demonstration
- [ ] Show microservices running
- [ ] Demonstrate auto-scaling
- [ ] Show HTTPS working
- [ ] Demonstrate Lambda triggers
- [ ] Show monitoring dashboards
- [ ] Explain architecture decisions

### Report (1 mark)
- [ ] Executive summary
- [ ] Architecture overview
- [ ] Technology choices justified
- [ ] Cost analysis
- [ ] Performance metrics
- [ ] Lessons learned
- [ ] Future improvements

---

## � Step-by-Step Manual AWS Setup (Lean Approach)

> **Use this guide if you want to set up manually before automating with Terraform**

### 1) Networking and Container Registry

#### VPC Setup
```bash
# Create VPC
aws ec2 create-vpc --cidr-block 10.0.0.0/16 --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=n11817143-vpc}]'

# Create 2 Public Subnets (in different AZs)
aws ec2 create-subnet --vpc-id <vpc-id> --cidr-block 10.0.1.0/24 --availability-zone ap-southeast-2a
aws ec2 create-subnet --vpc-id <vpc-id> --cidr-block 10.0.2.0/24 --availability-zone ap-southeast-2b

# Create 2 Private Subnets
aws ec2 create-subnet --vpc-id <vpc-id> --cidr-block 10.0.10.0/24 --availability-zone ap-southeast-2a
aws ec2 create-subnet --vpc-id <vpc-id> --cidr-block 10.0.11.0/24 --availability-zone ap-southeast-2b

# Create Internet Gateway
aws ec2 create-internet-gateway --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=n11817143-igw}]'
aws ec2 attach-internet-gateway --vpc-id <vpc-id> --internet-gateway-id <igw-id>

# Create NAT Gateway (in public subnet)
aws ec2 allocate-address --domain vpc
aws ec2 create-nat-gateway --subnet-id <public-subnet-id> --allocation-id <eip-alloc-id>

# Configure Route Tables (public and private)
# Public: route 0.0.0.0/0 → IGW
# Private: route 0.0.0.0/0 → NAT Gateway
```

#### ECR Repositories
```bash
# Create ECR repositories for each service
aws ecr create-repository --repository-name n11817143-video-api
aws ecr create-repository --repository-name n11817143-admin
aws ecr create-repository --repository-name n11817143-transcode-worker
aws ecr create-repository --repository-name n11817143-s3-to-sqs-lambda

# Login to ECR
aws ecr get-login-password --region ap-southeast-2 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.ap-southeast-2.amazonaws.com

# Build and push images
docker build -t n11817143-video-api ./server/services/video-api
docker tag n11817143-video-api:latest <account-id>.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-video-api:latest
docker push <account-id>.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-video-api:latest
```

---

### 2) Storage and Identity Services

#### S3 Buckets
```bash
# Create buckets
aws s3 mb s3://n11817143-raw-videos --region ap-southeast-2
aws s3 mb s3://n11817143-processed-videos --region ap-southeast-2
aws s3 mb s3://n11817143-static-frontend --region ap-southeast-2

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket n11817143-raw-videos \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Block public access
aws s3api put-public-access-block \
  --bucket n11817143-raw-videos \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

#### DynamoDB Table
```bash
# Create VideoMetadata table
aws dynamodb create-table \
  --table-name n11817143-VideoMetadata \
  --attribute-definitions \
    AttributeName=videoId,AttributeType=S \
    AttributeName=userId,AttributeType=S \
  --key-schema \
    AttributeName=videoId,KeyType=HASH \
  --global-secondary-indexes \
    '[{
      "IndexName": "UserIdIndex",
      "KeySchema": [{"AttributeName":"userId","KeyType":"HASH"}],
      "Projection": {"ProjectionType":"ALL"},
      "ProvisionedThroughput": {"ReadCapacityUnits":5,"WriteCapacityUnits":5}
    }]' \
  --billing-mode PAY_PER_REQUEST
```

#### IAM Roles

**ECS Execution Role:**
```bash
aws iam create-role --role-name n11817143-ecs-execution-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

aws iam attach-role-policy \
  --role-name n11817143-ecs-execution-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
```

**Video-API Task Role:**
```bash
aws iam create-role --role-name n11817143-video-api-task-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

aws iam put-role-policy --role-name n11817143-video-api-task-role \
  --policy-name video-api-s3-dynamodb \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": ["s3:PutObject", "s3:GetObject"],
        "Resource": "arn:aws:s3:::n11817143-raw-videos/raw/*"
      },
      {
        "Effect": "Allow",
        "Action": ["dynamodb:*"],
        "Resource": "arn:aws:dynamodb:ap-southeast-2:*:table/n11817143-VideoMetadata"
      }
    ]
  }'
```

**Transcode Worker Task Role:**
```bash
aws iam create-role --role-name n11817143-transcode-worker-task-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

aws iam put-role-policy --role-name n11817143-transcode-worker-task-role \
  --policy-name transcode-worker-policy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": ["s3:GetObject"],
        "Resource": "arn:aws:s3:::n11817143-raw-videos/raw/*"
      },
      {
        "Effect": "Allow",
        "Action": ["s3:PutObject"],
        "Resource": "arn:aws:s3:::n11817143-processed-videos/transcoded/*"
      },
      {
        "Effect": "Allow",
        "Action": ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"],
        "Resource": "arn:aws:sqs:ap-southeast-2:*:n11817143-transcode-jobs"
      },
      {
        "Effect": "Allow",
        "Action": ["sns:Publish"],
        "Resource": "arn:aws:sns:ap-southeast-2:*:n11817143-video-events"
      }
    ]
  }'
```

**Lambda Execution Role:**
```bash
aws iam create-role --role-name n11817143-lambda-exec-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "lambda.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

aws iam put-role-policy --role-name n11817143-lambda-exec-role \
  --policy-name lambda-sqs-logs \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": ["logs:*"],
        "Resource": "*"
      },
      {
        "Effect": "Allow",
        "Action": ["sqs:SendMessage"],
        "Resource": "arn:aws:sqs:ap-southeast-2:*:n11817143-transcode-jobs"
      }
    ]
  }'
```

---

### 3) Messaging and Event Processing

#### SQS Queues
```bash
# Create DLQ first
aws sqs create-queue --queue-name n11817143-transcode-jobs-dlq

# Create main queue with redrive policy
aws sqs create-queue --queue-name n11817143-transcode-jobs \
  --attributes '{
    "VisibilityTimeout": "900",
    "MessageRetentionPeriod": "1209600",
    "ReceiveMessageWaitTimeSeconds": "20",
    "RedrivePolicy": "{\"deadLetterTargetArn\":\"arn:aws:sqs:ap-southeast-2:<account-id>:n11817143-transcode-jobs-dlq\",\"maxReceiveCount\":\"3\"}"
  }'
```

#### SNS Topic
```bash
# Create topic
aws sns create-topic --name n11817143-video-events

# Subscribe email for demo
aws sns subscribe \
  --topic-arn arn:aws:sns:ap-southeast-2:<account-id>:n11817143-video-events \
  --protocol email \
  --notification-endpoint your-email@example.com
```

#### Lambda Function (Container Image)
```bash
# Deploy Lambda function
aws lambda create-function \
  --function-name n11817143-s3-to-sqs \
  --package-type Image \
  --code ImageUri=<account-id>.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-s3-to-sqs-lambda:latest \
  --role arn:aws:iam::<account-id>:role/n11817143-lambda-exec-role \
  --timeout 60 \
  --memory-size 512 \
  --environment Variables="{QUEUE_URL=https://sqs.ap-southeast-2.amazonaws.com/<account-id>/n11817143-transcode-jobs,AWS_REGION=ap-southeast-2}"

# Add S3 trigger permission
aws lambda add-permission \
  --function-name n11817143-s3-to-sqs \
  --statement-id AllowS3Invoke \
  --action lambda:InvokeFunction \
  --principal s3.amazonaws.com \
  --source-arn arn:aws:s3:::n11817143-raw-videos

# Configure S3 bucket notification
aws s3api put-bucket-notification-configuration \
  --bucket n11817143-raw-videos \
  --notification-configuration '{
    "LambdaFunctionConfigurations": [{
      "LambdaFunctionArn": "arn:aws:lambda:ap-southeast-2:<account-id>:function:n11817143-s3-to-sqs",
      "Events": ["s3:ObjectCreated:*"],
      "Filter": {
        "Key": {
          "FilterRules": [
            {"Name": "prefix", "Value": "raw/"},
            {"Name": "suffix", "Value": ".mp4"}
          ]
        }
      }
    }]
  }'
```

---

### 4) Load Balancer and TLS

#### ACM Certificate
```bash
# Request certificate in ap-southeast-2
aws acm request-certificate \
  --domain-name n11817143-videoapp.cab432.com \
  --subject-alternative-names "*.n11817143-videoapp.cab432.com" \
  --validation-method DNS \
  --region ap-southeast-2

# Get validation records
aws acm describe-certificate --certificate-arn <cert-arn> --region ap-southeast-2

# Add CNAME records to Route 53 for validation
aws route53 change-resource-record-sets --hosted-zone-id <zone-id> \
  --change-batch file://cert-validation.json
```

#### Application Load Balancer
```bash
# Create ALB
aws elbv2 create-load-balancer \
  --name n11817143-alb \
  --subnets <public-subnet-1> <public-subnet-2> \
  --security-groups <alb-sg-id> \
  --scheme internet-facing

# Create Target Groups
aws elbv2 create-target-group \
  --name n11817143-video-api-tg \
  --protocol HTTP \
  --port 8080 \
  --vpc-id <vpc-id> \
  --target-type ip \
  --health-check-path /healthz \
  --health-check-interval-seconds 30 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3

aws elbv2 create-target-group \
  --name n11817143-admin-tg \
  --protocol HTTP \
  --port 8080 \
  --vpc-id <vpc-id> \
  --target-type ip \
  --health-check-path /healthz

# Create Listeners
# HTTP → HTTPS redirect
aws elbv2 create-listener \
  --load-balancer-arn <alb-arn> \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=redirect,RedirectConfig={Protocol=HTTPS,Port=443,StatusCode=HTTP_301}

# HTTPS listener
aws elbv2 create-listener \
  --load-balancer-arn <alb-arn> \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=<acm-cert-arn> \
  --default-actions Type=forward,TargetGroupArn=<video-api-tg-arn>

# Add listener rules for path-based routing
aws elbv2 create-rule \
  --listener-arn <https-listener-arn> \
  --priority 100 \
  --conditions Field=path-pattern,Values='/admin/*' \
  --actions Type=forward,TargetGroupArn=<admin-tg-arn>

aws elbv2 create-rule \
  --listener-arn <https-listener-arn> \
  --priority 200 \
  --conditions Field=path-pattern,Values='/api/*' \
  --actions Type=forward,TargetGroupArn=<video-api-tg-arn>
```

#### Route 53 DNS
```bash
# Create ALIAS record to ALB
aws route53 change-resource-record-sets --hosted-zone-id <zone-id> \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "n11817143-videoapp.cab432.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "<alb-hosted-zone-id>",
          "DNSName": "<alb-dns-name>",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'
```

---

### 5) ECS Fargate Services

#### ECS Cluster
```bash
aws ecs create-cluster --cluster-name n11817143-cluster \
  --settings name=containerInsights,value=enabled
```

#### Task Definitions
```bash
# Register video-api task definition
aws ecs register-task-definition --cli-input-json file://video-api-task-def.json

# video-api-task-def.json
{
  "family": "n11817143-video-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::<account-id>:role/n11817143-ecs-execution-role",
  "taskRoleArn": "arn:aws:iam::<account-id>:role/n11817143-video-api-task-role",
  "containerDefinitions": [{
    "name": "video-api",
    "image": "<account-id>.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-video-api:latest",
    "portMappings": [{"containerPort": 8080, "protocol": "tcp"}],
    "environment": [
      {"name": "NODE_ENV", "value": "production"},
      {"name": "AWS_REGION", "value": "ap-southeast-2"},
      {"name": "S3_BUCKET", "value": "n11817143-raw-videos"},
      {"name": "DYNAMODB_TABLE", "value": "n11817143-VideoMetadata"}
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/n11817143-video-api",
        "awslogs-region": "ap-southeast-2",
        "awslogs-stream-prefix": "ecs"
      }
    },
    "healthCheck": {
      "command": ["CMD-SHELL", "curl -f http://localhost:8080/healthz || exit 1"],
      "interval": 30,
      "timeout": 5,
      "retries": 3,
      "startPeriod": 60
    }
  }]
}
```

#### ECS Services
```bash
# Create video-api service
aws ecs create-service \
  --cluster n11817143-cluster \
  --service-name n11817143-video-api \
  --task-definition n11817143-video-api \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[<private-subnet-1>,<private-subnet-2>],securityGroups=[<ecs-sg-id>],assignPublicIp=DISABLED}" \
  --load-balancers "targetGroupArn=<video-api-tg-arn>,containerName=video-api,containerPort=8080"

# Create admin service (similar)
# Create transcode-worker service (no load balancer, desired count = 0)
```

#### ECS Service Auto-Scaling
```bash
# Register scalable target for video-api
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/n11817143-cluster/n11817143-video-api \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 1 \
  --max-capacity 10

# Create CPU-based scaling policy
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/n11817143-cluster/n11817143-video-api \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name n11817143-video-api-cpu-scaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
    },
    "TargetValue": 50.0,
    "ScaleInCooldown": 300,
    "ScaleOutCooldown": 60
  }'

# Transcode worker - scale on SQS queue depth
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/n11817143-cluster/n11817143-transcode-worker \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 0 \
  --max-capacity 10

aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/n11817143-cluster/n11817143-transcode-worker \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name n11817143-transcode-queue-scaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "CustomizedMetricSpecification": {
      "MetricName": "ApproximateNumberOfMessagesVisible",
      "Namespace": "AWS/SQS",
      "Dimensions": [{"Name": "QueueName", "Value": "n11817143-transcode-jobs"}],
      "Statistic": "Average"
    },
    "TargetValue": 5.0,
    "ScaleInCooldown": 300,
    "ScaleOutCooldown": 60
  }'
```

---

### 6) Edge Caching - CloudFront

```bash
# Create Origin Access Control
aws cloudfront create-origin-access-control \
  --origin-access-control-config '{
    "Name": "n11817143-s3-oac",
    "OriginAccessControlOriginType": "s3",
    "SigningBehavior": "always",
    "SigningProtocol": "sigv4"
  }'

# Create CloudFront distribution (use console or JSON config file)
aws cloudfront create-distribution --distribution-config file://cloudfront-config.json

# Update S3 bucket policy to allow CloudFront OAC
aws s3api put-bucket-policy --bucket n11817143-static-frontend \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [{
      "Sid": "AllowCloudFrontOAC",
      "Effect": "Allow",
      "Principal": {"Service": "cloudfront.amazonaws.com"},
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::n11817143-static-frontend/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::<account-id>:distribution/<distribution-id>"
        }
      }
    }]
  }'

# Create Route 53 CNAME for CloudFront
aws route53 change-resource-record-sets --hosted-zone-id <zone-id> \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "static.n11817143-videoapp.cab432.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "<cloudfront-domain>.cloudfront.net"}]
      }
    }]
  }'
```

---

### 7) Application Changes

#### Health Check Endpoints
```javascript
// server/services/video-api/src/healthz.js (NEW)
export function healthCheck(req, res) {
  res.status(200).json({
    status: 'healthy',
    service: 'video-api',
    timestamp: new Date().toISOString()
  });
}

// In index.js
app.get('/healthz', healthCheck);
```

#### Presigned URLs for Upload
```javascript
// server/services/video-api/src/controllers/video.controller.js
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export async function getUploadUrl(req, res) {
  const videoId = uuidv4();
  const key = `raw/${videoId}.mp4`;
  
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    ContentType: 'video/mp4'
  });
  
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  
  // Save metadata to DynamoDB
  await dynamoClient.send(new PutItemCommand({
    TableName: process.env.DYNAMODB_TABLE,
    Item: {
      videoId: { S: videoId },
      userId: { S: req.user.id },
      status: { S: 'uploading' },
      createdAt: { S: new Date().toISOString() }
    }
  }));
  
  res.json({ videoId, uploadUrl });
}
```

---

### 8) Evidence Capture

#### Show ALB Health
```bash
# Check target group health
aws elbv2 describe-target-health --target-group-arn <video-api-tg-arn>

# Expected output: State=healthy for all targets
```

#### Show ECS Service Scaling
```bash
# Watch ECS service scale up
aws ecs describe-services --cluster n11817143-cluster --services n11817143-video-api \
  --query 'services[0].desiredCount'

# Load test to trigger scaling
ab -n 10000 -c 100 https://n11817143-videoapp.cab432.com/api/videos

# Watch tasks increase: 1 → 3 → 5
watch -n 5 'aws ecs list-tasks --cluster n11817143-cluster --service-name n11817143-video-api'
```

#### Show Queue-Based Worker Scaling
```bash
# Send messages to SQS
for i in {1..50}; do
  aws sqs send-message --queue-url <queue-url> \
    --message-body "{\"videoId\":\"test-$i\",\"bucket\":\"n11817143-raw-videos\",\"key\":\"raw/test-$i.mp4\"}"
done

# Watch workers scale: 0 → 5 → 10
watch -n 5 'aws ecs describe-services --cluster n11817143-cluster --services n11817143-transcode-worker --query "services[0].desiredCount"'
```

#### Show HTTPS Certificate
```bash
# Browser: Visit https://n11817143-videoapp.cab432.com
# Check for lock icon and valid certificate

# CLI check
curl -vI https://n11817143-videoapp.cab432.com
```

#### Test DLQ
```bash
# Send bad message to trigger failures
aws sqs send-message --queue-url <queue-url> \
  --message-body '{"invalid":"json","no":"videoId"}'

# After 3 retries, check DLQ
aws sqs receive-message --queue-url <dlq-url>

# Verify CloudWatch alarm triggered
aws cloudwatch describe-alarm-history --alarm-name n11817143-dlq-messages --max-records 5
```

#### Show CloudFront Cache Hits
```bash
# Upload thumbnail to S3
aws s3 cp test-thumb.jpg s3://n11817143-processed-videos/thumbnails/test-video_thumb.jpg

# First request (MISS)
curl -I https://static.n11817143-videoapp.cab432.com/thumbnails/test-video_thumb.jpg
# X-Cache: Miss from cloudfront

# Second request (HIT)
curl -I https://static.n11817143-videoapp.cab432.com/thumbnails/test-video_thumb.jpg
# X-Cache: Hit from cloudfront
```

---

### 9) Terraform Module Alignment

When converting to Terraform, ensure these modules exist:

```
terraform/
├── modules/
│   ├── networking/       # VPC, subnets, NAT, IGW
│   ├── alb/              # ALB, target groups, listeners, rules
│   ├── ecs/              # Cluster, task defs, services, autoscaling
│   ├── messaging/        # SQS, SNS, DLQ, alarms
│   ├── lambda/           # Lambda function, S3 trigger, permissions
│   ├── acm/              # Certificate, validation, Route 53 records
│   ├── cloudfront/       # Distribution, OAC, S3 bucket policies
│   └── iam/              # All roles and policies
├── environments/
│   ├── dev/
│   └── prod/
├── main.tf               # Calls modules
├── variables.tf
├── outputs.tf
└── backend.tf            # Remote state (S3 + DynamoDB)

### AWS Documentation
- [ALB Documentation](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/)
- [ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [Auto Scaling Documentation](https://docs.aws.amazon.com/autoscaling/)

### Terraform
- [AWS Provider Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Terraform Best Practices](https://www.terraform-best-practices.com/)

### Tools
- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)
- [Apache Bench](https://httpd.apache.org/docs/2.4/programs/ab.html)
- [Artillery Load Testing](https://www.artillery.io/)

---

## 📝 Notes & Tips

### Common Pitfalls to Avoid
1. **Don't skip testing locally** - Test microservices with docker-compose before deploying
2. **Security groups matter** - Ensure proper ingress/egress rules
3. **IAM permissions** - Services need proper roles to access AWS resources
4. **Health checks** - Configure meaningful health check endpoints
5. **Logging** - Set up centralized logging from day one

### Performance Optimization
- Use ElastiCache effectively for frequently accessed data
- Implement pagination for large datasets
- Use CloudFront for static assets
- Optimize Docker images (multi-stage builds)
- Enable gzip compression on ALB

### Security Best Practices
- Rotate secrets regularly
- Use Parameter Store/Secrets Manager for sensitive data
- Enable VPC Flow Logs
- Use AWS WAF with CloudFront
- Implement least privilege IAM policies
- Enable encryption at rest and in transit

---

## 🏁 Success Metrics

### Performance Targets
- **API Response Time:** < 200ms (p95)
- **Video Upload:** < 30s for 100MB file
- **Transcoding:** < 5min for 720p video
- **Auto-scaling Time:** < 5min to add instances
- **Uptime:** > 99.9%

### Scalability Targets
- Handle 1000 concurrent users
- Process 100 video uploads/hour
- Support 10,000 video views/day
- Scale from 2 to 10 instances automatically

---

**END OF MIGRATION PLAN**

---

## 🎯 CRITICAL ARCHITECTURE SUMMARY

### ✅ WHAT TO DO (Correct Architecture)

1. **ECS Fargate ONLY** - No EC2, no ASG. All containers run on Fargate.
2. **ECS Service Auto-Scaling** - Scale tasks at service level:
   - video-api: CPU target tracking (50%)
   - admin: CPU target tracking (50%)
   - transcode-worker: SQS queue depth target tracking
3. **ALB for API Traffic** - n11817143-videoapp.cab432.com → ALB → ECS tasks
4. **CloudFront for S3 ONLY** - static.n11817143-videoapp.cab432.com → S3 (static assets + thumbnails)
5. **Lambda Container Image** - Include ffmpeg binary, not fluent-ffmpeg zip
6. **ACM in ap-southeast-2** - Certificate must be in same region as ALB
7. **Separate IAM Roles** - Execution role vs task role with least privilege
8. **Health Checks on /healthz** - Return HTTP 200, <2s latency

### ❌ WHAT NOT TO DO (Common Mistakes)

1. ❌ **Do NOT use EC2 ASG** - This is for ECS Fargate, not EC2 instances
2. ❌ **Do NOT front ALB with CloudFront** - CloudFront is for S3 static assets only
3. ❌ **Do NOT use single domain** - Use separate subdomains (API vs CDN)
4. ❌ **Do NOT use fluent-ffmpeg without binaries** - Lambda needs ffmpeg binary in container
5. ❌ **Do NOT use ACM cert in wrong region** - ALB cert must be in ap-southeast-2
6. ❌ **Do NOT use wildcards in S3 IAM policies** - Use specific prefixes (raw/*, transcoded/*)
7. ❌ **Do NOT skip health checks** - ALB requires /healthz endpoints

### 📊 Evidence You Must Capture

1. **ALB Health Checks** - Show all targets healthy in console
2. **ECS Service Scaling** - Demonstrate: 1 task → 3 tasks → 1 task (load test)
3. **Queue-Based Scaling** - Show transcode-worker: 0 tasks → 5 tasks → 0 tasks
4. **HTTPS Certificate** - Browser lock icon, curl output showing TLS
5. **DLQ Monitoring** - Force failure, show message in DLQ, CloudWatch alarm triggered
6. **CloudFront Cache Hits** - Show X-Cache: Miss → X-Cache: Hit for thumbnail
7. **Path-Based Routing** - /api/* → video-api, /admin/* → admin

### 🏆 Success Criteria Checklist

Core Requirements (10 marks):
- [ ] 3 microservices (video-api, admin, transcode-worker)
- [ ] ALB with path-based routing + HTTPS
- [ ] ECS service auto-scaling proven (CPU + queue depth)
- [ ] Valid ACM certificate in ap-southeast-2

Additional Requirements (14 marks - 7 selected):
- [ ] Lambda container with ffmpeg → S3 trigger → SQS
- [ ] SQS queue with DLQ (maxReceiveCount=3)
- [ ] SNS topic with email subscription
- [ ] ECS Fargate cluster with 3 services
- [ ] Custom CloudWatch metrics published
- [ ] Terraform modules (9 modules: networking, alb, ecs, iam, messaging, lambda, acm, cloudfront, storage)
- [ ] Remote state (S3 + DynamoDB locking)
- [ ] CloudFront for S3 static assets with OAC

Documentation (1 mark):
- [ ] A3_response_to_criteria.md completed
- [ ] Architecture diagrams included
- [ ] Evidence screenshots captured
- [ ] Cost analysis documented

---

*This plan provides a complete, production-ready roadmap from Assignment 2 (monolithic on EC2) to Assignment 3 (microservices on ECS Fargate with cloud-native services). Good luck!*
