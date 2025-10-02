#!/usr/bin/env node
import { transcodeVideoToResolution } from './src/videos/transcoding.service.js';

async function testRealTranscoding() {
    console.log('🧪 Testing transcoding with real video...\n');

    // Use real video data from the database
    const testParams = {
        userId: 'd9be34c8-f031-70a2-8508-c5c5d4965f6c', // Real user ID
        videoId: '39051db7-222c-4889-8209-3add7ac09ad1', // Real video ID
        originalS3Key: 'raw/d9be34c8-f031-70a2-8508-c5c5d4965f6c/1759378912761-a193e78f-06ea-45ac-b6bf-90767bf4467d-1000118040.mp4', // Real S3 key
        resolution: '720p'
    };

    try {
        console.log('🎬 Starting real transcoding test with parameters:');
        console.log('   userId:', testParams.userId);
        console.log('   videoId:', testParams.videoId);
        console.log('   S3 Key:', testParams.originalS3Key);
        console.log('   Resolution:', testParams.resolution);
        console.log('');

        const result = await transcodeVideoToResolution(testParams);

        console.log('✅ Transcoding completed successfully!');
        console.log('Result:', result);

    } catch (error) {
        console.log('📊 Test result - Error details:');
        console.log('Error message:', error.message);
        console.log('Error type:', error.constructor.name);

        if (error.message.includes('createWriteStream') || error.message.includes('ENOENT')) {
            console.log('❌ BAD: File system error - thumbnail/transcoding creation failed');
        } else if (error.message.includes('Failed to download video for transcoding')) {
            console.log('❌ S3 download error - video file might not exist in S3');
        } else if (error.message.includes('ffmpeg') || error.message.includes('Transcoding failed')) {
            console.log('⚠️  FFmpeg/transcoding error - this might be expected if video format is unsupported');
        } else if (error.message.includes('Thumbnail generation failed')) {
            console.log('⚠️  Thumbnail generation error - check if FFmpeg can process this video');
        } else {
            console.log('ℹ️  Other error:', error.stack);
        }
    }
}

testRealTranscoding().catch(console.error);