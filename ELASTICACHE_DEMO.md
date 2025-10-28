# ElastiCache Demo Guide - n11817143-a2-cache

## Overview
This demo shows how ElastiCache with Memcached improves performance by caching frequent video metadata queries.

## What You'll Say During Demo:

> "To improve performance, I use ElastiCache with Memcached. The backend caches frequent video metadata queries. If the cache is flushed, the next request fetches data from DynamoDB and repopulates the cache."

## Demo Steps

### 1. Prerequisites - Check Current Setup
```bash
# Make sure your app is running
docker-compose ps

# Check if containers are healthy
curl -s http://localhost:8080/api/health
```

**IMPORTANT**: Your ElastiCache cluster endpoint is: `n11817143-a2-cache.km2jzi.cfg.apse2.cache.amazonaws.com:11211`

If the cache commands fail, this could be due to:
- ElastiCache cluster not running
- Security group not allowing connections from your EC2 instance
- Network connectivity issues

### 2. Show Cache Configuration
```bash
# Show the ElastiCache endpoint configuration
cat server/src/config.js | grep -A 5 "Cache configuration"

# Show cache implementation
cat server/src/cache/cache.client.js
```

**Explain:** 
- ElastiCache endpoint: `n11817143-a2-cache.cfg.apse2.cache.amazonaws.com:11211`
- Cache TTL: 60 seconds (configurable)
- Using Memcached protocol with memjs client

### 3. Show Cache in Action (Before Flush)

**First, log into your app and load some videos to populate cache:**

1. Go to your webapp: https://n11817143-videoapp.cab432.com
2. Login with your credentials
3. Navigate to dashboard to load videos

**Check cache stats:**
```bash
# Using the CLI tool (from server directory)
cd server && node cache-demo.js stats

# Or via API (you'll need to get auth token first)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:8080/api/cache/stats
```

### 4. Demonstrate Cache Hit (Fast Response)

**Open browser developer tools (F12) and reload the video list:**

1. Go to Network tab
2. Reload the videos page
3. Look for the `/api/videos` request
4. **Point out:** Fast response time (~50-100ms)
5. **Show in response:** `"cached": true` field

### 5. Flush Cache - The Main Demo!

**Option A: Using CLI tool (Recommended)**
```bash
# Flush the cache (from server directory)
cd server && node cache-demo.js flush
```

**Option B: Using API endpoint**
```bash
# Get auth token first by logging in, then:
curl -X POST \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:8080/api/cache/flush
```

**Option C: AWS Console (Alternative)**
1. Go to ElastiCache Console
2. Find `n11817143-a2-cache`
3. Click "Actions" → "Modify"
4. Choose "Reboot" to clear cache

### 6. Demonstrate Cache Miss (Slower Response)

**Immediately after flushing, reload the videos page:**

1. Keep browser dev tools open
2. Reload the videos page
3. **Point out:** 
   - Slower response time (~200-500ms)
   - `"cached": false` in response
   - Data fetched from DynamoDB

### 7. Show Cache Repopulation (Fast Again)

**Reload the page one more time:**

1. Reload again
2. **Point out:**
   - Fast response time again (~50-100ms)
   - `"cached": true` in response
   - Cache has been repopulated

### 8. Show Cache Statistics

```bash
# Show updated stats after demo
cd server && node cache-demo.js stats
```

**Point out:**
- Increased cache misses after flush
- New cache hits after repopulation
- Current items in cache

## Key Points to Emphasize

1. **Performance Improvement**: 
   - Cached responses: ~50-100ms
   - Database queries: ~200-500ms
   - 2-4x performance improvement

2. **Automatic Cache Management**:
   - Cache keys include user ID for isolation
   - Version-based invalidation on uploads
   - TTL prevents stale data

3. **Fallback Strategy**:
   - App works even if cache is unavailable
   - Graceful degradation to database queries

4. **Real-world Usage**:
   - Video metadata queries
   - User-specific caching
   - Automatic invalidation on updates

## Cache Key Patterns Used

- `videos:{userId}:v{version}:p{page}:l{limit}` - Video lists
- `videos:{userId}:version` - Cache versioning for invalidation

## Troubleshooting

If cache demo doesn't work:

1. Check if ElastiCache cluster is running in AWS Console
2. Verify security groups allow port 11211
3. Check network connectivity: `telnet n11817143-a2-cache.cfg.apse2.cache.amazonaws.com 11211`
4. Review server logs for cache connection errors

## Files Modified for Demo

- `cache-demo.js` - CLI tool for cache operations
- `server/src/cache/cache.routes.js` - API endpoints for cache management
- `server/src/index.js` - Added cache routes to server

The existing cache implementation in `video.controller.js` already handles cache hits/misses automatically.