#!/bin/bash

# Temporary DNS workaround for testing domain functionality
# This script adds a local hosts entry to make the domain work on this server

echo "Adding temporary DNS entry for testing..."
echo "13.210.12.3 n11817143-videoapp.cab432.com" | sudo tee -a /etc/hosts

echo "Domain now accessible at: http://n11817143-videoapp.cab432.com:3000"
echo ""
echo "To remove this entry later, run:"
echo "sudo sed -i '/13.210.12.3 n11817143-videoapp.cab432.com/d' /etc/hosts"
echo ""
echo "Note: This only works on this server. For public access, the Route53 DNS record"
echo "needs to be updated to point to: ec2-13-210-12-3.ap-southeast-2.compute.amazonaws.com"