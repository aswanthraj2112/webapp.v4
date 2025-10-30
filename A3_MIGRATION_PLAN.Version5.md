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
FROM public.ecr.aws/lambda/nodejs:18-al2

# Copy pre-built ffmpeg binary (download from johnvansickle.com/ffmpeg)
# Teaching reference: Week 12 "Lambda Container Image build"
COPY ffmpeg /opt/bin/ffmpeg
RUN chmod +x /opt/bin/ffmpeg

# Add ffmpeg to PATH
ENV PATH="/opt/bin:${PATH}"

# Copy function code
COPY package*.json ${LAMBDA_TASK_ROOT}/
RUN npm ci --production

COPY index.js ${LAMBDA_TASK_ROOT}/

CMD [ "index.handler" ]
```

> **Note:** Download static ffmpeg binary from https://johnvansickle.com/ffmpeg/ before building.  
> EPEL installation can fail on Amazon Linux 2. Pre-built binaries are more reliable.

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

**CRITICAL:** Lambda uses container image with ffmpeg binary, NOT zip with fluent-ffmpeg

---

#### ✅ SELECTED: 2. Communication Mechanisms - SQS/SNS (2 marks)
**Purpose:** Asynchronous service-to-service communication

**AWS Resources:**
- **SQS Queue:** Video processing queue
- **SQS Queue:** Notification queue
- **SNS Topic:** Video events (uploaded, processed, failed)
- **Dead Letter Queue:** Failed message handling

**Architecture:**
```
Video Upload → SNS Topic → SQS Queue → Lambda/Service → Process
                   │
                   ├─→ Email Notification (SES)
                   ├─→ Transcoding Service
                   └─→ Analytics Service
```

**Terraform Configuration:**
```hcl
# terraform/messaging.tf (NEW FILE)
resource "aws_sqs_queue" "video_processing" {
  name                       = "n11817143-video-processing"
  visibility_timeout_seconds = 300
  message_retention_seconds  = 1209600 # 14 days
  
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.video_processing_dlq.arn
    maxReceiveCount     = 3
  })
}

resource "aws_sqs_queue" "video_processing_dlq" {
  name = "n11817143-video-processing-dlq"
}

resource "aws_sns_topic" "video_events" {
  name = "n11817143-video-events"
}

resource "aws_sns_topic_subscription" "video_to_sqs" {
  topic_arn = aws_sns_topic.video_events.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.video_processing.arn
}
```

---

#### ✅ SELECTED: 3. Container Orchestration - ECS (2 marks)
**Purpose:** Replace Docker Compose with Amazon ECS

**Migration Path:**
- Convert `docker-compose.yml` → ECS Task Definitions
- Create ECS Cluster
- Define ECS Services for each microservice
- Configure service discovery
- Set up auto-scaling at ECS level

**Terraform Configuration:**
```hcl
# terraform/ecs.tf (NEW FILE)
resource "aws_ecs_cluster" "main" {
  name = "n11817143-cluster"
  
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_ecs_task_definition" "video_service" {
  family                   = "n11817143-video-service"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn
  
  container_definitions = jsonencode([{
    name  = "video-service"
    image = "${aws_ecr_repository.video_service.repository_url}:latest"
    portMappings = [{
      containerPort = 8082
      protocol      = "tcp"
    }]
    environment = [
      { name = "AWS_REGION", value = var.aws_region },
      { name = "S3_BUCKET", value = var.s3_bucket_name }
    ]
  }])
}

resource "aws_ecs_service" "video_service" {
  name            = "n11817143-video-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.video_service.arn
  desired_count   = 2
  launch_type     = "FARGATE"
  
  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }
  
  load_balancer {
    target_group_arn = aws_lb_target_group.video_service.arn
    container_name   = "video-service"
    container_port   = 8082
  }
  
  depends_on = [aws_lb_listener.https]
}

# Admin Service Task Definition (ensure proper task_role_arn)
resource "aws_ecs_task_definition" "admin" {
  family                   = "n11817143-admin-service"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.admin_task.arn  # CRITICAL: Use admin-specific task role
  
  container_definitions = jsonencode([{
    name  = "admin-service"
    image = "${aws_ecr_repository.admin_service.repository_url}:latest"
    portMappings = [{
      containerPort = 8080
      protocol      = "tcp"
    }]
    environment = [
      { name = "AWS_REGION", value = var.aws_region },
      { name = "DYNAMODB_TABLE", value = var.dynamodb_table_name }
    ]
  }])
}

# Admin-specific task role with DynamoDB full access
resource "aws_iam_role" "admin_task" {
  name = "n11817143-admin-task-role"
  
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

resource "aws_iam_role_policy_attachment" "admin_dynamodb" {
  role       = aws_iam_role.admin_task.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess"
}
```

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
│   ├── ecs/
│   ├── lambda/
│   ├── messaging/
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
- [ ] **1.2** Split monolithic backend into 4 services
- [ ] **1.3** Create individual Dockerfiles for each service
- [ ] **1.4** Update docker-compose.yml for local testing
- [ ] **1.5** Test microservices locally
- [ ] **1.6** Push Docker images to ECR

### Phase 2: Infrastructure (Week 1-2)
- [ ] **2.1** Create Terraform modules structure
- [ ] **2.2** Set up remote state (S3 + DynamoDB)
- [ ] **2.3** Configure VPC and networking
- [ ] **2.4** Create Application Load Balancer
- [ ] **2.5** Create Target Groups for each service
- [ ] **2.6** Configure security groups
- [ ] **2.7** Request ACM certificate
- [ ] **2.8** Configure HTTPS listener on ALB
- [ ] **2.9** Update Route 53 to point to ALB

### Phase 3: ECS Service Auto-Scaling (Week 2)
- [ ] **3.1** Create Application Auto Scaling targets for all ECS services
- [ ] **3.2** Configure video-api CPU target tracking (50%, min 1, max 10)
- [ ] **3.3** Configure admin CPU target tracking (50%, min 1, max 5)
- [ ] **3.4** Configure transcode-worker SQS queue depth scaling (min 0, max 10)
- [ ] **3.5** Test ECS service auto-scaling behavior

### Phase 4: Container Orchestration (Week 2)
- [ ] **4.1** Create ECS Cluster
- [ ] **4.2** Define ECS Task Definitions
- [ ] **4.3** Create ECS Services
- [ ] **4.4** Configure service discovery
- [ ] **4.5** Set up ECS auto-scaling
- [ ] **4.6** Migrate from EC2 to ECS

### Phase 5: Serverless & Messaging (Week 3)
- [ ] **5.1** Create SQS queues (main + DLQ)
- [ ] **5.2** Create SNS topics
- [ ] **5.3** Configure queue subscriptions
- [ ] **5.4** Write Lambda functions
- [ ] **5.5** Set up S3 event triggers
- [ ] **5.6** Deploy Lambda functions
- [ ] **5.7** Test async processing flow

### Phase 6: Advanced Features (Week 3)
- [ ] **6.1** Implement custom CloudWatch metrics
- [ ] **6.2** Create custom scaling policies
- [ ] **6.3** Set up CloudFront distribution
- [ ] **6.4** Configure cache behaviors
- [ ] **6.5** Update DNS for CloudFront

### Phase 7: Monitoring & Alerting (Week 3-4)
- [ ] **7.1** Set up CloudWatch dashboards
- [ ] **7.2** Configure DLQ monitoring
- [ ] **7.3** Create SNS alerts topic
- [ ] **7.4** Set up email notifications
- [ ] **7.5** Test alert triggers

### Phase 8: Testing & Documentation (Week 4)
- [ ] **8.1** Load testing with Apache Bench
- [ ] **8.2** Auto-scaling verification
- [ ] **8.3** Failover testing
- [ ] **8.4** Security testing
- [ ] **8.5** Create architecture diagrams
- [ ] **8.6** Write deployment guide
- [ ] **8.7** Document design decisions
- [ ] **8.8** Cost analysis report
- [ ] **8.9** Performance testing results
- [ ] **8.10** Final report (Assignment requirement)

---

## 🏗️ Target Architecture (Assignment 3)

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Assignment 3 Architecture                      │
└────────────────────────────────────────────────────────────────────────┘

                              Internet
                                 │
                                 ▼
                       ┌──────────────────┐
                       │   CloudFront     │
                       │   (Edge Cache)   │
                       └────────┬─────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   Route 53 DNS   │
                       │   HTTPS (ACM)    │
                       └────────┬─────────┘
                                │
                                ▼
                    ┌──────────────────────┐
                    │  Application LB      │
                    │  (ALB - HTTPS)       │
                    └─────────┬────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐     ┌──────────────┐
│ ECS Cluster  │      │ ECS Cluster  │     │ ECS Cluster  │
│  (AZ-1)      │      │  (AZ-2)      │     │  (AZ-3)      │
└──────┬───────┘      └──────┬───────┘     └──────┬───────┘
       │                     │                     │
       │  ┌──────────────────┴────────────┐       │
       │  │                                │       │
       ▼  ▼                                ▼       ▼
  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │  Auth    │  │  Video   │  │Transcode │  │  Admin   │
  │ Service  │  │ Service  │  │ Service  │  │ Service  │
  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
       │             │               │             │
       └─────────────┼───────────────┼─────────────┘
                     │               │
        ┌────────────┼───────────────┼────────────┐
        │            │               │            │
        ▼            ▼               ▼            ▼
  ┌──────────┐ ┌──────────┐   ┌──────────┐ ┌──────────┐
  │  Lambda  │ │   SNS    │   │   SQS    │ │   DLQ    │
  │Functions │ │  Topic   │   │  Queue   │ │  Queue   │
  └──────────┘ └──────────┘   └──────────┘ └──────────┘
        │            │               │            │
        └────────────┼───────────────┼────────────┘
                     │               │
        ┌────────────┼───────────────┼────────────┐
        │            │               │            │
        ▼            ▼               ▼            ▼
  ┌──────────┐ ┌──────────┐   ┌──────────┐ ┌──────────┐
  │    S3    │ │ DynamoDB │   │ElastiCache│ │ Cognito  │
  │ Storage  │ │ Metadata │   │   Cache   │ │   Auth   │
  └──────────┘ └──────────┘   └──────────┘ └──────────┘
```

---

## 📁 Complete File Structure (After Migration)

```
webapp.v5/
├── client/                          # React frontend (unchanged)
│   ├── src/
│   ├── Dockerfile
│   └── nginx.conf
│
├── server/
│   ├── services/                    # NEW: Microservices
│   │   ├── auth-service/
│   │   │   ├── src/
│   │   │   │   ├── index.js
│   │   │   │   ├── config.js
│   │   │   │   ├── controllers/
│   │   │   │   │   └── auth.controller.js
│   │   │   │   ├── routes/
│   │   │   │   │   └── auth.routes.js
│   │   │   │   ├── middleware/
│   │   │   │   └── utils/
│   │   │   ├── Dockerfile
│   │   │   └── package.json
│   │   │
│   │   ├── video-service/
│   │   │   ├── src/
│   │   │   │   ├── index.js
│   │   │   │   ├── controllers/
│   │   │   │   ├── routes/
│   │   │   │   ├── services/
│   │   │   │   └── utils/
│   │   │   ├── Dockerfile
│   │   │   └── package.json
│   │   │
│   │   ├── transcoding-service/
│   │   │   ├── src/
│   │   │   │   ├── index.js
│   │   │   │   ├── worker.js
│   │   │   │   ├── queue.js
│   │   │   │   └── processors/
│   │   │   ├── Dockerfile
│   │   │   └── package.json
│   │   │
│   │   └── admin-service/
│   │       ├── src/
│   │       ├── Dockerfile
│   │       └── package.json
│   │
│   └── shared/                      # NEW: Shared utilities
│       ├── auth/
│       ├── config/
│       └── utils/
│
├── lambda/                          # NEW: Lambda functions
│   ├── thumbnail-generator/
│   │   ├── index.js
│   │   ├── package.json
│   │   └── Dockerfile
│   ├── transcoding-orchestrator/
│   └── notification-sender/
│
├── terraform/                       # ENHANCED: Modular IaC
│   ├── environments/                # NEW: Multi-environment
│   │   ├── dev/
│   │   │   ├── main.tf
│   │   │   ├── terraform.tfvars
│   │   │   └── backend.tf
│   │   ├── staging/
│   │   └── prod/
│   │
│   ├── modules/                     # NEW: Reusable modules
│   │   ├── alb/
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   ├── ecs/
│   │   ├── lambda/
│   │   ├── messaging/
│   │   ├── networking/
│   │   ├── storage/
│   │   └── monitoring/
│   │
│   ├── main.tf                      # UPDATED: Uses modules
│   ├── variables.tf
│   ├── outputs.tf
│   ├── backend.tf                   # NEW: Remote state
│   ├── alb.tf                       # NEW: Load balancer
│   ├── acm.tf                       # NEW: SSL certificate
│   ├── ecs.tf                       # NEW: Container orchestration (with auto-scaling)
│   ├── lambda.tf                    # NEW: Serverless functions
│   ├── messaging.tf                 # NEW: SQS/SNS
│   ├── cloudfront.tf                # NEW: CDN
│   └── monitoring.tf                # NEW: CloudWatch
│
├── docker-compose.yml               # UPDATED: Microservices
├── docker-compose.prod.yml          # NEW: Production config
├── scripts/
│   ├── deploy.sh                    # UPDATED: Deploy to ECS
│   ├── build-images.sh              # NEW: Build all images
│   ├── push-to-ecr.sh               # NEW: Push to ECR
│   └── run-tests.sh                 # NEW: Testing script
│
├── docs/                            # NEW: Documentation
│   ├── architecture.md
│   ├── deployment-guide.md
│   ├── api-documentation.md
│   └── troubleshooting.md
│
├── A2_response_to_criteria.md       # EXISTING
├── A3_response_to_criteria.md       # NEW: Assignment 3 responses
├── A3_MIGRATION_PLAN.md             # THIS FILE
└── README.md                        # UPDATED: New architecture
```

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
- **CloudWatch Logs retention:** Set to 7 days instead of indefinite
- **Single NAT Gateway:** Use one NAT instead of multi-AZ (dev environment)

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

# Watch ECS service scale up
watch -n 5 'aws ecs describe-services \
  --cluster n11817143-cluster \
  --services video-api \
  --query "services[0].[desiredCount,runningCount,pendingCount]"'

# Monitor all ECS services
aws ecs describe-services \
  --cluster n11817143-cluster \
  --services video-api admin transcode-worker \
  --query "services[*].[serviceName,desiredCount,runningCount]" \
  --output table
```

### 5. Failover Testing
- Stop random ECS task in a service
- Verify ALB redirects traffic to healthy tasks
- Check ECS service launches replacement task
- Confirm zero downtime during task replacement

---

## 📊 Monitoring Dashboard

### CloudWatch Metrics to Track
- **ALB:** Request count, latency, HTTP errors
- **ECS Services:** Desired count, running count, pending count, CPU utilization, memory utilization
- **ECS Auto-Scaling:** Scaling activities, target tracking metrics
- **Lambda:** Invocations, errors, duration
- **SQS:** Messages visible, messages in DLQ
- **Custom:** Queue depth, processing rate

### Alerts to Configure
1. ALB 5XX errors > 10 in 5 minutes
2. ECS task unhealthy
3. ECS service failed to scale
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
- ✅ ALB distributing traffic to multiple ECS tasks
- ✅ ECS services scale up/down based on load (Target Tracking policies)
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

## 🔗 Useful References

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

*Good luck with Assignment 3! This plan provides a complete roadmap from your current Assignment 2 setup to a production-ready, cloud-native microservices architecture.*
