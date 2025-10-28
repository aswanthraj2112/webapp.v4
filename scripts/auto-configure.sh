#!/bin/bash
set -e

echo "=========================================="
echo "Auto-configuring application at startup..."
echo "=========================================="

# Get instance metadata
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
eval $(bash "$SCRIPT_DIR/get-instance-metadata.sh")

echo "Detected instance information:"
echo "  Instance ID: $EC2_INSTANCE_ID"
echo "  Public IP: $EC2_PUBLIC_IP"
echo "  Public DNS: $EC2_PUBLIC_DNS"
echo "  Region: $AWS_REGION"
echo ""

# Create .env file for docker-compose
cat > "$SCRIPT_DIR/../.env" << EOF
# Auto-generated at $(date)
# Instance: $EC2_INSTANCE_ID

# EC2 Instance Information
EC2_INSTANCE_ID=$EC2_INSTANCE_ID
EC2_PUBLIC_IP=$EC2_PUBLIC_IP
EC2_PUBLIC_DNS=$EC2_PUBLIC_DNS
AWS_REGION=$AWS_REGION

# Application Configuration
DOMAIN_NAME=n11817143-videoapp.cab432.com
COGNITO_USER_POOL_ID=ap-southeast-2_CdVnmKfrW
PARAMETER_PREFIX=/n11817143/app/
S3_BUCKET=n11817143-a2
DYNAMO_TABLE=n11817143-VideoApp
ELASTICACHE_ENDPOINT=n11817143-a2-cache.km2jzi.cfg.apse2.cache.amazonaws.com:11211

# API URLs
API_URL=https://n11817143-videoapp.cab432.com:8080
CLIENT_ORIGINS=http://localhost:3000,https://n11817143-videoapp.cab432.com,http://n11817143-videoapp.cab432.com:3000,http://$EC2_PUBLIC_IP:3000,https://$EC2_PUBLIC_IP:3000
EOF

echo "✓ Created .env file with auto-detected configuration"

# Update terraform tfvars if they exist
if [ -f "$SCRIPT_DIR/../terraform/terraform.tfvars" ]; then
    echo "✓ Updating terraform configuration..."
    
    # Backup existing file
    cp "$SCRIPT_DIR/../terraform/terraform.tfvars" "$SCRIPT_DIR/../terraform/terraform.tfvars.backup"
    
    # Update instance information
    sed -i "s/ec2_instance_id = \".*\"/ec2_instance_id = \"$EC2_INSTANCE_ID\"/" "$SCRIPT_DIR/../terraform/terraform.tfvars"
    sed -i "s/ec2_public_ip = \".*\"/ec2_public_ip = \"$EC2_PUBLIC_IP\"/" "$SCRIPT_DIR/../terraform/terraform.tfvars"
    sed -i "s/ec2_public_dns = \".*\"/ec2_public_dns = \"$EC2_PUBLIC_DNS\"/" "$SCRIPT_DIR/../terraform/terraform.tfvars"
    
    echo "✓ Updated terraform/terraform.tfvars"
fi

echo ""
echo "=========================================="
echo "Configuration complete!"
echo "=========================================="
echo ""
echo "To start the application:"
echo "  docker-compose up -d"
echo ""
echo "To update Route53 DNS:"
echo "  cd terraform && terraform apply"
echo ""
