const mongoose = require('mongoose');

const vendorAccessSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  grantedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  userEmail: {
    type: String,
    required: [true, 'User email is required'],
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  userName: {
    type: String,
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  // Simple access grant - admin users get full access to vendor data
  accessType: {
    type: String,
    enum: ['admin_access'],
    default: 'admin_access'
  },
  accessToken: {
    type: String,
    index: true,
    unique: true,
    sparse: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'revoked'],
    default: 'pending'
  },
  invitedAt: {
    type: Date,
    default: Date.now
  },
  acceptedAt: {
    type: Date
  },
  lastAccessedAt: {
    type: Date
  },
  expiresAt: {
    type: Date
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
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

// Indexes for better query performance
vendorAccessSchema.index({ vendorId: 1, userEmail: 1 }, { unique: true });
vendorAccessSchema.index({ userEmail: 1, status: 1 });
vendorAccessSchema.index({ grantedBy: 1 });
vendorAccessSchema.index({ status: 1 });
vendorAccessSchema.index({ accessToken: 1 });

// Update the updatedAt field before saving
vendorAccessSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to check if access is active
vendorAccessSchema.methods.isActive = function() {
  if (this.status !== 'active') return false;
  if (this.expiresAt && this.expiresAt < new Date()) return false;
  return true;
};

// Method to get access summary
vendorAccessSchema.methods.getAccessSummary = function() {
  return {
    id: this._id,
    vendorId: this.vendorId,
    userEmail: this.userEmail,
    userName: this.userName,
    accessType: this.accessType,
    status: this.status,
    invitedAt: this.invitedAt,
    acceptedAt: this.acceptedAt,
    lastAccessedAt: this.lastAccessedAt,
    expiresAt: this.expiresAt,
    isActive: this.isActive()
  };
};

module.exports = mongoose.model('VendorAccess', vendorAccessSchema);
