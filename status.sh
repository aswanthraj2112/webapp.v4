#!/bin/bash
# Check deployment status of the video app

echo "🎬 Video App Deployment Status"
echo "================================"
echo ""

# Frontend
echo "🌐 Frontend:"
echo "   URL: https://app.n11817143-videoapp.cab432.com"
echo "   Status: $(curl -s -o /dev/null -w '%{http_code}' https://app.n11817143-videoapp.cab432.com)"
echo ""

# Backend
echo "🔧 Backend API:"
echo "   URL: https://n11817143-videoapp.cab432.com"
echo "   Status: $(curl -s -o /dev/null -w '%{http_code}' https://n11817143-videoapp.cab432.com/api/config)"
echo ""

# ECS Services
echo "📦 ECS Services:"
aws ecs describe-services \
  --cluster n11817143-app-cluster \
  --services n11817143-app-video-api n11817143-app-admin-service n11817143-app-transcode-worker \
  --region ap-southeast-2 \
  --query 'services[*].[serviceName,runningCount,desiredCount,deployments[0].status]' \
  --output table 2>/dev/null || echo "   ❌ Unable to fetch ECS status"

echo ""

# Cognito
echo "🔐 Cognito Users:"
aws cognito-idp list-users \
  --user-pool-id ap-southeast-2_CdVnmKfrW \
  --region ap-southeast-2 \
  --max-results 5 \
  --query 'Users[*].[Username,UserStatus]' \
  --output table 2>/dev/null || echo "   ❌ Unable to fetch Cognito users"

echo ""
echo "✅ Status check complete"
