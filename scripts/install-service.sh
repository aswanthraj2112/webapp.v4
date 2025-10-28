#!/bin/bash

# Install systemd service for automatic startup on boot

set -e

SERVICE_FILE="$(dirname "$0")/videoapp.service"
SYSTEMD_DIR="/etc/systemd/system"

echo "Installing videoapp systemd service..."

# Copy service file
sudo cp "$SERVICE_FILE" "$SYSTEMD_DIR/videoapp.service"

# Reload systemd
sudo systemctl daemon-reload

# Enable service
sudo systemctl enable videoapp.service

echo ""
echo "✓ Service installed successfully!"
echo ""
echo "Service commands:"
echo "  Start:   sudo systemctl start videoapp"
echo "  Stop:    sudo systemctl stop videoapp"
echo "  Status:  sudo systemctl status videoapp"
echo "  Logs:    sudo journalctl -u videoapp -f"
echo ""
echo "The service will now start automatically on system boot."
echo ""
