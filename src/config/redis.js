// npm i ioredis
const IORedis = require('ioredis');

let _client = null;

function getRedisClient() {
  if (!_client) {
    _client = new IORedis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT || 6379),
      password: process.env.REDIS_PASSWORD || undefined,

      // Các option hữu ích cho Bull/ioredis:
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy(times) {
        // backoff đơn giản
        return Math.min(times * 200, 5000);
      },
    });

    _client.on('connect', () => console.log('✅ Redis connected'));
    _client.on('ready',   () => console.log('✅ Redis ready'));
    _client.on('error',   (err) => console.error('Redis Error:', err));
    _client.on('end',     () => console.log('❌ Redis ended'));
  }
  return _client;
}

async function initRedis() {
  const c = getRedisClient();
  // ioredis tự connect khi cần, nhưng gọi ping để chắc chắn
  await c.ping();
  return c;
}

async function closeRedis() {
  if (_client) {
    await _client.quit();
    _client = null;
  }
}

module.exports = { getRedisClient, initRedis, closeRedis };