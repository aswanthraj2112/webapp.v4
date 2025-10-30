output "video_api_repository_url" {
  description = "URL of Video API repository"
  value       = aws_ecr_repository.video_api.repository_url
}

output "admin_service_repository_url" {
  description = "URL of Admin Service repository"
  value       = aws_ecr_repository.admin_service.repository_url
}

output "transcode_worker_repository_url" {
  description = "URL of Transcode Worker repository"
  value       = aws_ecr_repository.transcode_worker.repository_url
}

output "s3_lambda_repository_url" {
  description = "URL of S3 Lambda repository"
  value       = aws_ecr_repository.s3_lambda.repository_url
}

output "video_api_repository_arn" {
  description = "ARN of Video API repository"
  value       = aws_ecr_repository.video_api.arn
}

output "admin_service_repository_arn" {
  description = "ARN of Admin Service repository"
  value       = aws_ecr_repository.admin_service.arn
}

output "transcode_worker_repository_arn" {
  description = "ARN of Transcode Worker repository"
  value       = aws_ecr_repository.transcode_worker.arn
}

output "s3_lambda_repository_arn" {
  description = "ARN of S3 Lambda repository"
  value       = aws_ecr_repository.s3_lambda.arn
}
