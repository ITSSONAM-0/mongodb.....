// ========================================
// MongoDB Indexing & Performance Optimization
// Run: node 04-indexing-performance.js
// ========================================

const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function indexingExamples() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('performance_db');
    const users = db.collection('users');

    // Clear and create large dataset
    await users.deleteMany({});
    console.log('Creating 10,000 test documents...');
    
    const testData = [];
    for (let i = 0; i < 10000; i++) {
      testData.push({
        name: `User ${i}`,
        email: `user${i}@example.com`,
        age: 18 + Math.floor(Math.random() * 50),
        country: ['USA', 'UK', 'India', 'Canada', 'Australia'][Math.floor(Math.random() * 5)],
        status: ['active', 'inactive'][Math.floor(Math.random() * 2)],
        createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000)
      });
    }
    await users.insertMany(testData);
    console.log('✅ Created 10,000 documents\n');

    // ==================== Without Index ====================
    console.log('--- Query WITHOUT Index ---');
    
    let startTime = Date.now();
    const resultNoIndex = await users.find({ email: 'user5000@example.com' }).toArray();
    let endTime = Date.now();
    
    console.log('Result:', resultNoIndex.length);
    console.log('Time taken:', endTime - startTime, 'ms');
    
    // Explain query plan
    const explainNoIndex = await users.find({ email: 'user5000@example.com' }).explain('executionStats');
    console.log('Documents examined:', explainNoIndex.executionStats.totalDocsExamined);
    console.log('Index used:', explainNoIndex.executionStats.executionStages.stage);

    // ==================== Create Single Field Index ====================
    console.log('\n--- Creating Index on Email ---');
    
    await users.createIndex({ email: 1 });  // 1 = ascending, -1 = descending
    console.log('✅ Index created');

    // ==================== With Index ====================
    console.log('\n--- Query WITH Index ---');
    
    startTime = Date.now();
    const resultWithIndex = await users.find({ email: 'user5000@example.com' }).toArray();
    endTime = Date.now();
    
    console.log('Result:', resultWithIndex.length);
    console.log('Time taken:', endTime - startTime, 'ms');
    
    const explainWithIndex = await users.find({ email: 'user5000@example.com' }).explain('executionStats');
    console.log('Documents examined:', explainWithIndex.executionStats.totalDocsExamined);
    console.log('Index used:', explainWithIndex.executionStats.executionStages.stage);

    // ==================== Compound Index ====================
    console.log('\n--- Compound Index (Country + Age) ---');
    
    await users.createIndex({ country: 1, age: -1 });
    
    const compoundQuery = await users.find({
      country: 'USA',
      age: { $gte: 30 }
    }).explain('executionStats');
    
    console.log('Index used:', compoundQuery.executionStats.executionStages.inputStage?.indexName || 'COLLSCAN');
    console.log('Documents examined:', compoundQuery.executionStats.totalDocsExamined);

    // ==================== Text Index ====================
    console.log('\n--- Text Index for Search ---');
    
    await users.createIndex({ name: 'text' });
    
    const searchResults = await users.find({
      $text: { $search: 'User 100' }
    }).toArray();
    
    console.log('Search results:', searchResults.length);

    // ==================== Covered Query ====================
    console.log('\n--- Covered Query (All fields in index) ---');
    
    await users.createIndex({ name: 1, email: 1 });
    
    const coveredQuery = await users.find(
      { name: 'User 100' },
      { projection: { name: 1, email: 1, _id: 0 } }
    ).explain('executionStats');
    
    console.log('Total docs examined:', coveredQuery.executionStats.totalDocsExamined);
    console.log('Is covered?:', coveredQuery.executionStats.executionStages.stage === 'PROJECTION_COVERED');

    // ==================== Unique Index ====================
    console.log('\n--- Unique Index ---');
    
    // Email is already indexed, make it unique
    await users.dropIndex('email_1');
    await users.createIndex({ email: 1 }, { unique: true });
    
    try {
      await users.insertOne({
        name: 'Duplicate',
        email: 'user100@example.com'  // Already exists
      });
    } catch (error) {
      console.log('Duplicate prevented:', error.message.includes('duplicate'));
    }

    // ==================== Partial Index ====================
    console.log('\n--- Partial Index (Conditional) ---');
    
    await users.createIndex(
      { status: 1 },
      {
        partialFilterExpression: { status: 'active' }
      }
    );
    
    console.log('✅ Partial index created (only for active users)');

    // ==================== TTL Index ====================
    console.log('\n--- TTL Index (Auto-delete) ---');
    
    const sessions = db.collection('sessions');
    await sessions.deleteMany({});
    
    // Create TTL index - delete documents after 1 hour
    await sessions.createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: 3600 }
    );
    
    await sessions.insertOne({
      sessionId: 'abc123',
      userId: 'user1',
      createdAt: new Date()
    });
    
    console.log('✅ TTL index created (expires in 1 hour)');

    // ==================== List All Indexes ====================
    console.log('\n--- All Indexes on Users Collection ---');
    
    const indexes = await users.indexes();
    indexes.forEach(index => {
      console.log(`- ${index.name}:`, index.key);
    });

    // ==================== Index Statistics ====================
    console.log('\n--- Index Statistics ---');
    
    const stats = await users.stats();
    console.log('Total indexes:', stats.nindexes);
    console.log('Total index size:', Math.round(stats.totalIndexSize / 1024), 'KB');

    // ==================== ESR Rule Example ====================
    console.log('\n--- ESR Rule (Equality, Sort, Range) ---');
    
    // Query: Find USA users, sort by name, age > 25
    // Optimal index: { country: 1, name: 1, age: 1 }
    
    await users.createIndex({ country: 1, name: 1, age: 1 });
    
    const esrQuery = await users.find({
      country: 'USA',  // Equality
      age: { $gt: 25 }  // Range
    })
    .sort({ name: 1 })  // Sort
    .explain('executionStats');
    
    console.log('Index used:', esrQuery.executionStats.executionStages.inputStage?.indexName || 'Unknown');
    console.log('Docs examined:', esrQuery.executionStats.totalDocsExamined);

    // ==================== Drop Index ====================
    console.log('\n--- Dropping Unused Indexes ---');
    
    await users.dropIndex('name_text');
    console.log('✅ Dropped text index');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\n✅ Connection closed');
  }
}

indexingExamples();