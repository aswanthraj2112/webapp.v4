#!/usr/bin/env node
import { listVideos, getVideo } from './src/videos/video.repo.js';

async function listAllVideos() {
    console.log('🔍 Fetching videos from DynamoDB...\n');

    try {
        // Try to get videos for the known user from logs
        const testUserId = 'd9be34c8-f031-70a2-8508-c5c5d4965f6c';
        const userVideos = await listVideos(testUserId, 1, 10);

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

            // Test with the first video
            const testVideo = userVideos.items[0];
            console.log(`\n🧪 Test Video Found:`);
            console.log(`   Video ID: ${testVideo.id}`);
            console.log(`   Owner ID: ${testVideo.ownerId}`);
            console.log(`   S3 Key: ${testVideo.storedFilename}`);

            // If we have a video with an S3 key, we can test transcoding
            if (testVideo.storedFilename) {
                console.log(`\n✅ Video ready for transcoding test!`);
                console.log(`   Use these parameters:`);
                console.log(`   userId: "${testVideo.ownerId}"`);
                console.log(`   videoId: "${testVideo.id}"`);
                console.log(`   originalS3Key: "${testVideo.storedFilename}"`);
            }

            return testVideo;
        } else {
            console.log('📭 No videos found for this user');
        }

    } catch (error) {
        console.error('❌ Error fetching videos:', error);
    }
}

listAllVideos().catch(console.error);