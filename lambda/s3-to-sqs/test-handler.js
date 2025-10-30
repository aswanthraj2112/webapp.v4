/**
 * Test harness for S3-to-SQS Lambda function
 * Simulates S3 event notifications for local development
 */

import { handler } from './index.js';

// Mock S3 event for testing
const createMockS3Event = (bucket, key, size = 10485760) => ({
    Records: [
        {
            eventVersion: '2.1',
            eventSource: 'aws:s3',
            awsRegion: process.env.AWS_REGION || 'ap-southeast-2',
            eventTime: new Date().toISOString(),
            eventName: 's3:ObjectCreated:Put',
            s3: {
                s3SchemaVersion: '1.0',
                configurationId: 'VideoUploadNotification',
                bucket: {
                    name: bucket,
                    arn: `arn:aws:s3:::${bucket}`
                },
                object: {
                    key: key,
                    size: size,
                    eTag: 'mock-etag-12345',
                    sequencer: 'mock-sequencer'
                }
            }
        }
    ]
});

async function runTests() {
    console.log('========================================');
    console.log('Lambda Function Test Harness');
    console.log('========================================\n');

    const bucket = process.env.S3_BUCKET_NAME || 'n11817143-a2';

    // Test cases
    const testCases = [
        {
            name: 'Valid MP4 upload',
            key: 'raw/test-user-123/1698745200000-abc123-testvideo.mp4',
            size: 15728640, // 15 MB
            shouldSucceed: true
        },
        {
            name: 'Valid MOV upload',
            key: 'raw/user-456/1698745300000-def456-movie.mov',
            size: 52428800, // 50 MB
            shouldSucceed: true
        },
        {
            name: 'Invalid prefix (not in raw/)',
            key: 'transcoded/user-789/video.mp4',
            size: 10485760,
            shouldSucceed: false
        },
        {
            name: 'Invalid file type (not a video)',
            key: 'raw/user-123/document.pdf',
            size: 1048576,
            shouldSucceed: false
        },
        {
            name: 'Invalid key format (missing components)',
            key: 'raw/video.mp4',
            size: 10485760,
            shouldSucceed: false
        }
    ];

    let passed = 0;
    let failed = 0;

    for (const testCase of testCases) {
        console.log(`\nTest: ${testCase.name}`);
        console.log(`  Key: ${testCase.key}`);
        console.log(`  Size: ${(testCase.size / 1024 / 1024).toFixed(2)} MB`);

        try {
            const event = createMockS3Event(bucket, testCase.key, testCase.size);
            const result = await handler(event);

            if (testCase.shouldSucceed) {
                console.log(`  ✅ PASSED - Message sent to SQS`);
                console.log(`  Result: ${JSON.stringify(result, null, 2)}`);
                passed++;
            } else {
                console.log(`  ⚠️  UNEXPECTED - Should have been skipped`);
                console.log(`  Result: ${JSON.stringify(result, null, 2)}`);
                failed++;
            }
        } catch (error) {
            if (!testCase.shouldSucceed) {
                console.log(`  ✅ PASSED - Correctly rejected/skipped`);
                console.log(`  Reason: ${error.message}`);
                passed++;
            } else {
                console.log(`  ❌ FAILED - Unexpected error`);
                console.log(`  Error: ${error.message}`);
                failed++;
            }
        }
    }

    console.log('\n========================================');
    console.log('Test Results');
    console.log('========================================');
    console.log(`Total: ${testCases.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log('========================================\n');

    // Keep container running in watch mode
    if (process.env.WATCH_MODE === 'true') {
        console.log('Watch mode enabled. Waiting for file changes...');
        // In real scenario, would use nodemon or similar
        await new Promise(() => { }); // Keep alive
    } else {
        process.exit(failed > 0 ? 1 : 0);
    }
}

// Run tests
runTests().catch(error => {
    console.error('Test harness error:', error);
    process.exit(1);
});
