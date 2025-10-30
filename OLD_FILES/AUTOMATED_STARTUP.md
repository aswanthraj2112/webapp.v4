# 🚀 Automated Startup Guide

The application now has **fully automated configuration** that detects instance information at startup.

## ✨ What's Automated

- ✅ Auto-detects EC2 instance ID from metadata
- ✅ Auto-detects public IP and DNS
- ✅ Auto-generates `.env` file with correct configuration
- ✅ Auto-updates Terraform configuration
- ✅ Configures Docker containers with detected values
- ✅ Can run automatically on system boot

## 🎯 Quick Start

### Option 1: Manual Start (Recommended for first time)
```bash
./start.sh
```

This will:
1. Auto-detect your instance information
2. Generate configuration files
3. Start Docker containers

### Option 2: Run Configuration Only
```bash
./scripts/auto-configure.sh
```

Then manually start:
```bash
docker-compose up -d
```

### Option 3: Install as System Service (Auto-start on boot)
```bash
./scripts/install-service.sh
```

Then manage with systemd:
```bash
sudo systemctl start videoapp    # Start now
sudo systemctl stop videoapp     # Stop
sudo systemctl status videoapp   # Check status
sudo systemctl restart videoapp  # Restart
```

## 📁 Generated Files

After running auto-configuration:

- **`.env`** - Environment variables for Docker Compose (auto-generated)
- **`terraform/terraform.tfvars`** - Updated with current instance info

## 🔄 How It Works

1. **Instance Metadata Detection**: Uses AWS EC2 metadata service (IMDS v2) to get:
   - Instance ID
   - Public IP address
   - Region
   - Public DNS name

2. **Configuration Generation**: Creates `.env` file with:
   - Auto-detected instance information
   - Application configuration
   - API URLs with correct addresses

3. **Docker Compose**: Reads from `.env` file and configures:
   - Backend service with instance details
   - Frontend service with API URLs
   - All AWS service connections

## 📊 Current Instance

After running auto-configuration, check your instance details:
```bash
cat .env
```

## 🔧 Manual Override

If you need to override any values, edit `.env` before starting:
```bash
nano .env
docker-compose up -d
```

## 🌐 Update DNS

After configuration, update Route53 to point domain to new IP:
```bash
cd terraform
terraform plan
terraform apply
```

## 🐛 Troubleshooting

**Configuration not detected?**
```bash
# Check if metadata service is accessible
curl http://169.254.169.254/latest/meta-data/instance-id
```

**Need to reconfigure?**
```bash
# Stop containers, reconfigure, restart
docker-compose down
./scripts/auto-configure.sh
docker-compose up -d
```

**View logs:**
```bash
docker-compose logs -f
```

## ⚡ Benefits

- **No manual IP configuration needed**
- **Works when instance IP changes**
- **Works when moving to new instance**
- **Consistent configuration across deployments**
- **Automatic on system reboot (with systemd service)**
