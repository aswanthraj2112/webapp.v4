variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
}

variable "acm_certificate_arn" {
  description = "ARN of ACM certificate for CloudFront (must be in us-east-1)"
  type        = string
}

variable "cloudfront_aliases" {
  description = "List of domain aliases for CloudFront"
  type        = list(string)
  default     = []
}

variable "create_oac" {
  description = "Create new Origin Access Control (false to use existing)"
  type        = bool
  default     = false
}

variable "existing_oac_id" {
  description = "ID of existing Origin Access Control if not creating new one"
  type        = string
  default     = ""
}
