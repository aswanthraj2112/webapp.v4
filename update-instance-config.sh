#!/bin/bash

# Update configuration files with current EC2 instance information
# Usage: ./update-instance-config.sh [instance-id]

INSTANCE_ID=${1:-"i-0aaedfc6a70038409"}

echo "Updating configuration for instance: $INSTANCE_ID"
echo "================================================"

# Get current instance details
echo "Fetching current instance information..."

PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids "$INSTANCE_ID" \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text 2>/dev/null)

PUBLIC_DNS=$(aws ec2 describe-instances \
    --instance-ids "$INSTANCE_ID" \
    --query 'Reservations[0].Instances[0].PublicDnsName' \
    --output text 2>/dev/null)

if [ "$PUBLIC_IP" = "None" ] || [ "$PUBLIC_IP" = "" ] || [ "$PUBLIC_IP" = "null" ]; then
    echo "Error: Could not retrieve public IP for instance $INSTANCE_ID"
    echo "Make sure the instance is running and has a public IP assigned"
    exit 1
fi

if [ "$PUBLIC_DNS" = "None" ] || [ "$PUBLIC_DNS" = "" ] || [ "$PUBLIC_DNS" = "null" ]; then
    echo "Error: Could not retrieve public DNS for instance $INSTANCE_ID"
    echo "Make sure the instance is running and has a public DNS assigned"
    exit 1
fi

echo "Current instance details:"
echo "  Instance ID: $INSTANCE_ID"
echo "  Public IP: $PUBLIC_IP"
echo "  Public DNS: $PUBLIC_DNS"
echo ""

# Update terraform.tfvars
echo "Updating terraform/terraform.tfvars..."
sed -i "s/ec2_instance_id = \".*\"/ec2_instance_id = \"$INSTANCE_ID\"/" terraform/terraform.tfvars
sed -i "s/ec2_public_ip = \".*\"/ec2_public_ip = \"$PUBLIC_IP\"/" terraform/terraform.tfvars
sed -i "s/ec2_public_dns = \".*\"/ec2_public_dns = \"$PUBLIC_DNS\"/" terraform/terraform.tfvars

# Update docker-compose.yml
echo "Updating docker-compose.yml..."
sed -i "s/EC2_INSTANCE_ID=.*/EC2_INSTANCE_ID=$INSTANCE_ID/" docker-compose.yml

# Update variables.tf defaults (optional)
echo "Updating terraform/variables.tf defaults..."
sed -i "s/default     = \"i-.*\"/default     = \"$INSTANCE_ID\"/" terraform/variables.tf
sed -i "/ec2_public_ip/,/}/ s/default     = \".*\"/default     = \"$PUBLIC_IP\"/" terraform/variables.tf
sed -i "/ec2_public_dns/,/}/ s/default     = \".*\"/default     = \"$PUBLIC_DNS\"/" terraform/variables.tf

echo ""
echo "Configuration updated successfully!"
echo "Next steps:"
echo "1. Review the changes:"
echo "   - terraform/terraform.tfvars"
echo "   - terraform/variables.tf"
echo "   - docker-compose.yml"
echo ""
echo "2. Apply terraform changes:"
echo "   cd terraform && terraform plan && terraform apply"
echo ""
echo "3. Restart docker containers:"
echo "   docker-compose down && docker-compose up -d"