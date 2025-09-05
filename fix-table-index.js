const mongoose = require('mongoose');
require('dotenv').config();

async function fixTableIndex() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/byteme_restaurant';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB successfully');

    // Get the database connection
    const db = mongoose.connection.db;
    
    // Try to drop the old index on 'number' field (if it exists)
    console.log('Checking for old index on number field...');
    try {
      await db.collection('tables').dropIndex('number_1');
      console.log('✅ Old index dropped successfully');
    } catch (dropError) {
      if (dropError.code === 27) {
        console.log('ℹ️  Index "number_1" was already removed, which is fine.');
      } else {
        console.log('ℹ️  No old index found to drop.');
      }
    }

    // Create the new compound index on { number: 1, vendorId: 1 }
    console.log('Creating new compound index on { number: 1, vendorId: 1 }...');
    try {
      await db.collection('tables').createIndex(
        { number: 1, vendorId: 1 }, 
        { unique: true, name: 'number_vendorId_unique' }
      );
      console.log('✅ New compound index created successfully');
    } catch (createError) {
      if (createError.code === 85) {
        console.log('ℹ️  Index already exists, which is fine.');
      } else {
        throw createError;
      }
    }

    console.log('\n🎉 Table index fix completed successfully!');
    console.log('You can now create tables with the same number for different vendors.');
    
  } catch (error) {
    console.error('❌ Error fixing table index:', error);
  } finally {
    // Close the connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
  }
}

// Run the fix
fixTableIndex();
