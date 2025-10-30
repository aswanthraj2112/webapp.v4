terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = ">= 3.5"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

data "aws_caller_identity" "current" {}

# Note: Removed data source due to IAM permission constraints
# Using the user pool ID directly from variables

resource "aws_s3_bucket" "video" {
  bucket        = var.s3_bucket_name
  force_destroy = var.s3_force_destroy

  tags = merge(var.default_tags, {
    Name = var.s3_bucket_name
  })
}

resource "aws_s3_bucket_public_access_block" "video" {
  bucket = aws_s3_bucket.video.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "video" {
  bucket = aws_s3_bucket.video.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "video" {
  bucket = aws_s3_bucket.video.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_dynamodb_table" "videos" {
  name         = var.dynamodb_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "ownerId"
  range_key    = "videoId"

  attribute {
    name = "ownerId"
    type = "S"
  }

  attribute {
    name = "videoId"
    type = "S"
  }

  tags = merge(var.default_tags, {
    Name = var.dynamodb_table_name
  })
}

# Commented out due to IAM permission constraints
# resource "aws_cognito_user_pool_client" "app" {
#   name         = "${var.project_prefix}-web-client"
#   user_pool_id = var.cognito_user_pool_id
#
#   generate_secret = true
#   explicit_auth_flows = [
#     "ALLOW_REFRESH_TOKEN_AUTH",
#     "ALLOW_USER_PASSWORD_AUTH",
#     "ALLOW_USER_SRP_AUTH"
#   ]
#   supported_identity_providers = ["COGNITO"]
#   prevent_user_existence_errors = "ENABLED"
#   access_token_validity         = var.access_token_validity_minutes
#   id_token_validity             = var.id_token_validity_minutes
#   refresh_token_validity        = var.refresh_token_validity_days
#   token_validity_units {
#     access_token  = "minutes"
#     id_token      = "minutes"
#     refresh_token = "days"
#   }
# }

# Commented out due to IAM permission constraints
# resource "aws_secretsmanager_secret" "app" {
#   name        = var.secrets_manager_name
#   description = "Cognito client secret for ${var.project_prefix}"
#
#   tags = var.default_tags
# }
#
# resource "aws_secretsmanager_secret_version" "app" {
#   secret_id     = aws_secretsmanager_secret.app.id
#   secret_string = jsonencode({ cognitoClientSecret = aws_cognito_user_pool_client.app.client_secret })
# }

locals {
  parameter_prefix = trim(var.parameter_store_prefix, "/")
  cache_enabled    = length(var.cache_subnet_ids) > 0
  parameters = {
    # cognitoClientId       = aws_cognito_user_pool_client.app.id  # Commented due to IAM constraints
    cognitoUserPoolId     = var.cognito_user_pool_id
    domainName            = var.domain_name
    dynamoTable           = aws_dynamodb_table.videos.name
    maxUploadSizeMb       = var.max_upload_size_mb
    preSignedUrlTTL       = var.presigned_url_ttl
    s3Bucket              = aws_s3_bucket.video.bucket
    s3_raw_prefix         = var.s3_raw_prefix
    s3_transcoded_prefix  = var.s3_transcoded_prefix
    s3_thumbnail_prefix   = var.s3_thumbnail_prefix
  }
}

# Commented out due to IAM permission constraints
# resource "aws_ssm_parameter" "app" {
#   for_each = local.parameters
#
#   name  = "/${local.parameter_prefix}/${each.key}"
#   type  = "String"
#   value = tostring(each.value)
#   tags  = var.default_tags
# }

# Use existing subnet group instead of managing it
data "aws_elasticache_subnet_group" "existing" {
  count = local.cache_enabled ? 1 : 0
  name  = "cab432-subnets"
}

# Commented out to avoid conflicts with existing subnet group
# resource "aws_elasticache_subnet_group" "cache" {
#   count      = local.cache_enabled ? 1 : 0
#   name       = "cab432-subnets"  # Use existing subnet group name
#   subnet_ids = var.cache_subnet_ids
#
#   tags = var.default_tags
# }

resource "aws_elasticache_cluster" "cache" {
  count                = local.cache_enabled ? 1 : 0
  cluster_id           = var.elasticache_cluster_name
  engine               = "memcached"
  node_type            = var.elasticache_node_type
  num_cache_nodes      = var.elasticache_node_count
  port                 = 11211
  subnet_group_name    = local.cache_enabled ? data.aws_elasticache_subnet_group.existing[0].name : null
  security_group_ids   = var.cache_security_group_ids
  az_mode              = "single-az"

  tags = merge(var.default_tags, {
    Name = var.elasticache_cluster_name
  })
}

# Commented out data source due to permission issues with Route53 ListTagsForResource
# data "aws_route53_zone" "selected" {
#   name         = var.route53_zone_name
#   private_zone = false
# }

# Route53 record to point domain to current EC2 instance
# Note: Due to IAM constraints, we use manually specified DNS rather than dynamic lookup
resource "aws_route53_record" "app" {
  zone_id = "Z02680423BHWEVRU2JZDQ"  # cab432.com hosted zone ID
  name    = var.domain_name
  type    = "CNAME"
  ttl     = 300
  records = [var.ec2_public_dns]
}

output "cognito_user_pool_id" {
  value = var.cognito_user_pool_id
}

# Commented out due to IAM constraints
# output "cognito_client_id" {
#   value = aws_cognito_user_pool_client.app.id
# }

output "parameter_store_prefix" {
  value = "/${local.parameter_prefix}"
}

# ECR Repositories
resource "aws_ecr_repository" "backend" {
  name = "${var.app_name}-backend"
  
  image_tag_mutability = "MUTABLE"
  
  image_scanning_configuration {
    scan_on_push = true
  }

  tags = merge(var.default_tags, {
    Name = "${var.app_name}-backend"
  })
}

resource "aws_ecr_lifecycle_policy" "backend" {
  repository = aws_ecr_repository.backend.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["latest"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

resource "aws_ecr_repository" "frontend" {
  name = "${var.app_name}-frontend"
  
  image_tag_mutability = "MUTABLE"
  
  image_scanning_configuration {
    scan_on_push = true
  }

  tags = merge(var.default_tags, {
    Name = "${var.app_name}-frontend"
  })
}

resource "aws_ecr_lifecycle_policy" "frontend" {
  repository = aws_ecr_repository.frontend.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["latest"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

output "s3_bucket_name" {
  value = aws_s3_bucket.video.bucket
}

output "dynamodb_table_name" {
  value = aws_dynamodb_table.videos.name
}

output "elasticache_endpoint" {
  value       = local.cache_enabled ? aws_elasticache_cluster.cache[0].configuration_endpoint : ""
  description = "Configuration endpoint for the Memcached cluster. Empty when cache_subnet_ids is not provided."
}

output "ecr_backend_repository_url" {
  value = aws_ecr_repository.backend.repository_url
}

output "ecr_frontend_repository_url" {
  value = aws_ecr_repository.frontend.repository_url
}

output "ec2_instance_id" {
  value = var.ec2_instance_id
}

output "ec2_public_ip" {
  value = var.ec2_public_ip
}

output "ec2_public_dns" {
  value = var.ec2_public_dns
}

# Note: Due to IAM permission constraints, the following resources need to be managed manually:
# - Cognito User Pool Client (requires cognito-idp:CreateUserPoolClient permission)
# - Secrets Manager Secret (requires secretsmanager:CreateSecret permission)  
# - SSM Parameters (requires ssm:PutParameter permission)
# - Route53 Record (requires route53:ChangeResourceRecordSets permission)
