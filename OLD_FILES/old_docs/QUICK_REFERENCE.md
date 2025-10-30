# 🎯 Quick Reference Guide

## Three Ways to Start Your Application

### 1️⃣ **Automated Startup** (Recommended)
```bash
./start.sh
```
**What it does:**
- ✅ Auto-detects instance information
- ✅ Generates all configuration
- ✅ Starts Docker containers
- ✅ Shows access URLs

---

### 2️⃣ **Manual Configuration + Start**
```bash
# Step 1: Configure
./scripts/auto-configure.sh

# Step 2: Start
docker-compose up -d
```
**Use this when:** You want to review config before starting

---

### 3️⃣ **System Service** (Auto-start on boot)
```bash
# Install once
./scripts/install-service.sh

# Then manage with systemd
sudo systemctl start videoapp
sudo systemctl status videoapp
```
**Use this when:** You want app to start automatically after reboot

---

## 📊 Check Status

```bash
./status.sh
```

Shows:
- ✅ Current instance configuration
- ✅ Docker container status
- ✅ Application URLs
- ✅ Quick commands

---

## 🔄 Common Operations

| Task | Command |
|------|---------|
| **Start application** | `./start.sh` |
| **Stop application** | `docker-compose down` |
| **Restart application** | `docker-compose restart` |
| **View logs** | `docker-compose logs -f` |
| **Rebuild containers** | `docker-compose up -d --build` |
| **Check status** | `./status.sh` |
| **Reconfigure** | `./scripts/auto-configure.sh` |
| **Update DNS** | `cd terraform && terraform apply` |

---

## 🌐 Access URLs

After starting, access your application:

- **Domain**: https://n11817143-videoapp.cab432.com:3000
- **Public IP**: http://[auto-detected-ip]:3000
- **API**: https://n11817143-videoapp.cab432.com:8080

Check `.env` file for your current public IP.

---

## 🔧 Configuration Files

| File | Purpose | Auto-Generated? |
|------|---------|-----------------|
| `.env` | Docker environment variables | ✅ YES |
| `terraform/terraform.tfvars` | Terraform variables | ✅ Updated |
| `docker-compose.yml` | Container orchestration | No (uses .env) |

---

## 🆘 Troubleshooting

**Problem:** Configuration not detected
```bash
# Check metadata service
curl http://169.254.169.254/latest/meta-data/instance-id
```

**Problem:** Containers won't start
```bash
# Check logs
docker-compose logs

# Check configuration
cat .env
```

**Problem:** Application not accessible
```bash
# Check if running
docker-compose ps

# Check security groups allow ports 3000 and 8080
```

**Problem:** Need to start fresh
```bash
# Stop everything
docker-compose down

# Reconfigure
./scripts/auto-configure.sh

# Start again
docker-compose up -d
```

---

## 📝 What Gets Auto-Detected?

When you run auto-configuration:

✅ **EC2 Instance ID**: `i-0aaedfc6a70038409`  
✅ **Public IP Address**: Retrieved from metadata  
✅ **Public DNS Name**: Generated from IP  
✅ **AWS Region**: Detected from availability zone  

All of these are automatically populated in `.env` and `terraform.tfvars`

---

## 🚀 First Time Setup

```bash
# 1. Clone or navigate to project
cd /home/ubuntu/oct1/webapp.v1

# 2. Start application (auto-configures)
./start.sh

# 3. Update DNS to point to your instance
cd terraform
terraform apply

# 4. Access application
# https://n11817143-videoapp.cab432.com:3000
```

Done! 🎉
