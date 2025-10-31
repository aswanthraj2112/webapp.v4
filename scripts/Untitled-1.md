and this was the old practical note/ instruction that are taught while  implemeted manu in my practial sections :
EC2 (Elastic Compute Cloud):

- **Instance Type (Autoscaling):** For autoscaling, you must use a single-CPU instance like **`t2.micro`** (which has 1 vCPU) instead of `t3.micro` (which has 2 vCPUs). This is because the demo Node.js server is single-threaded and cannot max out both CPUs on a T3 instance.
- **Shutdown Behavior:** Set the **Shutdown behavior** to **`Terminate`**.

### Autoscaling-Specific Settings (for `t2.micro`):

- **Detailed CloudWatch Monitoring:** Must be set to **Enable**. This changes the monitoring interval from 5 minutes (default) to 1 minute.
- **Credit Specification:** Must be set to **`Unlimited`**. This prevents the CPU from being throttled to its 15% baseline after its burst credits are used, which would otherwise stop it from reaching the scaling target.

### Policy

- **Lights-out Policy:** All EC2 instances are automatically **stopped** (not terminated) every day at **3 AM**. For autoscaling groups, the min, desired, and max instances are set to 0 every night.

---

## Security Groups (Firewall Rules)

You must use the pre-configured, existing security groups.

- **For EC2 Instances:** Use **`CAB432SG`**.
- **For ElastiCache:** Use **`CAB432MemcachedSG`**.
- **or Database EC2:** Use **`CAB432DBSG`**.

The `CAB432SG` group allows the following inbound traffic:

- **SSH (Port 22):** From the QUT network/VPN only.
- **Web Traffic (Ports 80, 443, 8080, 5000, 3000-3010):** From the public internet.

---

## DynamoDB

- **Partition Key:** You **must** set the partition key for your tables to **`qut-username`**.
- **Table Name:** It is recommended to prefix the table name with your username (e.g., `n1234567-kitties`).
- **Provisioned Throughput:** If not using on-demand, the recommended setting for practicals is **`ReadCapacityUnits: 1`** and **`WriteCapacityUnits:`**

---

## ElastiCache (Caching)

- **Service:** Use **`Memcached`**.
- **Networking:**
    - You must use the **`CAB432-subnets`** subnet group.
    - You must attach the **`CAB432MemcachedSG`** security group.
    - ElastiCache instances are **not accessible from the public internet**; you must access them from another AWS resource (like an EC2 instance).
- **Port:** The default port for `Memcached` is **`11211`**.

---

## Secrets Manager & Parameter Store

- **Secrets Manager:**
    - **Tagging:** You must tag secrets with `qut-username` and `purpose`.
- **Parameter Store:**
    - **Naming:** The parameter **Name** must be structured like a path, starting with your username (e.g., **`/n1234567/demo_parameter`**).
    - **Tagging:** You must tag parameters with `qut-username`.

---

## Application Load Balancer (ALB) & Target Groups

- **ALB:**
    - Must be **Internet-facing**.
    - Must use the **public subnets**.
    - Must use the **`CAB432SG`** security group.
    - Must have a **Listener** for **HTTP** on **port 80**.
- **Target Group:**
    - **Port:** Must match your application's port (e.g., **3000**).
    - **Health Check Timeout:** Recommended to set to **20 seconds** (default is 5) to give instances time to respond when under load.

---

## Autoscaling Groups (ASG)

- **Launch Template:** Must be based on the `t2.micro` AMI you created with `Unlimited` credits and `Detailed` monitoring.
- **Group Size:** For practicals and Assignment 3, a typical setup is:
    - **Desired Capacity:** 1
    - **Minimum Capacity:** 1
    - **Maximum Capacity:** 3
- **Scaling Policy Metric:** Use **`Average CPU utilization`**.
- **Target Value:** The target for CPU utilization is **80%** (for the practical) or **70%** (for Assignment 3).
- **Instance Warmup:** Set to **90 seconds** (down from the 300 default).
- **Default Cooldown:** Can be reduced to **60 seconds** to allow faster scale-in.

---

## ECS (Elastic Container Service)

- **Compute:** Use **AWS Fargate** (serverless).
- **Cluster:** Create the cluster with **no namespace**.
- **Task Definition (IAM):**
    - **Task role:** `Task-Role-CAB432-ECS`
    - **Task execution role:** `Execution-Role-CAB432-ECS`
- **Task Definition (Container):**
    - **Logging:** **Uncheck** "Use log collection".
    - **Port:** Expose your container port (e.g., **3000**).
- **Task Networking:**
    - **Subnets:** Must use **public subnets**.
    - **Security Group:** Must use **`CAB432SG`**.
    - **Public IP:** Must be **Enabled**.

---

## Lambda

- **IAM Role:** You must use the existing role **`CAB432-Lambda-Role`**.
- **S3 Trigger:** A common setup is to use **`All object create events`** from an S3 bucket as the trigger.

---

## HTTPS / SSL

- **Service:** Use **AWS Certificate Manager (ACM)** to request a public certificate.
- **Validation:** You must use **DNS validation**. ACM will create a `CNAME` record in Route 53 for you to prove ownership.
- **Integration:** You must attach the validated certificate to either an **Application Load Balancer (ALB)** or an **API Gateway** custom domain.

---

## CloudFront (CDN)

- **Origin:** Can be an **S3 bucket** (for static assets) or an **ALB/API Gateway**.
- **Use Case:** CloudFront is for **edge caching** and should be used for **static files** (HTML, CSS, JS, images).
- **Architecture:** Clients should access CloudFront directly. Do **not** put CloudFront *behind* an ALB or API Gateway, as this defeats the purpose of edge caching.



iam not sure this helpful