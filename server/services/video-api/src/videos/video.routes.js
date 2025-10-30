import express from 'express';
import { z } from 'zod';
import { authenticate } from '../../../../shared/auth/middleware.js';
import asyncHandler from '../../../../shared/utils/asyncHandler.js';
import { validateBody } from '../../../../shared/utils/validate.js';
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

// Validation schemas
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

// Apply authentication to all routes
router.use(authenticate);

// Video routes
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
