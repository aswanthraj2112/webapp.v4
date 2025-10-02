import express from 'express';
import { z } from 'zod';
import authMiddleware from '../auth/auth.middleware.js';
import asyncHandler from '../utils/asyncHandler.js';
import { validateBody } from '../utils/validate.js';
import {
  createUploadSession,
  finalizeUpload,
  listUserVideos,
  getVideoMetadata,
  getVideoStream,
  deleteVideo
} from './video.controller.js';
import {
  startTranscoding,
  getTranscodingStatus,
  getAvailableTranscodingResolutions
} from './transcoding.controller.js';

const router = express.Router();

const initiateSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().min(1)
});

const finalizeSchema = z.object({
  videoId: z.string().min(1),
  originalName: z.string().min(1),
  s3Key: z.string().min(1),
  sizeBytes: z.number().int().nonnegative().optional(),
  durationSeconds: z.number().nonnegative().optional(),
  contentType: z.string().optional()
});

const transcodingSchema = z.object({
  resolution: z.enum(['720p', '1080p'])
});

router.use(authMiddleware);

router.post('/presign', validateBody(initiateSchema), asyncHandler(createUploadSession));
router.post('/finalize', validateBody(finalizeSchema), asyncHandler(finalizeUpload));
router.get('/', asyncHandler(listUserVideos));
router.get('/:id', asyncHandler(getVideoMetadata));
router.get('/:id/stream', asyncHandler(getVideoStream));
router.delete('/:id', asyncHandler(deleteVideo));

// Transcoding routes
router.get('/transcoding/resolutions', asyncHandler(getAvailableTranscodingResolutions));
router.post('/:id/transcode', validateBody(transcodingSchema), asyncHandler(startTranscoding));
router.get('/:id/transcoding-status', asyncHandler(getTranscodingStatus));

export default router;
