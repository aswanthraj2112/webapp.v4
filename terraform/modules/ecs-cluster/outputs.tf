output "cluster_id" {
  description = "ID of the ECS cluster"
  value       = aws_ecs_cluster.main.id
}

output "cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = aws_ecs_cluster.main.arn
}

output "task_execution_role_arn" {
  description = "ARN of ECS task execution role"
  value       = data.aws_iam_role.ecs_task_execution.arn
}

output "task_role_arn" {
  description = "ARN of ECS task role"
  value       = data.aws_iam_role.ecs_task.arn
}

output "log_group_name" {
  description = "Name of CloudWatch log group"
  value       = data.aws_cloudwatch_log_group.ecs.name
}
