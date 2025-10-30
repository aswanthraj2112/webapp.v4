# AWS SSO Setup for Terraform

## Problem
The EC2 instance role (`CAB432-Instance-Role`) has limited permissions and cannot create/modify resources like ALBs or ECS clusters. To run Terraform, you must use your CAB432-STUDENT credentials via SSO.

## Solution: Configure AWS CLI with SSO

### Option 1: Automated Script (Recommended)

Run the provided configuration script:

```bash
./configure-sso.sh
```

**Note:** The automated script may not work perfectly due to the interactive nature of SSO login. If it fails, use Option 2 below.

### Option 2: Manual Configuration (Most Reliable)

1. **Start the SSO configuration:**
   ```bash
   aws configure sso --use-device-code
   ```

2. **Enter these values when prompted:**
   - **SSO start URL:** `https://d-97671c4bd0.awsapps.com/start#/`
   - **SSO region:** `ap-southeast-2`
   
3. **Complete browser authentication:**
   - The CLI will display a code (e.g., `ABCD-1234`)
   - Open the URL shown: `https://device.sso.ap-southeast-2.amazonaws.com/`
   - Enter the code and complete login in your browser

4. **Back in terminal, confirm:**
   - **Account ID:** `901444280953` (should auto-select)
   - **Role:** Select `CAB432-STUDENT`
   - **Default region:** `ap-southeast-2`
   - **Output format:** `json`
   - **Profile name:** `cab432` (or `default`)

### Using the Profile with Terraform

After configuration is complete:

1. **Set the AWS profile environment variable:**
   ```bash
   export AWS_PROFILE=cab432
   ```

2. **Verify your credentials:**
   ```bash
   aws sts get-caller-identity
   ```
   
   Should show:
   ```json
   {
     "UserId": "...",
     "Account": "901444280953",
     "Arn": "arn:aws:sts::901444280953:assumed-role/CAB432-STUDENT/..."
   }
   ```

3. **Run Terraform:**
   ```bash
   cd terraform
   terraform plan
   terraform apply
   ```

### Making Profile Permanent

Add to your `~/.bashrc` to automatically use this profile:

```bash
echo 'export AWS_PROFILE=cab432' >> ~/.bashrc
source ~/.bashrc
```

## Troubleshooting

### SSO Session Expired
If you see authentication errors, your SSO session may have expired. Re-login:
```bash
aws sso login --profile cab432
```

### Wrong Credentials
Check which credentials Terraform is using:
```bash
aws sts get-caller-identity
```

Should show `CAB432-STUDENT` role, not `CAB432-Instance-Role`.

### Profile Not Found
List your configured profiles:
```bash
aws configure list-profiles
```

Re-run configuration if needed.

## Quick Reference

```bash
# Configure SSO (one-time setup)
aws configure sso --use-device-code

# Login to SSO (when session expires)
aws sso login --profile cab432

# Set profile for current session
export AWS_PROFILE=cab432

# Verify credentials
aws sts get-caller-identity

# Run Terraform
cd terraform
terraform plan
terraform apply
```

## References
- Based on "Publishing an image to AWS ECR" practical
- SSO Start URL: https://d-97671c4bd0.awsapps.com/start#/
- Account: 901444280953
- Role: CAB432-STUDENT
- Region: ap-southeast-2
