const Redis = require('redis');

const redisClient = Redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

redisClient.on('ready', () => {
  console.log('✅ Redis ready to accept commands');
});

redisClient.on('end', () => {
  console.log('❌ Redis connection ended');
});

// Connect to Redis
redisClient.connect().catch(console.error);

module.exports = redisClient;
