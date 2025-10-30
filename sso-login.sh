#!/bin/bash

# AWS SSO Login Helper Script
# Use this to re-authenticate when your SSO session expires

set -e

PROFILE_NAME="cab432"

echo "=================================="
echo "AWS SSO Login"
echo "=================================="
echo ""

# Check if profile exists
if ! aws configure list-profiles | grep -q "^${PROFILE_NAME}$"; then
    echo "❌ Profile '${PROFILE_NAME}' not found!"
    echo ""
    echo "You need to configure SSO first. Run:"
    echo "  ./configure-sso.sh"
    echo ""
    echo "Or manually:"
    echo "  aws configure sso --use-device-code"
    exit 1
fi

echo "Logging in to AWS SSO with profile: $PROFILE_NAME"
echo ""

# Login to SSO
aws sso login --profile "$PROFILE_NAME"

echo ""
echo "✅ Login successful!"
echo ""
echo "Verifying credentials..."
aws sts get-caller-identity --profile "$PROFILE_NAME"

echo ""
echo "=================================="
echo "Ready to use AWS CLI and Terraform"
echo "=================================="
echo ""
echo "Make sure to set your profile:"
echo "  export AWS_PROFILE=$PROFILE_NAME"
echo ""
echo "Or add to ~/.bashrc permanently:"
echo "  echo 'export AWS_PROFILE=$PROFILE_NAME' >> ~/.bashrc"
echo "  source ~/.bashrc"
echo ""
