#!/bin/bash

# Get EC2 instance metadata from IMDS (Instance Metadata Service)
# This script runs on the EC2 instance to get its own information

TOKEN=$(curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600" -s)

# Get instance information from metadata service
INSTANCE_ID=$(curl -H "X-aws-ec2-metadata-token: $TOKEN" -s http://169.254.169.254/latest/meta-data/instance-id)
PUBLIC_IP=$(curl -H "X-aws-ec2-metadata-token: $TOKEN" -s http://169.254.169.254/latest/meta-data/public-ipv4)
LOCAL_IP=$(curl -H "X-aws-ec2-metadata-token: $TOKEN" -s http://169.254.169.254/latest/meta-data/local-ipv4)
AVAILABILITY_ZONE=$(curl -H "X-aws-ec2-metadata-token: $TOKEN" -s http://169.254.169.254/latest/meta-data/placement/availability-zone)
REGION=$(echo $AVAILABILITY_ZONE | sed 's/[a-z]$//')

# Generate public DNS name from public IP
PUBLIC_DNS="ec2-$(echo $PUBLIC_IP | tr '.' '-').${REGION}.compute.amazonaws.com"

# Output in format that can be sourced
echo "export EC2_INSTANCE_ID=\"$INSTANCE_ID\""
echo "export EC2_PUBLIC_IP=\"$PUBLIC_IP\""
echo "export EC2_PUBLIC_DNS=\"$PUBLIC_DNS\""
echo "export EC2_LOCAL_IP=\"$LOCAL_IP\""
echo "export AWS_REGION=\"$REGION\""
