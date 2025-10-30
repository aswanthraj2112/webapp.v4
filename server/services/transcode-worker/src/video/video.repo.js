import { randomUUID } from 'crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { loadDynamoConfig } from '../config/config.dynamo.js';

const { REGION, TABLE } = await loadDynamoConfig();
const client = new DynamoDBClient({ region: REGION });
const ddb = DynamoDBDocumentClient.from(client);

const attributeMap = {
    originalName: 'originalName',
    storedFilename: 'originalKey',
    thumbPath: 'thumbKey',
    transcodedFilename: 'transcodedKey',
    durationSec: 'duration',
    sizeBytes: 'sizeBytes',
    width: 'width',
    height: 'height',
    format: 'format',
    status: 'status',
    transcodingProgress: 'transcodingProgress',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
};

const cleanUndefined = (obj) => {
    const copy = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
            copy[key] = value;
        }
    }
    return copy;
};

const fromItem = (item) => {
    if (!item) return null;
    return {
        id: item.videoId,
        userId: item.ownerId,
        originalName: item.originalName || item.title || '',
        storedFilename: item.originalKey,
        thumbPath: item.thumbKey || null,
        transcodedFilename: item.transcodedKey || null,
        durationSec: item.duration ?? null,
        format: item.format ?? null,
        width: item.width ?? null,
        height: item.height ?? null,
        sizeBytes: item.sizeBytes ?? null,
        status: item.status || 'uploaded',
        transcodingProgress: item.transcodingProgress ?? null,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
    };
};

export async function getVideo(userId, videoId) {
    const { Item } = await ddb.send(new GetCommand({
        TableName: TABLE,
        Key: {
            ownerId: String(userId),
            videoId: String(videoId)
        }
    }));
    return fromItem(Item);
}

export async function updateVideo(userId, videoId, updates) {
    const updateEntries = Object.entries(updates || {});
    if (updateEntries.length === 0) {
        return getVideo(userId, videoId);
    }

    if (!('updatedAt' in updates)) {
        updates.updatedAt = new Date().toISOString();
    }

    const exprNames = {};
    const exprValues = {};
    const setExprs = [];

    for (const [key, value] of Object.entries(updates)) {
        const attr = attributeMap[key] || key;
        exprNames[`#${attr}`] = attr;
        exprValues[`:${attr}`] = value;
        setExprs.push(`#${attr} = :${attr}`);
    }

    const { Attributes } = await ddb.send(new UpdateCommand({
        TableName: TABLE,
        Key: { ownerId: String(userId), videoId: String(videoId) },
        UpdateExpression: `SET ${setExprs.join(', ')}`,
        ExpressionAttributeNames: exprNames,
        ExpressionAttributeValues: cleanUndefined(exprValues),
        ReturnValues: 'ALL_NEW'
    }));

    return fromItem(Attributes);
}

export async function updateVideoTranscoding(userId, videoId, transcodingData) {
    return updateVideo(userId, videoId, {
        ...transcodingData,
        updatedAt: new Date().toISOString()
    });
}
