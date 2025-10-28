import express from 'express';
import { cacheGet, cacheSet, cacheDelete } from '../cache/cache.client.js';
import memjs from 'memjs';
import config from '../config.js';
import authMiddleware from '../auth/auth.middleware.js';

const router = express.Router();

// Apply authentication to all cache routes
router.use(authMiddleware);

// Flush entire cache (admin only)
router.post('/flush', async (req, res) => {
    try {
        const client = memjs.Client.create(config.ELASTICACHE_ENDPOINT, {
            timeout: 1000
        });

        await client.flush();
        client.quit();

        res.json({
            message: 'Cache flushed successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to flush cache',
            details: error.message
        });
    }
});

// Get cache statistics
router.get('/stats', async (req, res) => {
    try {
        const client = memjs.Client.create(config.ELASTICACHE_ENDPOINT, {
            timeout: 1000
        });

        const stats = await client.stats();
        client.quit();

        // Format stats for better readability
        const formattedStats = Object.entries(stats).reduce((acc, [server, data]) => {
            acc[server] = {
                hits: parseInt(data.get_hits || '0'),
                misses: parseInt(data.get_misses || '0'),
                totalGets: parseInt(data.cmd_get || '0'),
                totalSets: parseInt(data.cmd_set || '0'),
                currentItems: parseInt(data.curr_items || '0'),
                memoryUsed: parseInt(data.bytes || '0')
            };
            return acc;
        }, {});

        res.json({
            stats: formattedStats,
            endpoint: config.ELASTICACHE_ENDPOINT,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to get cache stats',
            details: error.message
        });
    }
});

// Get cache info for current user
router.get('/info', async (req, res) => {
    try {
        const userId = req.user.sub;
        const versionKey = `videos:${userId}:version`;
        const version = await cacheGet(versionKey);

        res.json({
            userId,
            cacheVersion: version,
            cacheEndpoint: config.ELASTICACHE_ENDPOINT,
            cacheTTL: config.CACHE_TTL_SECONDS,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to get cache info',
            details: error.message
        });
    }
});

export default router;