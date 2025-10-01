# n11817143 Video Transcoder

This repository contains a stateless, cloud-native video transcoder application that aligns with the CAB432 assignment requirements. The stack comprises a React frontend, an Express backend, and AWS managed services for authentication, storage, caching, and persistence. All infrastructure and application code are pre-configured for the following university-issued resources:

- **Region:** `ap-southeast-2`
- **Cognito User Pool:** `n11817143-a2` (`ap-southeast-2_CdVnmKfrW`)
- **S3 Bucket:** `n11817143-a2`
- **DynamoDB Table:** `n11817143-VideoApp`
- **ElastiCache Cluster:** `n11817143-a2-cache`
- **Parameter Store Prefix:** `/n11817143/app/`
- **Secrets Manager Secret:** `n11817143-a2-secret`
- **Domain Name:** `n11817143-videoapp.cab432.com`
- **EC2 CNAME Target:** `ec2-3-107-100-58.ap-southeast-2.compute.amazonaws.com`

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

After `terraform apply` completes, retrieve runtime secrets for the backend:

```bash
aws ssm get-parameters-by-path \
  --path /n11817143/app/ \
  --with-decryption \
  --profile cab432

aws secretsmanager get-secret-value \
  --secret-id n11817143-a2-secret \
  --profile cab432
```

These commands will return the Cognito client ID and secret needed to configure the API service.

## Local Development

1. Install dependencies (optional when using Docker):
   ```bash
   npm --prefix server install
   npm --prefix client install
   ```
2. Create a `server/.env` file or export shell variables with the following minimum configuration (values shown are the defaults emitted by Terraform):
   ```ini
   AWS_REGION=ap-southeast-2
   CLIENT_ORIGINS=http://localhost:3000,https://n11817143-videoapp.cab432.com
   COGNITO_USER_POOL_ID=ap-southeast-2_CdVnmKfrW
   COGNITO_CLIENT_ID=<value from Parameter Store>
   ELASTICACHE_ENDPOINT=n11817143-a2-cache.cfg.apse2.cache.amazonaws.com:11211
   S3_BUCKET=n11817143-a2
   DYNAMO_TABLE=n11817143-VideoApp
   PARAMETER_PREFIX=/n11817143/app/
   DOMAIN_NAME=n11817143-videoapp.cab432.com
   EC2_CNAME_TARGET=ec2-3-107-100-58.ap-southeast-2.compute.amazonaws.com
   ```
3. Start both services via Docker:
   ```bash
   docker compose up --build
   ```
   - Backend available at `http://localhost:8080/api`
   - Frontend served at `http://localhost:3000`

4. For iterative frontend work without containers, run Vite directly:
   ```bash
   npm --prefix client run dev
   ```

    Ensure the backend is running (either via Docker or `npm --prefix server run dev`).

## Deploying to EC2

1. **Build production images** on your workstation or CI runner:
   ```bash
   docker compose build
   ```
   Tag and push the images to your registry of choice (e.g., Amazon ECR).

2. **Provision the host** using Terraform outputs:
   - Ensure the EC2 instance referenced by the Route 53 record (`ec2-3-107-100-58.ap-southeast-2.compute.amazonaws.com`) has Docker and Docker Compose installed.
   - Copy the `docker-compose.yml`, the `client/` and `server/` directories (or pre-built images), and your `.env` files to the instance.

3. **Configure runtime secrets** on the EC2 instance by exporting the same environment variables documented above. The recommended approach is to create a `.env` file alongside the compose file and reference it with the `env_file` directive.

4. **Launch the stack** on the instance:
   ```bash
   docker compose pull   # when using images pushed to a registry
   docker compose up -d
   ```

5. Confirm health:
   ```bash
   curl -I http://localhost:8080/api/health
   curl -I http://localhost:3000
   ```

## Operations & Maintenance

- **Invalidate video cache:** call `POST /api/videos/cache/invalidate` after bulk updates, or restart the backend container.
- **Admin features:** authenticated administrators (users in the `admins` Cognito group) can manage users via `/admin` in the frontend, which proxies to the backend's `/api/admin/users` endpoints.
- **Linting:** `npm --prefix server run lint` and `npm --prefix client run lint`.
- **Troubleshooting parameters:** run `npm --prefix server run params:status` to verify Parameter Store reachability.

## Support

For grading or operational issues, raise a ticket through th
