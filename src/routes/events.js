const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const { isEventLocked, requestEditLock, releaseEditLock } = require('../utils/lockManager');
const { paginateModel } = require('../utils/pagination');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

const getUserFromToken = (req) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return null;
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

const requireAuth = (req, res, next) => {
  const decoded = getUserFromToken(req);
  if (!decoded) {
    return res.status(401).json({
      message: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }
  req.user = decoded;
  next();
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      message: 'Admin access required',
      code: 'ADMIN_REQUIRED'
    });
  }
  next();
};

// Transform function for events
const transformEvent = (event) => {
  if (!event) return null;
  
  return {
    ...event,
    availableQuantity: event.maxQuantity - event.issuedCount,
    isFullyIssued: event.issuedCount >= event.maxQuantity
  };
};

/**
 * @swagger
 * /api/events:
 *   get:
 *     summary: Get all events with pagination
 *     tags: [Events]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of events to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of events to skip
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in event name and description
 *     responses:
 *       200:
 *         description: List of events
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Event'
 *                 totalCount:
 *                   type: integer
 *                 hasNextPage:
 *                   type: boolean
 *                 hasPreviousPage:
 *                   type: boolean
 */
router.get('/', async (req, res) => {
  try {
    const { limit = 20, offset = 0, isActive, search } = req.query;
    const query = {};
    
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) query.search = search;

    const result = await paginateModel({
      model: Event,
      query,
      transform: transformEvent,
      searchableFields: ['name', 'description'],
      fieldTypes: {
        name: { type: 'string' },
        description: { type: 'string' },
        issuedCount: { type: 'number', operators: ['gte', 'lte', 'gt', 'lt'] },
        maxQuantity: { type: 'number', operators: ['gte', 'lte', 'gt', 'lt'] }
      },
      limit: parseInt(limit),
      offset: parseInt(offset),
      sort: { createdAt: -1 }
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      message: `Failed to fetch events: ${error.message}`,
      code: 'FETCH_EVENTS_FAILED'
    });
  }
});

/**
 * @swagger
 * /api/events/{id}:
 *   get:
 *     summary: Get event by ID
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Event'
 *       404:
 *         description: Event not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: 'Invalid event ID',
        code: 'INVALID_EVENT_ID'
      });
    }

    const event = await Event.findById(req.params.id).lean();
    if (!event) {
      return res.status(404).json({
        message: 'Event not found',
        code: 'EVENT_NOT_FOUND'
      });
    }

    res.json(transformEvent(event));
  } catch (error) {
    res.status(500).json({
      message: `Failed to fetch event: ${error.message}`,
      code: 'FETCH_EVENT_FAILED'
    });
  }
});

/**
 * @swagger
 * /api/events:
 *   post:
 *     summary: Create a new event (Admin only)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - maxQuantity
 *             properties:
 *               name:
 *                 type: string
 *                 example: Tech Conference 2024
 *               description:
 *                 type: string
 *                 example: Annual technology conference
 *               maxQuantity:
 *                 type: integer
 *                 minimum: 1
 *                 example: 100
 *     responses:
 *       201:
 *         description: Event created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Event'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const event = new Event({
      ...req.body,
      issuedCount: 0
    });
    
    const saved = await event.save();
    res.status(201).json(transformEvent(saved.toObject()));
  } catch (error) {
    res.status(400).json({
      message: `Event creation failed: ${error.message}`,
      code: 'EVENT_CREATION_FAILED'
    });
  }
});

/**
 * @swagger
 * /api/events/{id}/lock:
 *   post:
 *     summary: Lock event for editing
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event locked successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Event'
 *       409:
 *         description: Event is already being edited
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:id/lock', requireAuth, async (req, res) => {
  try {
    const lockResult = await requestEditLock(req.params.id, req.user.userId);
    
    if (lockResult.code === 200) {
      const event = await Event.findById(req.params.id).lean();
      res.json(transformEvent(event));
    } else if (lockResult.code === 409) {
      res.status(409).json({
        message: lockResult.message,
        code: 'EVENT_LOCKED'
      });
    } else if (lockResult.code === 404) {
      res.status(404).json({
        message: 'Event not found',
        code: 'EVENT_NOT_FOUND'
      });
    } else {
      res.status(500).json({
        message: 'Failed to acquire edit lock',
        code: 'LOCK_FAILED'
      });
    }
  } catch (error) {
    res.status(500).json({
      message: `Event lock failed: ${error.message}`,
      code: 'EVENT_LOCK_FAILED'
    });
  }
});

/**
 * @swagger
 * /api/events/{id}/unlock:
 *   post:
 *     summary: Release edit lock
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event unlocked successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Event'
 *       403:
 *         description: You are not the editing user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:id/unlock', requireAuth, async (req, res) => {
  try {
    const unlockResult = await releaseEditLock(req.params.id, req.user.userId);
    
    if (unlockResult.code === 200) {
      const event = await Event.findById(req.params.id).lean();
      res.json(transformEvent(event));
    } else if (unlockResult.code === 403) {
      res.status(403).json({
        message: unlockResult.message,
        code: 'NOT_EDITING_USER'
      });
    } else {
      res.status(500).json({
        message: 'Failed to release edit lock',
        code: 'UNLOCK_FAILED'
      });
    }
  } catch (error) {
    res.status(500).json({
      message: `Event unlock failed: ${error.message}`,
      code: 'EVENT_UNLOCK_FAILED'
    });
  }
});

module.exports = router;
