import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
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

  // Generate thumbnail immediately after upload
  let thumbPath = null;
  try {
    console.log(`🖼️ Generating thumbnail for video ${videoId}...`);
    const thumbnailResult = await generateThumbnailForUpload(s3Key, userId, videoId);
    thumbPath = thumbnailResult.thumbS3Key;
    console.log(`✅ Thumbnail generated: ${thumbPath}`);
  } catch (error) {
    console.error(`❌ Failed to generate thumbnail for ${videoId}:`, error.message);
    // Continue without thumbnail - don't fail the upload
  }

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
    thumbPath: thumbPath,
    transcodedFilename: null,
    createdAt: now,
    updatedAt: now
  });
}

export async function fetchVideosForUser({ userId, page, limit }) {
  const { total, items } = await repoListVideos(String(userId), page, limit);
  return { total, items: items.map(mapVideo) };
}

export async function fetchAllVideos({ page, limit }) {
  // This function requires a new repo method to get all videos
  // For now, we'll implement it by getting all users' videos
  const { repoListAllVideos } = await import('./video.repo.js');
  const { total, items } = await repoListAllVideos(page, limit);
  return { total, items: items.map(mapVideo) };
}

export async function fetchVideoMetadata({ userId, videoId }) {
  console.log(`🔍 fetchVideoMetadata: userId=${userId}, videoId=${videoId}`);
  const video = await repoGetVideo(String(userId), videoId);
  console.log(`🔍 fetchVideoMetadata result:`, video ? 'found' : 'NOT FOUND');
  if (!video) {
    throw new NotFoundError('Video not found');
  }
  return mapVideo(video);
}

export async function createStreamUrl({ userId, videoId, variant, download }) {
  const video = await fetchVideoMetadata({ userId, videoId });

  let key;
  if (variant === 'transcoded') {
    key = video.transcodedFilename;
    if (!key) {
      throw new NotFoundError('Transcoded video not available. Please transcode the video first.');
    }
  } else if (variant === 'thumbnail') {
    key = video.thumbPath;
    if (!key) {
      throw new NotFoundError('Thumbnail not available');
    }
  } else {
    key = video.storedFilename;
  }

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

async function generateThumbnailForUpload(videoS3Key, userId, videoId) {
  const { generateThumbnail, uploadVideoToS3 } = await import('./transcoding.service.js');

  // Generate thumbnail filename
  const thumbS3Key = `thumbs/${userId}/${videoId}_thumb.jpg`;

  // Download video, generate thumbnail, upload to S3
  const tempDir = `/tmp/thumbnail_${Date.now()}`;
  await fs.mkdir(tempDir, { recursive: true });

  try {
    console.log(`🔍 Downloading video from S3: ${videoS3Key}`);

    // Download the video file
    const videoPath = path.join(tempDir, 'input.mp4');
    const command = new GetObjectCommand({
      Bucket: config.S3_BUCKET,
      Key: videoS3Key
    });

    const response = await s3.send(command);
    await writeS3BodyToFile(response.Body, videoPath);

    console.log(`🎬 Video downloaded, generating thumbnail...`);

    // Generate thumbnail (specify full output path)
    const thumbPath = path.join(tempDir, 'thumbnail.jpg');
    await generateThumbnail(videoPath, thumbPath);

    console.log(`📤 Uploading thumbnail to S3: ${thumbS3Key}`);

    // Upload thumbnail to S3
    await uploadVideoToS3(thumbPath, thumbS3Key, 'image/jpeg');

    console.log(`✅ Thumbnail successfully generated and uploaded`);
    return { thumbS3Key };
  } catch (error) {
    console.error(`❌ Error in thumbnail generation:`, error);
    throw error;
  } finally {
    // Cleanup temp directory
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => { });
  }
}

async function writeS3BodyToFile(body, destinationPath) {
  if (!body) {
    throw new AppError('Received empty response when downloading from storage', 500);
  }

  if (typeof body.transformToByteArray === 'function') {
    const bytes = await body.transformToByteArray();
    await fs.writeFile(destinationPath, Buffer.from(bytes));
    return;
  }

  if (typeof body.arrayBuffer === 'function') {
    const buffer = await body.arrayBuffer();
    await fs.writeFile(destinationPath, Buffer.from(buffer));
    return;
  }

  if (Buffer.isBuffer(body) || body instanceof Uint8Array) {
    await fs.writeFile(destinationPath, Buffer.from(body));
    return;
  }

  if (typeof body[Symbol.asyncIterator] !== 'function') {
    throw new AppError('Unsupported response stream type received from storage', 500);
  }

  // Fallback for runtimes where transform helpers are unavailable
  const chunks = [];
  for await (const chunk of body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  await fs.writeFile(destinationPath, Buffer.concat(chunks));
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

export async function removeVideoAsAdmin({ userId, videoId }) {
  // Admin can delete any user's video without ownership check
  const video = await fetchVideoMetadata({ userId, videoId });
  await Promise.all([
    deleteIfExists(video.storedFilename),
    deleteIfExists(video.thumbPath),
    deleteIfExists(video.transcodedFilename)
  ]);
  await repoDeleteVideo(String(userId), videoId);
}
