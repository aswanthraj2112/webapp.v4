# ==========================================
# ECR Module
# Creates ECR repositories for Docker images
# ==========================================

# Video API Repository
resource "aws_ecr_repository" "video_api" {
  name                 = "${var.project_name}/video-api"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = var.enable_image_scanning
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name        = "${var.project_name}-video-api"
    Project     = var.project_name
    Environment = var.environment
    Service     = "video-api"
  }
}

# Admin Service Repository
resource "aws_ecr_repository" "admin_service" {
  name                 = "${var.project_name}/admin-service"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = var.enable_image_scanning
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name        = "${var.project_name}-admin-service"
    Project     = var.project_name
    Environment = var.environment
    Service     = "admin-service"
  }
}

# Transcode Worker Repository
resource "aws_ecr_repository" "transcode_worker" {
  name                 = "${var.project_name}/transcode-worker"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = var.enable_image_scanning
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name        = "${var.project_name}-transcode-worker"
    Project     = var.project_name
    Environment = var.environment
    Service     = "transcode-worker"
  }
}

# S3-to-SQS Lambda Repository
resource "aws_ecr_repository" "s3_lambda" {
  name                 = "${var.project_name}/s3-to-sqs-lambda"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = var.enable_image_scanning
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name        = "${var.project_name}-s3-lambda"
    Project     = var.project_name
    Environment = var.environment
    Service     = "lambda"
  }
}

# Lifecycle Policy for all repositories
resource "aws_ecr_lifecycle_policy" "cleanup" {
  for_each = {
    video_api        = aws_ecr_repository.video_api.name
    admin_service    = aws_ecr_repository.admin_service.name
    transcode_worker = aws_ecr_repository.transcode_worker.name
    s3_lambda        = aws_ecr_repository.s3_lambda.name
  }

  repository = each.value

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last ${var.image_retention_count} images"
        selection = {
          tagStatus     = "any"
          countType     = "imageCountMoreThan"
          countNumber   = var.image_retention_count
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
