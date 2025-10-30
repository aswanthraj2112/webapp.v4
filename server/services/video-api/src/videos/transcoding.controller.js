import {
    transcodeVideoToResolution,
    isSupportedResolution,
    getAvailableResolutions
} from './transcoding.service.js';
import { fetchVideoMetadata } from './video.service.js';
import { AppError } from '../../../../shared/utils/errors.js';

/**
 * Start transcoding a video to a specific resolution
 * POST /api/videos/:id/transcode
 */
export const startTranscoding = async (req, res) => {
    console.log(`🎬 TRANSCODE START: Called with videoId=${req.params.id}, body=`, req.body);

    const { resolution = '720p' } = req.body;
    const { id: videoId } = req.params;
    const userId = req.user.sub;

    console.log(`🎬 TRANSCODE: userId=${userId}, videoId=${videoId}, resolution=${resolution}`);

    // Validate resolution
    if (!isSupportedResolution(resolution)) {
        throw new AppError(`Unsupported resolution: ${resolution}. Supported: ${getAvailableResolutions().join(', ')}`, 400);
    }

    try {
        // Get video metadata to check if it exists and get S3 key
        const video = await fetchVideoMetadata({ userId, videoId });

        if (!video.storedFilename) {
            throw new AppError('Video file not found', 404);
        }

        if (video.status === 'transcoding') {
            throw new AppError('Video is already being transcoded', 409);
        }

        // Start transcoding in the background
        console.log(`🎬 Starting transcoding for video ${videoId} to ${resolution}`);
        transcodeVideoToResolution({
            userId,
            videoId,
            originalS3Key: video.storedFilename,
            resolution
        }).catch(error => {
            console.error(`Background transcoding failed for video ${videoId}:`, error);
        });

        res.status(202).json({
            message: 'Transcoding started',
            videoId,
            resolution,
            status: 'transcoding'
        });

    } catch (error) {
        console.error('Transcoding start error:', error);
        throw error;
    }
};

/**
 * Get transcoding status for a video
 * GET /api/videos/:id/transcoding-status
 */
export const getTranscodingStatus = async (req, res) => {
    const { id: videoId } = req.params;
    const userId = req.user.sub;

    console.log(`🔍 getTranscodingStatus: userId=${userId}, videoId=${videoId}`);

    const video = await fetchVideoMetadata({ userId, videoId });

    res.json({
        videoId,
        status: video.status,
        transcodingProgress: video.transcodingProgress || 0,
        hasTranscodedVersion: !!video.transcodedFilename,
        hasThumbnail: !!video.thumbPath,
        resolution: video.width && video.height ? `${video.width}x${video.height}` : null
    });
};

/**
 * Get available transcoding resolutions
 * GET /api/videos/transcoding/resolutions
 */
export const getAvailableTranscodingResolutions = async (req, res) => {
    res.json({
        resolutions: getAvailableResolutions().map(resolution => ({
            value: resolution,
            label: resolution.toUpperCase(),
            dimensions: resolution === '720p' ? '1280x720' : '1920x1080'
        }))
    });
};
