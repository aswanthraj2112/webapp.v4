import ffmpeg from 'fluent-ffmpeg';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { createReadStream, unlinkSync, renameSync, mkdirSync, existsSync } from 'fs';
import { writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { randomUUID } from 'crypto';
import config from '../../../shared/config/index.js';
import { AppError } from '../../../shared/utils/errors.js';
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
        await writeS3BodyToFile(response.Body, tempFilePath);
        return tempFilePath;
    } catch (error) {
        console.error('Failed to download video from S3:', error);
        throw new AppError('Failed to download video for transcoding', 500);
    }
}

async function writeS3BodyToFile(body, destinationPath) {
    if (!body) {
        throw new AppError('Received empty response when downloading from storage', 500);
    }

    if (typeof body.transformToByteArray === 'function') {
        const bytes = await body.transformToByteArray();
        await writeFile(destinationPath, Buffer.from(bytes));
        return;
    }

    if (typeof body.arrayBuffer === 'function') {
        const buffer = await body.arrayBuffer();
        await writeFile(destinationPath, Buffer.from(buffer));
        return;
    }

    if (Buffer.isBuffer(body) || body instanceof Uint8Array) {
        await writeFile(destinationPath, Buffer.from(body));
        return;
    }

    if (typeof body[Symbol.asyncIterator] !== 'function') {
        throw new AppError('Unsupported response stream type received from storage', 500);
    }

    const chunks = [];
    for await (const chunk of body) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    await writeFile(destinationPath, Buffer.concat(chunks));
}

/**
 * Upload transcoded video to S3
 */
async function uploadVideoToS3(filePath, s3Key, contentType = 'video/mp4') {
    try {
        const fileStream = createReadStream(filePath);

        const command = new PutObjectCommand({
            Bucket: config.S3_BUCKET,
            Key: s3Key,
            Body: fileStream,
            ContentType: contentType
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

    // Ensure output directory exists
    const outputDir = dirname(outputPath);
    if (!existsSync(outputDir)) {
        try {
            mkdirSync(outputDir, { recursive: true });
        } catch (error) {
            console.error('Failed to create transcoding output directory:', error);
            throw new AppError(`Failed to create output directory: ${error.message}`, 500);
        }
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
                '-movflags +faststart',
                '-y'
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
        const outputDir = dirname(outputPath);
        if (!existsSync(outputDir)) {
            try {
                mkdirSync(outputDir, { recursive: true });
            } catch (error) {
                console.error('Failed to create thumbnail output directory:', error);
                reject(new AppError(`Failed to create output directory: ${error.message}`, 500));
                return;
            }
        }

        console.log(`🖼️ Generating thumbnail: ${inputPath} -> ${outputPath}`);

        ffmpeg(inputPath)
            .seekInput(5)
            .frames(1)
            .size('320x240')
            .format('image2')
            .outputOptions(['-y'])
            .on('start', (commandLine) => {
                console.log('🎬 Starting thumbnail generation:', commandLine);
            })
            .on('end', () => {
                console.log('✅ Thumbnail generation completed successfully');
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error('❌ Thumbnail generation failed:', err);
                reject(new AppError(`Thumbnail generation failed: ${err.message}`, 500));
            })
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
 * Main transcoding function - processes transcode job from SQS
 */
export async function processTranscodeJob(job) {
    const { userId, videoId, originalS3Key, resolution } = job;
    const tempDir = tmpdir();
    const sessionId = randomUUID();
    const inputFile = join(tempDir, `input-${sessionId}.mp4`);
    const outputFile = join(tempDir, `output-${sessionId}.mp4`);
    const thumbFile = join(tempDir, `thumb-${sessionId}.jpg`);

    try {
        console.log('🎬 ════════════════════════════════════════════════════════');
        console.log(`   TRANSCODING JOB STARTED`);
        console.log('   ════════════════════════════════════════════════════════');
        console.log(`   Video ID:    ${videoId}`);
        console.log(`   User ID:     ${userId}`);
        console.log(`   Resolution:  ${resolution}`);
        console.log(`   S3 Key:      ${originalS3Key}`);
        console.log('   ════════════════════════════════════════════════════════');

        // Ensure temp directory exists
        if (!existsSync(tempDir)) {
            console.log(`📁 Creating temp directory: ${tempDir}`);
            mkdirSync(tempDir, { recursive: true });
        }

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
        console.log('📊 Extracting video metadata...');
        const metadata = await getVideoMetadata(inputFile);

        // Generate S3 keys for transcoded files
        const transcodedS3Key = originalS3Key.replace('raw/', `transcoded/${resolution}/`);
        const thumbS3Key = originalS3Key.replace('raw/', 'thumbs/').replace(/\.[^.]+$/, '.jpg');

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
            uploadVideoToS3(thumbFile, thumbS3Key, 'image/jpeg')
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

        console.log('✅ ════════════════════════════════════════════════════════');
        console.log(`   TRANSCODING JOB COMPLETED`);
        console.log('   ════════════════════════════════════════════════════════');

        return {
            success: true,
            transcodedS3Key,
            thumbS3Key,
            resolution,
            metadata
        };

    } catch (error) {
        console.error('❌ ════════════════════════════════════════════════════════');
        console.error(`   TRANSCODING JOB FAILED`);
        console.error('   ════════════════════════════════════════════════════════');
        console.error(`   Error: ${error.message}`);
        console.error('   ════════════════════════════════════════════════════════');

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
                if (existsSync(file)) {
                    unlinkSync(file);
                }
            } catch (e) {
                // Ignore cleanup errors
            }
        });
    }
}
