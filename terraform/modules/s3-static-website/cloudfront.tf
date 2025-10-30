# Use existing CloudFront Origin Access Control if available
# If creating new, ensure account limit is not exceeded
resource "aws_cloudfront_origin_access_control" "static_website" {
  count = var.create_oac ? 1 : 0
  
  name                              = "${var.project_name}-static-oac"
  description                       = "OAC for ${var.project_name} static website"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "static_website" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.project_name} Static Website Distribution"
  default_root_object = "index.html"
  aliases             = var.acm_certificate_arn != "" ? var.cloudfront_aliases : []
  price_class         = "PriceClass_All"

  origin {
    domain_name              = aws_s3_bucket.static_website.bucket_regional_domain_name
    origin_id                = "S3-${aws_s3_bucket.static_website.id}"
    origin_access_control_id = var.create_oac ? aws_cloudfront_origin_access_control.static_website[0].id : var.existing_oac_id
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.static_website.id}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
    compress               = true
  }

  # Custom error response for SPA routing
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    # Use ACM certificate if provided (must be in us-east-1), otherwise use CloudFront default
    cloudfront_default_certificate = var.acm_certificate_arn == ""
    acm_certificate_arn            = var.acm_certificate_arn != "" ? var.acm_certificate_arn : null
    ssl_support_method             = var.acm_certificate_arn != "" ? "sni-only" : null
    minimum_protocol_version       = var.acm_certificate_arn != "" ? "TLSv1.2_2021" : null
  }

  tags = {
    Name        = "${var.project_name}-cloudfront"
    Project     = var.project_name
    Environment = var.environment
  }
}
