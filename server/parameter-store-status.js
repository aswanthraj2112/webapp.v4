#!/usr/bin/env node

import { loadAppConfig } from './src/utils/parameterStore.js';

console.log('🔧 AWS Parameter Store Integration Summary');
console.log('==========================================\n');

try {
    const config = await loadAppConfig();

    console.log('✅ Parameter Store integration is fully operational!\n');

    console.log('📋 Configured Parameters:');
    console.log(`   • Cognito Client ID: ${config.COGNITO_CLIENT_ID}`);
    console.log(`   • Cognito User Pool ID: ${config.COGNITO_USER_POOL_ID}`);
    console.log(`   • Domain Name: ${config.DOMAIN_NAME}`);
    console.log(`   • DynamoDB Table: ${config.DYNAMO_TABLE}`);
    console.log(`   • DynamoDB Owner Index: ${config.DYNAMO_OWNER_INDEX}`);
    console.log(`   • Max Upload Size: ${config.MAX_UPLOAD_SIZE_MB}MB`);
    console.log(`   • Presigned URL TTL: ${config.PRESIGNED_URL_TTL}s`);
    console.log(`   • S3 Bucket: ${config.S3_BUCKET}`);
    console.log(`   • S3 Raw Prefix: ${config.S3_RAW_PREFIX}`);
    console.log(`   • S3 Thumbnail Prefix: ${config.S3_THUMBNAIL_PREFIX}`);
    console.log(`   • S3 Transcoded Prefix: ${config.S3_TRANSCODED_PREFIX}\n`);

    console.log('🚀 Available Commands:');
    console.log('   • npm run params:list      - List all parameters');
    console.log('   • npm run params:validate  - Validate configuration');
    console.log('   • npm run params:test      - Run integration tests');
    console.log('   • npm start                - Start server with Parameter Store\n');

    console.log('📚 Documentation: docs/PARAMETER-STORE-INTEGRATION.md');

} catch (error) {
    console.error('❌ Parameter Store integration failed:', error.message);
    console.log('\n🔍 Troubleshooting:');
    console.log('   1. Check AWS credentials and region');
    console.log('   2. Verify IAM permissions for SSM');
    console.log('   3. Run: npm run params:validate');
    process.exit(1);
}