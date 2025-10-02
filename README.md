# n11817143 Video Transcoder

This repository contains a stateless, cloud-native video transcoder application that aligns with the CAB432 assignment requirements. The stack comprises a React frontend, an Express backend, and AWS managed services for authentication, storage, caching, and persistence. All infrastructure and application code are pre-configured for the following university-issued resources:

- **Region:** `ap-southeast-2`
- **Cognito User Pool:** `n11817143-a2` (`ap-southeast-2_CdVnmKfrW`)
- **S3 Bucket:** `n11817143-a2`
- **DynamoDB Table:** `n11817143-VideoApp`
- **ElastiCache Cluster:** `n11817143-a2-cache` (`n11817143-a2-cache.km2jzi.cfg.apse2.cache.amazonaws.com`)
- **Parameter Store Prefix:** `/n11817143/app/`
- **Secrets Manager Secret:** `n11817143-a2-secret`
- **Domain Name:** `n11817143-videoapp.cab432.com`
- **EC2 CNAME Target:** `ec2-3-27-210-9.ap-southeast-2.compute.amazonaws.com`

## Repository Layout

| Path | Description |
| ---- | ----------- |
| `client/` | React application served by Nginx and configured with AWS Amplify for Cognito auth and S3 uploads. |
| `server/` | Express API that validates Cognito JWTs, issues S3 presigned URLs, stores metadata in DynamoDB, and caches listings in Memcached. |
| `docker-compose.yml` | Local orchestration of the frontend and backend services. |
| `terraform/` | Terraform configuration that provisions the AWS resources listed above and writes runtime configuration to SSM & Secrets Manager. |
| `Dockerfile` | Legacy single-image build (unused once docker-compose is adopted). |

## Prerequisites

Before deploying, install and configure the following tools on your workstation or CI environment:

1. **Node.js 22.0+ and npm 10+** – required if you need to lint or run either service directly.
2. **Docker Engine & Docker Compose Plugin** – required for local development and for building the container images.
3. **Terraform 1.5+** – used to provision cloud infrastructure.
4. **AWS CLI v2** – configure it with an IAM user/role that has permission to manage S3, DynamoDB, Cognito, ElastiCache, Secrets Manager, SSM Parameter Store, and Route 53 in account `901444280953`.

> **Tip:** Run `aws configure --profile cab432` to create a dedicated named profile, then export `AWS_PROFILE=cab432` before invoking Terraform or Docker builds that rely on the CLI.

## Bootstrap AWS Infrastructure

Terraform is the single source of truth for infrastructure. It creates or reuses the named AWS services and writes application configuration parameters.

```bash
cd terraform
terraform init
terraform validate
terraform plan -out tfplan
terraform apply tfplan
```

Key behaviour:

- The module **reuses** the existing Cognito User Pool (`ap-southeast-2_CdVnmKfrW`) and creates a new app client; the client ID is exported and written to SSM.
- A **private S3 bucket** (`n11817143-a2`) is created with versioning and SSE enabled.
- A **DynamoDB table** (`n11817143-VideoApp`) is created with PAY_PER_REQUEST billing.
- A **Memcached ElastiCache cluster** (`n11817143-a2-cache`) is provisioned when subnet and security group IDs are provided via `-var` or `.tfvars`.
- Application configuration is stored beneath `/n11817143/app/` in Parameter Store, and the Cognito client secret is stored in Secrets Manager (`n11817143-a2-secret`).
- A public CNAME record `n11817143-videoapp.cab432.com` is pointed at `ec2-3-107-100-58.ap-southeast-2.compute.amazonaws.com`.

> **Optional inputs:** Provide `cache_subnet_ids` and `cache_security_group_ids` if the default VPC does not meet assignment requirements. All variables have defaults that match the assignment specification, but they can be overridden via `terraform.tfvars` or `-var` flags.

After `terraform apply` completes, the application will automatically load configuration from Parameter Store and Secrets Manager. You can verify the configuration is accessible:

```bash
# Verify Parameter Store configuration
npm --prefix server run params:status

# Optional: View all parameters (for troubleshooting)
aws ssm get-parameters-by-path \
  --path /n11817143/app/ \
  --with-decryption \
  --profile cab432

# Optional: View JWT secret (for troubleshooting)
aws secretsmanager get-secret-value \
  --secret-id n11817143-a2-secret \
  --profile cab432
```

No manual configuration is required - the application loads all settings dynamically.

## Local Development

The application uses **AWS Parameter Store** and **Secrets Manager** for configuration, eliminating the need for manual .env file management. All configuration is loaded dynamically at runtime.

### Quick Start

1. **Ensure AWS credentials are configured** for your environment:
   ```bash
   aws configure --profile cab432
   export AWS_PROFILE=cab432
   ```

2. **Start both services via Docker** (recommended):
   ```bash
   docker compose up --build
   ```
   - Backend available at `http://n11817143-videoapp.cab432.com:8080/api`
   - Frontend served at `http://n11817143-videoapp.cab432.com:3000`

### Configuration Details

The application automatically loads configuration from:
- **Parameter Store**: `/n11817143/app/*` parameters
- **Secrets Manager**: `n11817143-a2-secret` for JWT secret
- **Environment Variables**: For local overrides (optional)

Current configuration defaults (can be overridden via environment variables):
- **AWS Region**: `ap-southeast-2`
- **Cognito User Pool**: `ap-southeast-2_CdVnmKfrW`
- **S3 Bucket**: `n11817143-a2` 
- **DynamoDB Table**: `n11817143-VideoApp`
- **ElastiCache Endpoint**: `n11817143-a2-cache.km2jzi.cfg.apse2.cache.amazonaws.com:11211`
- **Domain**: `n11817143-videoapp.cab432.com`

### Alternative Development Options

1. **Install dependencies** (optional when using Docker):
   ```bash
   npm --prefix server install
   npm --prefix client install
   ```

2. **For local .env override** (optional), create `server/.env` with minimal config:
   ```ini
   PORT=8080
   CLIENT_ORIGINS=http://localhost:3000,http://n11817143-videoapp.cab432.com:3000
   AWS_REGION=ap-southeast-2
   ```

3. **For iterative frontend development** without containers:
   ```bash
   # Start backend via Docker (recommended)
   docker compose up backend -d
   
   # Or start backend directly (requires AWS credentials)
   npm --prefix server run dev
   
   # Start frontend development server  
   npm --prefix client run dev
   ```

### Troubleshooting Configuration

If you encounter configuration issues:

```bash
# Check Parameter Store connectivity
npm --prefix server run params:status

# View Docker logs for configuration loading
docker compose logs backend | grep -E "(Configuration|Parameter|Secret)"

# Test AWS credentials
aws sts get-caller-identity --profile cab432
```

## Deploying to EC2

1. **Build production images** on your workstation or CI runner:
   ```bash
   docker compose build
   ```
   Tag and push the images to your registry of choice (e.g., Amazon ECR).

2. **Provision the host** using Terraform outputs:
   - Ensure the EC2 instance has Docker and Docker Compose installed
   - Configure AWS credentials on the instance (IAM role or AWS CLI)
   - Copy the `docker-compose.yml` and source directories to the instance

3. **Deploy the application**:
   ```bash
   # Clone or copy the application
   git clone <repository-url>
   cd webapp.v1
   
   # Launch the stack (no manual .env needed)
   docker compose up --build -d
   ```

4. **Verify deployment**:
   ```bash
   # Check application health
   curl -I http://localhost:8080/api/health
   curl -I http://localhost:3000
   
   # Verify configuration loading
   docker compose logs backend | grep "Configuration loaded"
   ```

5. **Domain access**:
   - Frontend: `http://n11817143-videoapp.cab432.com:3000`
   - Backend API: `http://n11817143-videoapp.cab432.com:8080/api`

The application automatically loads all configuration from AWS services - no manual environment setup required.

## Operations & Maintenance

- **Invalidate video cache:** call `POST /api/videos/cache/invalidate` after bulk updates, or restart the backend container.
- **Admin features:** authenticated administrators (users in the `admins` Cognito group) can manage users via `/admin` in the frontend, which proxies to the backend's `/api/admin/users` endpoints.
- **Linting:** `npm --prefix server run lint` and `npm --prefix client run lint`.
- **Troubleshooting parameters:** run `npm --prefix server run params:status` to verify Parameter Store reachability.

## Support

For grading or operational issues, raise a ticket through th
