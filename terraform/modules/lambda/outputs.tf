# ==========================================
# Lambda Module - Outputs
# ==========================================

output "function_name" {
  description = "Name of the Lambda function"
  value       = aws_lambda_function.this.function_name
}

output "function_arn" {
  description = "ARN of the Lambda function"
  value       = aws_lambda_function.this.arn
}

output "function_invoke_arn" {
  description = "Invoke ARN of the Lambda function"
  value       = aws_lambda_function.this.invoke_arn
}

output "function_version" {
  description = "Latest published version of the Lambda function"
  value       = aws_lambda_function.this.version
}

output "lambda_role_arn" {
  description = "ARN of the Lambda execution role"
  value       = var.lambda_execution_role_arn
}

output "lambda_role_name" {
  description = "Name of the Lambda execution role"
  value       = split("/", var.lambda_execution_role_arn)[1]
}

output "log_group_name" {
  description = "Name of the CloudWatch log group"
  value       = "/aws/lambda/${var.function_name}"
}

output "log_group_arn" {
  description = "ARN of the CloudWatch log group"
  value       = "arn:aws:logs:${var.aws_region}:*:log-group:/aws/lambda/${var.function_name}"
}
