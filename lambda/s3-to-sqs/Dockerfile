# S3-to-SQS Lambda (Container Image)
FROM public.ecr.aws/lambda/nodejs:18

# Copy package files
COPY lambda/s3-to-sqs/package*.json ${LAMBDA_TASK_ROOT}/

# Install dependencies
RUN npm ci --only=production

# Copy function code
COPY lambda/s3-to-sqs/index.js ${LAMBDA_TASK_ROOT}/

# Set the CMD to your handler
CMD [ "index.handler" ]
