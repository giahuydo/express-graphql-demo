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
 * Request edit lock for a specific event
 * @param {string} eventId - Event ID
 * @param {string} userId - ID of the user requesting the lock
 * @returns {{
*   code: number,
*   message: string,
*   eventId: string,
*   lockUntil: Date|null,
*   event?: object
* }}
*/
const requestEditLock = async (eventId, userId) => {
 const Event = require('../models/Event');
 const mongoose = require('mongoose');
 const session = await mongoose.startSession();
 session.startTransaction();

 try {
   const now = new Date();

   // Try to atomically acquire the lock:
   // Conditions:
   //   - No one is editing (`editingBy: null`)
   //   - Or the existing lock has expired (`editLockAt < now`)
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
         editLockAt: new Date(now.getTime() + EDIT_TIMEOUT_MS) // set new lock expiration
       }
     },
     {
       new: true,    // return the updated document
       session,
       upsert: false // do NOT create a new event if not found
     }
   );

   // If no event was updated, check why:
   if (!event) {
     let lockedEvent;
     try {
       // Try reading within the same session
       lockedEvent = await Event.findById(eventId).session(session);
     } catch (_) {
       // Fallback if session is not supported (e.g., in tests)
       lockedEvent = await Event.findById(eventId);
     }

     // If event exists and is currently locked
     if (lockedEvent?.editingBy && lockedEvent?.editLockAt && lockedEvent.editLockAt > now) {
       // If the current user already owns the lock
       if (String(lockedEvent.editingBy) === String(userId)) {
         await session.abortTransaction();
         return {
           code: 200,
           message: 'Already editing',
           eventId,
           lockUntil: lockedEvent.editLockAt,
           event: transformEvent ? transformEvent(lockedEvent.toObject()) : lockedEvent.toObject()
         };
       }

       // Lock is owned by another user
       await session.abortTransaction();
       return {
         code: 409,
         message: 'Event is being edited by another user',
         eventId,
         lockUntil: lockedEvent.editLockAt
       };
     }

     // If no event found or lock is invalid → treat as "not found"
     await session.abortTransaction();
     return {
       code: 404,
       message: 'Event not found',
       eventId,
       lockUntil: null
     };
   }

   // Lock successfully acquired
   await session.commitTransaction();
   return {
     code: 200,
     message: 'Edit lock acquired',
     eventId,
     lockUntil: event.editLockAt,
     event: transformEvent ? transformEvent(event.toObject()) : event.toObject()
   };
 } catch (error) {
   // On error, abort transaction
   await session.abortTransaction();
   throw error;
 } finally {
   // Always end session
   session.endSession();
 }
};

/**
 * Release edit lock for a specific event
 * @param {string} eventId - Event ID
 * @param {string} userId - ID of the user releasing the lock
 * @returns {{
*   code:number,
*   message:string,
*   eventId:string,
*   lockUntil:null,
*   event?:object
* }}
*/
const releaseEditLock = async (eventId, userId) => {
  const Event = require('../models/Event');
  const mongoose = require('mongoose');

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1) Try atomic unlock only if the caller is the current owner
    const unlocked = await Event.findOneAndUpdate(
      { _id: eventId, editingBy: new mongoose.Types.ObjectId(userId) },
      { $set: { editingBy: null, editLockAt: null } },
      { new: true, session, upsert: false }
    );

    if (unlocked) {
      await session.commitTransaction();
      return {
        code: 200,
        message: 'Edit lock released',
        eventId,
        lockUntil: null,
        event: transformEvent ? transformEvent(unlocked.toObject()) : unlocked.toObject(),
      };
    }

    // 2) Not updated → figure out WHY (404 vs 403)
    //    Read minimal fields to avoid heavy doc load.
    let current;
    try {
      current = await Event.findById(eventId)
        .select('_id editingBy editLockAt')
        .session(session);
    } catch {
      current = await Event.findById(eventId).select('_id editingBy editLockAt');
    }

    if (!current) {
      await session.abortTransaction();
      return {
        code: 404,
        message: 'Event not found',
        eventId,
        lockUntil: null,
      };
    }

    // Event exists but caller is not the editing user (or lock already cleared/expired/owned by someone else)
    await session.abortTransaction();
    return {
      code: 403,
      message: 'You are not the editing user',
      eventId,
      lockUntil: current.editLockAt ?? null,
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
 * @returns {{
*   code: number,
*   message: string,
*   eventId: string,
*   lockUntil: Date|null,
*   event?: object
* }}
*/
const maintainEditLock = async (eventId, userId) => {
 const Event = require('../models/Event');
 const mongoose = require('mongoose');
 const session = await mongoose.startSession();
 session.startTransaction();

 try {
   const now = new Date();
   const newExpiresAt = new Date(now.getTime() + EDIT_TIMEOUT_MS);
   // Try to extend lock atomically if this user is the owner and lock still valid
   const event = await Event.findOneAndUpdate(
     {
       _id: eventId,
       editingBy: new mongoose.Types.ObjectId(userId),
       editLockAt: { $gt: now },
     },
     { $set: { editLockAt: newExpiresAt } },
     { new: true, session }
   );

   if (event) {
     await session.commitTransaction();

     return {
       code: 200,
       message: 'Edit lock extended',
       eventId,
       lockUntil: event.editLockAt,
       event: transformEvent ? transformEvent(event.toObject()) : event.toObject(),
     };
   }

   // No event updated → check why
   let current;
   try {
     current = await Event.findById(eventId)
       .select('_id editingBy editLockAt')
       .session(session);
   } catch {
     current = await Event.findById(eventId).select('_id editingBy editLockAt');
   }

   if (!current) {
     await session.abortTransaction();
     return {
       code: 404,
       message: 'Event not found',
       eventId,
       lockUntil: null,
     };
   }

   // Event exists but either expired or owned by another user
   await session.abortTransaction();
   if (String(current.editingBy) !== String(userId)) {
     return {
       code: 403,
       message: 'You are not the editing user',
       eventId,
       lockUntil: current.editLockAt,
     };
   }

   return {
     code: 409,
     message: 'Edit lock expired',
     eventId,
     lockUntil: current.editLockAt,
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
