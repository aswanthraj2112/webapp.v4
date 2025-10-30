output "alb_security_group_id" {
  description = "ID of ALB security group"
  value       = aws_security_group.alb.id
}

output "video_api_security_group_id" {
  description = "ID of Video API security group"
  value       = aws_security_group.video_api.id
}

output "admin_service_security_group_id" {
  description = "ID of Admin Service security group"
  value       = aws_security_group.admin_service.id
}

output "transcode_worker_security_group_id" {
  description = "ID of Transcode Worker security group"
  value       = aws_security_group.transcode_worker.id
}

output "elasticache_security_group_id" {
  description = "ID of ElastiCache security group"
  value       = aws_security_group.elasticache.id
}

output "lambda_security_group_id" {
  description = "ID of Lambda security group"
  value       = aws_security_group.lambda.id
}
