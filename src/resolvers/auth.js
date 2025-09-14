const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

const generateToken = (user) => {
  return jwt.sign(
    { 
      userId: user._id, 
      email: user.email, 
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

const authResolvers = {
  Mutation: {
    register: async (_, { input }) => {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({
          $or: [{ email: input.email }, { username: input.username }]
        });

        if (existingUser) {
          throw new Error('User with this email or username already exists');
        }

        // Create new user
        const user = new User(input);
        await user.save();

        // Generate token
        const token = generateToken(user);

        return {
          token,
          user
        };
      } catch (error) {
        throw new Error(`Registration failed: ${error.message}`);
      }
    },

    login: async (_, { input }) => {
      try {
        // Find user by email
        const user = await User.findOne({ email: input.email });
        if (!user) {
          throw new Error('Invalid email or password');
        }

        // Check if user is active
        if (!user.isActive) {
          throw new Error('Account is deactivated');
        }

        // Verify password
        const isValidPassword = await user.comparePassword(input.password);
        if (!isValidPassword) {
          throw new Error('Invalid email or password');
        }

        // Generate token
        const token = generateToken(user);

        return {
          token,
          user
        };
      } catch (error) {
        throw new Error(`Login failed: ${error.message}`);
      }
    }
  }
};

module.exports = authResolvers;
