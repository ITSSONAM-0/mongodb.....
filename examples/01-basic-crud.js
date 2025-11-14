// ========================================
// MongoDB Basic CRUD Operations
// Run: node 01-basic-crud.js
// ========================================

const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function basicCRUD() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('practice_db');
    const users = db.collection('users');

    // ==================== CREATE ====================
    console.log('\n--- CREATE Operations ---');

    // Insert one
    const insertResult = await users.insertOne({
      name: 'John Doe',
      email: 'john@example.com',
      age: 28,
      hobbies: ['reading', 'coding'],
      address: {
        city: 'New York',
        country: 'USA'
      },
      createdAt: new Date()
    });
    console.log('Inserted user:', insertResult.insertedId);

    // Insert many
    await users.insertMany([
      { name: 'Jane Smith', email: 'jane@example.com', age: 25, status: 'active' },
      { name: 'Bob Wilson', email: 'bob@example.com', age: 32, status: 'inactive' },
      { name: 'Alice Brown', email: 'alice@example.com', age: 29, status: 'active' }
    ]);
    console.log('Inserted multiple users');

    // ==================== READ ====================
    console.log('\n--- READ Operations ---');

    // Find all
    const allUsers = await users.find({}).toArray();
    console.log('Total users:', allUsers.length);

    // Find one
    const user = await users.findOne({ email: 'john@example.com' });
    console.log('Found user:', user.name);

    // Find with conditions
    const activeUsers = await users.find({ status: 'active' }).toArray();
    console.log('Active users:', activeUsers.length);

    // Comparison operators
    const adultsOver30 = await users.find({ age: { $gt: 30 } }).toArray();
    console.log('Users over 30:', adultsOver30.length);

    // Multiple conditions (AND)
    const activeAdults = await users.find({
      status: 'active',
      age: { $gte: 25 }
    }).toArray();
    console.log('Active users 25+:', activeAdults.length);

    // OR operator
    const selected = await users.find({
      $or: [
        { age: { $lt: 26 } },
        { status: 'inactive' }
      ]
    }).toArray();
    console.log('Young or inactive users:', selected.length);

    // Projection (select specific fields)
    const names = await users.find({}, { projection: { name: 1, email: 1, _id: 0 } }).toArray();
    console.log('User names and emails:', names);

    // Sorting and limiting
    const topUsers = await users.find({})
      .sort({ age: -1 })  // Descending order
      .limit(2)
      .toArray();
    console.log('Top 2 oldest users:', topUsers.map(u => u.name));

    // ==================== UPDATE ====================
    console.log('\n--- UPDATE Operations ---');

    // Update one
    await users.updateOne(
      { email: 'john@example.com' },
      { $set: { status: 'active', lastLogin: new Date() } }
    );
    console.log('Updated John\'s status');

    // Update many
    const updateResult = await users.updateMany(
      { age: { $gte: 30 } },
      { $set: { category: 'senior' } }
    );
    console.log('Updated users:', updateResult.modifiedCount);

    // Increment operator
    await users.updateOne(
      { email: 'john@example.com' },
      { $inc: { age: 1 } }  // Increase age by 1
    );
    console.log('Incremented John\'s age');

    // Array operators
    await users.updateOne(
      { email: 'john@example.com' },
      { $push: { hobbies: 'gaming' } }  // Add to array
    );
    console.log('Added hobby to John');

    await users.updateOne(
      { email: 'john@example.com' },
      { $pull: { hobbies: 'reading' } }  // Remove from array
    );
    console.log('Removed hobby from John');

    // Upsert (update or insert)
    await users.updateOne(
      { email: 'new@example.com' },
      { $set: { name: 'New User', age: 20 } },
      { upsert: true }
    );
    console.log('Upserted new user');

    // ==================== DELETE ====================
    console.log('\n--- DELETE Operations ---');

    // Delete one
    await users.deleteOne({ email: 'new@example.com' });
    console.log('Deleted new user');

    // Delete many
    const deleteResult = await users.deleteMany({ status: 'inactive' });
    console.log('Deleted inactive users:', deleteResult.deletedCount);

    // Final count
    const finalCount = await users.countDocuments();
    console.log('\nFinal user count:', finalCount);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\n✅ Connection closed');
  }
}

basicCRUD();