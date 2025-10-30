# 📁 File Structure

Complete overview of the project structure and purpose of each directory/file.

## Root Directory Structure

```
webapp.v5/
├── 📄 README.md                    # Main project documentation
├── 📄 ARCHITECTURE.md              # Detailed architecture documentation
├── 📄 API_REFERENCE.md             # API endpoints documentation
├── 📄 DEPLOYMENT_GUIDE.md          # Step-by-step deployment instructions
├── 📄 DOCUMENTATION_INDEX.md       # Index of all documentation
├── 📄 FILE_STRUCTURE.md            # This file
├── 📄 .gitignore                   # Git ignore rules
├── 📄 status.sh                    # Check deployment status script
│
├── 📁 client/                      # React frontend application
├── 📁 server/                      # Backend microservices
├── 📁 terraform/                   # Infrastructure as Code
├── 📁 scripts/                     # Utility scripts
├── 📁 lambda/                      # Lambda functions
├── 📁 docs/                        # Additional documentation
├── 📁 tests/                       # Test scripts
└── 📁 OLD_FILES/                   # Archived/unused files
```

## Client Directory (Frontend)

```
client/
├── 📄 package.json                 # Frontend dependencies
├── 📄 vite.config.js               # Vite configuration
├── 📄 index.html                   # HTML entry point
├── 📄 .env                         # Environment variables
├── 📄 Dockerfile                   # Docker image (not used, in S3)
│
├── 📁 src/                         # Source code
│   ├── 📄 main.jsx                 # Application entry point
│   ├── 📄 App.jsx                  # Main App component
│   ├── 📄 api.js                   # API client functions
│   ├── 📄 index.css                # Global styles
│   │
│   ├── 📁 components/              # Reusable React components
│   │   ├── Layout.jsx              # Page layout wrapper
│   │   ├── Navbar.jsx              # Navigation bar
│   │   ├── VideoCard.jsx           # Video display card
│   │   ├── VideoPlayer.jsx         # Video player with quality selection
│   │   └── ...                     # Other components
│   │
│   └── 📁 pages/                   # Page components
│       ├── Home.jsx                # Landing page
│       ├── Login.jsx               # Login page
│       ├── Signup.jsx              # Registration page
│       ├── VideoList.jsx           # User's videos list
│       ├── VideoUpload.jsx         # Upload new video
│       └── VideoView.jsx           # Watch video
│
├── 📁 public/                      # Static assets
│   └── favicon.svg                 # Favicon
│
└── 📁 dist/                        # Build output (generated)
    ├── index.html
    ├── assets/
    └── ...
```

### Key Frontend Files

- **`src/api.js`**: API client with functions for all backend endpoints
- **`src/App.jsx`**: Main application logic, routing, Cognito configuration
- **`vite.config.js`**: Build configuration, proxy settings
- **`.env`**: Contains `VITE_API_URL=https://n11817143-videoapp.cab432.com/api`

## Server Directory (Backend)

```
server/
├── 📄 package.json                 # Root package file (not used)
│
├── 📁 services/                    # Microservices
│   │
│   ├── 📁 video-api/               # Video API Service
│   │   ├── 📄 package.json         # Service dependencies
│   │   ├── 📄 Dockerfile           # Container image definition
│   │   └── 📁 src/
│   │       ├── 📄 index.js         # Server entry point
│   │       ├── 📁 auth/            # Authentication routes
│   │       │   └── auth.routes.js  # Signup, signin endpoints
│   │       └── 📁 videos/          # Video routes
│   │           └── video.routes.js # CRUD operations
│   │
│   ├── 📁 admin-service/           # Admin Service
│   │   ├── 📄 package.json
│   │   ├── 📄 Dockerfile
│   │   └── 📁 src/
│   │       ├── 📄 index.js
│   │       └── 📁 admin/
│   │           └── admin.routes.js # Admin endpoints
│   │
│   └── 📁 transcode-worker/        # Transcoding Worker
│       ├── 📄 package.json
│       ├── 📄 Dockerfile
│       └── 📁 src/
│           ├── 📄 index.js         # SQS polling & transcoding
│           └── 📁 transcoder/
│               └── transcoder.js   # FFmpeg wrapper
│
└── 📁 shared/                      # Shared utilities
    ├── 📄 package.json             # Shared dependencies
    │
    ├── 📁 config/                  # Configuration management
    │   └── index.js                # Environment config loader
    │
    ├── 📁 auth/                    # Authentication utilities
    │   └── middleware.js           # JWT verification
    │
    └── 📁 utils/                   # Utility functions
        ├── errors.js               # Error handling
        ├── validation.js           # Input validation
        └── logger.js               # Logging utility
```

### Key Backend Files

- **`services/video-api/src/index.js`**: Express server, routes, CORS, health check, `/api/config` endpoint
- **`services/transcode-worker/src/index.js`**: SQS polling, video transcoding orchestration
- **`shared/config/index.js`**: Centralized configuration from environment variables
- **`shared/auth/middleware.js`**: JWT verification middleware for protected routes

## Terraform Directory (Infrastructure)

```
terraform/
├── 📄 main.tf                      # Main infrastructure configuration
├── 📄 variables.tf                 # Variable definitions
├── 📄 terraform.tfvars             # Variable values (sensitive)
├── 📄 outputs.tf                   # Output values after apply
├── 📄 terraform.tfstate            # Current state (generated)
├── 📄 terraform.tfstate.backup     # Previous state backup
│
└── 📁 modules/                     # Reusable Terraform modules
    │
    ├── 📁 alb/                     # Application Load Balancer
    │   ├── main.tf                 # ALB, listeners, target groups
    │   ├── variables.tf            # Module inputs
    │   └── outputs.tf              # Module outputs
    │
    ├── 📁 ecr/                     # Elastic Container Registry
    │   ├── main.tf                 # ECR repositories
    │   ├── variables.tf
    │   └── outputs.tf
    │
    ├── 📁 ecs-cluster/             # ECS Cluster
    │   ├── main.tf                 # Cluster, log groups
    │   ├── variables.tf
    │   └── outputs.tf
    │
    ├── 📁 ecs-service/             # ECS Service (reusable)
    │   ├── main.tf                 # Task definition, service, autoscaling
    │   ├── variables.tf            # Configurable per service
    │   └── outputs.tf
    │
    └── 📁 s3-static-website/       # Frontend Hosting
        ├── main.tf                 # S3 bucket configuration
        ├── cloudfront.tf           # CloudFront distribution
        ├── variables.tf
        └── outputs.tf
```

### Terraform Workflow

1. **`terraform init`**: Downloads providers, initializes modules
2. **`terraform plan`**: Shows what will be created/changed
3. **`terraform apply`**: Applies changes to AWS
4. **`terraform destroy`**: Tears down infrastructure

### Key Terraform Files

- **`main.tf`**: Orchestrates all modules, defines services
- **`terraform.tfvars`**: Contains actual values (Cognito IDs, domain names, etc.)
- **`outputs.tf`**: Displays important values after deployment (URLs, ARNs)

## Scripts Directory

```
scripts/
├── 📄 build-and-push.sh            # Build Docker images, push to ECR
└── 📄 gather-aws-info.sh           # Gather AWS resource information
```

### Script Usage

```bash
# Build and push all services
./scripts/build-and-push.sh all

# Build specific service
./scripts/build-and-push.sh video-api

# Gather AWS info
./scripts/gather-aws-info.sh > aws-info.txt
```

## Lambda Directory

```
lambda/
└── 📁 s3-to-sqs/                   # S3 event processor Lambda
    ├── 📄 package.json
    ├── 📄 Dockerfile
    └── 📄 index.js                 # Lambda handler
```

### Lambda Purpose

Triggers SQS message when video is uploaded to S3 (alternative to direct API call).

## Tests Directory

```
tests/
├── 📄 load-test.sh                 # Load testing script
└── 📄 test-endpoints.sh            # API endpoint testing
```

## Docs Directory

```
docs/
└── 📄 A3_READY_TO_START.md         # Initial setup documentation
```

## OLD_FILES Directory

```
OLD_FILES/
├── 📁 old_docs/                    # Archived documentation
│   ├── README.old.md
│   ├── ARCHITECTURE.old.md
│   ├── CHANGES_AND_NEXT_STEPS.md
│   ├── PROJECT_STATUS.md
│   └── ...
│
├── 📁 old_scripts/                 # Deprecated scripts
│   ├── start.sh
│   ├── dev-start.sh
│   ├── auto-configure.sh
│   └── ...
│
├── 📁 terraform_backups/           # Terraform backup files
├── 📁 OLD plan docs/               # Old planning documents
└── 📁 localstack-init/             # LocalStack initialization (not used)
```

## Essential Files for Running the Application

### Absolutely Required

```
✅ client/src/**                    # Frontend source code
✅ server/services/**               # Backend services source
✅ server/shared/**                 # Shared utilities
✅ terraform/main.tf                # Infrastructure definition
✅ terraform/modules/**             # Terraform modules
✅ terraform/terraform.tfvars       # Configuration values
✅ scripts/build-and-push.sh        # Deployment script
```

### Important but Regenerated

```
🔄 client/dist/                     # Generated by npm run build
🔄 terraform/terraform.tfstate      # Generated by terraform apply
```

### Optional but Useful

```
📖 README.md                        # Documentation
📖 ARCHITECTURE.md                  # Architecture details
📖 DEPLOYMENT_GUIDE.md              # Deployment steps
📜 status.sh                        # Status checking
```

### Not Required (Archived)

```
❌ OLD_FILES/**                     # All archived files
❌ docker-compose.yml               # Not used (using ECS Fargate)
❌ Dockerfile (root)                # Not used
```

## File Permissions

```bash
# Scripts should be executable
chmod +x status.sh
chmod +x scripts/*.sh

# Terraform files should be readable
chmod 644 terraform/*.tf
chmod 644 terraform/*.tfvars
```

## .gitignore Configuration

Important files excluded from Git:

```gitignore
# Dependencies
node_modules/
.pnpm-debug.log*

# Build outputs
client/dist/
client/build/

# Environment files
.env
.env.local

# Terraform
terraform/.terraform/
terraform/*.tfstate
terraform/*.tfstate.backup

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
```

## Backup Recommendations

### Critical Files to Backup

1. **`terraform/terraform.tfstate`** - Infrastructure state
2. **`terraform/terraform.tfvars`** - Configuration values
3. **`client/.env`** - Frontend environment
4. **`server/services/**/.env`** - Backend environment (if exists)

### Backup Commands

```bash
# Backup Terraform state
cp terraform/terraform.tfstate terraform/terraform.tfstate.$(date +%Y%m%d).backup

# Backup configuration
tar -czf webapp-config-backup-$(date +%Y%m%d).tar.gz \
  terraform/terraform.tfvars \
  client/.env
```

## Storage Requirements

### Development Environment
- Source Code: ~50 MB
- node_modules: ~500 MB (client + all services)
- Docker Images: ~2 GB
- **Total**: ~2.5 GB

### Build Artifacts
- Frontend Build: ~5 MB
- Docker Images in ECR: ~1 GB (compressed)

## File Naming Conventions

- **Markdown files**: `UPPERCASE_WITH_UNDERSCORES.md`
- **JavaScript files**: `camelCase.js` or `kebab-case.js`
- **React components**: `PascalCase.jsx`
- **Terraform files**: `lowercase_with_underscores.tf`
- **Scripts**: `kebab-case.sh`

## Summary

### Must Keep
- ✅ `client/` - Frontend
- ✅ `server/` - Backend
- ✅ `terraform/` - Infrastructure
- ✅ `scripts/` - Deployment tools
- ✅ `README.md` - Main docs

### Can Delete
- ❌ `OLD_FILES/` - Everything
- ❌ `docs/A3_READY_TO_START.md` - Old setup
- ❌ Root docker files - Not used

---

**Last Updated**: October 30, 2025  
**Project Structure Version**: 5.0
