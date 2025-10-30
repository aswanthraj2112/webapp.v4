# Assignment 3 - Migration Plan & Requirements Analysis

**Student:** n11817143 - Aswanth Raj  
**Current Build:** Assignment 2 (Monolithic Architecture)  
**Target:** Assignment 3 (Microservices + Cloud-Native Architecture)  
**Date:** October 28, 2025

---

## 📊 Current Application State (Assignment 2)

### Architecture Overview
- **Type:** Monolithic application
- **Deployment:** Single EC2 instance (i-0aaedfc6a70038409)
- **Orchestration:** Docker Compose
- **Domain:** n11817143-videoapp.cab432.com
- **Protocol:** HTTP only (ports 3000, 8080)

### Current Components

#### Frontend
- React application (Vite)
- Single Nginx container
- Port: 3000

#### Backend
- Express.js monolith
- Single Node.js container
- Port: 8080
- All services in one codebase:
  - Authentication (`/src/auth/`)
  - Video management (`/src/videos/`)
  - Admin operations (`/src/admin/`)
  - Cache management (`/src/cache/`)

### AWS Services Currently Integrated

| Service | Usage | Status |
|---------|-------|--------|
| **S3** | Video storage (raw, transcoded, thumbnails) | ✅ Active |
| **DynamoDB** | Video metadata storage | ✅ Active |
| **ElastiCache** | Memcached caching layer | ✅ Active |
| **Cognito** | User authentication | ✅ Active |
| **Parameter Store** | Application configuration | ✅ Active |
| **Secrets Manager** | JWT secrets | ✅ Active |
| **Route 53** | DNS management | ✅ Active |
| **ECR** | Container registry | ✅ Active |

### Infrastructure as Code
- Terraform managed resources
- Manual EC2 instance
- Basic security groups
- No auto-scaling
- No load balancing

---

## 🎯 Assignment 3 Requirements

### CORE CRITERIA (10 Marks - All Required)

#### 1. Microservices Architecture (3 Marks)

**Current State:** Monolithic Express.js application

**Required Changes:**
- Split backend into independent microservices
- Each service must be independently deployable
- Services communicate via REST APIs or message queues

**Proposed Microservices:**

1. **Authentication Service** (Port: 8081)
   - Cognito integration
   - JWT token validation
   - User session management
   - Group/role management

2. **Video Service** (Port: 8082)
   - Video metadata CRUD
   - S3 presigned URL generation
   - Video listing and filtering
   - Thumbnail management

3. **Transcoding Service** (Port: 8083)
   - FFmpeg video processing
   - Queue-based job processing
   - Status tracking
   - Multiple resolution support

4. **Admin Service** (Port: 8084)
   - User management
   - System administration
   - Video moderation
   - Analytics dashboard

**Implementation Tasks:**
- [ ] Create separate service directories
- [ ] Extract and isolate service logic
- [ ] Create individual Dockerfiles
- [ ] Set up service-to-service authentication
- [ ] Implement API Gateway pattern
- [ ] Update docker-compose for multiple services

**Files to Create:**
```
server/src/services/
├── auth-service/
│   ├── index.js
│   ├── routes.js
│   ├── controller.js
│   ├── middleware.js
│   ├── Dockerfile
│   └── package.json
├── video-service/
│   ├── index.js
│   ├── routes.js
│   ├── controller.js
│   ├── repository.js
│   ├── Dockerfile
│   └── package.json
├── transcoding-service/
│   ├── index.js
│   ├── worker.js
│   ├── processor.js
│   ├── Dockerfile
│   └── package.json
└── admin-service/
    ├── index.js
    ├── routes.js
    ├── controller.js
    ├── Dockerfile
    └── package.json
```

---

#### 2. Load Distribution (2 Marks)

**Current State:** Single EC2 instance, no load balancing

**Required Changes:**
- Deploy Application Load Balancer (ALB)
- Configure target groups for each microservice
- Implement health checks
- Set up routing rules

**Implementation Tasks:**
- [ ] Create ALB with Terraform
- [ ] Configure target groups:
  - Frontend target group (port 3000)
  - Auth service target group (port 8081)
  - Video service target group (port 8082)
  - Transcoding service target group (port 8083)
  - Admin service target group (port 8084)
- [ ] Set up path-based routing:
  - `/api/auth/*` → Auth Service
  - `/api/videos/*` → Video Service
  - `/api/transcoding/*` → Transcoding Service
  - `/api/admin/*` → Admin Service
  - `/*` → Frontend
- [ ] Configure health check endpoints
- [ ] Update security groups

**Terraform Resources Needed:**
```hcl
resource "aws_lb" "main"
resource "aws_lb_target_group" "frontend"
resource "aws_lb_target_group" "auth_service"
resource "aws_lb_target_group" "video_service"
resource "aws_lb_target_group" "transcoding_service"
resource "aws_lb_target_group" "admin_service"
resource "aws_lb_listener" "http"
resource "aws_lb_listener" "https"
resource "aws_lb_listener_rule" "auth"
resource "aws_lb_listener_rule" "videos"
resource "aws_lb_listener_rule" "transcoding"
resource "aws_lb_listener_rule" "admin"
```

---

#### 3. Auto Scaling (3 Marks)

**Current State:** Single fixed EC2 instance

**Required Changes:**
- Create Auto Scaling Group (ASG)
- Configure launch template
- Implement scaling policies
- Set up CloudWatch alarms

**Scaling Strategy:**

**Target Configuration:**
- Minimum instances: 2
- Desired instances: 2
- Maximum instances: 6

**Scaling Triggers:**
1. **CPU-Based Scaling**
   - Scale out: CPU > 70% for 2 minutes
   - Scale in: CPU < 30% for 5 minutes

2. **Request-Based Scaling**
   - Scale out: Request count > 1000/min
   - Scale in: Request count < 200/min

3. **Memory-Based Scaling** (if available)
   - Scale out: Memory > 80%
   - Scale in: Memory < 40%

**Implementation Tasks:**
- [ ] Create launch template with user data script
- [ ] Configure Auto Scaling Group
- [ ] Set up scaling policies
- [ ] Create CloudWatch alarms
- [ ] Configure ALB integration
- [ ] Test scaling behavior
- [ ] Document scaling thresholds

**Terraform Resources Needed:**
```hcl
resource "aws_launch_template" "app"
resource "aws_autoscaling_group" "app"
resource "aws_autoscaling_policy" "scale_up"
resource "aws_autoscaling_policy" "scale_down"
resource "aws_cloudwatch_metric_alarm" "cpu_high"
resource "aws_cloudwatch_metric_alarm" "cpu_low"
resource "aws_autoscaling_attachment" "alb"
```

---

#### 4. HTTPS Implementation (2 Marks)

**Current State:** HTTP only (no SSL/TLS)

**Required Changes:**
- Request/create ACM certificate
- Configure HTTPS listener on ALB
- Redirect HTTP to HTTPS
- Update application URLs

**Implementation Tasks:**
- [ ] Request ACM certificate for `n11817143-videoapp.cab432.com`
- [ ] Validate certificate (DNS or email)
- [ ] Configure ALB HTTPS listener (port 443)
- [ ] Configure HTTP listener (port 80) to redirect to HTTPS
- [ ] Update frontend API calls to use HTTPS
- [ ] Update CORS configuration
- [ ] Update Route 53 records if needed
- [ ] Test certificate and HTTPS access

**Terraform Resources Needed:**
```hcl
resource "aws_acm_certificate" "main"
resource "aws_acm_certificate_validation" "main"
resource "aws_lb_listener" "https" # port 443
resource "aws_lb_listener" "http_redirect" # port 80 → 443
```

**Configuration Updates:**
- Update `.env` files to use `https://`
- Update `CLIENT_ORIGINS` to include HTTPS URLs
- Update frontend `VITE_API_URL` to use HTTPS

---

## 🌟 ADDITIONAL CRITERIA (Choose 7 out of 10 for 14 Marks)

### Recommended Selection Strategy
Pick criteria that:
1. Build on existing infrastructure
2. Complement core requirements
3. Demonstrate diverse AWS services
4. Are achievable within timeline

---

### Option 1: Serverless Functions (2 Marks) ⭐ RECOMMENDED

**Implementation:**
- Lambda function for video transcoding triggers
- Lambda function for thumbnail generation
- Lambda function for notification sending
- S3 event triggers for automated processing

**Architecture:**
```
S3 Upload → S3 Event → Lambda (Trigger) → SQS → Transcoding Service
S3 Upload → S3 Event → Lambda (Thumbnail) → S3 (thumbnails/)
Video Complete → SNS → Lambda (Notify) → SES/SNS
```

**Tasks:**
- [ ] Create Lambda functions:
  - `videoUploadTrigger` - Queues transcoding jobs
  - `thumbnailGenerator` - Generates video thumbnails
  - `notificationHandler` - Sends user notifications
- [ ] Configure S3 event notifications
- [ ] Set up Lambda execution roles
- [ ] Create SQS queues for job management
- [ ] Implement error handling
- [ ] Add CloudWatch logging

**Terraform Resources:**
```hcl
resource "aws_lambda_function" "video_trigger"
resource "aws_lambda_function" "thumbnail_generator"
resource "aws_lambda_function" "notification_handler"
resource "aws_s3_bucket_notification" "video_upload"
resource "aws_iam_role" "lambda_execution"
resource "aws_sqs_queue" "transcoding_jobs"
```

---

### Option 2: Communication Mechanisms - SNS/SQS (2 Marks) ⭐ RECOMMENDED

**Implementation:**
- SNS topics for event broadcasting
- SQS queues for reliable message delivery
- Event-driven architecture between services

**Message Flow:**
```
Video Service → SNS (video.uploaded) → SQS → Transcoding Service
Auth Service → SNS (user.registered) → SQS → Email Service
Admin Service → SNS (content.moderated) → SQS → Notification Service
```

**Tasks:**
- [ ] Create SNS topics:
  - `video-events` - Video lifecycle events
  - `user-events` - User account events
  - `system-events` - Admin/system events
- [ ] Create SQS queues:
  - `transcoding-queue` - Video processing jobs
  - `notification-queue` - User notifications
  - `email-queue` - Email sending jobs
- [ ] Implement message publishers in services
- [ ] Implement message consumers/workers
- [ ] Add message validation and error handling
- [ ] Configure DLQ for failed messages

**Benefits:**
- Decoupled services
- Reliable message delivery
- Async processing
- Better scalability

---

### Option 3: Container Orchestration with ECS (2 Marks) ⭐ RECOMMENDED

**Implementation:**
- Migrate from Docker Compose to Amazon ECS
- Create ECS cluster
- Define task definitions for each service
- Configure ECS services with auto-scaling

**ECS Architecture:**
```
ECS Cluster: n11817143-video-cluster
├── Frontend Service (Fargate)
│   ├── Task Definition: frontend:latest
│   ├── Desired Count: 2
│   └── Auto Scaling: CPU-based
├── Auth Service (Fargate)
│   ├── Task Definition: auth-service:latest
│   ├── Desired Count: 2
│   └── Auto Scaling: Request-based
├── Video Service (Fargate)
│   ├── Task Definition: video-service:latest
│   ├── Desired Count: 2-4
│   └── Auto Scaling: Request + CPU
└── Transcoding Service (EC2)
    ├── Task Definition: transcoding-service:latest
    ├── Desired Count: 1-3
    └── Auto Scaling: Queue depth
```

**Tasks:**
- [ ] Create ECS cluster
- [ ] Push images to ECR
- [ ] Create task definitions for each service
- [ ] Configure ECS services
- [ ] Set up service discovery (Cloud Map)
- [ ] Configure ALB integration
- [ ] Implement ECS auto-scaling
- [ ] Set up CloudWatch logs

**Terraform Resources:**
```hcl
resource "aws_ecs_cluster" "main"
resource "aws_ecs_task_definition" "frontend"
resource "aws_ecs_task_definition" "auth_service"
resource "aws_ecs_task_definition" "video_service"
resource "aws_ecs_task_definition" "transcoding_service"
resource "aws_ecs_service" "frontend"
resource "aws_ecs_service" "auth_service"
resource "aws_ecs_service" "video_service"
resource "aws_ecs_service" "transcoding_service"
resource "aws_appautoscaling_target" "ecs_target"
resource "aws_appautoscaling_policy" "ecs_policy"
```

---

### Option 4: Custom Scaling Metric (2 Marks) ⭐ RECOMMENDED

**Implementation:**
- Custom CloudWatch metrics from application
- Scaling based on application-specific metrics
- Better resource utilization

**Custom Metrics:**
1. **Video Processing Queue Length**
   - Metric: `VideoProcessing/QueueDepth`
   - Scale out: Queue > 10 items
   - Scale in: Queue < 3 items

2. **Active User Sessions**
   - Metric: `Application/ActiveSessions`
   - Scale out: Sessions > 100
   - Scale in: Sessions < 20

3. **S3 Upload Rate**
   - Metric: `VideoService/UploadsPerMinute`
   - Scale out: Uploads > 5/min
   - Scale in: Uploads < 1/min

4. **Cache Hit Rate**
   - Metric: `Cache/HitRate`
   - Scale in: Hit rate > 80%
   - Monitor only: Hit rate < 50%

**Tasks:**
- [ ] Implement CloudWatch metrics SDK in services
- [ ] Create custom metric publishers
- [ ] Configure CloudWatch alarms for custom metrics
- [ ] Create scaling policies based on custom metrics
- [ ] Set up CloudWatch dashboard
- [ ] Document metric collection

**Code Example:**
```javascript
// Publish custom metric
import { CloudWatch } from '@aws-sdk/client-cloudwatch';

async function publishQueueMetric(queueLength) {
  const cloudwatch = new CloudWatch({ region: 'ap-southeast-2' });
  await cloudwatch.putMetricData({
    Namespace: 'VideoProcessing',
    MetricData: [{
      MetricName: 'QueueDepth',
      Value: queueLength,
      Unit: 'Count',
      Timestamp: new Date()
    }]
  });
}
```

---

### Option 5: Enhanced Infrastructure as Code (2 Marks) ⭐ RECOMMENDED

**Current State:** Basic Terraform with some manual steps

**Enhancement Goals:**
- Modular Terraform code
- Multiple environments (dev/staging/prod)
- Remote state management
- CI/CD integration
- Complete infrastructure coverage

**Terraform Structure:**
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
│   ├── vpc/
│   ├── alb/
│   ├── asg/
│   ├── ecs/
│   ├── rds/
│   ├── elasticache/
│   ├── s3/
│   ├── lambda/
│   └── monitoring/
├── main.tf
├── variables.tf
├── outputs.tf
└── backend.tf
```

**Tasks:**
- [ ] Refactor into reusable modules
- [ ] Set up S3 backend for state
- [ ] Implement DynamoDB state locking
- [ ] Create workspace for environments
- [ ] Add comprehensive outputs
- [ ] Implement variable validation
- [ ] Add pre-commit hooks for validation
- [ ] Document module usage

**Backend Configuration:**
```hcl
terraform {
  backend "s3" {
    bucket         = "n11817143-terraform-state"
    key            = "webapp/terraform.tfstate"
    region         = "ap-southeast-2"
    dynamodb_table = "terraform-state-lock"
    encrypt        = true
  }
}
```

---

### Option 6: Edge Caching with CloudFront (2 Marks) ⭐ RECOMMENDED

**Implementation:**
- CloudFront distribution for static assets
- Edge caching for video thumbnails
- Reduced latency for users
- Lower S3 costs

**Architecture:**
```
User → CloudFront → Origin (ALB/S3)
       ↓ Cache
    Edge Locations (Sydney, Melbourne, etc.)
```

**Distribution Configuration:**
- **Origin 1:** ALB (dynamic content)
  - Cache policy: None or minimal
  - Viewer protocol: Redirect HTTP to HTTPS
  
- **Origin 2:** S3 (static assets)
  - Cache policy: CachingOptimized
  - TTL: 86400 seconds (1 day)

- **Origin 3:** S3 (video thumbnails)
  - Cache policy: CachingOptimized
  - TTL: 604800 seconds (7 days)

**Tasks:**
- [ ] Create CloudFront distribution
- [ ] Configure multiple origins
- [ ] Set up cache behaviors:
  - `/static/*` → S3 origin (long cache)
  - `/api/*` → ALB origin (no cache)
  - `/thumbnails/*` → S3 origin (long cache)
  - `/*` → ALB origin (minimal cache)
- [ ] Configure custom SSL certificate
- [ ] Set up access logs
- [ ] Configure error pages
- [ ] Test caching behavior

**Benefits:**
- Faster content delivery
- Reduced backend load
- Lower bandwidth costs
- Global availability

---

### Option 7: Dead Letter Queue (2 Marks) ⭐ RECOMMENDED

**Implementation:**
- DLQ for failed message processing
- Error tracking and monitoring
- Message replay capability

**DLQ Architecture:**
```
Main Queue → Consumer (fail) → DLQ
             ↓ (success)
         Processing Complete

DLQ → CloudWatch Alarm → SNS → Email/Slack
DLQ → Lambda → Error Analysis → CloudWatch Logs
```

**Queues to Implement:**
1. **Transcoding Queue + DLQ**
   - Main: `transcoding-queue`
   - DLQ: `transcoding-queue-dlq`
   - Max receives: 3

2. **Notification Queue + DLQ**
   - Main: `notification-queue`
   - DLQ: `notification-queue-dlq`
   - Max receives: 5

3. **Email Queue + DLQ**
   - Main: `email-queue`
   - DLQ: `email-queue-dlq`
   - Max receives: 3

**Tasks:**
- [ ] Create DLQ for each main queue
- [ ] Configure redrive policy
- [ ] Implement message retention
- [ ] Set up CloudWatch alarms for DLQ
- [ ] Create Lambda for DLQ processing
- [ ] Implement message replay mechanism
- [ ] Add monitoring dashboard

**Error Handling Flow:**
```javascript
async function processMessage(message) {
  try {
    // Process message
    await doWork(message);
    // Delete from queue on success
  } catch (error) {
    // Log error
    console.error('Processing failed:', error);
    // Message returns to queue
    // After max retries → DLQ
    throw error;
  }
}
```

---

### Option 8: Additional Microservices (2 Marks)

**Potential Services:**
1. **API Gateway Service**
   - Central entry point
   - Request routing
   - Rate limiting
   - API key management

2. **Notification Service**
   - Email notifications (SES)
   - SMS notifications (SNS)
   - In-app notifications
   - Webhook delivery

3. **Analytics Service**
   - Usage tracking
   - Performance metrics
   - User behavior analysis
   - Report generation

4. **Search Service**
   - Video search (OpenSearch/Elasticsearch)
   - Full-text search
   - Faceted search
   - Search analytics

**Recommendation:** Skip unless time permits. Focus on core microservices first.

---

### Option 9: Advanced Container Orchestration - EKS (2 Marks)

**Implementation:**
- Amazon Elastic Kubernetes Service (EKS)
- Kubernetes manifests
- Helm charts
- Service mesh (optional)

**Why Skip:**
- Complex setup
- Steep learning curve
- ECS is sufficient
- Higher cost
- More maintenance

**If Implementing:**
- [ ] Create EKS cluster
- [ ] Configure kubectl
- [ ] Create Kubernetes manifests
- [ ] Set up Helm charts
- [ ] Configure ingress controller
- [ ] Implement pod auto-scaling
- [ ] Set up monitoring (Prometheus/Grafana)

**Recommendation:** Skip this option. Use ECS instead (Option 3).

---

### Option 10: Upon Request (2 Marks)

**Potential Custom Features:**
- Machine learning integration (Rekognition for content moderation)
- Real-time video streaming (AWS IVS)
- Advanced caching strategies (Redis with ElastiCache)
- Multi-region deployment
- Disaster recovery setup

**Recommendation:** Discuss with instructor if interested in custom feature.

---

## 📋 Report Requirements (1 Mark)

### Report Structure

#### 1. Executive Summary
- Project overview
- Architecture evolution (A2 → A3)
- Key achievements
- Challenges faced

#### 2. Architecture Design
- **Current Architecture Diagram** (Assignment 2)
- **Target Architecture Diagram** (Assignment 3)
- Component descriptions
- Communication patterns
- Data flow diagrams

#### 3. Microservices Design
- Service breakdown rationale
- API contracts
- Inter-service communication
- Service dependencies
- Database per service (if applicable)

#### 4. Infrastructure as Code
- Terraform module structure
- Resource organization
- State management
- Variable management
- Environment separation

#### 5. Load Balancing & Scaling
- ALB configuration details
- Target group setup
- Health check configuration
- Auto-scaling policies
- Scaling test results

#### 6. Security Implementation
- HTTPS setup process
- Certificate management
- Security group configuration
- IAM roles and policies
- Secrets management

#### 7. Additional Features
- Detailed implementation for each selected criterion
- Design decisions
- Trade-offs considered
- Benefits realized

#### 8. Performance Analysis
- Load testing methodology
- Performance metrics before/after
- Scalability test results
- Cost analysis

#### 9. Deployment Guide
- Prerequisites
- Step-by-step deployment
- Configuration details
- Troubleshooting guide

#### 10. Cost Analysis
- **AWS Cost Calculator estimates**
- Monthly cost projection
- Cost optimization strategies
- Cost comparison (A2 vs A3)

#### 11. Challenges & Solutions
- Technical challenges
- Solutions implemented
- Lessons learned
- Future improvements

#### 12. Conclusion
- Summary of achievements
- Assignment criteria fulfillment
- Future enhancements

### Required Diagrams

1. **Architecture Diagram (Before)**
2. **Architecture Diagram (After)**
3. **Microservices Communication Diagram**
4. **Load Balancer Flow Diagram**
5. **Auto-scaling Behavior Diagram**
6. **Deployment Pipeline Diagram**

---

## 🗓️ Implementation Timeline

### Week 1: Core Infrastructure (Days 1-7)

#### Day 1-2: Microservices Refactoring
- Split monolithic backend
- Create service directories
- Extract service logic
- Create individual Dockerfiles

#### Day 3-4: Load Balancer Setup
- Create ALB with Terraform
- Configure target groups
- Set up routing rules
- Test load distribution

#### Day 5-6: Auto Scaling
- Create launch template
- Configure ASG
- Set up scaling policies
- Test scaling behavior

#### Day 7: HTTPS Implementation
- Request ACM certificate
- Configure HTTPS listener
- Update application for HTTPS
- Test SSL/TLS

### Week 2: Additional Features (Days 8-14)

#### Day 8-9: ECS Migration
- Create ECS cluster
- Build task definitions
- Deploy services to ECS
- Configure service auto-scaling

#### Day 10-11: Serverless + Messaging
- Create Lambda functions
- Set up SNS/SQS
- Implement event-driven flows
- Test async processing

#### Day 12: CloudFront + DLQ
- Create CloudFront distribution
- Configure DLQ for queues
- Set up monitoring
- Test edge caching

#### Day 13: Enhanced IaC + Custom Metrics
- Refactor Terraform into modules
- Implement custom CloudWatch metrics
- Set up monitoring dashboard
- Test custom scaling

#### Day 14: Testing & Validation
- End-to-end testing
- Performance testing
- Security testing
- Documentation review

### Week 3: Documentation & Polish (Days 15-21)

#### Day 15-17: Report Writing
- Architecture documentation
- Implementation details
- Cost analysis
- Performance results

#### Day 18-19: Diagrams & Screenshots
- Create architecture diagrams
- Capture screenshots
- Generate performance graphs
- Document configurations

#### Day 20: Final Review
- Code review
- Documentation review
- Test all functionality
- Fix any issues

#### Day 21: Submission Preparation
- Package submission
- Verify all requirements
- Double-check criteria
- Submit assignment

---

## ✅ Success Criteria Checklist

### Core Requirements (10 Marks)
- [ ] Microservices: 3+ independent services deployed
- [ ] Load Distribution: ALB with target groups configured
- [ ] Auto Scaling: ASG with 2+ scaling policies
- [ ] HTTPS: SSL/TLS certificate on ALB

### Additional Requirements (14 Marks - Select 7)
- [ ] Serverless Functions: 2+ Lambda functions deployed
- [ ] SNS/SQS: Message queues for async communication
- [ ] ECS: Container orchestration with auto-scaling
- [ ] Custom Metrics: Application metrics for scaling
- [ ] Enhanced IaC: Modular Terraform with remote state
- [ ] CloudFront: CDN for static assets
- [ ] Dead Letter Queue: Error handling for queues

### Report (1 Mark)
- [ ] Architecture diagrams (before/after)
- [ ] Implementation details
- [ ] Cost analysis
- [ ] Performance testing results
- [ ] Deployment guide

### Code Quality
- [ ] Clean, maintainable code
- [ ] Comprehensive comments
- [ ] Error handling
- [ ] Logging and monitoring
- [ ] Security best practices

### Testing
- [ ] Services start successfully
- [ ] Load balancer distributes traffic
- [ ] Auto-scaling triggers correctly
- [ ] HTTPS works end-to-end
- [ ] All features functional

---

## 💰 Estimated AWS Costs (Monthly)

### Assignment 2 (Current)
- EC2 t3.medium (1x): $30.40
- S3 storage (100 GB): $2.30
- DynamoDB (on-demand): ~$2.50
- ElastiCache (cache.t3.micro): $12.41
- Data transfer: ~$5.00
- **Total: ~$52.61/month**

### Assignment 3 (Projected)

#### Compute
- ALB: $16.20 (basic)
- EC2 instances (2-6x t3.medium): $60.80 - $182.40
- ECS Fargate (if used): ~$40-80
- Lambda executions (100K/month): $0.20

#### Storage & Database
- S3 storage (100 GB): $2.30
- DynamoDB (on-demand): ~$2.50
- ElastiCache: $12.41

#### Networking
- Data transfer: ~$15-30
- CloudFront (if used): ~$10-20

#### Messaging & Monitoring
- SNS/SQS: ~$0.50
- CloudWatch: ~$5-10

**Estimated Total: $150-350/month**

### Cost Optimization Strategies
- Use spot instances for non-critical services
- Implement aggressive auto-scaling policies
- Use CloudFront to reduce data transfer
- Optimize S3 lifecycle policies
- Use Reserved Instances for base capacity

---

## 🚨 Potential Challenges & Mitigation

### Challenge 1: Service Communication Complexity
**Issue:** Multiple services need to communicate reliably  
**Mitigation:**
- Implement API Gateway pattern
- Use service discovery (ECS Service Discovery)
- Implement circuit breakers
- Add comprehensive logging

### Challenge 2: Database Consistency
**Issue:** Distributed transactions across services  
**Mitigation:**
- Use eventual consistency where possible
- Implement saga pattern for critical workflows
- Use DynamoDB transactions
- Add idempotency keys

### Challenge 3: Debugging Distributed Systems
**Issue:** Difficult to trace requests across services  
**Mitigation:**
- Implement correlation IDs
- Use AWS X-Ray for tracing
- Centralized logging (CloudWatch Logs)
- Service mesh (if using EKS)

### Challenge 4: Configuration Management
**Issue:** Multiple services, multiple configurations  
**Mitigation:**
- Use Parameter Store extensively
- Implement configuration service
- Use environment-specific configs
- Version control all configs

### Challenge 5: Testing Complexity
**Issue:** Testing distributed system end-to-end  
**Mitigation:**
- Implement integration tests
- Use contract testing
- Set up staging environment
- Implement chaos engineering (optional)

### Challenge 6: Cost Management
**Issue:** Multiple services = higher costs  
**Mitigation:**
- Monitor costs with AWS Cost Explorer
- Set up billing alarms
- Implement auto-scaling aggressively
- Use cost optimization tools

---

## 📚 Reference Documentation

### AWS Documentation
- [Application Load Balancer](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/)
- [Auto Scaling Groups](https://docs.aws.amazon.com/autoscaling/ec2/userguide/)
- [Amazon ECS](https://docs.aws.amazon.com/ecs/)
- [AWS Lambda](https://docs.aws.amazon.com/lambda/)
- [Amazon SNS](https://docs.aws.amazon.com/sns/)
- [Amazon SQS](https://docs.aws.amazon.com/sqs/)
- [Amazon CloudFront](https://docs.aws.amazon.com/cloudfront/)
- [AWS Certificate Manager](https://docs.aws.amazon.com/acm/)

### Terraform Documentation
- [AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Module Development](https://www.terraform.io/docs/language/modules/develop/index.html)
- [Remote State](https://www.terraform.io/docs/language/state/remote.html)

### Best Practices
- [Microservices on AWS](https://aws.amazon.com/microservices/)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [12-Factor App](https://12factor.net/)

---

## 🎯 Final Recommendations

### Must-Do (Core Requirements)
1. ✅ **Microservices** - Start here, foundation for everything
2. ✅ **ALB** - Required for load distribution
3. ✅ **Auto Scaling** - Key requirement, test thoroughly
4. ✅ **HTTPS** - Straightforward, do early

### Recommended Additional (Pick 7)
1. ✅ **ECS** - Modern, managed, scalable
2. ✅ **Serverless (Lambda)** - Easy wins, impressive
3. ✅ **SNS/SQS** - Enables async, decoupled architecture
4. ✅ **Custom Metrics** - Shows understanding of monitoring
5. ✅ **Enhanced IaC** - Good practice, helps with everything
6. ✅ **CloudFront** - Easy to implement, clear benefits
7. ✅ **DLQ** - Complements SQS, shows maturity

### Skip Unless Time Permits
- ❌ **EKS** - Too complex, ECS is better choice
- ❌ **Additional Microservices** - Focus on quality over quantity
- ⚠️ **Custom Feature** - Only if specific interest

---

## 📞 Next Steps

1. **Review this document** - Understand all requirements
2. **Set up project board** - Track progress
3. **Start with microservices refactor** - Week 1, Days 1-2
4. **Follow timeline** - Stay on schedule
5. **Test frequently** - Don't wait until the end
6. **Document as you go** - Makes report easier
7. **Ask questions early** - Don't get stuck

---

## 🎓 Learning Outcomes

By completing this assignment, you will demonstrate:
- Microservices architecture design
- Cloud-native application development
- Container orchestration (ECS/EKS)
- Serverless computing
- Load balancing and auto-scaling
- Infrastructure as Code (Terraform)
- Event-driven architecture
- AWS service integration
- Security best practices (HTTPS, IAM)
- Cost optimization
- Monitoring and observability

---

**Document Version:** 1.0  
**Last Updated:** October 28, 2025  
**Status:** Planning Phase  
**Next Review:** After Week 1 completion
