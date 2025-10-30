# ==========================================
# Core Variables
# ==========================================

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "ap-southeast-2"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "n11817143-videoapp"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "az_count" {
  description = "Number of availability zones to use"
  type        = number
  default     = 2
}

# ==========================================
# Network Variables
# ==========================================

variable "vpc_id" {
  description = "Existing VPC ID to use (QUT environment)"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_ids" {
  description = "List of existing public subnet IDs"
  type        = list(string)
  default     = []
}

variable "private_subnet_ids" {
  description = "List of existing private subnet IDs"
  type        = list(string)
  default     = []
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnets"
  type        = bool
  default     = true
}

variable "enable_vpc_flow_logs" {
  description = "Enable VPC Flow Logs"
  type        = bool
  default     = false
}

variable "cab432_security_group_id" {
  description = "ID of existing CAB432SG security group"
  type        = string
  default     = "sg-032bd1ff8cf77dbb9"
}

variable "cab432_memcached_security_group_id" {
  description = "ID of existing CAB432MemcachedSG security group"
  type        = string
  default     = "sg-07707a36aa1599475"
}

# ==========================================
# ALB Variables
# ==========================================

variable "acm_certificate_arn" {
  description = "ARN of ACM certificate for HTTPS (leave empty for HTTP only)"
  type        = string
  default     = ""
}

variable "enable_alb_deletion_protection" {
  description = "Enable deletion protection for ALB"
  type        = bool
  default     = false
}

# ==========================================
# ECR Variables
# ==========================================

variable "enable_ecr_scanning" {
  description = "Enable image vulnerability scanning"
  type        = bool
  default     = true
}

variable "ecr_image_retention_count" {
  description = "Number of images to retain in ECR"
  type        = number
  default     = 10
}

# ==========================================
# ECS Cluster Variables
# ==========================================

variable "enable_container_insights" {
  description = "Enable CloudWatch Container Insights"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 7
}

# ==========================================
# AWS Service Names
# ==========================================

variable "s3_bucket_name" {
  description = "Name of S3 bucket for videos"
  type        = string
  default     = "n11817143-a2"
}

variable "dynamodb_table_name" {
  description = "Name of DynamoDB table"
  type        = string
  default     = "n11817143-videos"
}

variable "sqs_queue_name" {
  description = "Name of SQS queue"
  type        = string
  default     = "n11817143-transcode-queue"
}

variable "elasticache_endpoint" {
  description = "ElastiCache endpoint (if using existing cluster)"
  type        = string
  default     = ""
}

# ==========================================
# Cognito Variables
# ==========================================

variable "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  type        = string
}

variable "cognito_client_id" {
  description = "Cognito App Client ID"
  type        = string
}

# ==========================================
# Video API Service Variables
# ==========================================

variable "video_api_image_tag" {
  description = "Docker image tag for Video API"
  type        = string
  default     = "latest"
}

variable "video_api_cpu" {
  description = "CPU units for Video API task"
  type        = number
  default     = 512
}

variable "video_api_memory" {
  description = "Memory for Video API task in MB"
  type        = number
  default     = 1024
}

variable "video_api_desired_count" {
  description = "Desired number of Video API tasks"
  type        = number
  default     = 2
}

variable "video_api_min_capacity" {
  description = "Minimum number of Video API tasks"
  type        = number
  default     = 1
}

variable "video_api_max_capacity" {
  description = "Maximum number of Video API tasks"
  type        = number
  default     = 4
}

# ==========================================
# Admin Service Variables
# ==========================================

variable "admin_service_image_tag" {
  description = "Docker image tag for Admin Service"
  type        = string
  default     = "latest"
}

variable "admin_service_cpu" {
  description = "CPU units for Admin Service task"
  type        = number
  default     = 256
}

variable "admin_service_memory" {
  description = "Memory for Admin Service task in MB"
  type        = number
  default     = 512
}

variable "admin_service_desired_count" {
  description = "Desired number of Admin Service tasks"
  type        = number
  default     = 1
}

variable "admin_service_min_capacity" {
  description = "Minimum number of Admin Service tasks"
  type        = number
  default     = 1
}

variable "admin_service_max_capacity" {
  description = "Maximum number of Admin Service tasks"
  type        = number
  default     = 2
}

# ==========================================
# Transcode Worker Variables
# ==========================================

variable "transcode_worker_image_tag" {
  description = "Docker image tag for Transcode Worker"
  type        = string
  default     = "latest"
}

variable "transcode_worker_cpu" {
  description = "CPU units for Transcode Worker task"
  type        = number
  default     = 1024
}

variable "transcode_worker_memory" {
  description = "Memory for Transcode Worker task in MB"
  type        = number
  default     = 2048
}

variable "transcode_worker_desired_count" {
  description = "Desired number of Transcode Worker tasks"
  type        = number
  default     = 1
}

variable "transcode_worker_min_capacity" {
  description = "Minimum number of Transcode Worker tasks"
  type        = number
  default     = 0
}

variable "transcode_worker_max_capacity" {
  description = "Maximum number of Transcode Worker tasks"
  type        = number
  default     = 3
}

# ==========================================
# Auto-scaling Variables
# ==========================================

variable "enable_autoscaling" {
  description = "Enable auto-scaling for services"
  type        = bool
  default     = true
}

variable "autoscaling_cpu_target" {
  description = "Target CPU utilization for auto-scaling (%)"
  type        = number
  default     = 70
}

variable "autoscaling_memory_target" {
  description = "Target memory utilization for auto-scaling (%)"
  type        = number
  default     = 80
}

# ==========================================
# Monitoring Variables
# ==========================================

variable "enable_cloudwatch_alarms" {
  description = "Enable CloudWatch alarms"
  type        = bool
  default     = true
}
