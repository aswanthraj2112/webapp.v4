import { randomUUID } from 'crypto';
import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import mime from 'mime-types';
import config from '../config.js';
import { AppError, NotFoundError } from '../utils/errors.js';
import {
  createVideo as repoCreateVideo,
  listVideos as repoListVideos,
  getVideo as repoGetVideo,
  deleteVideo as repoDeleteVideo
} from './video.repo.js';

const s3 = new S3Client({ region: config.AWS_REGION });

const ensurePrefix = (value) => (value.endsWith('/') ? value : `${value}/`);
const RAW_PREFIX = ensurePrefix(config.S3_RAW_PREFIX);

function sanitiseFileName(name) {
  return name.replace(/[^a-zA-Z0-9_.-]+/g, '-');
}

function buildKey({ userId, fileName }) {
  const cleanName = sanitiseFileName(fileName || 'video.mp4');
  const unique = `${Date.now()}-${randomUUID()}`;
  return `${RAW_PREFIX}${userId}/${unique}-${cleanName}`;
}

const mapVideo = (video) => ({
  ...video,
  sizeBytes: video.sizeBytes != null ? Number(video.sizeBytes) : null,
  durationSec: video.durationSec != null ? Number(video.durationSec) : null
});

export async function createPresignedUpload({ userId, fileName, contentType }) {
  if (!config.S3_BUCKET) {
    throw new AppError('Storage bucket not configured', 500);
  }

  const key = buildKey({ userId, fileName });
  const command = new PutObjectCommand({
    Bucket: config.S3_BUCKET,
    Key: key,
    ContentType: contentType || mime.lookup(fileName) || 'application/octet-stream',
    Metadata: { ownerId: userId }
  });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: config.PRESIGNED_URL_TTL });
  return {
    videoId: randomUUID(),
    uploadUrl,
    s3Key: key,
    bucket: config.S3_BUCKET,
    expiresIn: config.PRESIGNED_URL_TTL
  };
}

async function ensureObjectExists(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: config.S3_BUCKET, Key: key }));
  } catch (error) {
    if (error?.$metadata?.httpStatusCode === 404 || error?.name === 'NotFound') {
      throw new NotFoundError('Uploaded object not found in storage');
    }
    throw new AppError('Failed to validate uploaded object', 500);
  }
}

export async function finalizeUploadedVideo({ userId, videoId, originalName, s3Key, sizeBytes, durationSeconds, contentType }) {
  if (!s3Key) {
    throw new AppError('Missing storage key for uploaded object', 400);
  }

  await ensureObjectExists(s3Key);

  const now = new Date().toISOString();
  await repoCreateVideo({
    id: videoId || randomUUID(),
    userId: String(userId),
    originalName,
    storedFilename: s3Key,
    status: 'uploaded',
    sizeBytes: sizeBytes ?? null,
    durationSec: durationSeconds ?? null,
    format: contentType || mime.lookup(originalName) || 'video/mp4',
    thumbPath: null,
    transcodedFilename: null,
    createdAt: now,
    updatedAt: now
  });
}

export async function fetchVideosForUser({ userId, page, limit }) {
  const { total, items } = await repoListVideos(String(userId), page, limit);
  return { total, items: items.map(mapVideo) };
}

export async function fetchVideoMetadata({ userId, videoId }) {
  const video = await repoGetVideo(String(userId), videoId);
  if (!video) {
    throw new NotFoundError('Video not found');
  }
  return mapVideo(video);
}

export async function createStreamUrl({ userId, videoId, variant, download }) {
  const video = await fetchVideoMetadata({ userId, videoId });
  const key = variant === 'transcoded' ? video.transcodedFilename : video.storedFilename;
  if (!key) {
    throw new NotFoundError('Video file not available');
  }

  await ensureObjectExists(key);

  const command = new GetObjectCommand({
    Bucket: config.S3_BUCKET,
    Key: key,
    ...(download ? { ResponseContentDisposition: `attachment; filename="${sanitiseFileName(video.originalName || 'video.mp4')}"` } : {})
  });

  const url = await getSignedUrl(s3, command, { expiresIn: config.PRESIGNED_URL_TTL });
  return url;
}

async function deleteIfExists(key) {
  if (!key) return;
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: config.S3_BUCKET, Key: key }));
  } catch (error) {
    console.warn(`⚠️  Failed to delete object ${key}:`, error.message);
  }
}

export async function removeVideoForUser({ userId, videoId }) {
  const video = await fetchVideoMetadata({ userId, videoId });
  await Promise.all([
    deleteIfExists(video.storedFilename),
    deleteIfExists(video.thumbPath),
    deleteIfExists(video.transcodedFilename)
  ]);
  await repoDeleteVideo(String(userId), videoId);
}
