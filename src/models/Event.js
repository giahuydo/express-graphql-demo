const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true
  },
  maxQuantity: {
    type: Number,
    required: true,
    min: 1
  },
  issuedCount: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  editingBy: {
    type: String,
    default: null
  },
  editLockAt: {
    type: Date,
    default: null
  }
});

// Update updatedAt field
eventSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for available quantity
eventSchema.virtual('availableQuantity').get(function() {
  return this.maxQuantity - this.issuedCount;
});

// Virtual for isFullyIssued
eventSchema.virtual('isFullyIssued').get(function() {
  return this.issuedCount >= this.maxQuantity;
});

// Ensure virtual fields are serialized
eventSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

// Index for better query performance
eventSchema.index({ isActive: 1 });
eventSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Event', eventSchema);
