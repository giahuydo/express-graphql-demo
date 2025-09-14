const mongoose = require('mongoose');

const voucherSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  issuedTo: {
    type: String,
    required: true,
    trim: true
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update updatedAt field
voucherSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Ensure virtual fields are serialized
voucherSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

// Index for better query performance
voucherSchema.index({ code: 1 });
voucherSchema.index({ eventId: 1 });
voucherSchema.index({ issuedTo: 1 });
voucherSchema.index({ isUsed: 1 });

module.exports = mongoose.model('Voucher', voucherSchema);
