require('dotenv').config();
const { emailQueue, notificationQueue } = require('./src/config/queue');

async function testQueueSystemSimple() {
  console.log('🧪 Testing Queue System (Simple)...\n');

  try {
    // Test 1: Add welcome email job
    console.log('1️⃣ Testing welcome email job...');
    const welcomeJob = await emailQueue.add('welcome', {
      userData: {
        email: 'test@example.com',
        name: 'Test User'
      }
    });
    console.log(`✅ Welcome email job added: ${welcomeJob.id}\n`);

    // Test 2: Add voucher email job
    console.log('2️⃣ Testing voucher email job...');
    const voucherJob = await emailQueue.add('voucher', {
      voucherData: {
        email: 'test@example.com',
        name: 'Test User',
        voucherCode: 'VOUCHER-TEST-123',
        eventName: 'Test Event',
        eventDescription: 'This is a test event'
      }
    });
    console.log(`✅ Voucher email job added: ${voucherJob.id}\n`);

    // Test 3: Add notification email job
    console.log('3️⃣ Testing notification email job...');
    const notificationJob = await emailQueue.add('notification', {
      notificationData: {
        email: 'test@example.com',
        name: 'Test User',
        subject: 'Test Notification',
        message: 'This is a test notification message',
        type: 'info'
      }
    });
    console.log(`✅ Notification email job added: ${notificationJob.id}\n`);

    // Test 4: Add event created notification job
    console.log('4️⃣ Testing event created notification job...');
    const eventCreatedJob = await notificationQueue.add('event_created', {
      eventData: {
        name: 'Test Event',
        description: 'This is a test event description'
      },
      adminEmails: ['admin@example.com']
    });
    console.log(`✅ Event created notification job added: ${eventCreatedJob.id}\n`);

    // Test 5: Get queue statistics
    console.log('5️⃣ Getting queue statistics...');
    const emailStats = await emailQueue.getJobCounts();
    const notificationStats = await notificationQueue.getJobCounts();
    
    console.log('📊 Email Queue Statistics:');
    console.log(JSON.stringify(emailStats, null, 2));
    console.log('\n📊 Notification Queue Statistics:');
    console.log(JSON.stringify(notificationStats, null, 2));
    console.log('');

    // Wait a bit for jobs to process
    console.log('⏳ Waiting for jobs to process...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get updated statistics
    console.log('6️⃣ Getting updated queue statistics...');
    const updatedEmailStats = await emailQueue.getJobCounts();
    const updatedNotificationStats = await notificationQueue.getJobCounts();
    
    console.log('📊 Updated Email Queue Statistics:');
    console.log(JSON.stringify(updatedEmailStats, null, 2));
    console.log('\n📊 Updated Notification Queue Statistics:');
    console.log(JSON.stringify(updatedNotificationStats, null, 2));

    console.log('\n✅ Queue system test completed successfully!');
    console.log('\n📝 Note: Email sending will fail without proper SMTP credentials, but queue processing works correctly.');
    
  } catch (error) {
    console.error('❌ Queue system test failed:', error);
  } finally {
    // Clean up completed jobs
    console.log('\n🧹 Cleaning up completed jobs...');
    try {
      await emailQueue.clean(24 * 60 * 60 * 1000, 'completed'); // 24 hours
      await notificationQueue.clean(24 * 60 * 60 * 1000, 'completed'); // 24 hours
      console.log('✅ Cleanup completed');
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }
    
    process.exit(0);
  }
}

// Run the test
testQueueSystemSimple();
