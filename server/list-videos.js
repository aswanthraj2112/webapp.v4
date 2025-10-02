#!/usr/bin/env node
import { fetchAllVideos } from './src/videos/video.service.js';

async function listAllVideos() {
    console.log('🔍 Fetching all videos from DynamoDB...\n');

    try {
        const videos = await fetchAllVideos();

        if (videos.length === 0) {
            console.log('📭 No videos found in database');
            return;
        }

        console.log(`📋 Found ${videos.length} videos:`);
        videos.forEach((video, index) => {
            console.log(`\n${index + 1}. Video ID: ${video.id}`);
            console.log(`   Owner: ${video.ownerId}`);
            console.log(`   Original Name: ${video.originalName}`);
            console.log(`   Status: ${video.status}`);
            console.log(`   Stored Filename: ${video.storedFilename || 'Not set'}`);
            console.log(`   Transcoded: ${video.transcodedFilename || 'Not transcoded'}`);
            console.log(`   Thumbnail: ${video.thumbPath || 'No thumbnail'}`);
        });

        // Return the first video for testing
        if (videos.length > 0) {
            const testVideo = videos[0];
            console.log(`\n🧪 Test Video Found:`);
            console.log(`   Video ID: ${testVideo.id}`);
            console.log(`   Owner ID: ${testVideo.ownerId}`);
            console.log(`   S3 Key: ${testVideo.storedFilename}`);

            return testVideo;
        }

    } catch (error) {
        console.error('❌ Error fetching videos:', error);
    }
}

listAllVideos().catch(console.error);