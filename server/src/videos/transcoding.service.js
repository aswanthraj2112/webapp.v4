import ffmpeg from 'fluent-ffmpeg';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { createWriteStream, createReadStream, unlinkSync, renameSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
import config from '../config.js';
import { AppError } from '../utils/errors.js';
import { updateVideoTranscoding } from './video.repo.js';

const s3 = new S3Client({ region: config.AWS_REGION });

// Resolution presets
const RESOLUTION_PRESETS = {
    '720p': {
        width: 1280,
        height: 720,
        videoBitrate: '2500k',
        audioBitrate: '128k'
    },
    '1080p': {
        width: 1920,
        height: 1080,
        videoBitrate: '4000k',
        audioBitrate: '192k'
    }
};

/**
 * Download video from S3 to local temp file
 */
async function downloadVideoFromS3(s3Key) {
    const tempFilePath = join(tmpdir(), `input-${randomUUID()}.mp4`);

    try {
        const command = new GetObjectCommand({
            Bucket: config.S3_BUCKET,
            Key: s3Key
        });

        const response = await s3.send(command);
        const writeStream = createWriteStream(tempFilePath);

        return new Promise((resolve, reject) => {
            response.Body.pipe(writeStream)
                .on('finish', () => resolve(tempFilePath))
                .on('error', reject);
        });
    } catch (error) {
        console.error('Failed to download video from S3:', error);
        throw new AppError('Failed to download video for transcoding', 500);
    }
}

/**
 * Upload transcoded video to S3
 */
async function uploadVideoToS3(filePath, s3Key) {
    try {
        const fileStream = createReadStream(filePath);

        const command = new PutObjectCommand({
            Bucket: config.S3_BUCKET,
            Key: s3Key,
            Body: fileStream,
            ContentType: 'video/mp4'
        });

        await s3.send(command);
        return s3Key;
    } catch (error) {
        console.error('Failed to upload transcoded video to S3:', error);
        throw new AppError('Failed to upload transcoded video', 500);
    }
}

/**
 * Transcode video using FFmpeg
 */
async function transcodeVideo(inputPath, outputPath, resolution) {
    const preset = RESOLUTION_PRESETS[resolution];
    if (!preset) {
        throw new AppError(`Unsupported resolution: ${resolution}`, 400);
    }

    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .videoCodec('libx264')
            .audioCodec('aac')
            .videoBitrate(preset.videoBitrate)
            .audioBitrate(preset.audioBitrate)
            .size(`${preset.width}x${preset.height}`)
            .format('mp4')
            .outputOptions([
                '-preset fast',
                '-crf 23',
                '-movflags +faststart' // Enable streaming
            ])
            .on('start', (commandLine) => {
                console.log('🎬 Starting transcoding:', commandLine);
            })
            .on('progress', (progress) => {
                console.log(`📈 Transcoding progress: ${Math.round(progress.percent || 0)}%`);
            })
            .on('end', () => {
                console.log('✅ Transcoding completed successfully');
                resolve();
            })
            .on('error', (err) => {
                console.error('❌ Transcoding failed:', err);
                reject(new AppError(`Transcoding failed: ${err.message}`, 500));
            })
            .save(outputPath);
    });
}

/**
 * Generate thumbnail from video
 */
async function generateThumbnail(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .seekInput(5) // Seek to 5 seconds to avoid black frames
            .frames(1)
            .size('320x240')
            .format('image2')
            .on('end', () => {
                resolve(outputPath);
            })
            .on('error', reject)
            .save(outputPath);
    });
}

/**
 * Get video metadata using FFmpeg
 */
async function getVideoMetadata(filePath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) {
                reject(err);
                return;
            }

            const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
            const duration = metadata.format.duration;

            resolve({
                duration: duration ? Math.round(duration) : null,
                width: videoStream?.width || null,
                height: videoStream?.height || null,
                format: metadata.format.format_name || null,
                size: metadata.format.size ? parseInt(metadata.format.size) : null
            });
        });
    });
}

/**
 * Main transcoding function
 */
export async function transcodeVideoToResolution({ userId, videoId, originalS3Key, resolution }) {
    const tempDir = tmpdir();
    const inputFile = join(tempDir, `input-${randomUUID()}.mp4`);
    const outputFile = join(tempDir, `output-${randomUUID()}.mp4`);
    const thumbFile = join(tempDir, `thumb-${randomUUID()}.jpg`);

    try {
        console.log(`🎬 Starting transcoding for video ${videoId} to ${resolution}`);

        // Update status to processing
        await updateVideoTranscoding(userId, videoId, {
            status: 'transcoding',
            transcodingProgress: 0
        });

        // Download original video
        console.log('📥 Downloading original video from S3...');
        const downloadedFile = await downloadVideoFromS3(originalS3Key);
        renameSync(downloadedFile, inputFile);

        // Get video metadata
        const metadata = await getVideoMetadata(inputFile);

        // Generate S3 keys for transcoded files
        const transcodedS3Key = originalS3Key.replace('/raw/', `/transcoded/${resolution}/`);
        const thumbS3Key = originalS3Key.replace('/raw/', '/thumbs/').replace(/\.[^.]+$/, '.jpg');

        // Transcode video
        console.log(`🔄 Transcoding to ${resolution}...`);
        await transcodeVideo(inputFile, outputFile, resolution);

        // Generate thumbnail
        console.log('🖼️ Generating thumbnail...');
        await generateThumbnail(inputFile, thumbFile);

        // Upload transcoded video and thumbnail
        console.log('📤 Uploading transcoded files to S3...');
        await Promise.all([
            uploadVideoToS3(outputFile, transcodedS3Key),
            uploadVideoToS3(thumbFile, thumbS3Key)
        ]);

        // Update database with transcoded file info
        await updateVideoTranscoding(userId, videoId, {
            status: 'transcoded',
            transcodedFilename: transcodedS3Key,
            thumbPath: thumbS3Key,
            transcodingProgress: 100,
            width: RESOLUTION_PRESETS[resolution].width,
            height: RESOLUTION_PRESETS[resolution].height,
            durationSec: metadata.duration
        });

        console.log(`✅ Transcoding completed for video ${videoId}`);

        return {
            transcodedS3Key,
            thumbS3Key,
            resolution,
            metadata
        };

    } catch (error) {
        console.error(`❌ Transcoding failed for video ${videoId}:`, error);

        // Update status to failed
        await updateVideoTranscoding(userId, videoId, {
            status: 'failed',
            transcodingProgress: 0
        });

        throw error;
    } finally {
        // Clean up temporary files
        const filesToClean = [inputFile, outputFile, thumbFile];
        filesToClean.forEach(file => {
            try {
                unlinkSync(file);
            } catch (e) {
                // Ignore cleanup errors
            }
        });
    }
}

/**
 * Check if a resolution is supported
 */
export function isSupportedResolution(resolution) {
    return Object.keys(RESOLUTION_PRESETS).includes(resolution);
}

/**
 * Get available resolutions
 */
export function getAvailableResolutions() {
    return Object.keys(RESOLUTION_PRESETS);
}