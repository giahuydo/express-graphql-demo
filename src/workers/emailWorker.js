const { emailQueue } = require('../config/queue');
const emailService = require('../services/emailService');

// Email job types
const EMAIL_JOB_TYPES = {
  VOUCHER: 'voucher',
  PASSWORD_RESET: 'password_reset',
  NOTIFICATION: 'notification',
};

// Process voucher email jobs
emailQueue.process(EMAIL_JOB_TYPES.VOUCHER, async (job) => {
  const { voucherData } = job.data;
  console.log(`📧 Processing voucher email for: ${voucherData.email}`);
  
  try {
    const result = await emailService.sendVoucherEmail(voucherData);
    return { success: true, ...result };
  } catch (error) {
    console.error('❌ Voucher email job failed:', error);
    throw error;
  }
});


// Process notification email jobs
emailQueue.process(EMAIL_JOB_TYPES.NOTIFICATION, async (job) => {
  const { notificationData } = job.data;
  console.log(`📧 Processing notification email for: ${notificationData.email}`);
  
  try {
    const result = await emailService.sendNotificationEmail(notificationData);
    return { success: true, ...result };
  } catch (error) {
    console.error('❌ Notification email job failed:', error);
    throw error;
  }
});

// Queue event listeners
emailQueue.on('waiting', (jobId) => {
  console.log(`⏳ Email job ${jobId} is waiting`);
});

emailQueue.on('active', (job) => {
  console.log(`🔄 Email job ${job.id} is now active`);
});

emailQueue.on('completed', (job, result) => {
  console.log(`✅ Email job ${job.id} completed successfully`);
});

emailQueue.on('failed', (job, err) => {
  console.error(`❌ Email job ${job.id} failed:`, err.message);
});

emailQueue.on('stalled', (job) => {
  console.warn(`⚠️ Email job ${job.id} stalled`);
});

// Error handling
emailQueue.on('error', (error) => {
  console.error('❌ Email queue error:', error);
});

console.log('✅ Email worker started successfully');

module.exports = {
  EMAIL_JOB_TYPES,
  emailQueue,
};
