import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import config from '../../../shared/config/index.js';

const sqsClient = new SQSClient({ region: config.AWS_REGION });

class SQSConsumer {
    constructor(queueUrl, messageHandler, options = {}) {
        this.queueUrl = queueUrl;
        this.messageHandler = messageHandler;
        this.isRunning = false;
        this.pollingInterval = options.pollingInterval || 1000; // 1 second
        this.maxMessages = options.maxMessages || 1; // Process 1 message at a time
        this.waitTimeSeconds = options.waitTimeSeconds || 20; // Long polling
        this.visibilityTimeout = options.visibilityTimeout || 300; // 5 minutes
    }

    async start() {
        if (this.isRunning) {
            console.warn('⚠️  Consumer is already running');
            return;
        }

        this.isRunning = true;
        console.log('🚀 Starting SQS consumer...');
        console.log(`   Queue: ${this.queueUrl}`);
        console.log(`   Max messages: ${this.maxMessages}`);
        console.log(`   Wait time: ${this.waitTimeSeconds}s`);
        console.log(`   Visibility timeout: ${this.visibilityTimeout}s`);

        this.poll();
    }

    async stop() {
        console.log('🛑 Stopping SQS consumer...');
        this.isRunning = false;
    }

    async poll() {
        while (this.isRunning) {
            try {
                await this.receiveAndProcessMessages();
            } catch (error) {
                console.error('❌ Error in polling loop:', error);
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, this.pollingInterval));
            }
        }
    }

    async receiveAndProcessMessages() {
        try {
            const command = new ReceiveMessageCommand({
                QueueUrl: this.queueUrl,
                MaxNumberOfMessages: this.maxMessages,
                WaitTimeSeconds: this.waitTimeSeconds,
                VisibilityTimeout: this.visibilityTimeout,
                MessageAttributeNames: ['All']
            });

            const response = await sqsClient.send(command);
            const messages = response.Messages || [];

            if (messages.length === 0) {
                // No messages, continue polling
                return;
            }

            console.log(`📬 Received ${messages.length} message(s) from queue`);

            // Process messages sequentially
            for (const message of messages) {
                await this.processMessage(message);
            }
        } catch (error) {
            console.error('❌ Error receiving messages from SQS:', error);
            throw error;
        }
    }

    async processMessage(message) {
        const messageId = message.MessageId;
        const receiptHandle = message.ReceiptHandle;

        try {
            console.log(`⚙️  Processing message: ${messageId}`);

            // Parse message body
            let messageBody;
            try {
                messageBody = JSON.parse(message.Body);
            } catch (parseError) {
                console.error('❌ Failed to parse message body:', parseError);
                // Delete unparseable messages
                await this.deleteMessage(receiptHandle);
                return;
            }

            // Call the message handler
            await this.messageHandler(messageBody, message);

            // Delete message from queue after successful processing
            await this.deleteMessage(receiptHandle);
            console.log(`✅ Message ${messageId} processed and deleted`);

        } catch (error) {
            console.error(`❌ Error processing message ${messageId}:`, error);
            // Message will become visible again after visibility timeout
            // and can be retried or sent to DLQ
        }
    }

    async deleteMessage(receiptHandle) {
        try {
            const command = new DeleteMessageCommand({
                QueueUrl: this.queueUrl,
                ReceiptHandle: receiptHandle
            });
            await sqsClient.send(command);
        } catch (error) {
            console.error('❌ Error deleting message from queue:', error);
            throw error;
        }
    }
}

export default SQSConsumer;
