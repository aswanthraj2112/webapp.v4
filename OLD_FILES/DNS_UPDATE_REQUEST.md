# DNS Update Request for CAB432 Assignment

## Student Information
- **Student ID**: n11817143
- **Name**: Aswanth Raj
- **Domain**: n11817143-videoapp.cab432.com

## Current Issue
The domain `n11817143-videoapp.cab432.com` is currently pointing to the wrong EC2 instance.

## DNS Update Required
Please update the Route53 CNAME record for `n11817143-videoapp.cab432.com` to point to:

**Current (incorrect)**: `ec2-3-27-210-9.ap-southeast-2.compute.amazonaws.com`
**New (correct)**: `ec2-13-210-12-3.ap-southeast-2.compute.amazonaws.com`

## Verification
- Current server IP: `13.210.12.3`
- Application working at: http://13.210.12.3:3000
- Backend API working at: http://13.210.12.3:8080/api

## Route53 Record Details
- **Hosted Zone**: cab432.com (Z02680423BHWEVRU2JZDQ)
- **Record Name**: n11817143-videoapp.cab432.com
- **Record Type**: CNAME
- **TTL**: 300
- **Value**: ec2-13-210-12-3.ap-southeast-2.compute.amazonaws.com

## AWS CLI Command (for admin reference)
```bash
aws route53 change-resource-record-sets --hosted-zone-id Z02680423BHWEVRU2JZDQ --change-batch '{
    "Changes": [{
        "Action": "UPSERT",
        "ResourceRecordSet": {
            "Name": "n11817143-videoapp.cab432.com",
            "Type": "CNAME",
            "TTL": 300,
            "ResourceRecords": [{"Value": "ec2-13-210-12-3.ap-southeast-2.compute.amazonaws.com"}]
        }
    }]
}'
```