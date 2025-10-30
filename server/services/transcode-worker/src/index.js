import config from '../../../shared/config/index.js';
import SQSConsumer from './queue/sqs-consumer.js';
import { processTranscodeJob } from './video/transcode.service.js';

// Message handler for transcode jobs
async function handleTranscodeMessage(messageBody, rawMessage) {
    console.log('📨 Received transcode job:', JSON.stringify(messageBody, null, 2));

    // Validate message structure
    if (!messageBody.userId || !messageBody.videoId || !messageBody.originalS3Key) {
        console.error('❌ Invalid message format:', messageBody);
        throw new Error('Invalid message format: missing required fields');
    }

    const { userId, videoId, originalS3Key, resolution = '720p' } = messageBody;

    // Process the transcode job
    await processTranscodeJob({
        userId,
        videoId,
        originalS3Key,
        resolution
    });
}

// Main startup function
async function startWorker() {
    try {
        console.log('');
        console.log('🚀 ════════════════════════════════════════════════════════');
        console.log('   TRANSCODE WORKER STARTING');
        console.log('   ════════════════════════════════════════════════════════');

        // Set service name
        config.SERVICE_NAME = 'transcode-worker';

        // Initialize configuration
        await config.initialize();

        // Check for required configuration
        if (!config.TRANSCODE_QUEUE_URL) {
            throw new Error('TRANSCODE_QUEUE_URL environment variable is required');
        }

        console.log(`   Service:     ${config.SERVICE_NAME}`);
        console.log(`   Region:      ${config.AWS_REGION}`);
        console.log(`   Queue:       ${config.TRANSCODE_QUEUE_URL}`);
        console.log(`   S3 Bucket:   ${config.S3_BUCKET}`);
        console.log(`   DynamoDB:    ${config.DYNAMO_TABLE}`);
        console.log('   ════════════════════════════════════════════════════════');
        console.log('');

        // Create and start SQS consumer
        const consumer = new SQSConsumer(
            config.TRANSCODE_QUEUE_URL,
            handleTranscodeMessage,
            {
                maxMessages: 1, // Process one transcode job at a time
                waitTimeSeconds: 20, // Long polling
                visibilityTimeout: 600, // 10 minutes for transcoding
                pollingInterval: 1000 // 1 second between polls
            }
        );

        // Handle graceful shutdown
        const shutdown = async (signal) => {
            console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
            await consumer.stop();
            console.log('✅ Worker stopped');
            process.exit(0);
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

        // Start consuming messages
        await consumer.start();

    } catch (error) {
        console.error('❌ Failed to start worker:', error);
        process.exit(1);
    }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start the worker
startWorker();
