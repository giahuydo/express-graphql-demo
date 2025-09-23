const { emailQueue, notificationQueue } = require('../config/queue');
const { EMAIL_JOB_TYPES } = require('../workers/emailWorker');
const User = require('../models/User');

class QueueService {
  /**
   * Add voucher email job to queue
   */
  async addVoucherEmailJob(voucherData) {
    try {
      const job = await emailQueue.add(EMAIL_JOB_TYPES.VOUCHER, {
        voucherData: {
          email: voucherData.email,
          name: voucherData.name,
          voucherCode: voucherData.voucherCode,
          eventName: voucherData.eventName,
          eventDescription: voucherData.eventDescription,
        },
      }, {
        priority: 2, // Medium priority
        delay: 0, // Send immediately
      });
      
      console.log(`✅ Voucher email job added: ${job.id}`);
      return job;
    } catch (error) {
      console.error('❌ Failed to add voucher email job:', error);
      throw error;
    }
  }

  /**
   * Add password reset email job to queue
   */
  async addPasswordResetEmailJob(userData, resetToken) {
    try {
      const job = await emailQueue.add(EMAIL_JOB_TYPES.PASSWORD_RESET, {
        userData: {
          email: userData.email,
          name: userData.name,
        },
        resetToken,
      }, {
        priority: 1, // High priority
        delay: 0, // Send immediately
      });
      
      console.log(`✅ Password reset email job added: ${job.id}`);
      return job;
    } catch (error) {
      console.error('❌ Failed to add password reset email job:', error);
      throw error;
    }
  }

  /**
   * Add notification email job to queue
   */
  async addNotificationEmailJob(notificationData) {
    try {
      const job = await emailQueue.add(EMAIL_JOB_TYPES.NOTIFICATION, {
        notificationData: {
          email: notificationData.email,
          name: notificationData.name,
          subject: notificationData.subject,
          message: notificationData.message,
          type: notificationData.type || 'info',
        },
      }, {
        priority: 3, // Low priority
        delay: 0, // Send immediately
      });
      
      console.log(`✅ Notification email job added: ${job.id}`);
      return job;
    } catch (error) {
      console.error('❌ Failed to add notification email job:', error);
      throw error;
    }
  }

  /**
   * Add event updated notification job to queue
   */
  async addEventUpdatedNotificationJob(eventData) {
    try {
      // Get all admin emails
      const admins = await User.find({ role: 'ADMIN', isActive: true }).select('email');
      const adminEmails = admins.map(admin => admin.email);
      
      if (adminEmails.length === 0) {
        console.log('⚠️ No admin emails found for event updated notification');
        return null;
      }

      const job = await notificationQueue.add(NOTIFICATION_JOB_TYPES.EVENT_UPDATED, {
        eventData: {
          name: eventData.name,
          description: eventData.description,
        },
        adminEmails,
      }, {
        priority: 2, // Medium priority
        delay: 0, // Send immediately
      });
      
      console.log(`✅ Event updated notification job added: ${job.id}`);
      return job;
    } catch (error) {
      console.error('❌ Failed to add event updated notification job:', error);
      throw error;
    }
  }

  /**
   * Add event deleted notification job to queue
   */
  async addEventDeletedNotificationJob(eventData) {
    try {
      // Get all admin emails
      const admins = await User.find({ role: 'ADMIN', isActive: true }).select('email');
      const adminEmails = admins.map(admin => admin.email);
      
      if (adminEmails.length === 0) {
        console.log('⚠️ No admin emails found for event deleted notification');
        return null;
      }

      const job = await notificationQueue.add(NOTIFICATION_JOB_TYPES.EVENT_DELETED, {
        eventData: {
          name: eventData.name,
          description: eventData.description,
        },
        adminEmails,
      }, {
        priority: 2, // Medium priority
        delay: 0, // Send immediately
      });
      
      console.log(`✅ Event deleted notification job added: ${job.id}`);
      return job;
    } catch (error) {
      console.error('❌ Failed to add event deleted notification job:', error);
      throw error;
    }
  }

  /**
   * Add voucher issued notification job to queue
   */
  async addVoucherIssuedNotificationJob(voucherData) {
    try {
      // Get all admin emails
      const admins = await User.find({ role: 'ADMIN', isActive: true }).select('email');
      const adminEmails = admins.map(admin => admin.email);
      
      if (adminEmails.length === 0) {
        console.log('⚠️ No admin emails found for voucher issued notification');
        return null;
      }

      const job = await notificationQueue.add(NOTIFICATION_JOB_TYPES.VOUCHER_ISSUED, {
        voucherData: {
          code: voucherData.code,
          issuedTo: voucherData.issuedTo,
        },
        adminEmails,
      }, {
        priority: 2, // Medium priority
        delay: 0, // Send immediately
      });
      
      console.log(`✅ Voucher issued notification job added: ${job.id}`);
      return job;
    } catch (error) {
      console.error('❌ Failed to add voucher issued notification job:', error);
      throw error;
    }
  }

  /**
   * Add voucher used notification job to queue
   */
  async addVoucherUsedNotificationJob(voucherData) {
    try {
      // Get all admin emails
      const admins = await User.find({ role: 'ADMIN', isActive: true }).select('email');
      const adminEmails = admins.map(admin => admin.email);
      
      if (adminEmails.length === 0) {
        console.log('⚠️ No admin emails found for voucher used notification');
        return null;
      }

      const job = await notificationQueue.add(NOTIFICATION_JOB_TYPES.VOUCHER_USED, {
        voucherData: {
          code: voucherData.code,
          issuedTo: voucherData.issuedTo,
        },
        adminEmails,
      }, {
        priority: 2, // Medium priority
        delay: 0, // Send immediately
      });
      
      console.log(`✅ Voucher used notification job added: ${job.id}`);
      return job;
    } catch (error) {
      console.error('❌ Failed to add voucher used notification job:', error);
      throw error;
    }
  }

  /**
   * Add system maintenance notification job to queue
   */
  async addSystemMaintenanceNotificationJob(maintenanceData) {
    try {
      // Get all user emails
      const users = await User.find({ isActive: true }).select('email');
      const userEmails = users.map(user => user.email);
      
      if (userEmails.length === 0) {
        console.log('⚠️ No user emails found for system maintenance notification');
        return null;
      }

      const job = await notificationQueue.add(NOTIFICATION_JOB_TYPES.SYSTEM_MAINTENANCE, {
        maintenanceData: {
          message: maintenanceData.message,
          scheduledTime: maintenanceData.scheduledTime,
        },
        userEmails,
      }, {
        priority: 1, // High priority
        delay: maintenanceData.delay || 0, // Can be scheduled
      });
      
      console.log(`✅ System maintenance notification job added: ${job.id}`);
      return job;
    } catch (error) {
      console.error('❌ Failed to add system maintenance notification job:', error);
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    try {
      const emailStats = await emailQueue.getJobCounts();
      const notificationStats = await notificationQueue.getJobCounts();
      
      return {
        email: emailStats,
        notification: notificationStats,
        total: {
          waiting: emailStats.waiting + notificationStats.waiting,
          active: emailStats.active + notificationStats.active,
          completed: emailStats.completed + notificationStats.completed,
          failed: emailStats.failed + notificationStats.failed,
        }
      };
    } catch (error) {
      console.error('❌ Failed to get queue stats:', error);
      throw error;
    }
  }

  /**
   * Clean completed jobs
   */
  async cleanCompletedJobs() {
    try {
      await emailQueue.clean(24 * 60 * 60 * 1000, 'completed'); // 24 hours
      await notificationQueue.clean(24 * 60 * 60 * 1000, 'completed'); // 24 hours
      console.log('✅ Completed jobs cleaned successfully');
    } catch (error) {
      console.error('❌ Failed to clean completed jobs:', error);
      throw error;
    }
  }
}

module.exports = new QueueService();
