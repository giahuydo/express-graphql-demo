const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Voucher = require('../models/Voucher');
const Event = require('../models/Event');
const queueService = require('../services/queueService');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

const getUserFromToken = (token) => {
  try {
    if (!token) return null;
    return jwt.verify(token.replace('Bearer ', ''), JWT_SECRET);
  } catch (error) {
    return null;
  }
};

function genVoucherCode() {
  return `VOUCHER-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

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
      if (decoded.role !== 'ADMIN') {
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
      if (decoded.role !== 'ADMIN') {
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
      if (decoded.role !== 'ADMIN') {
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

        // Add voucher used notification job to queue
        try {
          await queueService.addVoucherUsedNotificationJob({
            code: updatedVoucher.code,
            issuedTo: updatedVoucher.issuedTo,
          });
        } catch (notificationError) {
          console.error('❌ Failed to queue voucher used notification:', notificationError);
          // Don't fail voucher usage if notification fails
        }

        return updatedVoucher;
      } catch (error) {
        throw new Error(`Voucher usage failed: ${error.message}`);
      }
    },

    
    issueVoucherToUser: async (_, { input }, { req }) => {
      const decoded = getUserFromToken(req.headers.authorization);
      if (!decoded) throw new Error('Authentication required');
      if (decoded.role !== 'ADMIN') throw new Error('Admin access required');

      const session = await mongoose.startSession();
      let event, voucherDoc;

      try {
        await session.withTransaction(async () => {
          // 1) Atomically + condition: chỉ inc nếu còn slot
          event = await Event.findOneAndUpdate(
            {
              _id: input.eventId,
              isActive: { $ne: false },
              // chỉ tăng khi issuedCount < maxQuantity
              $expr: { $lt: ['$issuedCount', '$maxQuantity'] }
            },
            { $inc: { issuedCount: 1 } },
            { new: true, session }
          );

          if (!event) {
            throw new Error('Event not found or no more voucher slots available');
          }

          // 2) Tạo voucher trong cùng transaction (retry nếu trùng code)
          let attempts = 0;
          while (attempts < 3) {
            try {
              const code = genVoucherCode();
              const created = await Voucher.create([{
                eventId: event._id,
                code,
                issuedTo: input.issuedTo,
                isUsed: false
              }], { session });
              voucherDoc = created[0];
              break;
            } catch (e) {
              if (e && e.code === 11000) {
                attempts += 1; // duplicate key -> regen code
                continue;
              }
              throw e;
            }
          }

          if (!voucherDoc) {
            // Không tạo được code unique sau 3 lần → fail transaction
            throw new Error('Failed to generate unique voucher code');
          }
        });

        // 3) Ra ngoài transaction rồi mới queue mail (không block, không ảnh hưởng DB)
        try {
          await queueService.addVoucherEmailJob({
            email: input.issuedTo,
            name: input.issuedTo,
            voucherCode: voucherDoc.code,
            eventName: event.name,
            eventDescription: event.description,
          });
        } catch (emailErr) {
          console.error('❌ Failed to queue voucher email:', emailErr);
          // không throw để không làm fail issuance
        }

        // 4) Trả về voucher đã populate
        return await Voucher.findById(voucherDoc._id).populate('eventId');
      } catch (err) {
        // nếu có lỗi trong withTransaction thì đã auto abort
        throw new Error(`Voucher issuance failed: ${err.message}`);
      } finally {
        session.endSession();
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
