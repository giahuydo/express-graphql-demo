const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Event = require("../models/Event");
const Voucher = require("../models/Voucher");
const {
  isEventLocked,
  requestEditLock,
  releaseEditLock,
  maintainEditLock,
} = require("../utils/lockManager");
const { paginateModel } = require("../utils/pagination");
const queueService = require("../services/queueService");

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";

const getUserFromToken = (token) => {
  try {
    if (!token) return null;
    return jwt.verify(token.replace("Bearer ", ""), JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Transform function for events
const transformEvent = (event) => {
  if (!event) return null;

  return {
    id: event.id ?? event._id?.toString(),
    ...event,
    availableQuantity: event.maxQuantity - event.issuedCount,
    isFullyIssued: event.issuedCount >= event.maxQuantity,
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
          searchableFields: ["name", "description"],
          fieldTypes: {
            name: { type: "string" },
            description: { type: "string" },
            issuedCount: {
              type: "number",
              operators: ["gte", "lte", "gt", "lt"],
            },
            maxQuantity: {
              type: "number",
              operators: ["gte", "lte", "gt", "lt"],
            },
          },
          limit,
          offset,
          sort: { createdAt: -1 },
        });

        return result.data;
      } catch (error) {
        throw new Error(`Failed to fetch events: ${error.message}`);
      }
    },

    event: async (_, { id }) => {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid event ID");
      }

      const event = await Event.findById(id).lean();
      if (!event) {
        throw new Error("Event not found");
      }
      return transformEvent(event);
    },

    activeEvents: async (_, { limit = 10 }) => {
      const events = await Event.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      return events.map(transformEvent);
    },
  },

  Mutation: {
    createEvent: async (_, { input }, { req }) => {
      const token = req.headers.authorization;
      const decoded = getUserFromToken(token);

      if (!decoded) {
        throw new Error("Authentication required");
      }

      try {
        const event = new Event({
          ...input,
          issuedCount: 0, // default value
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
        throw new Error("Authentication required");
      }

      // Only admins can update events
      if (decoded.role !== "ADMIN") {
        throw new Error("Admin access required");
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid event ID");
      }

      try {
        // Check if event is locked by another user before updating
        const isLocked = await isEventLocked(id, decoded.userId);
        if (isLocked) {
          throw new Error("Event is currently being edited by another user");
        }

        const updated = await Event.findByIdAndUpdate(
          id,
          { $set: input },
          { new: true, runValidators: true }
        ).lean();

        if (!updated) {
          throw new Error("Event not found");
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
        throw new Error("Authentication required");
      }

      // Only admins can delete events
      if (decoded.role !== "ADMIN") {
        throw new Error("Admin access required");
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid event ID");
      }

      try {
        const deleted = await Event.findByIdAndDelete(id);
        if (!deleted) {
          throw new Error("Event not found");
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
        throw new Error("Authentication required");
      }

      // Only admins can activate events
      if (decoded.role !== "ADMIN") {
        throw new Error("Admin access required");
      }

      try {
        const updatedEvent = await Event.findByIdAndUpdate(
          id,
          { isActive: true, updatedAt: new Date() },
          { new: true, runValidators: true }
        ).lean();

        if (!updatedEvent) {
          throw new Error("Event not found");
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
        throw new Error("Authentication required");
      }

      // Only admins can deactivate events
      if (decoded.role !== "ADMIN") {
        throw new Error("Admin access required");
      }

      try {
        const updatedEvent = await Event.findByIdAndUpdate(
          id,
          { isActive: false, updatedAt: new Date() },
          { new: true, runValidators: true }
        ).lean();

        if (!updatedEvent) {
          throw new Error("Event not found");
        }

        return transformEvent(updatedEvent);
      } catch (error) {
        throw new Error(`Event deactivation failed: ${error.message}`);
      }
    },

    requestEditLockMe: async (_, { input }, { req }) => {
      const decoded = getUserFromToken(req.headers.authorization);
      if (!decoded) throw new Error("Authentication required");

      const r = await requestEditLock(input.eventId, decoded.userId);

      if (r.code === 200) {
        return {
          message: r.message,
          code: "REQUEST_EDIT_LOCK_SUCCESS",
          data: transformEvent(r.event),
          lockUntil: r.lockUntil?.toISOString?.() || null,
        };
      }
      if (r.code === 409) {
        return {
          message: "Event is already locked by another user",
          code: "EVENT_LOCKED_BY_ANOTHER_USER",
          data: null,
          lockUntil: r.lockUntil?.toISOString?.() || null,
        };
      }
      if (r.code === 404) {
        return {
          message: "Event not found",
          code: "EVENT_NOT_FOUND",
          data: null,
          lockUntil: null,
        };
      }
      return {
        message: "Failed to request edit lock",
        code: "REQUEST_EDIT_LOCK_FAILED",
        data: null,
        lockUntil: null,
      };
    },

    releaseEditLockMe: async (_, { input }, { req }) => {
      if (!input || !input.eventId) throw new Error("eventId is required");
      const decoded = getUserFromToken(req.headers.authorization);
      if (!decoded) throw new Error("Authentication required");
    
      const r = await releaseEditLock(input.eventId, decoded.userId);
    
      if (r.code === 200) {
        return {
          message: r.message,
          code: "RELEASE_EDIT_LOCK_SUCCESS",
          data: transformEvent(r.event),
          lockUntil: null,
        };
      }
      if (r.code === 403) {
        return {
          message: "You are not the editing user",
          code: "NOT_EDITING_USER",
          data: null,
          lockUntil: r.lockUntil ?? null,
        };
      }
      if (r.code === 404) {
        return {
          message: "Event not found",
          code: "EVENT_NOT_FOUND",
          data: null,
          lockUntil: null,
        };
      }
    
      return {
        message: "Release edit lock failed",
        code: "EVENT_EDITABLE_RELEASE_FAILED",
        data: null,
        lockUntil: null,
      };
    },

  },

  Event: {
    vouchers: async (parent) => {
      return await Voucher.find({ eventId: parent._id }).sort({
        createdAt: -1,
      });
    },
  },
};

module.exports = eventResolvers;
