variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
}

variable "service_name" {
  description = "Name of the service"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "cluster_id" {
  description = "ID of ECS cluster"
  type        = string
}

variable "cluster_name" {
  description = "Name of ECS cluster"
  type        = string
}

variable "container_image" {
  description = "Docker image URL"
  type        = string
}

variable "container_port" {
  description = "Port exposed by container (0 for no port)"
  type        = number
  default     = 0
}

variable "task_cpu" {
  description = "CPU units for task (256, 512, 1024, 2048, 4096)"
  type        = number
  default     = 512
}

variable "task_memory" {
  description = "Memory for task in MB (512, 1024, 2048, etc.)"
  type        = number
  default     = 1024
}

variable "desired_count" {
  description = "Desired number of tasks"
  type        = number
  default     = 1
}

variable "execution_role_arn" {
  description = "ARN of task execution role"
  type        = string
}

variable "task_role_arn" {
  description = "ARN of task role"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs"
  type        = list(string)
}

variable "security_group_id" {
  description = "ID of security group"
  type        = string
}

variable "assign_public_ip" {
  description = "Assign public IP to task"
  type        = bool
  default     = false
}

variable "target_group_arn" {
  description = "ARN of target group (empty if no load balancer)"
  type        = string
  default     = ""
}

variable "health_check_grace_period" {
  description = "Health check grace period in seconds"
  type        = number
  default     = 60
}

variable "log_group_name" {
  description = "Name of CloudWatch log group"
  type        = string
}

variable "enable_logging" {
  description = "Enable CloudWatch logging (QUT guideline: should be disabled)"
  type        = bool
  default     = false
}

variable "environment_variables" {
  description = "Environment variables for container"
  type        = map(string)
  default     = {}
}

variable "secrets" {
  description = "Secrets from Parameter Store or Secrets Manager"
  type = list(object({
    name      = string
    valueFrom = string
  }))
  default = []
}

variable "health_check_command" {
  description = "Health check command for container"
  type        = list(string)
  default     = null
}

variable "enable_autoscaling" {
  description = "Enable auto-scaling"
  type        = bool
  default     = true
}

variable "min_capacity" {
  description = "Minimum number of tasks"
  type        = number
  default     = 1
}

variable "max_capacity" {
  description = "Maximum number of tasks"
  type        = number
  default     = 4
}

variable "cpu_target_value" {
  description = "Target CPU utilization for auto-scaling (%)"
  type        = number
  default     = 70
}

variable "memory_target_value" {
  description = "Target memory utilization for auto-scaling (%)"
  type        = number
  default     = 80
}

variable "enable_alarms" {
  description = "Enable CloudWatch alarms"
  type        = bool
  default     = true
}
