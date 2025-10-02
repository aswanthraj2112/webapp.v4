import { randomUUID } from 'crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand, QueryCommand, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { loadDynamoConfig } from '../config.dynamo.js';

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

const toItem = (video) => {
  const now = new Date().toISOString();
  const videoId = video.id || randomUUID();
  return cleanUndefined({
    ownerId: String(video.userId),
    videoId,
    originalName: video.originalName,
    title: video.originalName,
    status: video.status || 'uploaded',
    originalKey: video.storedFilename,
    transcodedKey: video.transcodedFilename || null,
    thumbKey: video.thumbPath || null,
    duration: video.durationSec ?? null,
    format: video.format ?? null,
    width: video.width ?? null,
    height: video.height ?? null,
    sizeBytes: video.sizeBytes ?? null,
    transcodingProgress: video.transcodingProgress ?? null,
    createdAt: video.createdAt || now,
    updatedAt: video.updatedAt || now
  });
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

export async function createVideo(video) {
  const item = toItem(video);
  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: item
  }));
  return fromItem(item);
}

export async function getVideo(userId, videoId) {
  const { Item } = await ddb.send(new GetCommand({
    TableName: TABLE,
    Key: {
      ownerId: String(userId),
      videoId: String(videoId)
    }
  }));
  return fromItem(Item);
} export async function listVideos(userId, page = 1, limit = 10) {
  const { Items = [] } = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'ownerId = :o',
    ExpressionAttributeValues: { ':o': String(userId) }
  }));
  const mapped = Items.map(fromItem)
    .filter(Boolean)
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  const total = mapped.length;
  const offset = Math.max(0, (page - 1) * limit);
  const items = mapped.slice(offset, offset + limit);
  return { total, items };
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

export async function deleteVideo(userId, videoId) {
  await ddb.send(new DeleteCommand({
    TableName: TABLE,
    Key: { ownerId: String(userId), videoId: String(videoId) }
  }));
}

export async function updateVideoTranscoding(userId, videoId, transcodingData) {
  return updateVideo(userId, videoId, {
    ...transcodingData,
    updatedAt: new Date().toISOString()
  });
}

export async function listAllVideos(page = 1, limit = 10) {
  // DynamoDB doesn't support scanning all items efficiently across partitions
  // For admin purposes, we'll use a scan operation (note: this is expensive for large datasets)
  const scanLimit = Math.min(limit, 100); // Cap at 100 for performance
  const startKey = page > 1 ? undefined : undefined; // Simplified pagination

  try {
    const params = {
      TableName: TABLE,
      Limit: scanLimit
    };

    const result = await ddb.send(new ScanCommand(params));
    const items = (result.Items || []).map(fromItem);

    return {
      total: result.Count || 0, // Note: This is not the total count, just current page count
      items
    };
  } catch (error) {
    console.error('Error scanning all videos:', error);
    throw error;
  }
}
