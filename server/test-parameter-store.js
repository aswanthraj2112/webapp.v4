import { loadAppConfig, getParameter, getParameters } from './src/utils/parameterStore.js';

async function testParameterStore() {
    console.log('🧪 Testing Parameter Store Integration');
    console.log('=====================================\n');

    try {
        // Test 1: Load all application config
        console.log('Test 1: Loading complete application configuration...');
        const startTime = Date.now();
        const config = await loadAppConfig();
        const loadTime = Date.now() - startTime;

        console.log(`✅ Configuration loaded in ${loadTime}ms`);
        console.log(`📊 Loaded ${Object.keys(config).length} configuration values\n`);

        // Test 2: Individual parameter retrieval
        console.log('Test 2: Testing individual parameter retrieval...');
        try {
            const s3Bucket = await getParameter('s3Bucket');
            console.log(`✅ S3 Bucket: ${s3Bucket}`);
        } catch (error) {
            console.log(`❌ Failed to get S3 bucket: ${error.message}`);
        }

        // Test 3: Batch parameter retrieval
        console.log('\nTest 3: Testing batch parameter retrieval...');
        try {
            const batchStart = Date.now();
            const params = await getParameters(['s3Bucket', 'dynamoTable', 'maxUploadSizeMb']);
            const batchTime = Date.now() - batchStart;
            console.log(`✅ Batch retrieval completed in ${batchTime}ms`);
            console.log(`📋 Retrieved: ${Object.keys(params).join(', ')}`);
        } catch (error) {
            console.log(`❌ Batch retrieval failed: ${error.message}`);
        }

        // Test 4: Configuration validation
        console.log('\nTest 4: Validating configuration completeness...');
        const requiredFields = [
            'COGNITO_CLIENT_ID',
            'COGNITO_USER_POOL_ID',
            'DOMAIN_NAME',
            'DYNAMO_TABLE',
            'DYNAMO_OWNER_INDEX',
            'S3_BUCKET'
        ];

        let validationPassed = true;
        for (const field of requiredFields) {
            if (!config[field]) {
                console.log(`❌ Missing required field: ${field}`);
                validationPassed = false;
            } else {
                console.log(`✅ ${field}: configured`);
            }
        }

        // Test 5: Numeric parameter parsing
        console.log('\nTest 5: Testing numeric parameter parsing...');
        console.log(`✅ Max Upload Size: ${config.MAX_UPLOAD_SIZE_MB}MB (type: ${typeof config.MAX_UPLOAD_SIZE_MB})`);
        console.log(`✅ Presigned URL TTL: ${config.PRESIGNED_URL_TTL}s (type: ${typeof config.PRESIGNED_URL_TTL})`);

        // Test 6: S3 prefix validation
        console.log('\nTest 6: Testing S3 prefix configuration...');
        const s3Prefixes = [
            'S3_RAW_PREFIX',
            'S3_THUMBNAIL_PREFIX',
            'S3_TRANSCODED_PREFIX'
        ];

        for (const prefix of s3Prefixes) {
            if (config[prefix]) {
                console.log(`✅ ${prefix}: ${config[prefix]}`);
            } else {
                console.log(`⚠️  ${prefix}: not configured`);
            }
        }

        console.log('\n' + '='.repeat(50));
        if (validationPassed) {
            console.log('🎉 All tests passed! Parameter Store integration is working correctly.');

            console.log('\n📋 Configuration Summary:');
            console.log(`   Region: ${config.REGION}`);
            console.log(`   Domain: ${config.DOMAIN_NAME}`);
            console.log(`   S3 Bucket: ${config.S3_BUCKET}`);
            console.log(`   DynamoDB Table: ${config.DYNAMO_TABLE}`);
            console.log(`   Max Upload: ${config.MAX_UPLOAD_SIZE_MB}MB`);
            console.log(`   URL TTL: ${config.PRESIGNED_URL_TTL}s`);

        } else {
            console.log('❌ Some tests failed. Please check Parameter Store configuration.');
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ Parameter Store test failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    testParameterStore();
}