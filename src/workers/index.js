// Load environment variables
require('dotenv').config();

// Ensure Redis client initializes
require('../config/queue');

// Start workers
require('./emailWorker');

console.log('✅ All workers started');
