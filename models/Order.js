const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  menuItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 200
  }
});

const orderSchema = new mongoose.Schema({
  tableNumber: {
    type: String,
    required: [true, 'Table number is required'],
    trim: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Optional for walk-in customers
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  items: [orderItemSchema],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'preparing', 'ready', 'served', 'cancelled'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'mobile'],
    default: 'cash'
  },
  tipAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  tipPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  taxAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  taxRate: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  serviceChargeAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  serviceChargeRate: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  subtotal: {
    type: Number,
    min: 0,
    default: 0
  },
  specialRequests: {
    type: String,
    trim: true,
    maxlength: 300
  },
  customerPhone: {
    type: String,
    trim: true,
    maxlength: 20
  },
  customerEmail: {
    type: String,
    trim: true,
    maxlength: 100,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  },
  estimatedPreparationTime: {
    type: Number, // in minutes
    min: 0
  },
  actualPreparationTime: {
    type: Number, // in minutes
    min: 0
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
orderSchema.index({ vendorId: 1, status: 1 });
orderSchema.index({ tableNumber: 1 });
orderSchema.index({ customerId: 1 });
orderSchema.index({ createdAt: 1 });
orderSchema.index({ status: 1, createdAt: 1 });

// Calculate total amount before saving
orderSchema.pre('save', function(next) {
  const calculatedSubtotal = this.items.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);
  
  // Set subtotal if not already set
  if (this.subtotal === undefined || this.subtotal === 0) {
    this.subtotal = calculatedSubtotal;
  }
  
  // Calculate total amount including tax, service charge, and tip
  this.totalAmount = this.subtotal + (this.taxAmount || 0) + (this.serviceChargeAmount || 0) + (this.tipAmount || 0);
  
  this.updatedAt = Date.now();
  next();
});

// Virtual for calculatedSubtotal (without tax, service charge, and tip)
orderSchema.virtual('calculatedSubtotal').get(function() {
  return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
});

// Virtual for order summary
orderSchema.virtual('itemCount').get(function() {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Ensure virtuals are serialized
orderSchema.set('toJSON', { virtuals: true });
orderSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Order', orderSchema); 