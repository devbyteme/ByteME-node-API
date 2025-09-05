const mongoose = require('mongoose');

const customerProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  loyaltyPoints: {
    type: Number,
    default: 0,
    min: 0
  },
  loyaltyTier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum'],
    default: 'bronze'
  },
  dietaryRestrictions: [{
    type: String,
    trim: true,
    enum: ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free', 'halal', 'kosher']
  }],
  allergies: [{
    type: String,
    trim: true
  }],
  favoriteItems: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem'
  }],
  preferredPaymentMethod: {
    type: String,
    enum: ['cash', 'card', 'mobile'],
    default: 'card'
  },
  deliveryAddresses: [{
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  }],
  orderHistory: [{
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    date: {
      type: Date,
      default: Date.now
    },
    total: Number,
    status: String
  }],
  preferences: {
    spiceLevel: {
      type: String,
      enum: ['mild', 'medium', 'hot', 'extra-hot'],
      default: 'medium'
    },
    portionSize: {
      type: String,
      enum: ['small', 'regular', 'large'],
      default: 'regular'
    },
    notificationPreferences: {
      orderUpdates: { type: Boolean, default: true },
      promotions: { type: Boolean, default: true },
      loyaltyRewards: { type: Boolean, default: true }
    }
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
customerProfileSchema.index({ userId: 1 });
customerProfileSchema.index({ loyaltyTier: 1 });
customerProfileSchema.index({ loyaltyPoints: 1 });

// Update the updatedAt field before saving
customerProfileSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to add loyalty points
customerProfileSchema.methods.addLoyaltyPoints = function(points) {
  this.loyaltyPoints += points;
  
  // Update loyalty tier based on points
  if (this.loyaltyPoints >= 1000) {
    this.loyaltyTier = 'platinum';
  } else if (this.loyaltyPoints >= 500) {
    this.loyaltyTier = 'gold';
  } else if (this.loyaltyPoints >= 100) {
    this.loyaltyTier = 'silver';
  } else {
    this.loyaltyTier = 'bronze';
  }
  
  return this.save();
};

// Method to get loyalty tier benefits
customerProfileSchema.methods.getLoyaltyBenefits = function() {
  const benefits = {
    bronze: ['Basic rewards'],
    silver: ['Basic rewards', 'Priority support', '5% discount'],
    gold: ['Basic rewards', 'Priority support', '10% discount', 'Free delivery'],
    platinum: ['Basic rewards', 'Priority support', '15% discount', 'Free delivery', 'VIP events']
  };
  
  return benefits[this.loyaltyTier] || [];
};

module.exports = mongoose.model('CustomerProfile', customerProfileSchema); 