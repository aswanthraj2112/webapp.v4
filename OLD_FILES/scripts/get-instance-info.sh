#!/bin/bash

# Get EC2 instance information using AWS CLI
# Usage: ./get-instance-info.sh [instance-id]

INSTANCE_ID=${1:-"i-0aaedfc6a70038409"}

echo "Getting information for instance: $INSTANCE_ID"
echo "================================================"

# Get instance details
aws ec2 describe-instances \
    --instance-ids "$INSTANCE_ID" \
    --query 'Reservations[0].Instances[0].{
        InstanceId: InstanceId,
        State: State.Name,
        PublicIpAddress: PublicIpAddress,
        PublicDnsName: PublicDnsName,
        PrivateIpAddress: PrivateIpAddress,
        PrivateDnsName: PrivateDnsName,
        InstanceType: InstanceType,
        LaunchTime: LaunchTime
    }' \
    --output table

echo ""
echo "Environment variables for docker-compose:"
echo "EC2_INSTANCE_ID=$INSTANCE_ID"

# Get public IP for environment variables
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids "$INSTANCE_ID" \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

PUBLIC_DNS=$(aws ec2 describe-instances \
    --instance-ids "$INSTANCE_ID" \
    --query 'Reservations[0].Instances[0].PublicDnsName' \
    --output text)

if [ "$PUBLIC_IP" != "None" ] && [ "$PUBLIC_IP" != "" ]; then
    echo "EC2_PUBLIC_IP=$PUBLIC_IP"
fi

if [ "$PUBLIC_DNS" != "None" ] && [ "$PUBLIC_DNS" != "" ]; then
    echo "EC2_PUBLIC_DNS=$PUBLIC_DNS"
fi