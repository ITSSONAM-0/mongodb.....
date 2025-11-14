// ========================================
// MongoDB with Mongoose (Node.js ORM)
// Run: node 03-mongoose-examples.js
// ========================================

const mongoose = require('mongoose');

// ==================== Schemas & Models ====================

// User Schema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters']
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email format']
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false  // Don't return in queries by default
  },
  age: {
    type: Number,
    min: [18, 'Must be at least 18'],
    max: 120
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'banned'],
    default: 'active'
  },
  profile: {
    bio: String,
    avatar: String,
    social: {
      twitter: String,
      linkedin: String
    }
  },
  hobbies: [String],
  credits: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true  // Adds createdAt and updatedAt
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ name: 'text' });  // Text search

// Virtual fields (computed properties)
userSchema.virtual('profileUrl').get(function() {
  return `/users/${this._id}`;
});

// Instance methods
userSchema.methods.isAdult = function() {
  return this.age >= 18;
};

// Static methods
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email });
};

// Middleware (hooks)
userSchema.pre('save', function(next) {
  console.log('About to save user:', this.name);
  next();
});

const User = mongoose.model('User', userSchema);

// Product Schema
const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  category: {
    type: String,
    required: true,
    enum: ['electronics', 'clothing', 'books', 'furniture']
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  stock: {
    type: Number,
    default: 0,
    min: 0
  },
  images: [String],
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  avgRating: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Auto-generate slug from name
productSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name.toLowerCase().replace(/\s+/g, '-');
  }
  next();
});

// Calculate average rating
productSchema.methods.updateAvgRating = function() {
  if (this.reviews.length === 0) {
    this.avgRating = 0;
  } else {
    const sum = this.reviews.reduce((acc, review) => acc + review.rating, 0);
    this.avgRating = sum / this.reviews.length;
  }
  return this.save();
};

const Product = mongoose.model('Product', productSchema);

// Order Schema (with references)
const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    quantity: {
      type: Number,
      min: 1,
      default: 1
    },
    price: Number  // Snapshot price at order time
  }],
  total: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  shippingAddress: {
    street: String,
    city: String,
    zipCode: String,
    country: String
  }
}, {
  timestamps: true
});

const Order = mongoose.model('Order', orderSchema);

// ==================== Main Function ====================

async function mongooseExamples() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/mongoose_practice');
    console.log('✅ Connected to MongoDB with Mongoose');

    // Clear existing data
    await User.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});

    // ==================== CREATE ====================
    console.log('\n--- CREATE Operations ---');

    // Create user
    const user1 = await User.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      age: 28,
      hobbies: ['reading', 'coding'],
      profile: {
        bio: 'Software Developer',
        social: {
          twitter: '@johndoe'
        }
      }
    });
    console.log('Created user:', user1.name);

    // Create multiple users
    const users = await User.insertMany([
      { name: 'Jane Smith', email: 'jane@example.com', password: 'pass123', age: 25 },
      { name: 'Bob Wilson', email: 'bob@example.com', password: 'pass123', age: 32 }
    ]);
    console.log('Created users:', users.length);

    // Create products
    const laptop = await Product.create({
      name: 'Gaming Laptop',
      category: 'electronics',
      price: 1299,
      stock: 50,
      images: ['laptop1.jpg', 'laptop2.jpg']
    });
    console.log('Created product:', laptop.slug);

    const book = await Product.create({
      name: 'JavaScript Guide',
      category: 'books',
      price: 29.99,
      stock: 100
    });

    // ==================== READ ====================
    console.log('\n--- READ Operations ---');

    // Find all
    const allUsers = await User.find();
    console.log('Total users:', allUsers.length);

    // Find one
    const john = await User.findOne({ email: 'john@example.com' });
    console.log('Found user:', john.name);

    // Find by ID
    const userById = await User.findById(user1._id);
    console.log('Found by ID:', userById.name);

    // Find with conditions
    const adults = await User.find({ age: { $gte: 25 } });
    console.log('Adults:', adults.length);

    // Select specific fields
    const names = await User.find().select('name email -_id');
    console.log('Names:', names.map(u => u.name));

    // Sorting and limiting
    const topUsers = await User.find().sort({ age: -1 }).limit(2);
    console.log('Oldest users:', topUsers.map(u => u.name));

    // Count
    const activeCount = await User.countDocuments({ status: 'active' });
    console.log('Active users:', activeCount);

    // Text search
    const searchResults = await User.find({ $text: { $search: 'john' } });
    console.log('Search results:', searchResults.length);

    // ==================== UPDATE ====================
    console.log('\n--- UPDATE Operations ---');

    // Update one
    await User.updateOne(
      { email: 'john@example.com' },
      { $set: { status: 'active' } }
    );
    console.log('Updated user status');

    // Find and update
    const updatedUser = await User.findOneAndUpdate(
      { email: 'jane@example.com' },
      { $inc: { age: 1 } },
      { new: true }  // Return updated document
    );
    console.log('Updated age:', updatedUser.age);

    // Find by ID and update
    await User.findByIdAndUpdate(
      user1._id,
      { $push: { hobbies: 'gaming' } }
    );
    console.log('Added hobby');

    // ==================== DELETE ====================
    console.log('\n--- DELETE Operations ---');

    // Delete one (but we'll skip to keep data)
    // await User.deleteOne({ email: 'temp@example.com' });

    // ==================== RELATIONSHIPS & POPULATE ====================
    console.log('\n--- Relationships (Populate) ---');

    // Add review to product
    laptop.reviews.push({
      user: user1._id,
      rating: 5,
      comment: 'Excellent laptop!'
    });
    await laptop.updateAvgRating();
    console.log('Added review, avg rating:', laptop.avgRating);

    // Create order
    const order = await Order.create({
      orderNumber: 'ORD-2024-001',
      user: user1._id,
      items: [
        { product: laptop._id, quantity: 1, price: laptop.price },
        { product: book._id, quantity: 2, price: book.price }
      ],
      total: laptop.price + (book.price * 2),
      shippingAddress: {
        street: '123 Main St',
        city: 'New York',
        zipCode: '10001',
        country: 'USA'
      }
    });
    console.log('Created order:', order.orderNumber);

    // Populate (join) user and products
    const populatedOrder = await Order.findById(order._id)
      .populate('user', 'name email')  // Only get name and email
      .populate('items.product', 'name price');
    
    console.log('\nPopulated Order:');
    console.log('User:', populatedOrder.user.name);
    console.log('Items:', populatedOrder.items.map(item => ({
      product: item.product.name,
      quantity: item.quantity
    })));

    // ==================== AGGREGATION ====================
    console.log('\n--- Aggregation ---');

    const stats = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          avgPrice: { $avg: '$price' },
          count: { $sum: 1 }
        }
      }
    ]);
    console.log('Product stats:', stats);

    // ==================== TRANSACTIONS ====================
    console.log('\n--- Transactions ---');

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Deduct credits from user
      await User.findByIdAndUpdate(
        user1._id,
        { $inc: { credits: -10 } },
        { session }
      );

      // Reduce product stock
      await Product.findByIdAndUpdate(
        laptop._id,
        { $inc: { stock: -1 } },
        { session }
      );

      await session.commitTransaction();
      console.log('Transaction committed successfully');
    } catch (error) {
      await session.abortTransaction();
      console.log('Transaction aborted:', error.message);
    } finally {
      session.endSession();
    }

    // ==================== VIRTUAL FIELDS ====================
    console.log('\n--- Virtual Fields ---');

    const userWithVirtual = await User.findById(user1._id);
    console.log('Profile URL:', userWithVirtual.profileUrl);

    // ==================== CUSTOM METHODS ====================
    console.log('\n--- Custom Methods ---');

    console.log('Is adult?', userWithVirtual.isAdult());

    const foundUser = await User.findByEmail('john@example.com');
    console.log('Found by custom method:', foundUser.name);

    // ==================== VALIDATION ====================
    console.log('\n--- Validation ---');

    try {
      await User.create({
        name: 'Invalid',
        email: 'not-an-email',  // Invalid email
        password: '123'  // Too short
      });
    } catch (error) {
      console.log('Validation error:', error.message);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

mongooseExamples();