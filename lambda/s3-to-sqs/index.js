import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const sqsClient = new SQSClient({ region: process.env.AWS_REGION || 'ap-southeast-2' });
const TRANSCODE_QUEUE_URL = process.env.TRANSCODE_QUEUE_URL;

/**
 * Lambda handler for S3 events
 * Triggered when a video is uploaded to S3 (raw/ prefix)
 * Sends a transcode job message to SQS queue
 */
export const handler = async (event) => {
    console.log('📨 Received S3 event:', JSON.stringify(event, null, 2));

    if (!TRANSCODE_QUEUE_URL) {
        console.error('❌ TRANSCODE_QUEUE_URL environment variable is not set');
        throw new Error('TRANSCODE_QUEUE_URL is required');
    }

    const results = [];

    // Process each S3 record in the event
    for (const record of event.Records) {
        try {
            // Extract S3 event details
            const eventName = record.eventName;
            const bucket = record.s3.bucket.name;
            const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
            const size = record.s3.object.size;

            console.log(`📦 Processing S3 event: ${eventName}`);
            console.log(`   Bucket: ${bucket}`);
            console.log(`   Key: ${key}`);
            console.log(`   Size: ${size} bytes`);

            // Only process ObjectCreated events
            if (!eventName.startsWith('ObjectCreated:')) {
                console.log(`⏭️  Skipping non-creation event: ${eventName}`);
                continue;
            }

            // Only process files in raw/ prefix
            if (!key.startsWith('raw/')) {
                console.log(`⏭️  Skipping file outside raw/ prefix: ${key}`);
                continue;
            }

            // Only process video files
            const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv'];
            const hasVideoExtension = videoExtensions.some(ext => key.toLowerCase().endsWith(ext));

            if (!hasVideoExtension) {
                console.log(`⏭️  Skipping non-video file: ${key}`);
                continue;
            }

            // Extract userId from S3 key (raw/userId/filename.mp4)
            const pathParts = key.split('/');
            if (pathParts.length < 3) {
                console.error(`❌ Invalid S3 key format (expected raw/userId/filename): ${key}`);
                continue;
            }

            const userId = pathParts[1];

            // Extract or generate videoId
            // If the filename contains a UUID pattern, use it; otherwise generate one
            const filename = pathParts[pathParts.length - 1];
            const uuidMatch = filename.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
            const videoId = uuidMatch ? uuidMatch[1] : generateUUID();

            // Create transcode job message
            const transcodeJob = {
                userId,
                videoId,
                originalS3Key: key,
                resolution: '720p', // Default resolution
                bucket,
                fileSize: size,
                timestamp: new Date().toISOString(),
                eventName
            };

            console.log('📤 Sending transcode job to SQS:', JSON.stringify(transcodeJob, null, 2));

            // Send message to SQS
            const command = new SendMessageCommand({
                QueueUrl: TRANSCODE_QUEUE_URL,
                MessageBody: JSON.stringify(transcodeJob),
                MessageAttributes: {
                    userId: {
                        DataType: 'String',
                        StringValue: userId
                    },
                    videoId: {
                        DataType: 'String',
                        StringValue: videoId
                    },
                    resolution: {
                        DataType: 'String',
                        StringValue: '720p'
                    }
                }
            });

            const response = await sqsClient.send(command);

            console.log(`✅ Message sent to SQS. MessageId: ${response.MessageId}`);

            results.push({
                key,
                status: 'queued',
                messageId: response.MessageId
            });

        } catch (error) {
            console.error(`❌ Error processing record:`, error);
            results.push({
                key: record.s3?.object?.key || 'unknown',
                status: 'error',
                error: error.message
            });
            // Continue processing other records even if one fails
        }
    }

    console.log(`📊 Processed ${event.Records.length} record(s), ${results.filter(r => r.status === 'queued').length} queued`);

    return {
        statusCode: 200,
        body: JSON.stringify({
            message: 'S3 events processed',
            results
        })
    };
};

/**
 * Simple UUID v4 generator (fallback if not extracted from filename)
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
