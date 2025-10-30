#!/usr/bin/env node

import {
    getParameter,
    getParameters,
    loadAppConfig,
    clearCache,
    getCacheStats
} from './src/utils/parameterStore.js'; const PARAM_PREFIX = '/n11817143/app';

async function listParameters() {
    try {
        console.log('📋 Loading all application parameters...\n');

        const config = await loadAppConfig();

        console.log('✅ Parameter Store Configuration:');
        console.log('=====================================');

        const paramMap = {
            'Cognito Client ID': config.COGNITO_CLIENT_ID,
            'Cognito User Pool ID': config.COGNITO_USER_POOL_ID,
            'Domain Name': config.DOMAIN_NAME,
            'DynamoDB Table': config.DYNAMO_TABLE,
            'DynamoDB Owner Index': config.DYNAMO_OWNER_INDEX,
            'Max Upload Size (MB)': config.MAX_UPLOAD_SIZE_MB,
            'Presigned URL TTL (seconds)': config.PRESIGNED_URL_TTL,
            'S3 Bucket': config.S3_BUCKET,
            'S3 Raw Prefix': config.S3_RAW_PREFIX,
            'S3 Thumbnail Prefix': config.S3_THUMBNAIL_PREFIX,
            'S3 Transcoded Prefix': config.S3_TRANSCODED_PREFIX
        };

        for (const [key, value] of Object.entries(paramMap)) {
            const status = value ? '✅' : '❌';
            console.log(`${status} ${key}: ${value || 'NOT SET'}`);
        }

        console.log('\n📊 Cache Statistics:');
        const stats = getCacheStats();
        console.log(`   - Cached parameters: ${stats.size}`);

    } catch (error) {
        console.error('❌ Failed to load parameters:', error.message);
        process.exit(1);
    }
}

async function getParam(paramName) {
    try {
        console.log(`🔍 Getting parameter: ${paramName}`);
        const value = await getParameter(paramName);
        console.log(`✅ ${PARAM_PREFIX}/${paramName}: ${value}`);
    } catch (error) {
        console.error(`❌ Failed to get parameter ${paramName}:`, error.message);
        process.exit(1);
    }
}

async function validateConfig() {
    try {
        console.log('🔍 Validating Parameter Store configuration...\n');

        const requiredParams = [
            'cognitoClientId',
            'cognitoUserPoolId',
            'domainName',
            'dynamoTable',
            'dynamoOwnerIndex',
            's3Bucket'
        ];

        const optionalParams = [
            'maxUploadSizeMb',
            'preSignedUrlTTL',
            's3_raw_prefix',
            's3_thumbnail_prefix',
            's3_transcoded_prefix'
        ];

        console.log('Required Parameters:');
        console.log('====================');

        let allRequired = true;
        for (const param of requiredParams) {
            try {
                const value = await getParameter(param);
                console.log(`✅ ${param}: ${value}`);
            } catch (error) {
                console.log(`❌ ${param}: MISSING`);
                allRequired = false;
            }
        }

        console.log('\nOptional Parameters:');
        console.log('====================');

        for (const param of optionalParams) {
            try {
                const value = await getParameter(param);
                console.log(`✅ ${param}: ${value}`);
            } catch (error) {
                console.log(`⚠️  ${param}: NOT SET (will use default)`);
            }
        }

        console.log('\n' + '='.repeat(50));
        if (allRequired) {
            console.log('✅ All required parameters are configured!');
        } else {
            console.log('❌ Some required parameters are missing!');
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ Validation failed:', error.message);
        process.exit(1);
    }
}

function showUsage() {
    console.log(`
Parameter Store Management CLI

Usage:
  node parameter-cli.js <command> [arguments]

Commands:
  list                 List all application parameters
  get <param-name>     Get a specific parameter value
  validate            Validate all required parameters exist
  clear-cache         Clear the parameter cache
  help                Show this help message

Examples:
  node parameter-cli.js list
  node parameter-cli.js get s3Bucket
  node parameter-cli.js validate
  node parameter-cli.js clear-cache

Parameter Names (without prefix):
  - cognitoClientId
  - cognitoUserPoolId
  - domainName
  - dynamoTable
  - dynamoOwnerIndex
  - maxUploadSizeMb
  - preSignedUrlTTL
  - s3Bucket
  - s3_raw_prefix
  - s3_thumbnail_prefix
  - s3_transcoded_prefix
`);
}

async function main() {
    const command = process.argv[2];

    switch (command) {
        case 'list':
            await listParameters();
            break;

        case 'get':
            const paramName = process.argv[3];
            if (!paramName) {
                console.error('❌ Parameter name is required');
                showUsage();
                process.exit(1);
            }
            await getParam(paramName);
            break;

        case 'validate':
            await validateConfig();
            break;

        case 'clear-cache':
            clearCache();
            console.log('✅ Parameter cache cleared');
            break;

        case 'help':
        case '--help':
        case '-h':
            showUsage();
            break;

        default:
            console.error(`❌ Unknown command: ${command || 'none'}`);
            showUsage();
            process.exit(1);
    }
}

main().catch(error => {
    console.error('❌ CLI Error:', error.message);
    process.exit(1);
});