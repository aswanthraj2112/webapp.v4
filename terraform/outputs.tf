# ==========================================
# Outputs for Microservices Infrastructure
# ==========================================

# VPC Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = var.vpc_id
}

output "public_subnet_ids" {
  description = "IDs of public subnets"
  value       = data.aws_subnets.public.ids
}

output "private_subnet_ids" {
  description = "IDs of private subnets"
  value       = data.aws_subnets.private.ids
}

# ALB Outputs
output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = module.alb.alb_dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the Application Load Balancer"
  value       = module.alb.alb_zone_id
}

# ECR Outputs
output "video_api_repository_url" {
  description = "URL of Video API ECR repository"
  value       = module.ecr.video_api_repository_url
}

output "admin_service_repository_url" {
  description = "URL of Admin Service ECR repository"
  value       = module.ecr.admin_service_repository_url
}

output "transcode_worker_repository_url" {
  description = "URL of Transcode Worker ECR repository"
  value       = module.ecr.transcode_worker_repository_url
}

output "s3_lambda_repository_url" {
  description = "URL of S3 Lambda ECR repository"
  value       = module.ecr.s3_lambda_repository_url
}

# ECS Outputs
output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = module.ecs_cluster.cluster_name
}

output "ecs_cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = module.ecs_cluster.cluster_arn
}

# Service Outputs
output "video_api_service_name" {
  description = "Name of Video API service"
  value       = module.video_api_service.service_name
}

output "admin_service_name" {
  description = "Name of Admin Service"
  value       = module.admin_service.service_name
}

output "transcode_worker_service_name" {
  description = "Name of Transcode Worker service"
  value       = module.transcode_worker.service_name
}

# Connection Information
output "api_endpoint" {
  description = "API endpoint URL"
  value       = "http://${module.alb.alb_dns_name}"
}

output "video_api_endpoint" {
  description = "Video API endpoint"
  value       = "http://${module.alb.alb_dns_name}/api"
}

output "admin_api_endpoint" {
  description = "Admin API endpoint"
  value       = "http://${module.alb.alb_dns_name}/api/admin"
}

# Deployment Commands
output "docker_login_command" {
  description = "Command to login to ECR"
  value       = "aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${local.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com"
  sensitive   = true
}

output "build_and_push_commands" {
  description = "Commands to build and push Docker images"
  value = {
    video_api = "docker build -t ${module.ecr.video_api_repository_url}:latest ./server/services/video-api && docker push ${module.ecr.video_api_repository_url}:latest"
    admin_service = "docker build -t ${module.ecr.admin_service_repository_url}:latest ./server/services/admin-service && docker push ${module.ecr.admin_service_repository_url}:latest"
    transcode_worker = "docker build -t ${module.ecr.transcode_worker_repository_url}:latest ./server/services/transcode-worker && docker push ${module.ecr.transcode_worker_repository_url}:latest"
    s3_lambda = "docker build -t ${module.ecr.s3_lambda_repository_url}:latest ./lambda/s3-to-sqs && docker push ${module.ecr.s3_lambda_repository_url}:latest"
  }
}

output "update_service_commands" {
  description = "Commands to force update ECS services"
  value = {
    video_api = "aws ecs update-service --cluster ${module.ecs_cluster.cluster_name} --service ${module.video_api_service.service_name} --force-new-deployment"
    admin_service = "aws ecs update-service --cluster ${module.ecs_cluster.cluster_name} --service ${module.admin_service.service_name} --force-new-deployment"
    transcode_worker = "aws ecs update-service --cluster ${module.ecs_cluster.cluster_name} --service ${module.transcode_worker.service_name} --force-new-deployment"
  }
}
