variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "ap-southeast-2"
}

variable "project_prefix" {
  description = "Prefix used for naming AWS resources"
  type        = string
  default     = "n11817143"
}

variable "cognito_user_pool_id" {
  description = "Existing Cognito User Pool ID"
  type        = string
  default     = "ap-southeast-2_CdVnmKfrW"
}

variable "domain_name" {
  description = "Application domain name"
  type        = string
  default     = "n11817143-videoapp.cab432.com"
}

variable "route53_zone_name" {
  description = "Route53 hosted zone name"
  type        = string
  default     = "cab432.com"
}

variable "ec2_public_dns" {
  description = "Public DNS name of the EC2 instance for the CNAME"
  type        = string
  default     = "ec2-3-27-210-9.ap-southeast-2.compute.amazonaws.com"
}

variable "s3_bucket_name" {
  description = "S3 bucket name for raw uploads and assets"
  type        = string
  default     = "n11817143-a2"
}

variable "s3_force_destroy" {
  description = "Allow Terraform to delete non-empty buckets"
  type        = bool
  default     = false
}

variable "dynamodb_table_name" {
  description = "DynamoDB table name for video metadata"
  type        = string
  default     = "n11817143-VideoApp"
}

variable "secrets_manager_name" {
  description = "Secrets Manager secret name for Cognito client secret"
  type        = string
  default     = "n11817143-a2-secret"
}

variable "parameter_store_prefix" {
  description = "SSM Parameter Store prefix"
  type        = string
  default     = "/n11817143/app/"
}

variable "s3_raw_prefix" {
  description = "S3 prefix for raw uploads"
  type        = string
  default     = "raw/"
}

variable "s3_transcoded_prefix" {
  description = "S3 prefix for transcoded assets"
  type        = string
  default     = "transcoded/"
}

variable "s3_thumbnail_prefix" {
  description = "S3 prefix for thumbnails"
  type        = string
  default     = "thumbnails/"
}

variable "max_upload_size_mb" {
  description = "Maximum upload size in megabytes"
  type        = number
  default     = 512
}

variable "presigned_url_ttl" {
  description = "Presigned URL expiry in seconds"
  type        = number
  default     = 900
}

variable "elasticache_cluster_name" {
  description = "ElastiCache cluster identifier"
  type        = string
  default     = "n11817143-a2-cache"
}

variable "elasticache_node_type" {
  description = "ElastiCache node instance type"
  type        = string
  default     = "cache.t3.micro"
}

variable "elasticache_node_count" {
  description = "Number of cache nodes"
  type        = number
  default     = 1
}

variable "cache_subnet_ids" {
  description = "Subnet IDs for the ElastiCache subnet group"
  type        = list(string)
  default     = []
}

variable "cache_security_group_ids" {
  description = "Security groups applied to the ElastiCache cluster"
  type        = list(string)
  default     = []
}

variable "default_tags" {
  description = "Default tags applied to all resources"
  type        = map(string)
  default = {
    Project = "n11817143-video-transcoder"
  }
}

variable "access_token_validity_minutes" {
  description = "Access token validity for Cognito client"
  type        = number
  default     = 60
}

variable "id_token_validity_minutes" {
  description = "ID token validity for Cognito client"
  type        = number
  default     = 60
}

variable "refresh_token_validity_days" {
  description = "Refresh token validity for Cognito client"
  type        = number
  default     = 30
}
