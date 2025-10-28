# Automation Architecture

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     APPLICATION STARTUP                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                      ┌───────────────┐
                      │  ./start.sh   │
                      └───────┬───────┘
                              │
                              ▼
    ┌─────────────────────────────────────────────────────────┐
    │  Step 1: Auto-Configuration                             │
    │  ./scripts/auto-configure.sh                            │
    └─────────────────────────────────────────────────────────┘
                              │
                              ▼
    ┌─────────────────────────────────────────────────────────┐
    │  Get Instance Metadata (IMDS v2)                        │
    │  ./scripts/get-instance-metadata.sh                     │
    │                                                          │
    │  Queries: http://169.254.169.254/latest/meta-data/      │
    │    • instance-id        → i-0aaedfc6a70038409          │
    │    • public-ipv4        → 13.210.156.163               │
    │    • placement/az       → ap-southeast-2a              │
    │                                                          │
    │  Derives:                                               │
    │    • public-dns         → ec2-13-210-156-163...        │
    │    • region             → ap-southeast-2               │
    └─────────────────────────────────────────────────────────┘
                              │
                              ▼
    ┌─────────────────────────────────────────────────────────┐
    │  Generate Configuration Files                           │
    │                                                          │
    │  Creates:                                               │
    │    • .env                (Docker environment)          │
    │                                                          │
    │  Updates:                                               │
    │    • terraform/terraform.tfvars                        │
    └─────────────────────────────────────────────────────────┘
                              │
                              ▼
    ┌─────────────────────────────────────────────────────────┐
    │  Step 2: Start Docker Containers                        │
    │  docker-compose up -d                                   │
    └─────────────────────────────────────────────────────────┘
                              │
                              ▼
    ┌─────────────────────────────────────────────────────────┐
    │  Docker Compose reads .env file                         │
    │                                                          │
    │  Backend Container:                                     │
    │    • EC2_INSTANCE_ID=${EC2_INSTANCE_ID}                │
    │    • EC2_PUBLIC_IP=${EC2_PUBLIC_IP}                    │
    │    • AWS_REGION=${AWS_REGION}                          │
    │    • ... other config ...                              │
    │                                                          │
    │  Frontend Container:                                    │
    │    • VITE_EC2_INSTANCE_ID=${EC2_INSTANCE_ID}           │
    │    • VITE_API_URL=${API_URL}                           │
    │    • ... other config ...                              │
    └─────────────────────────────────────────────────────────┘
                              │
                              ▼
    ┌─────────────────────────────────────────────────────────┐
    │  ✅ Application Running                                 │
    │                                                          │
    │  Access via:                                            │
    │    • https://n11817143-videoapp.cab432.com:3000        │
    │    • http://13.210.156.163:3000                        │
    └─────────────────────────────────────────────────────────┘
```

## Alternative Flows

### Manual Configuration Only
```
./scripts/auto-configure.sh  →  Generates .env  →  Manual: docker-compose up -d
```

### System Service (Auto-start on Boot)
```
System Boot
    ↓
systemd service: videoapp.service
    ↓
ExecStartPre: ./scripts/auto-configure.sh
    ↓
ExecStart: docker-compose up -d
    ↓
✅ Application Running
```

### Check Status
```
./status.sh  →  Shows current config + Docker status + URLs
```

## Key Components

| Component | Purpose | Auto-Generated |
|-----------|---------|---------------|
| `scripts/get-instance-metadata.sh` | Query EC2 metadata service | No |
| `scripts/auto-configure.sh` | Generate config files | No |
| `start.sh` | Complete automated startup | No |
| `status.sh` | Check current status | No |
| `.env` | Environment variables for Docker | **YES** ✅ |
| `terraform/terraform.tfvars` | Terraform variable values | **Updated** ✅ |

## Automation Benefits

1. **Zero Manual Configuration**: No need to hardcode IP addresses
2. **Instance Portability**: Move to new instance, just run `./start.sh`
3. **IP Change Resilient**: Automatically detects new public IP
4. **Consistent Deployments**: Same process every time
5. **Boot Persistence**: Can auto-start on system reboot
6. **Multi-Environment**: Works across dev/staging/prod instances

## What's NOT Automated (Manual Steps)

- Initial infrastructure setup (run once)
- Route53 DNS updates (requires `terraform apply`)
- SSL certificate configuration
- Security group changes
- IAM role modifications
