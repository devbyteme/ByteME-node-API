const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    maxlength: [50, 'Category name cannot exceed 50 characters'],
    lowercase: true
  },
  displayName: {
    type: String,
    required: [true, 'Display name is required'],
    trim: true,
    maxlength: [50, 'Display name cannot exceed 50 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  icon: {
    type: String,
    default: null
  },
  color: {
    type: String,
    default: '#6366f1' // Default indigo color
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
categorySchema.index({ vendorId: 1, name: 1 }, { unique: true });
categorySchema.index({ vendorId: 1, sortOrder: 1 });

// Ensure category name is unique per vendor
categorySchema.pre('save', function(next) {
  // Convert name to lowercase and remove special characters for consistency
  if (this.name) {
    this.name = this.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_');
  }
  next();
});

// Static method to get default categories for a new vendor
categorySchema.statics.createDefaultCategories = async function(vendorId) {
  const defaultCategories = [
    { name: 'appetizers', displayName: 'Appetizers', description: 'Starters and small plates', sortOrder: 1 },
    { name: 'mains', displayName: 'Main Courses', description: 'Primary dishes and entrees', sortOrder: 2 },
    { name: 'desserts', displayName: 'Desserts', description: 'Sweet treats and desserts', sortOrder: 3 },
    { name: 'beverages', displayName: 'Beverages', description: 'Non-alcoholic drinks', sortOrder: 4 },
    { name: 'wine', displayName: 'Wine', description: 'Wine selection', sortOrder: 5 },
    { name: 'cocktails', displayName: 'Cocktails', description: 'Mixed drinks and cocktails', sortOrder: 6 },
    { name: 'coffee', displayName: 'Coffee & Tea', description: 'Hot beverages', sortOrder: 7 }
  ];

  const categories = defaultCategories.map(cat => ({
    ...cat,
    vendorId
  }));

  return this.insertMany(categories);
};

module.exports = mongoose.model('Category', categorySchema);
