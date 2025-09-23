require('dotenv').config();
const queueService = require('./src/services/queueService');

async function testQueueSystem() {
  console.log('🧪 Testing Queue System...\n');

  try {
    // Test 1: Add welcome email job
    console.log('1️⃣ Testing welcome email job...');
    const welcomeJob = await queueService.addWelcomeEmailJob({
      email: 'test@example.com',
      name: 'Test User'
    });
    console.log(`✅ Welcome email job added: ${welcomeJob.id}\n`);

    // Test 2: Add voucher email job
    console.log('2️⃣ Testing voucher email job...');
    const voucherJob = await queueService.addVoucherEmailJob({
      email: 'test@example.com',
      name: 'Test User',
      voucherCode: 'VOUCHER-TEST-123',
      eventName: 'Test Event',
      eventDescription: 'This is a test event'
    });
    console.log(`✅ Voucher email job added: ${voucherJob.id}\n`);

    // Test 3: Add notification email job
    console.log('3️⃣ Testing notification email job...');
    const notificationJob = await queueService.addNotificationEmailJob({
      email: 'test@example.com',
      name: 'Test User',
      subject: 'Test Notification',
      message: 'This is a test notification message',
      type: 'info'
    });
    console.log(`✅ Notification email job added: ${notificationJob.id}\n`);

    // Test 5: Get queue statistics
    console.log('5️⃣ Getting queue statistics...');
    const stats = await queueService.getQueueStats();
    console.log('📊 Queue Statistics:');
    console.log(JSON.stringify(stats, null, 2));
    console.log('');

    // Wait a bit for jobs to process
    console.log('⏳ Waiting for jobs to process...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Get updated statistics
    console.log('6️⃣ Getting updated queue statistics...');
    const updatedStats = await queueService.getQueueStats();
    console.log('📊 Updated Queue Statistics:');
    console.log(JSON.stringify(updatedStats, null, 2));

    console.log('\n✅ Queue system test completed successfully!');
    
  } catch (error) {
    console.error('❌ Queue system test failed:', error);
  } finally {
    // Clean up completed jobs
    console.log('\n🧹 Cleaning up completed jobs...');
    try {
      await queueService.cleanCompletedJobs();
      console.log('✅ Cleanup completed');
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }
    
    process.exit(0);
  }
}

// Run the test
testQueueSystem();
