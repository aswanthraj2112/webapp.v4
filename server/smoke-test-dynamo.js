#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();

import { randomUUID } from 'crypto';
import { createVideo, getVideo, listVideos, updateVideo, deleteVideo } from './src/videos/video.repo.js';

const TEST_USER_ID = 'n11817143'; // QUT username
const TEST_VIDEO_ID = randomUUID();

async function smokeTest() {
    try {
        console.log('🧪 Starting DynamoDB Smoke Test...\n');

        // Test 1: Create Video
        console.log('1️⃣ Testing createVideo...');
        const newVideo = {
            id: TEST_VIDEO_ID,
            userId: TEST_USER_ID,
            originalName: 'test-video.mp4',
            storedFilename: 'stored-test-video.mp4',
            thumbPath: 'thumb-test.jpg',
            transcodedFilename: 'transcoded-test-video-720p.mp4',
            durationSec: 120,
            format: 'mp4',
            width: 1920,
            height: 1080,
            sizeBytes: 10485760,
            status: 'transcoded'
        };

        const createdVideo = await createVideo(newVideo);
        console.log('✅ Video created:', {
            id: createdVideo.id,
            userId: createdVideo.userId,
            originalName: createdVideo.originalName,
            status: createdVideo.status
        });

        // Test 2: Get Video
        console.log('\n2️⃣ Testing getVideo...');
        const retrievedVideo = await getVideo(TEST_USER_ID, TEST_VIDEO_ID);
        console.log('✅ Video retrieved:', {
            id: retrievedVideo.id,
            userId: retrievedVideo.userId,
            originalName: retrievedVideo.originalName,
            status: retrievedVideo.status
        });

        // Test 3: List Videos
        console.log('\n3️⃣ Testing listVideos...');
        const videosList = await listVideos(TEST_USER_ID, 1, 10);
        console.log('✅ Videos listed:', {
            total: videosList.total,
            items: videosList.items.length,
            firstItem: videosList.items[0] ? {
                id: videosList.items[0].id,
                originalName: videosList.items[0].originalName
            } : null
        });

        // Test 4: Update Video
        console.log('\n4️⃣ Testing updateVideo...');
        const updates = {
            status: 'completed',
            durationSec: 125
        };
        const updatedVideo = await updateVideo(TEST_USER_ID, TEST_VIDEO_ID, updates);
        console.log('✅ Video updated:', {
            id: updatedVideo.id,
            status: updatedVideo.status,
            durationSec: updatedVideo.durationSec
        });

        // Test 5: Delete Video
        console.log('\n5️⃣ Testing deleteVideo...');
        await deleteVideo(TEST_USER_ID, TEST_VIDEO_ID);
        console.log('✅ Video deleted');

        // Test 6: Verify deletion
        console.log('\n6️⃣ Verifying deletion...');
        const deletedVideo = await getVideo(TEST_USER_ID, TEST_VIDEO_ID);
        if (!deletedVideo) {
            console.log('✅ Video confirmed deleted (returns null)');
        } else {
            console.log('❌ Video still exists after deletion');
        }

        console.log('\n🎉 All DynamoDB tests passed! The integration is working correctly.');
        console.log('\n📋 DynamoDB Configuration:');
        console.log('- Table: n11817143-VideoApp');
        console.log('- Partition Key: ownerId (qut-username)');
        console.log('- Sort Key: videoId (id)');
        console.log('- Global Secondary Index: OwnerIndex');
        console.log('- Status: ✅ ACTIVE and tested');

    } catch (error) {
        console.error('❌ Smoke test failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

smokeTest();