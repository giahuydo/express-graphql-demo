const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Voucher = require('../models/Voucher');
const Event = require('../models/Event');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

const getUserFromToken = (token) => {
  try {
    if (!token) return null;
    return jwt.verify(token.replace('Bearer ', ''), JWT_SECRET);
  } catch (error) {
    return null;
  }
};

const voucherResolvers = {
  Query: {
    vouchers: async (_, { limit = 20, offset = 0, eventId, issuedTo, isUsed }) => {
      try {
        let query = {};

        // Apply filters
        if (eventId) query.eventId = eventId;
        if (issuedTo) query.issuedTo = issuedTo;
        if (isUsed !== undefined) query.isUsed = isUsed;

        const vouchers = await Voucher.find(query)
          .populate('eventId')
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(offset);

        return vouchers;
      } catch (error) {
        throw new Error(`Failed to fetch vouchers: ${error.message}`);
      }
    },

    voucher: async (_, { id }) => {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error('Invalid voucher ID');
      }

      const voucher = await Voucher.findById(id).populate('eventId');
      if (!voucher) {
        throw new Error('Voucher not found');
      }
      return voucher;
    },

    voucherByCode: async (_, { code }) => {
      const voucher = await Voucher.findOne({ code: code.toUpperCase() }).populate('eventId');
      if (!voucher) {
        throw new Error('Voucher not found');
      }
      return voucher;
    },

    eventVouchers: async (_, { eventId }) => {
      if (!mongoose.Types.ObjectId.isValid(eventId)) {
        throw new Error('Invalid event ID');
      }

      return await Voucher.find({ eventId })
        .populate('eventId')
        .sort({ createdAt: -1 });
    },

    userVouchers: async (_, { issuedTo }) => {
      return await Voucher.find({ issuedTo })
        .populate('eventId')
        .sort({ createdAt: -1 });
    }
  },

  Mutation: {
    createVoucher: async (_, { input }, { req }) => {
      const token = req.headers.authorization;
      const decoded = getUserFromToken(token);
      
      if (!decoded) {
        throw new Error('Authentication required');
      }

      // Only admins can create vouchers
      if (decoded.role !== 'admin') {
        throw new Error('Admin access required');
      }

      try {
        // Check if voucher code already exists
        const existingVoucher = await Voucher.findOne({ code: input.code.toUpperCase() });
        if (existingVoucher) {
          throw new Error('Voucher code already exists');
        }

        // Check if event exists
        const event = await Event.findById(input.eventId);
        if (!event) {
          throw new Error('Event not found');
        }

        const voucher = new Voucher({
          ...input,
          code: input.code.toUpperCase()
        });
        
        const saved = await voucher.save();
        return await Voucher.findById(saved._id).populate('eventId');
      } catch (error) {
        throw new Error(`Voucher creation failed: ${error.message}`);
      }
    },

    updateVoucher: async (_, { id, input }, { req }) => {
      const token = req.headers.authorization;
      const decoded = getUserFromToken(token);
      
      if (!decoded) {
        throw new Error('Authentication required');
      }

      // Only admins can update vouchers
      if (decoded.role !== 'admin') {
        throw new Error('Admin access required');
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error('Invalid voucher ID');
      }

      try {
        const voucher = await Voucher.findById(id);
        if (!voucher) {
          throw new Error('Voucher not found');
        }

        const updatedVoucher = await Voucher.findByIdAndUpdate(
          id,
          { ...input, updatedAt: new Date() },
          { new: true, runValidators: true }
        ).populate('eventId');

        return updatedVoucher;
      } catch (error) {
        throw new Error(`Voucher update failed: ${error.message}`);
      }
    },

    deleteVoucher: async (_, { id }, { req }) => {
      const token = req.headers.authorization;
      const decoded = getUserFromToken(token);
      
      if (!decoded) {
        throw new Error('Authentication required');
      }

      // Only admins can delete vouchers
      if (decoded.role !== 'admin') {
        throw new Error('Admin access required');
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error('Invalid voucher ID');
      }

      try {
        const voucher = await Voucher.findByIdAndDelete(id);
        if (!voucher) {
          throw new Error('Voucher not found');
        }
        return true;
      } catch (error) {
        throw new Error(`Voucher deletion failed: ${error.message}`);
      }
    },

    useVoucher: async (_, { id }, { req }) => {
      const token = req.headers.authorization;
      const decoded = getUserFromToken(token);
      
      if (!decoded) {
        throw new Error('Authentication required');
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error('Invalid voucher ID');
      }

      try {
        const voucher = await Voucher.findById(id);
        if (!voucher) {
          throw new Error('Voucher not found');
        }

        if (voucher.isUsed) {
          throw new Error('Voucher has already been used');
        }

        const updatedVoucher = await Voucher.findByIdAndUpdate(
          id,
          { isUsed: true, updatedAt: new Date() },
          { new: true, runValidators: true }
        ).populate('eventId');

        return updatedVoucher;
      } catch (error) {
        throw new Error(`Voucher usage failed: ${error.message}`);
      }
    },

    issueVoucherToUser: async (_, { input }, { req }) => {
      const token = req.headers.authorization;
      const decoded = getUserFromToken(token);
      
      if (!decoded) {
        throw new Error('Authentication required');
      }

      // Only admins can issue vouchers
      if (decoded.role !== 'admin') {
        throw new Error('Admin access required');
      }

      try {
        // Check if event exists
        const event = await Event.findById(input.eventId);
        if (!event) {
          throw new Error('Event not found');
        }

        // Check if event has available quantity
        if (event.issuedCount >= event.maxQuantity) {
          throw new Error('Event has reached maximum voucher limit');
        }

        // Generate unique voucher code
        const voucherCode = `VOUCHER-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        const voucher = new Voucher({
          eventId: input.eventId,
          code: voucherCode,
          issuedTo: input.issuedTo,
          isUsed: false
        });

        const saved = await voucher.save();

        // Update event issued count
        await Event.findByIdAndUpdate(input.eventId, {
          $inc: { issuedCount: 1 }
        });

        return await Voucher.findById(saved._id).populate('eventId');
      } catch (error) {
        throw new Error(`Voucher issuance failed: ${error.message}`);
      }
    }
  },

  Voucher: {
    event: async (parent) => {
      return await Event.findById(parent.eventId);
    }
  }
};

module.exports = voucherResolvers;
