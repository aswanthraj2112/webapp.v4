import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import config from '../../../../shared/config/index.js';
import { NotFoundError } from '../../../../shared/utils/errors.js';
import videoRepo from './video.repo.js';

const s3 = new S3Client({ region: config.AWS_REGION });

const mapVideo = (video) => ({
    ...video,
    sizeBytes: video.sizeBytes != null ? Number(video.sizeBytes) : null,
    durationSec: video.durationSec != null ? Number(video.durationSec) : null
});

async function deleteIfExists(key) {
    if (!key) return;
    try {
        await s3.send(new DeleteObjectCommand({ Bucket: config.S3_BUCKET, Key: key }));
    } catch (error) {
        console.warn(`⚠️  Failed to delete object ${key}:`, error.message);
    }
}

class VideoService {
    async fetchAllVideos({ page, limit }) {
        const { total, items } = await videoRepo.listAllVideos(page, limit);
        return { total, items: items.map(mapVideo) };
    }

    async fetchVideoMetadata({ userId, videoId }) {
        console.log(`🔍 fetchVideoMetadata: userId=${userId}, videoId=${videoId}`);
        const video = await videoRepo.getVideo(String(userId), videoId);
        console.log(`🔍 fetchVideoMetadata result:`, video ? 'found' : 'NOT FOUND');
        if (!video) {
            throw new NotFoundError('Video not found');
        }
        return mapVideo(video);
    }

    async removeVideoAsAdmin({ userId, videoId }) {
        const video = await this.fetchVideoMetadata({ userId, videoId });
        await Promise.all([
            deleteIfExists(video.storedFilename),
            deleteIfExists(video.thumbPath),
            deleteIfExists(video.transcodedFilename)
        ]);
        await videoRepo.deleteVideo(String(userId), videoId);
    }
}

export default new VideoService();
