# ==========================================
# ECS Cluster Module
# Creates ECS Fargate cluster with CloudWatch logging
# ==========================================

resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"

  setting {
    name  = "containerInsights"
    value = var.enable_container_insights ? "enabled" : "disabled"
  }

  tags = {
    Name        = "${var.project_name}-cluster"
    Project     = var.project_name
    Environment = var.environment
  }
}

# CloudWatch Log Group - Use existing or reference common log group
# QUT environment restricts creating new log groups with tags
# Using a data source to check if log group exists, otherwise tasks will run without logging
data "aws_cloudwatch_log_group" "ecs" {
  name = "/ecs/${var.project_name}"
}

# Use existing ECS Task Execution Role (QUT pre-created)
data "aws_iam_role" "ecs_task_execution" {
  name = "Execution-Role-CAB432-ECS"
}

# Use existing ECS Task Role (QUT pre-created)
data "aws_iam_role" "ecs_task" {
  name = "Task-Role-CAB432-ECS"
}

# Capacity Provider for Fargate
resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name = aws_ecs_cluster.main.name

  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    base              = 1
    weight            = 100
    capacity_provider = "FARGATE"
  }
}
