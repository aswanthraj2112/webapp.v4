#!/usr/bin/env node
import { loadRepo } from './src/videos/video.repo.js';

async function listAllVideos() {
    console.log('🔍 Fetching all videos from DynamoDB...\n');

    try {
        const repo = await loadRepo();

        // Try to get a specific user's videos first
        const testUserId = 'd9be34c8-f031-70a2-8508-c5c5d4965f6c'; // From the logs
        const userVideos = await repo.getUserVideos(testUserId, 1, 10);

        if (userVideos && userVideos.items && userVideos.items.length > 0) {
            console.log(`📋 Found ${userVideos.items.length} videos for user ${testUserId}:`);
            userVideos.items.forEach((video, index) => {
                console.log(`\n${index + 1}. Video ID: ${video.id}`);
                console.log(`   Owner: ${video.ownerId}`);
                console.log(`   Original Name: ${video.originalName}`);
                console.log(`   Status: ${video.status}`);
                console.log(`   Stored Filename: ${video.storedFilename || 'Not set'}`);
                console.log(`   Transcoded: ${video.transcodedFilename || 'Not transcoded'}`);
                console.log(`   Thumbnail: ${video.thumbPath || 'No thumbnail'}`);
            });

            // Return the first video for testing
            const testVideo = userVideos.items[0];
            console.log(`\n🧪 Test Video Found:`);
            console.log(`   Video ID: ${testVideo.id}`);
            console.log(`   Owner ID: ${testVideo.ownerId}`);
            console.log(`   S3 Key: ${testVideo.storedFilename}`);

            return testVideo;
        } else {
            console.log('📭 No videos found for this user');
        }

    } catch (error) {
        console.error('❌ Error fetching videos:', error);
    }
}

listAllVideos().catch(console.error);