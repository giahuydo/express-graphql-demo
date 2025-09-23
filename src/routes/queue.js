const express = require('express');
const router = express.Router();
const queueService = require('../services/queueService');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

// Middleware to verify admin access
const requireAdmin = (req, res, next) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token.replace('Bearer ', ''), JWT_SECRET);
    if (decoded.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

/**
 * @swagger
 * /api/queue/stats:
 *   get:
 *     summary: Get queue statistics
 *     tags: [Queue]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Queue statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 email:
 *                   type: object
 *                   properties:
 *                     waiting:
 *                       type: integer
 *                       description: Number of waiting email jobs
 *                     active:
 *                       type: integer
 *                       description: Number of active email jobs
 *                     completed:
 *                       type: integer
 *                       description: Number of completed email jobs
 *                     failed:
 *                       type: integer
 *                       description: Number of failed email jobs
 *                 notification:
 *                   type: object
 *                   properties:
 *                     waiting:
 *                       type: integer
 *                       description: Number of waiting notification jobs
 *                     active:
 *                       type: integer
 *                       description: Number of active notification jobs
 *                     completed:
 *                       type: integer
 *                       description: Number of completed notification jobs
 *                     failed:
 *                       type: integer
 *                       description: Number of failed notification jobs
 *                 total:
 *                   type: object
 *                   properties:
 *                     waiting:
 *                       type: integer
 *                       description: Total waiting jobs
 *                     active:
 *                       type: integer
 *                       description: Total active jobs
 *                     completed:
 *                       type: integer
 *                       description: Total completed jobs
 *                     failed:
 *                       type: integer
 *                       description: Total failed jobs
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await queueService.getQueueStats();
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Failed to get queue stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get queue statistics',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/queue/clean:
 *   post:
 *     summary: Clean completed jobs
 *     tags: [Queue]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Completed jobs cleaned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 */
router.post('/clean', requireAdmin, async (req, res) => {
  try {
    await queueService.cleanCompletedJobs();
    res.json({
      success: true,
      message: 'Completed jobs cleaned successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Failed to clean completed jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clean completed jobs',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/queue/test-email:
 *   post:
 *     summary: Test email sending
 *     tags: [Queue]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address to send test email to
 *                 example: test@example.com
 *               name:
 *                 type: string
 *                 description: Name of the recipient
 *                 example: Test User
 *     responses:
 *       200:
 *         description: Test email job added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 jobId:
 *                   type: string
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 */
router.post('/test-email', requireAdmin, async (req, res) => {
  try {
    const { email, name } = req.body;
    
    if (!email || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email and name are required'
      });
    }

    const job = await queueService.addWelcomeEmailJob({
      email,
      name
    });

    res.json({
      success: true,
      message: 'Test email job added successfully',
      jobId: job.id,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Failed to add test email job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add test email job',
      error: error.message
    });
  }
});

module.exports = router;
