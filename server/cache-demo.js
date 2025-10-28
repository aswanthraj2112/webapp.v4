#!/usr/bin/env node

/**
 * ElastiCache Demo Script for n11817143-a2-cache
 * This script helps demonstrate cache flush functionality
 */

import memjs from 'memjs';
import dotenv from 'dotenv';

dotenv.config();

const ELASTICACHE_ENDPOINT = process.env.ELASTICACHE_ENDPOINT || 'n11817143-a2-cache.cfg.apse2.cache.amazonaws.com:11211';

async function createCacheClient() {
    try {
        const client = memjs.Client.create(ELASTICACHE_ENDPOINT, {
            timeout: 1000
        });
        return client;
    } catch (error) {
        console.error('❌ Failed to connect to ElastiCache:', error.message);
        process.exit(1);
    }
}

async function flushCache() {
    console.log('🧹 Flushing ElastiCache...');
    const client = await createCacheClient();

    try {
        await client.flush();
        console.log('✅ Cache flushed successfully!');
        console.log('💡 Next API request will be a cache MISS and will fetch from DynamoDB');
    } catch (error) {
        console.error('❌ Failed to flush cache:', error.message);
    } finally {
        client.quit();
    }
}

async function checkCacheStats() {
    console.log('📊 Checking cache statistics...');
    const client = await createCacheClient();

    try {
        const stats = await client.stats();
        console.log('📈 Cache Stats:');
        for (const [server, data] of Object.entries(stats)) {
            console.log(`\n🖥️  Server: ${server}`);
            if (data.get_hits) console.log(`   Cache Hits: ${data.get_hits}`);
            if (data.get_misses) console.log(`   Cache Misses: ${data.get_misses}`);
            if (data.cmd_get) console.log(`   Total Gets: ${data.cmd_get}`);
            if (data.cmd_set) console.log(`   Total Sets: ${data.cmd_set}`);
            if (data.curr_items) console.log(`   Current Items: ${data.curr_items}`);
            if (data.bytes) console.log(`   Memory Used: ${data.bytes} bytes`);
        }
    } catch (error) {
        console.error('❌ Failed to get cache stats:', error.message);
    } finally {
        client.quit();
    }
}

async function listCacheKeys() {
    console.log('🔍 Attempting to list cache keys...');
    const client = await createCacheClient();

    try {
        // Note: Memcached doesn't natively support key listing
        // This is for demonstration purposes
        console.log('ℹ️  Note: Memcached doesn\'t support native key listing');
        console.log('🎯 Common keys used in this app:');
        console.log('   - videos:{userId}:v{version}:p{page}:l{limit} (video lists)');
        console.log('   - videos:{userId}:version (cache versioning)');
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        client.quit();
    }
}

// Command line interface
const command = process.argv[2];

switch (command) {
    case 'flush':
        await flushCache();
        break;
    case 'stats':
        await checkCacheStats();
        break;
    case 'keys':
        await listCacheKeys();
        break;
    default:
        console.log('🎯 ElastiCache Demo Commands:');
        console.log('');
        console.log('  node cache-demo.js flush   - Flush all cache data');
        console.log('  node cache-demo.js stats   - Show cache statistics');
        console.log('  node cache-demo.js keys    - List common cache key patterns');
        console.log('');
        console.log('🔧 Current ElastiCache endpoint:', ELASTICACHE_ENDPOINT);
        break;
}