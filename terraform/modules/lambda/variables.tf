# ==========================================
# Lambda Module - Variables
# ==========================================

variable "function_name" {
  description = "Name of the Lambda function"
  type        = string
}

variable "image_uri" {
  description = "ECR image URI for the Lambda function"
  type        = string
}

variable "queue_url" {
  description = "SQS queue URL for transcode jobs"
  type        = string
}

variable "queue_arn" {
  description = "SQS queue ARN for IAM permissions"
  type        = string
}

variable "s3_bucket_id" {
  description = "S3 bucket ID to monitor for events"
  type        = string
}

variable "s3_bucket_arn" {
  description = "S3 bucket ARN for IAM permissions"
  type        = string
}

variable "environment_variables" {
  description = "Environment variables for Lambda function"
  type        = map(string)
  default     = {}
}

variable "timeout" {
  description = "Lambda function timeout in seconds"
  type        = number
  default     = 30
}

variable "memory_size" {
  description = "Lambda function memory size in MB"
  type        = number
  default     = 256
}

variable "reserved_concurrent_executions" {
  description = "Number of reserved concurrent executions"
  type        = number
  default     = -1
}

variable "tags" {
  description = "Tags to apply to Lambda resources"
  type        = map(string)
  default     = {}
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-southeast-2"
}

variable "lambda_execution_role_arn" {
  description = "ARN of existing Lambda execution role"
  type        = string
}
