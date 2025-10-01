#!/usr/bin/env node

import { DynamoDBClient, CreateTableCommand } from '@aws-sdk/client-dynamodb';

const REGION = 'ap-southeast-2';
const TABLE_NAME = 'n11817143-VideoApp';

const client = new DynamoDBClient({ region: REGION });

const createTableParams = {
    TableName: TABLE_NAME,
    KeySchema: [
        {
            AttributeName: 'ownerId',
            KeyType: 'HASH' // Partition key (qut-username)
        },
        {
            AttributeName: 'videoId',
            KeyType: 'RANGE' // Sort key (id)
        }
    ],
    AttributeDefinitions: [
        {
            AttributeName: 'ownerId',
            AttributeType: 'S'
        },
        {
            AttributeName: 'videoId',
            AttributeType: 'S'
        }
    ],
    BillingMode: 'PAY_PER_REQUEST',
    GlobalSecondaryIndexes: [
        {
            IndexName: 'OwnerIndex',
            KeySchema: [
                {
                    AttributeName: 'ownerId',
                    KeyType: 'HASH'
                }
            ],
            Projection: {
                ProjectionType: 'ALL'
            }
        }
    ]
};

async function createTable() {
    try {
        console.log('Creating DynamoDB table:', TABLE_NAME);
        const result = await client.send(new CreateTableCommand(createTableParams));
        console.log('✅ Table creation initiated successfully');
        console.log('Table ARN:', result.TableDescription.TableArn);
        console.log('Table Status:', result.TableDescription.TableStatus);
        console.log('\n📋 Table Schema:');
        console.log('- Partition Key: ownerId (qut-username)');
        console.log('- Sort Key: videoId (id)');
        console.log('- Global Secondary Index: OwnerIndex');
        console.log('\nWait for table to become ACTIVE before using it...');
    } catch (error) {
        console.error('❌ Error creating table:', error.message);
        process.exit(1);
    }
}

createTable();