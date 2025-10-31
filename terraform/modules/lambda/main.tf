# ==========================================
# Lambda Module - Main Configuration
# ==========================================

# Lambda Function (Container Image)
resource "aws_lambda_function" "this" {
  function_name = var.function_name
  role          = var.lambda_execution_role_arn
  package_type  = "Image"
  image_uri     = var.image_uri

  timeout     = var.timeout
  memory_size = var.memory_size

  reserved_concurrent_executions = var.reserved_concurrent_executions

  environment {
    variables = var.environment_variables
  }

  tags = merge(var.tags, {
    Name = var.function_name
  })
}

# CloudWatch Log Group for Lambda
# Note: Commented out because CAB432 account doesn't have logs:TagResource permission
# Lambda will automatically create this log group when it first executes
/*
resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${var.function_name}"
  retention_in_days = 7
}
*/

# Lambda permission for S3 to invoke the function
resource "aws_lambda_permission" "allow_s3" {
  statement_id  = "AllowExecutionFromS3"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.this.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = var.s3_bucket_arn
}

# S3 Bucket Notification to trigger Lambda
resource "aws_s3_bucket_notification" "video_upload" {
  bucket = var.s3_bucket_id

  lambda_function {
    lambda_function_arn = aws_lambda_function.this.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "raw/"
    # Optional: filter by file extension
    # filter_suffix       = ".mp4"
  }

  depends_on = [aws_lambda_permission.allow_s3]
}
