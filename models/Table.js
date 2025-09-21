const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema({
  number: {
    type: String,
    required: [true, 'Table number is required'],
    trim: true
  },
  status: {
    type: String,
    enum: ['available', 'occupied', 'reserved', 'maintenance'],
    default: 'available'
  },
  location: {
    type: String,
    trim: true,
    default: 'indoor'
  },
  capacity: {
    type: Number,
    required: [true, 'Table capacity is required'],
    min: [1, 'Table capacity must be at least 1'],
    max: [20, 'Table capacity cannot exceed 20']
  },
  qrCode: {
    type: String,
    default: null
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  currentOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  lastCleaned: {
    type: Date,
    default: Date.now
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
  }
}, {
  timestamps: true
});

// Index for better query performance
tableSchema.index({ vendorId: 1, status: 1 });
tableSchema.index({ number: 1, vendorId: 1 }, { unique: true }); // Make number unique per vendor
tableSchema.index({ status: 1, isActive: 1 });

// Update the updatedAt field before saving
tableSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to check if table is available
tableSchema.methods.isAvailable = function() {
  return this.status === 'available' && this.isActive;
};

// Method to reserve table
tableSchema.methods.reserve = function() {
  if (this.isAvailable()) {
    this.status = 'reserved';
    return true;
  }
  return false;
};

// Method to occupy table
tableSchema.methods.occupy = function() {
  if (this.status === 'available' || this.status === 'reserved') {
    this.status = 'occupied';
    return true;
  }
  return false;
};

// Method to free table
tableSchema.methods.free = function() {
  if (this.status === 'occupied' || this.status === 'reserved') {
    this.status = 'available';
    this.currentOrder = null;
    return true;
  }
  return false;
};

module.exports = mongoose.model('Table', tableSchema); 