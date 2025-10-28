#!/bin/bash

# Quick status check script
# Shows current configuration and application status

cd "$(dirname "$0")"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║              Video App - Status Check                          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check if .env exists
if [ -f .env ]; then
    echo "📋 Current Configuration:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    grep "^EC2_INSTANCE_ID" .env
    grep "^EC2_PUBLIC_IP" .env
    grep "^EC2_PUBLIC_DNS" .env
    grep "^AWS_REGION" .env
    echo ""
    echo "Generated: $(head -1 .env)"
else
    echo "⚠️  Configuration not found!"
    echo "Run: ./scripts/auto-configure.sh"
fi

echo ""
echo "🐳 Docker Status:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker-compose ps 2>/dev/null || echo "Containers not running"

echo ""
echo "🌐 Application URLs:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -f .env ]; then
    PUBLIC_IP=$(grep "^EC2_PUBLIC_IP" .env | cut -d'=' -f2)
    echo "  Domain:    https://n11817143-videoapp.cab432.com:3000"
    echo "  Public IP: http://$PUBLIC_IP:3000"
    echo "  API:       https://n11817143-videoapp.cab432.com:8080"
else
    echo "  (Configuration needed)"
fi

echo ""
echo "📝 Quick Commands:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Start:        ./start.sh"
echo "  Configure:    ./scripts/auto-configure.sh"
echo "  Stop:         docker-compose down"
echo "  Logs:         docker-compose logs -f"
echo "  Rebuild:      docker-compose up -d --build"
echo ""
