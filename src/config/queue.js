const Queue = require('bull');
const redisClient = require('./redis');

// Email queue configuration
const emailQueue = new Queue('email queue', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },
  defaultJobOptions: {
    removeOnComplete: 10, // Keep 10 completed jobs
    removeOnFail: 5, // Keep 5 failed jobs
    attempts: 3, // Retry failed jobs 3 times
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2 second delay
    },
  },
});

// Queue event listeners
emailQueue.on('completed', (job, result) => {
  console.log(`✅ Email job ${job.id} completed:`, result);
});

emailQueue.on('failed', (job, err) => {
  console.error(`❌ Email job ${job.id} failed:`, err.message);
});

emailQueue.on('stalled', (job) => {
  console.warn(`⚠️ Email job ${job.id} stalled`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🔄 Shutting down queues gracefully...');
  await emailQueue.close();
  await redisClient.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🔄 Shutting down queues gracefully...');
  await emailQueue.close();
  await redisClient.quit();
  process.exit(0);
});

module.exports = {
  emailQueue,
  redisClient,
};
