#!/bin/bash

# Automated startup script
# This script auto-configures and starts the application

set -e

cd "$(dirname "$0")"

echo "╔════════════════════════════════════════╗"
echo "║  Video App - Automated Startup         ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Step 1: Auto-configure
echo "Step 1: Auto-detecting instance configuration..."
./scripts/auto-configure.sh

# Step 2: Start Docker containers
echo ""
echo "Step 2: Starting Docker containers..."
docker-compose up -d

echo ""
echo "╔════════════════════════════════════════╗"
echo "║  Application Started Successfully!     ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Show status
docker-compose ps

echo ""
echo "Access your application at:"
echo "  - https://n11817143-videoapp.cab432.com:3000"
echo "  - http://$(grep EC2_PUBLIC_IP .env | cut -d'=' -f2):3000"
echo ""
echo "To view logs: docker-compose logs -f"
echo "To stop: docker-compose down"
echo ""
