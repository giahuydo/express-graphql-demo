const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

const testAuth = async () => {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/express-graphql-demo';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // Check if any users exist
    const userCount = await User.countDocuments();
    console.log(`📊 Total users in database: ${userCount}`);

    if (userCount === 0) {
      console.log('👤 Creating test user...');
      
      // Create a test user
      const testUser = new User({
        email: 'admin@example.com',
        password: 'password123',
        name: 'Admin User',
        role: 'admin'
      });
      
      await testUser.save();
      console.log('✅ Test user created:', {
        email: testUser.email,
        name: testUser.name,
        role: testUser.role,
        isActive: testUser.isActive
      });
    } else {
      // Show existing users
      const users = await User.find({}, 'email name role isActive').lean();
      console.log('👥 Existing users:');
      users.forEach(user => {
        console.log(`  - ${user.email} (${user.name}) - Role: ${user.role} - Active: ${user.isActive}`);
      });
    }

    // Test password comparison
    const testUser = await User.findOne({ email: 'admin@example.com' });
    if (testUser) {
      console.log('\n🔐 Testing password comparison...');
      const isValid = await testUser.comparePassword('password123');
      console.log(`Password 'password123' is valid: ${isValid}`);
      
      const isInvalid = await testUser.comparePassword('wrongpassword');
      console.log(`Password 'wrongpassword' is valid: ${isInvalid}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
  }
};

testAuth();
