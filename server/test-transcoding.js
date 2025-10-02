#!/usr/bin/env node
import { transcodeVideoToResolution } from './src/videos/transcoding.service.js';

async function testTranscoding() {
    console.log('🧪 Testing transcoding functionality...\n');

    // Test parameters (using fake data to test the file system operations)
    const testParams = {
        userId: 'test-user',
        videoId: 'test-video-id',
        originalS3Key: 'raw/test-user/test-video.mp4',
        resolution: '720p'
    };

    try {
        console.log('🎬 Starting transcoding test with parameters:', testParams);

        // This will fail at S3 download but should show us if the filesystem operations work
        const result = await transcodeVideoToResolution(testParams);

        console.log('✅ Transcoding completed successfully:', result);
    } catch (error) {
        console.log('📊 Test result - Error details:');
        console.log('Error message:', error.message);
        console.log('Error type:', error.constructor.name);

        if (error.message.includes('Failed to download video for transcoding')) {
            console.log('✅ EXPECTED: S3 download failed (no actual video file)');
            console.log('✅ GOOD: File system operations appear to be working correctly');
            console.log('   The error occurred at the S3 download stage, not file creation');
        } else if (error.message.includes('fs.createWriteStream') || error.message.includes('ENOENT')) {
            console.log('❌ BAD: File system error still exists');
            console.log('   This indicates the thumbnail/transcoding file creation issue persists');
        } else {
            console.log('ℹ️  Unknown error type - please review');
        }
    }
}

testTranscoding().catch(console.error);