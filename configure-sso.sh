#!/bin/bash

# AWS SSO Configuration Script for CAB432 Students
# This script configures AWS CLI to use your student SSO credentials
# instead of the limited EC2 instance role

set -e

echo "=================================="
echo "AWS SSO Configuration for CAB432"
echo "=================================="
echo ""

# SSO Configuration Values
SSO_START_URL="https://d-97671c4bd0.awsapps.com/start#/"
SSO_REGION="ap-southeast-2"
ACCOUNT_ID="901444280953"
ROLE_NAME="CAB432-STUDENT"
DEFAULT_REGION="ap-southeast-2"
PROFILE_NAME="cab432"

echo "This script will configure AWS CLI with your CAB432-STUDENT SSO credentials."
echo ""
echo "Configuration values:"
echo "  SSO Start URL: $SSO_START_URL"
echo "  SSO Region: $SSO_REGION"
echo "  Account ID: $ACCOUNT_ID"
echo "  Role: $ROLE_NAME"
echo "  Profile: $PROFILE_NAME"
echo ""
echo "IMPORTANT: You will need to complete authentication in a web browser."
echo "The CLI will provide a device code and URL."
echo ""
read -p "Press Enter to continue..."

echo ""
echo "Starting SSO configuration..."
echo ""

# Run AWS SSO configure with device code
# Note: This is interactive and requires user to complete authentication in browser
aws configure sso \
  --profile "$PROFILE_NAME" \
  <<EOF
$SSO_START_URL
$SSO_REGION
$ACCOUNT_ID
$ROLE_NAME
$DEFAULT_REGION
json
EOF

echo ""
echo "=================================="
echo "Configuration Complete!"
echo "=================================="
echo ""
echo "Your AWS CLI is now configured with profile: $PROFILE_NAME"
echo ""
echo "To use this profile with Terraform, run:"
echo "  export AWS_PROFILE=$PROFILE_NAME"
echo ""
echo "Then you can run Terraform commands:"
echo "  cd terraform"
echo "  terraform plan"
echo "  terraform apply"
echo ""
echo "To check your current identity:"
echo "  aws sts get-caller-identity --profile $PROFILE_NAME"
echo ""
