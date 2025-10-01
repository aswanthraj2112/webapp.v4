import {
  createPresignedUpload,
  finalizeUploadedVideo,
  fetchVideosForUser,
  fetchVideoMetadata,
  createStreamUrl,
  removeVideoForUser
} from './video.service.js';
import { cacheGet, cacheSet } from '../cache/cache.client.js';
import config from '../config.js';

const buildCacheKey = (userId, version, page, limit) => `videos:${userId}:v${version}:p${page}:l${limit}`;
const versionKeyForUser = (userId) => `videos:${userId}:version`;

async function getCacheVersion(userId) {
  const versionKey = versionKeyForUser(userId);
  let version = await cacheGet(versionKey);
  if (!version) {
    version = Date.now().toString();
    await cacheSet(versionKey, version, 24 * 60 * 60);
  }
  return version;
}

async function invalidateUserCache(userId) {
  const versionKey = versionKeyForUser(userId);
  const newVersion = Date.now().toString();
  await cacheSet(versionKey, newVersion, 24 * 60 * 60);
}

export const createUploadSession = async (req, res) => {
  const { fileName, contentType } = req.validatedBody;
  const session = await createPresignedUpload({
    userId: req.user.sub,
    fileName,
    contentType
  });
  res.status(201).json(session);
};

export const finalizeUpload = async (req, res) => {
  const payload = req.validatedBody;
  await finalizeUploadedVideo({
    ...payload,
    userId: req.user.sub
  });
  await invalidateUserCache(req.user.sub);
  res.status(201).json({ message: 'Upload finalized' });
};

export const listUserVideos = async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page || '1', 10));
  const rawLimit = Number.parseInt(req.query.limit || '10', 10);
  const limit = Math.min(Math.max(rawLimit || 10, 1), 50);
  const version = await getCacheVersion(req.user.sub);
  const cacheKey = buildCacheKey(req.user.sub, version, page, limit);
  const cached = await cacheGet(cacheKey);
  if (cached) {
    return res.json({ ...cached, cached: true });
  }
  const data = await fetchVideosForUser({ userId: req.user.sub, page, limit });
  await cacheSet(cacheKey, data, config.CACHE_TTL_SECONDS);
  res.json({ ...data, cached: false });
};

export const getVideoMetadata = async (req, res) => {
  const video = await fetchVideoMetadata({ userId: req.user.sub, videoId: req.params.id });
  res.json({ video });
};

export const getVideoStream = async (req, res) => {
  const variant = req.query.variant === 'transcoded' ? 'transcoded' : 'original';
  const url = await createStreamUrl({
    userId: req.user.sub,
    videoId: req.params.id,
    variant,
    download: req.query.download === '1' || req.query.download === 'true'
  });
  res.json({ url });
};

export const deleteVideo = async (req, res) => {
  await removeVideoForUser({ userId: req.user.sub, videoId: req.params.id });
  await invalidateUserCache(req.user.sub);
  res.status(204).send();
};
