# ==========================================
# Terraform Configuration for Microservices Architecture
# CAB432 Assignment 3 - Video App
# ==========================================

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      "qut-username" = "n11817143@qut.edu.au"
      ManagedBy      = "Terraform"
      Student        = "n11817143"
      Project        = "CAB432-VideoApp"
    }
  }
}

# Data Sources
data "aws_caller_identity" "current" {}

data "aws_availability_zones" "available" {
  state = "available"
}

# Local Variables
locals {
  account_id         = data.aws_caller_identity.current.account_id
  availability_zones = slice(data.aws_availability_zones.available.names, 0, var.az_count)

  # Select unique public subnets (one per AZ) - ALB requires unique AZs
  unique_public_subnet_ids = [
    "subnet-04cc288ea3b2e1e53", # ap-southeast-2a
    "subnet-075811427d5564cf9", # ap-southeast-2b
    "subnet-05d0352bb15852524", # ap-southeast-2c
  ]

  common_tags = {
    Project        = var.project_name
    Environment    = var.environment
    ManagedBy      = "Terraform"
    Student        = "n11817143"
    Assignment     = "CAB432-A3"
    "qut-username" = "n11817143@qut.edu.au"
  }
}

# ==========================================
# VPC and Networking - Using Existing Infrastructure
# ==========================================

# Reference existing VPC
data "aws_vpc" "existing" {
  id = var.vpc_id
}

# Reference existing subnets
data "aws_subnets" "public" {
  filter {
    name   = "vpc-id"
    values = [var.vpc_id]
  }
  filter {
    name   = "map-public-ip-on-launch"
    values = ["true"]
  }
}

data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [var.vpc_id]
  }
  filter {
    name   = "map-public-ip-on-launch"
    values = ["false"]
  }
}

# ==========================================
# Cognito - Use Existing User Pool
# ==========================================

# Reference existing Cognito User Pool
data "aws_cognito_user_pool" "existing" {
  user_pool_id = "ap-southeast-2_CdVnmKfrW"
}

# Use the n11817143-a2-public-client
data "aws_cognito_user_pool_client" "existing" {
  user_pool_id = data.aws_cognito_user_pool.existing.id
  client_id    = "296uu7cjlfinpnspc04kp53p83"
}

# ==========================================
# S3 Bucket (Videos Storage)
# ==========================================

# Reference existing S3 bucket for videos
data "aws_s3_bucket" "videos" {
  bucket = var.s3_bucket_name
}

# ==========================================
# Security Groups
# ==========================================

# Reference existing security groups (QUT managed)
data "aws_security_group" "cab432_sg" {
  id = var.cab432_security_group_id
}

data "aws_security_group" "cab432_memcached_sg" {
  id = var.cab432_memcached_security_group_id
}

# ==========================================
# Application Load Balancer
# ==========================================

module "alb" {
  source = "./modules/alb"

  project_name               = var.project_name
  environment                = var.environment
  vpc_id                     = var.vpc_id
  public_subnet_ids          = local.unique_public_subnet_ids
  alb_security_group_id      = data.aws_security_group.cab432_sg.id
  certificate_arn            = var.acm_certificate_arn
  enable_deletion_protection = var.enable_alb_deletion_protection
  enable_alarms              = var.enable_cloudwatch_alarms
}

# ==========================================
# ECR Repositories
# ==========================================

module "ecr" {
  source = "./modules/ecr"

  project_name          = var.project_name
  environment           = var.environment
  enable_image_scanning = var.enable_ecr_scanning
  image_retention_count = var.ecr_image_retention_count
}

# ==========================================
# ECS Cluster
# ==========================================

module "ecs_cluster" {
  source = "./modules/ecs-cluster"

  project_name              = var.project_name
  environment               = var.environment
  aws_region                = var.aws_region
  aws_account_id            = local.account_id
  s3_bucket_name            = var.s3_bucket_name
  dynamodb_table_name       = var.dynamodb_table_name
  sqs_queue_name            = var.sqs_queue_name
  enable_container_insights = var.enable_container_insights
  log_retention_days        = var.log_retention_days
}

# ==========================================
# Video API Service
# ==========================================

module "video_api_service" {
  source = "./modules/ecs-service"

  project_name       = var.project_name
  environment        = var.environment
  service_name       = "video-api"
  aws_region         = var.aws_region
  cluster_id         = module.ecs_cluster.cluster_id
  cluster_name       = module.ecs_cluster.cluster_name
  container_image    = "${module.ecr.video_api_repository_url}:${var.video_api_image_tag}"
  container_port     = 8080
  task_cpu           = var.video_api_cpu
  task_memory        = var.video_api_memory
  desired_count      = var.video_api_desired_count
  execution_role_arn = module.ecs_cluster.task_execution_role_arn
  task_role_arn      = module.ecs_cluster.task_role_arn
  subnet_ids         = data.aws_subnets.public.ids
  security_group_id  = data.aws_security_group.cab432_sg.id
  assign_public_ip   = !var.enable_nat_gateway
  target_group_arn   = module.alb.video_api_target_group_arn
  log_group_name     = module.ecs_cluster.log_group_name
  enable_logging     = true  # Temporarily enable for debugging

  environment_variables = {
    NODE_ENV             = var.environment
    PORT                 = "8080"
    AWS_REGION           = var.aws_region
    DYNAMODB_TABLE_NAME  = var.dynamodb_table_name
    S3_BUCKET_NAME       = var.s3_bucket_name
    SQS_QUEUE_URL        = "https://sqs.${var.aws_region}.amazonaws.com/${local.account_id}/${var.sqs_queue_name}"
    COGNITO_USER_POOL_ID = data.aws_cognito_user_pool.existing.id
    COGNITO_CLIENT_ID    = data.aws_cognito_user_pool_client.existing.id
    COGNITO_REGION       = var.aws_region
    ELASTICACHE_ENDPOINT = var.elasticache_endpoint
    CACHE_TTL            = "300"
    USE_PARAMETER_STORE  = "false"
    CLIENT_ORIGINS       = "https://app.${var.domain_name},https://${var.domain_name}"
  }

  secrets = [
    {
      name      = "JWT_SECRET"
      valueFrom = "arn:aws:ssm:${var.aws_region}:${local.account_id}:parameter/videoapp/${var.environment}/jwt-secret"
    }
  ]

  enable_autoscaling  = var.enable_autoscaling
  min_capacity        = var.video_api_min_capacity
  max_capacity        = var.video_api_max_capacity
  cpu_target_value    = var.autoscaling_cpu_target
  memory_target_value = var.autoscaling_memory_target
  enable_alarms       = var.enable_cloudwatch_alarms
}

# ==========================================
# Admin Service
# ==========================================

module "admin_service" {
  source = "./modules/ecs-service"

  project_name       = var.project_name
  environment        = var.environment
  service_name       = "admin-service"
  aws_region         = var.aws_region
  cluster_id         = module.ecs_cluster.cluster_id
  cluster_name       = module.ecs_cluster.cluster_name
  container_image    = "${module.ecr.admin_service_repository_url}:${var.admin_service_image_tag}"
  container_port     = 8080
  task_cpu           = var.admin_service_cpu
  task_memory        = var.admin_service_memory
  desired_count      = var.admin_service_desired_count
  execution_role_arn = module.ecs_cluster.task_execution_role_arn
  task_role_arn      = module.ecs_cluster.task_role_arn
  subnet_ids         = data.aws_subnets.public.ids
  security_group_id  = data.aws_security_group.cab432_sg.id
  assign_public_ip   = !var.enable_nat_gateway
  target_group_arn   = module.alb.admin_service_target_group_arn
  log_group_name     = module.ecs_cluster.log_group_name
  enable_logging     = true  # Temporarily enable for debugging

  environment_variables = {
    NODE_ENV             = var.environment
    PORT                 = "8080"
    AWS_REGION           = var.aws_region
    DYNAMODB_TABLE_NAME  = var.dynamodb_table_name
    S3_BUCKET_NAME       = var.s3_bucket_name
    COGNITO_USER_POOL_ID = data.aws_cognito_user_pool.existing.id
    COGNITO_CLIENT_ID    = data.aws_cognito_user_pool_client.existing.id
    COGNITO_REGION       = var.aws_region
    USE_PARAMETER_STORE  = "false"
    CLIENT_ORIGINS       = "https://app.${var.domain_name},https://${var.domain_name}"
  }

  secrets = [
    {
      name      = "JWT_SECRET"
      valueFrom = "arn:aws:ssm:${var.aws_region}:${local.account_id}:parameter/videoapp/${var.environment}/jwt-secret"
    }
  ]

  enable_autoscaling  = var.enable_autoscaling
  min_capacity        = var.admin_service_min_capacity
  max_capacity        = var.admin_service_max_capacity
  cpu_target_value    = var.autoscaling_cpu_target
  memory_target_value = var.autoscaling_memory_target
  enable_alarms       = var.enable_cloudwatch_alarms
}

# ==========================================
# Transcode Worker Service
# ==========================================

module "transcode_worker" {
  source = "./modules/ecs-service"

  project_name       = var.project_name
  environment        = var.environment
  service_name       = "transcode-worker"
  aws_region         = var.aws_region
  cluster_id         = module.ecs_cluster.cluster_id
  cluster_name       = module.ecs_cluster.cluster_name
  container_image    = "${module.ecr.transcode_worker_repository_url}:latest"
  container_port     = 0 # No port - worker doesn't accept connections
  task_cpu           = var.transcode_worker_cpu
  task_memory        = var.transcode_worker_memory
  desired_count      = var.transcode_worker_desired_count
  execution_role_arn = module.ecs_cluster.task_execution_role_arn
  task_role_arn      = module.ecs_cluster.task_role_arn
  subnet_ids         = data.aws_subnets.public.ids
  security_group_id  = data.aws_security_group.cab432_sg.id
  assign_public_ip   = !var.enable_nat_gateway
  log_group_name     = module.ecs_cluster.log_group_name
  enable_logging     = true  # Temporarily enable for debugging

  environment_variables = {
    AWS_REGION             = var.aws_region
    DYNAMODB_TABLE_NAME    = var.dynamodb_table_name
    S3_BUCKET_NAME         = var.s3_bucket_name
    TRANSCODE_QUEUE_URL    = "https://sqs.${var.aws_region}.amazonaws.com/${local.account_id}/${var.sqs_queue_name}"
    SQS_WAIT_TIME_SECONDS  = "20"
    SQS_VISIBILITY_TIMEOUT = "600"
    SQS_MAX_MESSAGES       = "1"
    MAX_FILE_SIZE          = "524288000"
    TEMP_DIR               = "/tmp/transcode"
    USE_PARAMETER_STORE    = "false"
  }

  health_check_command = ["CMD-SHELL", "ps aux | grep 'node.*index.js' | grep -v grep || exit 1"]

  enable_autoscaling  = var.enable_autoscaling
  min_capacity        = var.transcode_worker_min_capacity
  max_capacity        = var.transcode_worker_max_capacity
  cpu_target_value    = var.autoscaling_cpu_target
  memory_target_value = var.autoscaling_memory_target
  enable_alarms       = var.enable_cloudwatch_alarms
}

# ==========================================
# Static Website (S3 + CloudFront)
# ==========================================

module "static_website" {
  source = "./modules/s3-static-website"

  project_name        = var.project_name
  environment         = var.environment
  acm_certificate_arn = "arn:aws:acm:us-east-1:901444280953:certificate/3e304793-a3b9-4d8d-9953-74f366cd3453"
  cloudfront_aliases  = ["app.${var.domain_name}"]
  create_oac          = false
  existing_oac_id     = "E2H9DXFI7YLTIM"  # Reuse existing OAC from account
}

# ==========================================
# SQS Dead Letter Queue
# ==========================================

# Dead Letter Queue for failed transcode jobs
resource "aws_sqs_queue" "transcode_dlq" {
  name                       = "${var.sqs_queue_name}-dlq"
  message_retention_seconds  = 1209600  # 14 days (maximum)
  visibility_timeout_seconds = 30

  tags = {
    Name        = "${var.project_name}-transcode-dlq"
    Project     = var.project_name
    Environment = var.environment
    Purpose     = "Dead Letter Queue for failed transcode jobs"
  }
}

# Reference to existing main SQS queue (managed outside Terraform)
# We add the DLQ configuration via AWS CLI after Terraform creates the DLQ
data "aws_sqs_queue" "main_queue" {
  name = var.sqs_queue_name
}

# CloudWatch Alarm for DLQ messages
resource "aws_cloudwatch_metric_alarm" "dlq_messages" {
  alarm_name          = "${var.project_name}-transcode-dlq-messages"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = "300"  # 5 minutes
  statistic           = "Average"
  threshold           = "0"
  alarm_description   = "Alert when messages accumulate in the Dead Letter Queue"
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = aws_sqs_queue.transcode_dlq.name
  }

  tags = {
    Name        = "${var.project_name}-dlq-alarm"
    Project     = var.project_name
    Environment = var.environment
  }
}

# ==========================================
# Lambda Function (S3 to SQS)
# ==========================================

module "s3_to_sqs_lambda" {
  source = "./modules/lambda"

  function_name = "${var.project_name}-s3-to-sqs"
  image_uri     = "${module.ecr.s3_lambda_repository_url}:latest"
  
  # Use existing Lambda execution role (CAB432 pre-created)
  lambda_execution_role_arn = "arn:aws:iam::901444280953:role/CAB432-Lambda-Role"
  
  # SQS Queue configuration
  queue_url = "https://sqs.${var.aws_region}.amazonaws.com/${local.account_id}/${var.sqs_queue_name}"
  queue_arn = "arn:aws:sqs:${var.aws_region}:${local.account_id}:${var.sqs_queue_name}"
  
  # S3 Bucket configuration
  s3_bucket_id  = data.aws_s3_bucket.videos.id
  s3_bucket_arn = data.aws_s3_bucket.videos.arn
  
  # Lambda configuration
  timeout     = 30
  memory_size = 256
  
  # Environment variables
  environment_variables = {
    TRANSCODE_QUEUE_URL = "https://sqs.${var.aws_region}.amazonaws.com/${local.account_id}/${var.sqs_queue_name}"
    # Note: AWS_REGION is automatically set by Lambda runtime, don't override
  }
  
  aws_region = var.aws_region
  tags       = local.common_tags
}
