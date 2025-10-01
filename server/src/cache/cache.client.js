import memjs from 'memjs';
import config from '../config.js';

let client;
let cacheDisabled = false;

function getClient() {
  if (cacheDisabled) {
    return null;
  }
  if (!client) {
    try {
      client = memjs.Client.create(config.ELASTICACHE_ENDPOINT, {
        timeout: parseInt(process.env.CACHE_TIMEOUT_MS || '500', 10)
      });
    } catch (error) {
      cacheDisabled = true;
      console.warn('⚠️  Failed to initialise Memcached client:', error.message);
      return null;
    }
  }
  return client;
}

export async function cacheGet(key) {
  const instance = getClient();
  if (!instance) return null;
  try {
    const result = await instance.get(key);
    if (!result?.value) return null;
    return JSON.parse(result.value.toString());
  } catch (error) {
    console.warn('⚠️  Cache get failed:', error.message);
    return null;
  }
}

export async function cacheSet(key, value, ttlSeconds = config.CACHE_TTL_SECONDS) {
  const instance = getClient();
  if (!instance) return;
  try {
    await instance.set(key, Buffer.from(JSON.stringify(value)), { expires: ttlSeconds });
  } catch (error) {
    console.warn('⚠️  Cache set failed:', error.message);
  }
}

export async function cacheDelete(key) {
  const instance = getClient();
  if (!instance) return;
  try {
    await instance.delete(key);
  } catch (error) {
    console.warn('⚠️  Cache delete failed:', error.message);
  }
}

export function disableCache() {
  cacheDisabled = true;
  if (client) {
    client.quit();
    client = null;
  }
}
