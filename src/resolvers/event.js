const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const Voucher = require('../models/Voucher');
const { isEventLocked, requestEditLock, releaseEditLock, maintainEditLock } = require('../utils/lockManager');
const { paginateModel } = require('../utils/pagination');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

const getUserFromToken = (token) => {
  try {
    if (!token) return null;
    return jwt.verify(token.replace('Bearer ', ''), JWT_SECRET);
  } catch (error) {
    return null;
  }
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

const eventResolvers = {
  Query: {
    events: async (_, { limit = 20, offset = 0, isActive, search }) => {
      try {
        const query = {};
        
        // Apply filters
        if (isActive !== undefined) query.isActive = isActive;
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
          limit,
          offset,
          sort: { createdAt: -1 }
        });

        return result.data;
      } catch (error) {
        throw new Error(`Failed to fetch events: ${error.message}`);
      }
    },

    event: async (_, { id }) => {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error('Invalid event ID');
      }

      const event = await Event.findById(id).lean();
      if (!event) {
        throw new Error('Event not found');
      }
      return transformEvent(event);
    },

    activeEvents: async (_, { limit = 10 }) => {
      const events = await Event.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
      
      return events.map(transformEvent);
    }
  },

  Mutation: {
    createEvent: async (_, { input }, { req }) => {
      const token = req.headers.authorization;
      const decoded = getUserFromToken(token);
      
      if (!decoded) {
        throw new Error('Authentication required');
      }

      // Only admins can create events
      if (decoded.role !== 'admin') {
        throw new Error('Admin access required');
      }

      try {
        const event = new Event({
          ...input,
          issuedCount: 0 // default value
        });
        
        const saved = await event.save();
        return transformEvent(saved.toObject());
      } catch (error) {
        throw new Error(`Event creation failed: ${error.message}`);
      }
    },

    updateEvent: async (_, { id, input }, { req }) => {
      const token = req.headers.authorization;
      const decoded = getUserFromToken(token);
      
      if (!decoded) {
        throw new Error('Authentication required');
      }

      // Only admins can update events
      if (decoded.role !== 'admin') {
        throw new Error('Admin access required');
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error('Invalid event ID');
      }

      try {
        // Check if event is locked by another user before updating
        const isLocked = await isEventLocked(id, decoded.userId);
        if (isLocked) {
          throw new Error('Event is currently being edited by another user');
        }

        const updated = await Event.findByIdAndUpdate(
          id,
          { $set: input },
          { new: true, runValidators: true }
        ).lean();

        if (!updated) {
          throw new Error('Event not found');
        }

        return transformEvent(updated);
      } catch (error) {
        throw new Error(`Event update failed: ${error.message}`);
      }
    },

    deleteEvent: async (_, { id }, { req }) => {
      const token = req.headers.authorization;
      const decoded = getUserFromToken(token);
      
      if (!decoded) {
        throw new Error('Authentication required');
      }

      // Only admins can delete events
      if (decoded.role !== 'admin') {
        throw new Error('Admin access required');
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error('Invalid event ID');
      }

      try {
        const deleted = await Event.findByIdAndDelete(id);
        if (!deleted) {
          throw new Error('Event not found');
        }

        // Delete associated vouchers
        await Voucher.deleteMany({ eventId: id });

        return transformEvent(deleted.toObject());
      } catch (error) {
        throw new Error(`Event deletion failed: ${error.message}`);
      }
    },

    activateEvent: async (_, { id }, { req }) => {
      const token = req.headers.authorization;
      const decoded = getUserFromToken(token);
      
      if (!decoded) {
        throw new Error('Authentication required');
      }

      // Only admins can activate events
      if (decoded.role !== 'admin') {
        throw new Error('Admin access required');
      }

      try {
        const updatedEvent = await Event.findByIdAndUpdate(
          id,
          { isActive: true, updatedAt: new Date() },
          { new: true, runValidators: true }
        ).lean();

        if (!updatedEvent) {
          throw new Error('Event not found');
        }

        return transformEvent(updatedEvent);
      } catch (error) {
        throw new Error(`Event activation failed: ${error.message}`);
      }
    },

    deactivateEvent: async (_, { id }, { req }) => {
      const token = req.headers.authorization;
      const decoded = getUserFromToken(token);
      
      if (!decoded) {
        throw new Error('Authentication required');
      }

      // Only admins can deactivate events
      if (decoded.role !== 'admin') {
        throw new Error('Admin access required');
      }

      try {
        const updatedEvent = await Event.findByIdAndUpdate(
          id,
          { isActive: false, updatedAt: new Date() },
          { new: true, runValidators: true }
        ).lean();

        if (!updatedEvent) {
          throw new Error('Event not found');
        }

        return transformEvent(updatedEvent);
      } catch (error) {
        throw new Error(`Event deactivation failed: ${error.message}`);
      }
    },

    lockEventForEditing: async (_, { id }, { req }) => {
      const token = req.headers.authorization;
      const decoded = getUserFromToken(token);
      
      if (!decoded) {
        throw new Error('Authentication required');
      }

      try {
        const lockResult = await requestEditLock(id, decoded.userId);
        
        if (lockResult.code === 200) {
          const event = await Event.findById(id).lean();
          return transformEvent(event);
        } else if (lockResult.code === 409) {
          throw new Error(lockResult.message);
        } else if (lockResult.code === 404) {
          throw new Error('Event not found');
        } else {
          throw new Error('Failed to acquire edit lock');
        }
      } catch (error) {
        throw new Error(`Event lock failed: ${error.message}`);
      }
    },

    unlockEvent: async (_, { id }, { req }) => {
      const token = req.headers.authorization;
      const decoded = getUserFromToken(token);
      
      if (!decoded) {
        throw new Error('Authentication required');
      }

      try {
        const unlockResult = await releaseEditLock(id, decoded.userId);
        
        if (unlockResult.code === 200) {
          const event = await Event.findById(id).lean();
          return transformEvent(event);
        } else if (unlockResult.code === 403) {
          throw new Error(unlockResult.message);
        } else {
          throw new Error('Failed to release edit lock');
        }
      } catch (error) {
        throw new Error(`Event unlock failed: ${error.message}`);
      }
    }
  },

  Event: {
    vouchers: async (parent) => {
      return await Voucher.find({ eventId: parent._id })
        .sort({ createdAt: -1 });
    }
  }
};

module.exports = eventResolvers;
