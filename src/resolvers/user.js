const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Event = require('../models/Event');
const Voucher = require('../models/Voucher');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

const getUserFromToken = (token) => {
  try {
    if (!token) return null;
    return jwt.verify(token.replace('Bearer ', ''), JWT_SECRET);
  } catch (error) {
    return null;
  }
};

const userResolvers = {
  Query: {
    me: async (_, __, { req }) => {
      const token = req.headers.authorization;
      const decoded = getUserFromToken(token);
      
      if (!decoded) {
        throw new Error('Authentication required');
      }

      const user = await User.findById(decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }

      return user;
    },

    users: async (_, __, { req }) => {
      const token = req.headers.authorization;
      const decoded = getUserFromToken(token);
      
      if (!decoded || decoded.role !== 'ADMIN') {
        throw new Error('Admin access required');
      }

      return await User.find().sort({ createdAt: -1 });
    },

    user: async (_, { id }, { req }) => {
      const token = req.headers.authorization;
      const decoded = getUserFromToken(token);
      
      if (!decoded) {
        throw new Error('Authentication required');
      }

      // Users can only view their own profile unless they're admin
      if (decoded.userId !== id && decoded.role !== 'ADMIN') {
        throw new Error('Access denied');
      }

      const user = await User.findById(id);
      if (!user) {
        throw new Error('User not found');
      }

      return user;
    },


    userByEmail: async (_, { email }) => {
      const user = await User.findOne({ email });
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    }
  },

  Mutation: {
    updateProfile: async (_, { input }, { req }) => {
      const token = req.headers.authorization;
      const decoded = getUserFromToken(token);
      
      if (!decoded) {
        throw new Error('Authentication required');
      }

      try {
        const user = await User.findByIdAndUpdate(
          decoded.userId,
          { ...input, updatedAt: new Date() },
          { new: true, runValidators: true }
        );

        if (!user) {
          throw new Error('User not found');
        }

        return user;
      } catch (error) {
        throw new Error(`Profile update failed: ${error.message}`);
      }
    },

    changePassword: async (_, { input }, { req }) => {
      const token = req.headers.authorization;
      const decoded = getUserFromToken(token);
      
      if (!decoded) {
        throw new Error('Authentication required');
      }

      try {
        const user = await User.findById(decoded.userId);
        if (!user) {
          throw new Error('User not found');
        }

        // Verify current password
        const isValidPassword = await user.comparePassword(input.currentPassword);
        if (!isValidPassword) {
          throw new Error('Current password is incorrect');
        }

        // Update password
        user.password = input.newPassword;
        await user.save();

        return true;
      } catch (error) {
        throw new Error(`Password change failed: ${error.message}`);
      }
    }
  },

  User: {
    events: async (parent) => {
      return await Event.find().sort({ createdAt: -1 });
    },

    vouchers: async (parent) => {
      return await Voucher.find({ issuedTo: parent.name })
        .populate('eventId')
        .sort({ createdAt: -1 });
    }
  }
};

module.exports = userResolvers;
