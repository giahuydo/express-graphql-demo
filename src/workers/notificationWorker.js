const { notificationQueue } = require('../config/queue');
const emailService = require('../services/emailService');

// Notification job types
const NOTIFICATION_JOB_TYPES = {
  EVENT_CREATED: 'event_created',
  EVENT_UPDATED: 'event_updated',
  EVENT_DELETED: 'event_deleted',
  VOUCHER_ISSUED: 'voucher_issued',
  VOUCHER_USED: 'voucher_used',
  SYSTEM_MAINTENANCE: 'system_maintenance',
  USER_ACTIVITY: 'user_activity',
};

// Process event created notifications
notificationQueue.process(NOTIFICATION_JOB_TYPES.EVENT_CREATED, async (job) => {
  const { eventData, adminEmails } = job.data;
  console.log(`📢 Processing event created notification`);
  
  try {
    const results = [];
    
    // Notify all admins about new event
    for (const adminEmail of adminEmails) {
      const result = await emailService.sendNotificationEmail({
        email: adminEmail,
        name: 'Admin',
        subject: 'New Event Created',
        message: `A new event "${eventData.name}" has been created and is now available.`,
        type: 'info'
      });
      results.push(result);
    }
    
    return { success: true, results };
  } catch (error) {
    console.error('❌ Event created notification failed:', error);
    throw error;
  }
});

// Process event updated notifications
notificationQueue.process(NOTIFICATION_JOB_TYPES.EVENT_UPDATED, async (job) => {
  const { eventData, adminEmails } = job.data;
  console.log(`📢 Processing event updated notification`);
  
  try {
    const results = [];
    
    // Notify all admins about event update
    for (const adminEmail of adminEmails) {
      const result = await emailService.sendNotificationEmail({
        email: adminEmail,
        name: 'Admin',
        subject: 'Event Updated',
        message: `Event "${eventData.name}" has been updated.`,
        type: 'info'
      });
      results.push(result);
    }
    
    return { success: true, results };
  } catch (error) {
    console.error('❌ Event updated notification failed:', error);
    throw error;
  }
});

// Process event deleted notifications
notificationQueue.process(NOTIFICATION_JOB_TYPES.EVENT_DELETED, async (job) => {
  const { eventData, adminEmails } = job.data;
  console.log(`📢 Processing event deleted notification`);
  
  try {
    const results = [];
    
    // Notify all admins about event deletion
    for (const adminEmail of adminEmails) {
      const result = await emailService.sendNotificationEmail({
        email: adminEmail,
        name: 'Admin',
        subject: 'Event Deleted',
        message: `Event "${eventData.name}" has been deleted.`,
        type: 'warning'
      });
      results.push(result);
    }
    
    return { success: true, results };
  } catch (error) {
    console.error('❌ Event deleted notification failed:', error);
    throw error;
  }
});

// Process voucher issued notifications
notificationQueue.process(NOTIFICATION_JOB_TYPES.VOUCHER_ISSUED, async (job) => {
  const { voucherData, adminEmails } = job.data;
  console.log(`📢 Processing voucher issued notification`);
  
  try {
    const results = [];
    
    // Notify all admins about voucher issuance
    for (const adminEmail of adminEmails) {
      const result = await emailService.sendNotificationEmail({
        email: adminEmail,
        name: 'Admin',
        subject: 'Voucher Issued',
        message: `Voucher "${voucherData.code}" has been issued to ${voucherData.issuedTo}.`,
        type: 'success'
      });
      results.push(result);
    }
    
    return { success: true, results };
  } catch (error) {
    console.error('❌ Voucher issued notification failed:', error);
    throw error;
  }
});

// Process voucher used notifications
notificationQueue.process(NOTIFICATION_JOB_TYPES.VOUCHER_USED, async (job) => {
  const { voucherData, adminEmails } = job.data;
  console.log(`📢 Processing voucher used notification`);
  
  try {
    const results = [];
    
    // Notify all admins about voucher usage
    for (const adminEmail of adminEmails) {
      const result = await emailService.sendNotificationEmail({
        email: adminEmail,
        name: 'Admin',
        subject: 'Voucher Used',
        message: `Voucher "${voucherData.code}" has been used.`,
        type: 'info'
      });
      results.push(result);
    }
    
    return { success: true, results };
  } catch (error) {
    console.error('❌ Voucher used notification failed:', error);
    throw error;
  }
});

// Process system maintenance notifications
notificationQueue.process(NOTIFICATION_JOB_TYPES.SYSTEM_MAINTENANCE, async (job) => {
  const { maintenanceData, userEmails } = job.data;
  console.log(`📢 Processing system maintenance notification`);
  
  try {
    const results = [];
    
    // Notify all users about system maintenance
    for (const userEmail of userEmails) {
      const result = await emailService.sendNotificationEmail({
        email: userEmail,
        name: 'User',
        subject: 'System Maintenance Notice',
        message: `Scheduled maintenance: ${maintenanceData.message}`,
        type: 'warning'
      });
      results.push(result);
    }
    
    return { success: true, results };
  } catch (error) {
    console.error('❌ System maintenance notification failed:', error);
    throw error;
  }
});

// Process user activity notifications
notificationQueue.process(NOTIFICATION_JOB_TYPES.USER_ACTIVITY, async (job) => {
  const { activityData, adminEmails } = job.data;
  console.log(`📢 Processing user activity notification`);
  
  try {
    const results = [];
    
    // Notify all admins about user activity
    for (const adminEmail of adminEmails) {
      const result = await emailService.sendNotificationEmail({
        email: adminEmail,
        name: 'Admin',
        subject: 'User Activity Alert',
        message: `User activity: ${activityData.message}`,
        type: 'info'
      });
      results.push(result);
    }
    
    return { success: true, results };
  } catch (error) {
    console.error('❌ User activity notification failed:', error);
    throw error;
  }
});

// Queue event listeners
notificationQueue.on('waiting', (jobId) => {
  console.log(`⏳ Notification job ${jobId} is waiting`);
});

notificationQueue.on('active', (job) => {
  console.log(`🔄 Notification job ${job.id} is now active`);
});

notificationQueue.on('completed', (job, result) => {
  console.log(`✅ Notification job ${job.id} completed successfully`);
});

notificationQueue.on('failed', (job, err) => {
  console.error(`❌ Notification job ${job.id} failed:`, err.message);
});

notificationQueue.on('stalled', (job) => {
  console.warn(`⚠️ Notification job ${job.id} stalled`);
});

// Error handling
notificationQueue.on('error', (error) => {
  console.error('❌ Notification queue error:', error);
});

console.log('✅ Notification worker started successfully');

module.exports = {
  NOTIFICATION_JOB_TYPES,
  notificationQueue,
};
