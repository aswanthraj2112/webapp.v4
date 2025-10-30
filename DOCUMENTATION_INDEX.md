# 📚 Documentation Index

Complete index of all project documentation.

## 🎯 Quick Start

New to the project? Start here:

1. **[README.md](README.md)** - Project overview, features, quick start
2. **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Step-by-step deployment instructions
3. **[ARCHITECTURE.md](ARCHITECTURE.md)** - Detailed architecture and design

## 📖 Core Documentation

### Overview & Getting Started
- **[README.md](README.md)**
  - Live application URLs
  - Features and tech stack
  - Quick deployment steps
  - Scripts and monitoring

### Architecture & Design
- **[ARCHITECTURE.md](ARCHITECTURE.md)**
  - Complete architecture diagrams
  - Component descriptions
  - Data flow diagrams
  - Security and scalability
  - Infrastructure details
  - Cost optimization strategies

### Deployment & Operations
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)**
  - Prerequisites
  - Step-by-step deployment
  - Troubleshooting guide
  - Update procedures
  - Cleanup/teardown instructions

### API Reference
- **[API_REFERENCE.md](API_REFERENCE.md)**
  - All API endpoints
  - Request/response formats
  - Authentication requirements
  - Example requests with curl

### Project Structure
- **[FILE_STRUCTURE.md](FILE_STRUCTURE.md)**
  - Complete directory structure
  - Purpose of each file and folder
  - Essential vs optional files
  - Backup recommendations
  - Storage requirements

## 🛠️ Technical Documentation

### Infrastructure as Code
Located in `terraform/`:
- **`main.tf`** - Main infrastructure configuration
- **`variables.tf`** - Variable definitions
- **`terraform.tfvars`** - Configuration values
- **`outputs.tf`** - Output definitions
- **`modules/*/`** - Reusable modules (ALB, ECS, ECR, S3)

### Frontend Documentation
Located in `client/`:
- **`README.md`** - Frontend-specific documentation
- **`package.json`** - Dependencies and scripts
- **`vite.config.js`** - Build configuration

### Backend Documentation
Located in `server/`:
- **`services/*/README.md`** - Service-specific docs
- **`shared/README.md`** - Shared utilities documentation

## 📜 Scripts & Tools

### Utility Scripts
- **[status.sh](status.sh)** - Check deployment status
  ```bash
  ./status.sh
  ```

- **[scripts/build-and-push.sh](scripts/build-and-push.sh)** - Build and push Docker images
  ```bash
  ./scripts/build-and-push.sh [service-name|all]
  ```

- **[scripts/gather-aws-info.sh](scripts/gather-aws-info.sh)** - Gather AWS resource information
  ```bash
  ./scripts/gather-aws-info.sh
  ```

## 🎓 Learning Resources

### For Understanding the Architecture
1. Read [ARCHITECTURE.md](ARCHITECTURE.md) - Section: "Components"
2. Review architecture diagrams
3. Understand data flow (Video Upload Flow, Playback Flow)

### For Deploying
1. Follow [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) step-by-step
2. Use troubleshooting section if issues arise
3. Run `./status.sh` to verify deployment

### For Development
1. Check [README.md](README.md) - Section: "Development"
2. Review [FILE_STRUCTURE.md](FILE_STRUCTURE.md) to understand codebase
3. Refer to [API_REFERENCE.md](API_REFERENCE.md) for endpoints

## 🔍 Quick Reference

### Application URLs
- **Frontend**: https://app.n11817143-videoapp.cab432.com
- **Backend API**: https://n11817143-videoapp.cab432.com/api
- **API Config**: https://n11817143-videoapp.cab432.com/api/config

### AWS Resources
- **ECS Cluster**: n11817143-app-cluster
- **ALB**: n11817143-app-alb
- **Cognito User Pool**: n11817143-a2 (ap-southeast-2_CdVnmKfrW)
- **S3 Bucket (Videos)**: n11817143-a2
- **S3 Bucket (Frontend)**: n11817143-app-static-website
- **CloudFront Distribution**: E3MBOUQVWZEHJQ
- **DynamoDB Table**: n11817143-a2

### Key Commands

```bash
# Check deployment status
./status.sh

# Deploy infrastructure
cd terraform && terraform apply

# Build and push images
./scripts/build-and-push.sh all

# Deploy frontend
cd client && npm run build && \
aws s3 sync dist/ s3://n11817143-app-static-website/ --delete && \
aws cloudfront create-invalidation --distribution-id E3MBOUQVWZEHJQ --paths "/*"

# Check ECS services
aws ecs describe-services --cluster n11817143-app-cluster \
  --services n11817143-app-video-api \
  --region ap-southeast-2

# List Cognito users
aws cognito-idp list-users \
  --user-pool-id ap-southeast-2_CdVnmKfrW \
  --region ap-southeast-2
```

## 📂 Additional Documentation

### Archive
Old documentation and planning documents are in `OLD_FILES/old_docs/`:
- Old README versions
- Planning documents
- Session logs
- Old architecture docs

### External Resources
- [AWS ECS Fargate Documentation](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [React Documentation](https://react.dev/)
- [AWS Amplify Documentation](https://docs.amplify.aws/)

## 🆘 Getting Help

### For Deployment Issues
1. Check [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Troubleshooting section
2. Run `./status.sh` to see current state
3. Check AWS Console for resource status

### For Architecture Questions
1. Read [ARCHITECTURE.md](ARCHITECTURE.md) relevant section
2. Review architecture diagrams
3. Check [FILE_STRUCTURE.md](FILE_STRUCTURE.md) for codebase organization

### For API Issues
1. Refer to [API_REFERENCE.md](API_REFERENCE.md)
2. Test endpoints with curl examples
3. Check backend service logs (if access granted)

## 📊 Documentation Hierarchy

```
README.md (Start Here)
    ├── ARCHITECTURE.md (Understand the System)
    │   ├── Components
    │   ├── Data Flow
    │   └── Infrastructure
    │
    ├── DEPLOYMENT_GUIDE.md (Deploy the System)
    │   ├── Prerequisites
    │   ├── Step-by-step Guide
    │   └── Troubleshooting
    │
    ├── API_REFERENCE.md (Use the API)
    │   ├── Authentication
    │   ├── Video Endpoints
    │   └── Admin Endpoints
    │
    └── FILE_STRUCTURE.md (Navigate the Code)
        ├── Directory Structure
        ├── Key Files
        └── Naming Conventions
```

## 📝 Document Maintenance

### Last Updated
- **README.md**: October 30, 2025
- **ARCHITECTURE.md**: October 30, 2025
- **DEPLOYMENT_GUIDE.md**: October 30, 2025
- **API_REFERENCE.md**: Earlier (may need updates)
- **FILE_STRUCTURE.md**: October 30, 2025
- **DOCUMENTATION_INDEX.md**: October 30, 2025

### Version
- Project Version: **5.0**
- Documentation Version: **5.0**

---

**📧 Contact**: n11817143@qut.edu.au  
**🎓 Course**: CAB432 - Cloud Computing  
**🏫 Institution**: Queensland University of Technology
