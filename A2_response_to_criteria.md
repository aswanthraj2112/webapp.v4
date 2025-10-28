Assignment 2 - Cloud Services Exercises - Response to Criteria
================================================

Instructions
------------------------------------------------
- Keep this file named A2_response_to_criteria.md, do not change the name
- Upload this file along with your code in the root directory of your project
- Upload this file in the current Markdown format (.md extension)
- Do not delete or rearrange sections.  If you did not attempt a criterion, leave it blank
- Text inside [ ] like [eg. S3 ] are examples and should be removed


Overview
------------------------------------------------

- **Name:** Aswanth Raj
- **Student number:** n11817143
- **Partner name (if applicable):** N/A
- **Application name:** n11817143 Video Transcoder
- **Two line description:** Secure video management platform with Cognito-authenticated uploads to S3 and DynamoDB-backed metadata. Automatic FFmpeg transcoding, thumbnail generation, and Memcached caching keep playback responsive for repeat viewers.
- **EC2 instance name or ID:** ec2-13-210-12-3.ap-southeast-2.compute.amazonaws.com

------------------------------------------------

### Core - First data persistence service

- **AWS service name:** Amazon S3
- **What data is being stored?:** Raw uploads, transcoded MP4 variants, and generated JPEG thumbnails for each video.
- **Why is this service suited to this data?:** S3 provides durable, scalable object storage with multipart upload support suited to large binary assets and integrates directly with presigned URL workflows.
- **Why is are the other services used not suitable for this data?:** DynamoDB and ElastiCache handle metadata and caching but are not cost-effective or size-appropriate for GB-scale binary video payloads.
- **Bucket/instance/table name:** n11817143-a2
- **Video timestamp:**
- **Relevant files:**
    - `server/src/videos/video.service.js:37` – Generates presigned upload URLs and stores object metadata for videos and thumbnails.
    - `server/src/videos/transcoding.service.js:87` – Streams transcoded outputs back into the same bucket for playback variants.
    - `terraform/variables.tf:43` – Declares the managed bucket so Terraform remains the single source of truth.

### Core - Second data persistence service

- **AWS service name:** Amazon DynamoDB
- **What data is being stored?:** Video metadata including owner ID, object keys, runtime stats, and transcoding progress.
- **Why is this service suited to this data?:** DynamoDB’s key-value model with partition key `ownerId` and range key `videoId` enables fast per-user listings with on-demand scaling and zero maintenance.
- **Why is are the other services used not suitable for this data?:** S3 lacks queryable attributes for dashboards, and relational engines would add operational overhead compared with DynamoDB’s pay-per-request model.
- **Bucket/instance/table name:** n11817143-VideoApp
- **Video timestamp:**
- **Relevant files:**
    - `server/src/videos/video.repo.dynamo.js:1` – Implements CRUD with the DynamoDB DocumentClient and maps schema attributes.
    - `server/src/videos/video.controller.js:51` – Reads from the table, caching paged results for users.
    - `terraform/main.tf:59` – Provisions the table with PAY_PER_REQUEST billing via IaC.

### Third data service

- **AWS service name:** AWS Systems Manager Parameter Store
- **What data is being stored?:** Application configuration such as Cognito client IDs, S3 prefixes, DynamoDB table name, and upload limits.
- **Why is this service suited to this data?:** Parameter Store keeps configuration centralised, versioned, and retrievable at runtime without hard-coding secrets into containers.
- **Why is are the other services used not suitable for this data?:** Secrets Manager is reserved for sensitive credentials, while embedding values in source or environment images breaks twelve-factor statelessness.
- **Bucket/instance/table name:** /n11817143/app/
- **Video timestamp:**
- **Relevant files:**
    - `server/src/utils/parameterStore.js:18` – Loads and caches parameters with decryption support.
    - `server/src/config.js:28` – Applies parameter overrides during startup to keep the app stateless.
    - `terraform/main.tf:119` – Defines the parameter keys expected in the environment.

### S3 Pre-signed URLs

- **S3 Bucket names:** n11817143-a2
- **Video timestamp:**
- **Relevant files:**
    - `server/src/videos/video.service.js:37` – Issues presigned PUT URLs for authenticated uploads.
    - `server/src/videos/video.service.js:129` – Creates presigned GET URLs for streaming originals, thumbnails, or transcoded assets.
    - `client/src/api.js:97` – Fetches signed URLs on demand from the React client with Amplify session tokens.

### In-memory cache

- **ElastiCache instance name:** n11817143-a2-cache
- **What data is being cached?:** Paged video listings and per-user cache version tokens to accelerate dashboard loads.
- **Why is this data likely to be accessed frequently?:** Users repeatedly visit the dashboard and admins browse aggregated video lists, making metadata reads far more common than writes.
- **Video timestamp:**
- **Relevant files:**
    - `server/src/videos/video.controller.js:12` – Wraps list responses with cache versioning and TTL-based storage.
    - `server/src/cache/cache.client.js:13` – Configures the Memcached client against the provisioned endpoint and handles failures gracefully.
    - `ELASTICACHE_DEMO.md:1` – Documents the demo procedure and endpoint used when presenting the cache benefit.

### Core - Statelessness

- **What data is stored within your application that is not stored in cloud data services?:** Only ephemeral files during FFmpeg transcoding and thumbnail generation inside `/tmp` on the container.
- **Why is this data not considered persistent state?:** Temporary artefacts are recreated from S3 originals and are deleted immediately after uploads complete.
- **How does your application ensure data consistency if the app suddenly stops?:** Upload finalisation validates the object exists in S3 before writing DynamoDB metadata, and transcoding jobs update DynamoDB atomically so restarts simply resume by reading that state.
- **Relevant files:**
    - `server/src/videos/video.service.js:75` – Verifies the uploaded object before persisting metadata to DynamoDB.
    - `server/src/videos/video.service.js:163` – Creates and then cleans up temporary working directories in `/tmp`.
    - `server/src/index.js:71` – Loads configuration from AWS services on boot, meaning instances can be replaced without manual setup.

### Graceful handling of persistent connections

- **Type of persistent connection and use:**
- **Method for handling lost connections:**
- **Relevant files:**
    -


### Core - Authentication with Cognito

- **User pool name:** n11817143-a2 (ap-southeast-2_CdVnmKfrW)
- **How are authentication tokens handled by the client?:** AWS Amplify fetches Cognito tokens into memory, and `client/src/api.js` attaches the short-lived access token to each request without storing sensitive data in localStorage.
- **Video timestamp:**
- **Relevant files:**
    - `server/src/auth/cognito.service.js:65` – Wraps Cognito sign-up, sign-in, refresh, and admin APIs.
    - `server/src/auth/auth.middleware.js:8` – Verifies access or ID tokens on every API request.
    - `client/src/App.jsx:142` – Configures Amplify runtime with the user pool values returned from the backend.

### Cognito multi-factor authentication

- **What factors are used for authentication:** Password plus SMS MFA codes or TOTP codes from an authenticator app.
- **Video timestamp:**
- **Relevant files:**
    - `client/src/pages/Login.jsx:2` – Implements MFA enrolment and verification flows with Amplify helpers.
    - `client/src/pages/Login.jsx:264` – Prompts for one-time codes when Cognito challenges the session.
    - `server/src/auth/auth.controller.js:82` – Handles Cognito challenge responses server-side so clients can complete MFA.

### Cognito federated identities

- **Identity providers used:**
- **Video timestamp:**
- **Relevant files:**
    -

### Cognito groups

- **How are groups used to set permissions?:** Users in the `admin` group unlock admin routes for listing and deleting users/videos, while standard users are restricted to their own content.
- **Video timestamp:**
- **Relevant files:**
    - `server/src/admin/admin.routes.js:11` – Checks Cognito group membership before granting admin access.
    - `client/src/App.jsx:279` – Shows admin navigation only when the decoded token includes the admin group.
    - `server/src/auth/auth.middleware.js:59` – Normalises Cognito group claims onto the request for downstream checks.

### Core - DNS with Route53

- **Subdomain**: n11817143-videoapp.cab432.com
- **Video timestamp:**

### Parameter store

- **Parameter names:** cognitoClientId, cognitoUserPoolId, domainName, dynamoTable, s3Bucket, s3_raw_prefix, s3_transcoded_prefix, s3_thumbnail_prefix, maxUploadSizeMb, preSignedUrlTTL
- **Video timestamp:**
- **Relevant files:**
    - `server/src/utils/parameterStore.js:51` – Retrieves and caches application parameters.
    - `server/src/config.js:33` – Applies parameter overrides during startup.
    - `terraform/main.tf:119` – Lists the parameters expected in the environment.

### Secrets manager

- **Secrets names:** n11817143-a2-secret
- **Video timestamp:**
- **Relevant files:**
    - `server/src/utils/secrets.js:1` – Fetches JWT and Cognito client secrets from Secrets Manager.
    - `server/src/auth/cognito.service.js:25` – Uses the stored client secret to calculate Cognito secret hashes.
    - `README.md:73` – Documents retrieving the secret for troubleshooting.

### Infrastructure as code

- **Technology used:** Terraform 1.5 modules managed in this repository.
- **Services deployed:** S3 bucket with SSE and versioning, DynamoDB metadata table, conditional ElastiCache Memcached cluster, ECR repositories, and supporting IAM-tagged resources.
- **Video timestamp:**
- **Relevant files:**
    - `terraform/main.tf:24` – Defines the S3 bucket, DynamoDB table, ElastiCache cluster, and ECR repositories.
    - `terraform/variables.tf:7` – Centralises naming/region variables for consistent resource provisioning.
    - `terraform/DEPLOYMENT_STATUS.md:8` – Captures deployment outcomes and manual follow-up actions.

### Other (with prior approval only)

- **Description:**
- **Video timestamp:**
- **Relevant files:**
    -

### Other (with prior permission only)

- **Description:**
- **Video timestamp:**
- **Relevant files:**
    -

