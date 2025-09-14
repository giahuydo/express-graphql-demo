const mongoose = require('mongoose');

const EDIT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// Helper function to check if event is locked
const isEventLocked = async (eventId, userId = null) => {
  const Event = require('../models/Event');
  const event = await Event.findById(eventId);
  if (!event) return false;
  
  const now = new Date();
  return !!(event.editingBy && 
           event.editingBy !== userId && 
           event.editLockAt && 
           event.editLockAt > now);
};

/**
 * Request edit lock for a specific event
 * @param {string} eventId - Event ID
 * @param {string} userId - ID of the user requesting the lock
 * @returns {Object} Lock response with code, message, eventId, lockUntil
 */
const requestEditLock = async (eventId, userId) => {
  const Event = require('../models/Event');
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const now = new Date();
    
    // Use atomic operation to prevent race conditions
    const event = await Event.findOneAndUpdate(
      {
        _id: eventId,
        $or: [
          { editingBy: null },
          { editLockAt: { $lt: now } }
        ]
      },
      {
        $set: {
          editingBy: userId,
          editLockAt: new Date(now.getTime() + EDIT_TIMEOUT_MS)
        }
      },
      { 
        new: true, 
        session,
        upsert: false 
      }
    );

    if (!event) {
      // Check if event is locked by another user
      let lockedEvent;
      try {
        lockedEvent = await Event.findById(eventId).session(session);
      } catch (error) {
        // Fallback for test environment where session might not be supported
        lockedEvent = await Event.findById(eventId);
      }
      
      if (lockedEvent?.editingBy && lockedEvent?.editLockAt && lockedEvent.editLockAt > now) {
        // Check if the same user is already editing
        if (lockedEvent.editingBy === userId) {
          await session.abortTransaction();
          return {
            code: 200,
            message: 'Already editing',
            eventId,
            lockUntil: lockedEvent.editLockAt
          };
        }
        
        await session.abortTransaction();
        return {
          code: 409,
          message: 'Event is being edited by another user',
          eventId,
          lockUntil: lockedEvent.editLockAt
        };
      }
      
      await session.abortTransaction();
      return {
        code: 404,
        message: 'Event not found',
        eventId,
        lockUntil: null
      };
    }

    await session.commitTransaction();
    return {
      code: 200,
      message: 'Edit lock acquired',
      eventId,
      lockUntil: event.editLockAt
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Release edit lock for a specific event
 * @param {string} eventId - Event ID
 * @param {string} userId - ID of the user releasing the lock
 * @returns {Object} Lock response with code, message, eventId, lockUntil
 */
const releaseEditLock = async (eventId, userId) => {
  const Event = require('../models/Event');
  console.log(`[ReleaseEditLock] User ${userId} is requesting to release lock on event ${eventId}`);

  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Use atomic operation to prevent race conditions
    const event = await Event.findOneAndUpdate(
      {
        _id: eventId,
        editingBy: userId
      },
      {
        $set: {
          editingBy: null,
          editLockAt: null
        }
      },
      { 
        new: true, 
        session 
      }
    );

    if (!event) {
      await session.abortTransaction();
      console.warn(`[ReleaseEditLock] User ${userId} is not the editing user of event ${eventId}`);
      return {
        code: 403,
        message: 'You are not the editing user',
        eventId,
        lockUntil: null
      };
    }

    await session.commitTransaction();
    console.log(`[ReleaseEditLock] Lock released by user ${userId} on event ${eventId}`);
    return {
      code: 200,
      message: 'Edit lock released',
      eventId,
      lockUntil: null
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Extend (maintain) edit lock if still valid
 * @param {string} eventId - Event ID
 * @param {string} userId - ID of the user maintaining the lock
 * @returns {Object} Lock response with code, message, eventId, lockUntil
 */
const maintainEditLock = async (eventId, userId) => {
  const Event = require('../models/Event');
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const now = new Date();

    console.log(`[MaintainEditLock] ⏳ Now: ${now.toISOString()}`);
    console.log(`[MaintainEditLock] 🧑‍💻 userId: ${userId}`);
    console.log(`[MaintainEditLock] 🔍 Checking eventId: ${eventId}`);

    // Use atomic operation to prevent race conditions
    const event = await Event.findOneAndUpdate(
      {
        _id: eventId,
        editingBy: userId,
        editLockAt: { $gt: now }
      },
      {
        $set: {
          editLockAt: new Date(now.getTime() + EDIT_TIMEOUT_MS)
        }
      },
      { 
        new: true, 
        session 
      }
    );

    if (!event) {
      await session.abortTransaction();
      console.warn(`[MaintainEditLock] ⚠️ Edit lock not valid or expired for user: ${userId}`);
      return {
        code: 409,
        message: 'Edit lock not valid or expired',
        eventId,
        lockUntil: null
      };
    }

    await session.commitTransaction();
    console.log(`[MaintainEditLock] 🔁 Lock extended to: ${event.editLockAt?.toISOString()}`);

    return {
      code: 200,
      message: 'Edit lock extended',
      eventId,
      lockUntil: event.editLockAt
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

module.exports = {
  isEventLocked,
  requestEditLock,
  releaseEditLock,
  maintainEditLock
};
