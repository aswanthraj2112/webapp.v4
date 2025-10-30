variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
}

variable "enable_image_scanning" {
  description = "Enable image vulnerability scanning"
  type        = bool
  default     = true
}

variable "image_retention_count" {
  description = "Number of images to retain"
  type        = number
  default     = 10
}
