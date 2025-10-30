output "s3_bucket_name" {
  description = "Name of the S3 bucket"
  value       = aws_s3_bucket.static_website.id
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = aws_s3_bucket.static_website.arn
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.static_website.id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.static_website.domain_name
}

output "cloudfront_hosted_zone_id" {
  description = "CloudFront hosted zone ID for Route53"
  value       = aws_cloudfront_distribution.static_website.hosted_zone_id
}

output "website_url" {
  description = "Website URL"
  value       = length(var.cloudfront_aliases) > 0 ? "https://${var.cloudfront_aliases[0]}" : "https://${aws_cloudfront_distribution.static_website.domain_name}"
}
