# Terraform Variables - Microservices
# Student: n11817143

aws_region   = "ap-southeast-2"
project_name = "n11817143-app"
environment  = "prod"
az_count     = 2

vpc_id               = "vpc-007bab53289655834"
vpc_cidr             = "10.0.0.0/16"
enable_nat_gateway   = false
enable_vpc_flow_logs = false

public_subnet_ids = [
  "subnet-05a3b8177138c8b14",
  "subnet-075811427d5564cf9"
]

private_subnet_ids = [
  "subnet-04cc288ea3b2e1e53",
  "subnet-08e89ff0d9b49c9ae"
]

acm_certificate_arn            = "arn:aws:acm:ap-southeast-2:901444280953:certificate/287c529f-3514-4283-9752-9f716540ff03"
domain_name                    = "n11817143-videoapp.cab432.com"
enable_alb_deletion_protection = false

enable_ecr_scanning       = true
ecr_image_retention_count = 10

enable_container_insights = true
log_retention_days        = 7

s3_bucket_name      = "n11817143-a2"
dynamodb_table_name = "n11817143-VideoApp"
sqs_queue_name      = "n11817143-transcode-queue"

cognito_user_pool_id = "ap-southeast-2_CdVnmKfW"
cognito_client_id    = "1dnnr9c18vuk983t8iojkgd8e"

video_api_image_tag     = "latest"
video_api_cpu           = 512
video_api_memory        = 1024
video_api_desired_count = 2
video_api_min_capacity  = 1
video_api_max_capacity  = 5

admin_service_image_tag     = "latest"
admin_service_cpu           = 256
admin_service_memory        = 512
admin_service_desired_count = 1
admin_service_min_capacity  = 1
admin_service_max_capacity  = 3

transcode_worker_image_tag     = "latest"
transcode_worker_cpu           = 1024
transcode_worker_memory        = 2048
transcode_worker_desired_count = 1
transcode_worker_min_capacity  = 0
transcode_worker_max_capacity  = 10

enable_autoscaling        = true
autoscaling_cpu_target    = 70
autoscaling_memory_target = 80

enable_cloudwatch_alarms = true
