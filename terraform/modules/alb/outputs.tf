output "alb_arn" {
  description = "ARN of the Application Load Balancer"
  value       = aws_lb.main.arn
}

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the Application Load Balancer"
  value       = aws_lb.main.zone_id
}

output "video_api_target_group_arn" {
  description = "ARN of Video API target group"
  value       = aws_lb_target_group.video_api.arn
}

output "admin_service_target_group_arn" {
  description = "ARN of Admin Service target group"
  value       = aws_lb_target_group.admin_service.arn
}

output "http_listener_arn" {
  description = "ARN of HTTP listener"
  value       = aws_lb_listener.http.arn
}

output "https_listener_arn" {
  description = "ARN of HTTPS listener (if enabled)"
  value       = var.certificate_arn != "" ? aws_lb_listener.https[0].arn : ""
}
