# 🎯 Top 50 MongoDB Interview Questions

## Basic Level (1-10 LPA)

### 1. What is MongoDB and why use it?
**Answer:** MongoDB is a NoSQL document database that stores data in flexible, JSON-like BSON documents. We use it for:
- **Flexible schema** - Easy to modify data structure
- **Horizontal scalability** - Scale out across servers
- **High performance** - Fast read/write operations
- **Rich query language** - Supports complex queries and aggregations
- **Native JSON** - Works seamlessly with JavaScript/Node.js

**Example:** In an e-commerce app, product attributes vary (laptop has RAM, shirt has size). MongoDB handles this without ALTER TABLE statements.

---

### 2. Explain BSON vs JSON
**Answer:**
- **JSON**: Human-readable text format, limited data types (string, number, boolean, null, array, object)
- **BSON**: Binary JSON, supports additional types (Date, ObjectId, Binary, Decimal128, etc.)

**Example:**
```javascript
// JSON
{ "date": "2024-11-02" }  // String

// BSON
{ "date": ISODate("2024-11-02T00:00:00Z") }  // Date object
```

---

### 3. What is the document size limit?
**Answer:** 16MB per document. This prevents excessive RAM usage and ensures performance.

**Solution for large data:**
- Use **GridFS** for files > 16MB
- Implement **Subset Pattern** (store recent data, move historical to separate collection)
- Use **references** instead of embedding large arrays

---

### 4. Difference between find() and findOne()?
**Answer:**
- `find()` returns a **cursor** (pointer to multiple documents)
- `findOne()` returns a **single document** or null

```javascript
// Returns cursor (need .toArray())
const users = await db.users.find({ age: { $gt: 25 } }).toArray()

// Returns document directly
const user = await db.users.findOne({ email: 'john@example.com' })
```

---

### 5. What are indexes? Why are they important?
**Answer:** Indexes are data structures that improve query performance by creating a sorted reference to documents.

**Without index:** O(n) - Full collection scan  
**With index:** O(log n) - Binary search

**Example:**
```javascript
// Without index - scans all documents
db.users.find({ email: 'john@example.com' })  // Slow for 1M users

// Create index
db.users.createIndex({ email: 1 })

// Same query now uses index - much faster!
```

**Trade-off:** Indexes speed up reads but slow down writes (must update index).

---

### 6. Embedded vs Referenced documents - when to use which?
**Answer:**

**Embedded (Denormalization):**
- **Use when:** 1-to-1 or 1-to-few, data always accessed together
- **Pros:** Single query, atomic updates, better performance
- **Cons:** Document size limit, data duplication

**Referenced (Normalization):**
- **Use when:** 1-to-many, many-to-many, unbounded growth
- **Pros:** No duplication, flexible querying
- **Cons:** Multiple queries or $lookup needed

**Example:**
```javascript
// EMBEDDED - User with address (1-to-1)
{
  _id: 1,
  name: "John",
  address: {
    city: "NYC",
    zip: "10001"
  }
}

// REFERENCED - User with orders (1-to-many)
// Users collection
{ _id: 1, name: "John" }

// Orders collection
{ _id: 101, userId: 1, total: 500 }
{ _id: 102, userId: 1, total: 300 }
```

---

### 7. What is ObjectId? What does it contain?
**Answer:** ObjectId is a 12-byte unique identifier automatically generated for `_id`.

**Structure:**
- 4 bytes: Timestamp (seconds since Unix epoch)
- 5 bytes: Random value (machine/process identifier)
- 3 bytes: Counter (incremental)

**Usage:**
```javascript
const id = new ObjectId()
console.log(id.getTimestamp())  // Extract creation time

// Can sort by _id to get chronological order
db.posts.find().sort({ _id: -1 })  // Latest first
```

---

### 8. Explain $set, $inc, $push operators
**Answer:**

**$set** - Set/update field value:
```javascript
db.users.updateOne(
  { _id: 1 },
  { $set: { status: 'active', lastLogin: new Date() } }
)
```

**$inc** - Increment/decrement numeric value:
```javascript
db.products.updateOne(
  { _id: 1 },
  { $inc: { views: 1, stock: -1 } }  // views++, stock--
)
```

**$push** - Add to array:
```javascript
db.users.updateOne(
  { _id: 1 },
  { $push: { hobbies: 'gaming' } }
)
```

---

### 9. What is aggregation pipeline?
**Answer:** Aggregation pipeline processes documents through multiple stages for complex data transformations.

**Common stages:**
- `$match` - Filter documents
- `$group` - Group and aggregate
- `$project` - Reshape documents
- `$sort` - Sort results
- `$limit` - Limit results
- `$lookup` - Join collections

**Example:** Monthly sales report
```javascript
db.orders.aggregate([
  { $match: { status: 'completed' } },
  {
    $group: {
      _id: { $month: '$createdAt' },
      revenue: { $sum: '$total' },
      count: { $sum: 1 }
    }
  },
  { $sort: { _id: 1 } }
])
```

---

### 10. Difference between updateOne() and findOneAndUpdate()?
**Answer:**

**updateOne():**
- Updates document
- Returns: `{ matchedCount: 1, modifiedCount: 1 }`

**findOneAndUpdate():**
- Updates document
- Returns: The actual document (before or after update)

```javascript
// Just update
const result = await db.users.updateOne(
  { _id: 1 },
  { $inc: { credits: 10 } }
)
console.log(result.modifiedCount)  // 1

// Update and get document
const user = await db.users.findOneAndUpdate(
  { _id: 1 },
  { $inc: { credits: 10 } },
  { returnDocument: 'after' }  // Return updated doc
)
console.log(user.credits)  // 110
```

---

## Intermediate Level

### 11. What is $lookup? Give an example.
**Answer:** `$lookup` performs a left outer join with another collection.

**Example:** Orders with user details
```javascript
db.orders.aggregate([
  {
    $lookup: {
      from: 'users',           // Collection to join
      localField: 'userId',    // Field in orders
      foreignField: '_id',     // Field in users
      as: 'userDetails'        // Output array name
    }
  },
  {
    $unwind: '$userDetails'    // Convert array to object
  }
])

// Output:
{
  _id: 101,
  userId: 1,
  total: 500,
  userDetails: {
    _id: 1,
    name: "John",
    email: "john@example.com"
  }
}
```

---

### 12. ESR Rule for compound indexes?
**Answer:** **E**quality → **S**ort → **R**ange

When creating compound indexes, order fields by:
1. **Equality** conditions (exact match)
2. **Sort** fields
3. **Range** conditions ($gt, $lt, $in)

**Example:**
```javascript
// Query
db.users.find({
  country: 'USA',           // Equality
  age: { $gt: 25 }         // Range
}).sort({ name: 1 })       // Sort

// Optimal index
db.users.createIndex({ country: 1, name: 1, age: 1 })
//                     Equality    Sort     Range
```

---

### 13. What are covered queries?
**Answer:** A covered query is one where all fields are in the index, so MongoDB never accesses the actual documents.

**Example:**
```javascript
// Create compound index
db.users.createIndex({ name: 1, email: 1 })

// Covered query (only uses index)
db.users.find(
  { name: 'John' },
  { name: 1, email: 1, _id: 0 }  // Only indexed fields
)

// Not covered (accesses documents)
db.users.find(
  { name: 'John' },
  { name: 1, email: 1, age: 1 }  // 'age' not in index
)
```

**How to verify:**
```javascript
const explain = await db.users.find(...).explain('executionStats')
console.log(explain.executionStats.totalDocsExamined)  // Should be 0
```

---

### 14. Implement pagination efficiently
**Answer:** Two methods:

**Method 1: Offset-based (skip/limit)**
```javascript
const page = 2
const pageSize = 10

db.products.find()
  .skip((page - 1) * pageSize)
  .limit(pageSize)
```
**Problem:** Slow for large offsets (skip 10000 still scans 10000 docs)

**Method 2: Cursor-based (Recommended)**
```javascript
// First page
const firstPage = await db.products.find()
  .sort({ _id: -1 })
  .limit(10)

const lastId = firstPage[firstPage.length - 1]._id

// Next page
const nextPage = await db.products.find({ _id: { $lt: lastId } })
  .sort({ _id: -1 })
  .limit(10)
```
**Advantages:** Consistent, fast, works with infinite scroll

---

### 15. What are transactions? When to use them?
**Answer:** Transactions ensure multiple operations execute atomically (all or nothing).

**Single document:** Already atomic by default
**Multi-document:** Need explicit transactions (MongoDB 4.0+)

**Example:** Money transfer
```javascript
const session = await mongoose.startSession()
session.startTransaction()

try {
  // Debit account A
  await Account.updateOne(
    { _id: 'A' },
    { $inc: { balance: -100 } },
    { session }
  )
  
  // Credit account B
  await Account.updateOne(
    { _id: 'B' },
    { $inc: { balance: 100 } },
    { session }
  )
  
  await session.commitTransaction()
} catch (error) {
  await session.abortTransaction()
  throw error
} finally {
  session.endSession()
}
```

**When to use:**
- Financial transactions
- Inventory management
- Multi-step operations requiring consistency

**When to avoid:**
- Performance overhead
- Design schema to avoid (use embedded documents)

---

### 16. What is a replica set?
**Answer:** A replica set is a group of MongoDB instances maintaining the same data for high availability.

**Architecture:**
- **Primary:** Accepts writes and reads
- **Secondary (2+):** Replicate from primary, can serve reads
- **Automatic Failover:** If primary fails, secondaries elect new primary

**Benefits:**
- High availability (99.99% uptime)
- Data redundancy
- Read scaling (read from secondaries)
- Zero downtime maintenance

**Connection string:**
```javascript
mongodb://host1:27017,host2:27017,host3:27017/mydb?replicaSet=rs0
```

---

### 17. What is sharding?
**Answer:** Sharding distributes data across multiple servers for horizontal scaling.

**Components:**
- **Shards:** Store subset of data
- **Config servers:** Store metadata
- **Mongos:** Route queries to correct shards

**Example:**
```javascript
// Shard by userId
sh.shardCollection('mydb.users', { userId: 1 })

// Shard 1: userId 1-1000
// Shard 2: userId 1001-2000
// Shard 3: userId 2001+
```

**Good shard key:** High cardinality, even distribution (userId, orderId)  
**Bad shard key:** Low cardinality (status: active/inactive)

---

### 18. Write Concern vs Read Concern?
**Answer:**

**Write Concern:** How many nodes acknowledge write before success
```javascript
// Default: acknowledged by primary only
db.users.insertOne({ ... }, { writeConcern: { w: 1 } })

// Majority: acknowledged by majority
db.users.insertOne({ ... }, { writeConcern: { w: 'majority' } })

// No acknowledgment (fast but risky)
db.users.insertOne({ ... }, { writeConcern: { w: 0 } })
```

**Read Concern:** Staleness of data
```javascript
// Local: most recent (might be rolled back)
db.users.find().readConcern('local')

// Majority: data acknowledged by majority (durable)
db.users.find().readConcern('majority')
```

**Financial app:** Use `{ w: 'majority', j: true }` for writes and `readConcern: 'majority'` for reads.

---

### 19. GridFS - what and when?
**Answer:** GridFS stores files larger than 16MB by splitting them into chunks.

**Collections:**
- `fs.files` - Metadata (filename, size, upload date)
- `fs.chunks` - Binary chunks (255KB each)

**When to use:**
- Files > 16MB (videos, large PDFs)
- Streaming large files
- Need to retrieve parts of files

**Example:**
```javascript
// Upload
const bucket = new GridFSBucket(db)
fs.createReadStream('video.mp4')
  .pipe(bucket.openUploadStream('video.mp4'))

// Download
bucket.openDownloadStreamByName('video.mp4')
  .pipe(fs.createWriteStream('downloaded.mp4'))
```

**Alternative:** For smaller files, use cloud storage (AWS S3) and store only URL in MongoDB.

---

### 20. Schema validation in MongoDB?
**Answer:** Define rules to enforce data integrity.

```javascript
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'email', 'age'],
      properties: {
        name: {
          bsonType: 'string',
          minLength: 2,
          description: 'must be a string'
        },
        email: {
          bsonType: 'string',
          pattern: '^\\S+@\\S+\\.\\S+$',
          description: 'must be valid email'
        },
        age: {
          bsonType: 'int',
          minimum: 18,
          maximum: 120,
          description: 'must be 18-120'
        }
      }
    }
  },
  validationAction: 'error'  // or 'warn'
})
```

**With Mongoose:**
```javascript
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, minlength: 2 },
  email: { type: String, required: true, match: /^\S+@\S+\.\S+$/ },
  age: { type: Number, min: 18, max: 120 }
})
```

---

## Advanced Level

### 21. Design Patterns: Bucket Pattern
**Answer:** Group time-series data into buckets to reduce document count.

**Problem:** 1 million sensor readings = 1 million documents

**Solution:** Bucket by hour
```javascript
// Instead of
{ sensor: 123, time: '10:00:00', temp: 20 }
{ sensor: 123, time: '10:00:15', temp: 21 }
// ... 240 documents per hour

// Use
{
  sensor: 123,
  hour: ISODate('2024-11-02T10:00:00Z'),
  readings: [
    { time: '00', temp: 20 },
    { time: '15', temp: 21 },
    // ... all readings in this hour
  ],
  count: 240,
  avgTemp: 20.5
}
```

**Benefits:**
- 1/240th documents
- Faster queries
- Pre-aggregated stats

---

### 22. Design Patterns: Subset Pattern
**Answer:** Store frequently accessed subset in document, full data separately.

**Problem:** Product with 10,000 reviews (exceeds 16MB)

**Solution:**
```javascript
// Products collection
{
  _id: 'prod1',
  name: 'Laptop',
  // Only recent 10 reviews
  recentReviews: [
    { user: 'john', rating: 5, comment: 'Great!' },
    // ... 9 more
  ],
  reviewStats: {
    count: 10000,
    avgRating: 4.5
  }
}

// Reviews collection (full data)
{
  productId: 'prod1',
  page: 1,
  reviews: [ /* 100 reviews */ ]
}
```

---

### 23. Change Streams - what and use cases?
**Answer:** Change Streams listen to real-time database changes (insert, update, delete).

**Example:** Real-time notifications
```javascript
const changeStream = db.collection('messages').watch()

changeStream.on('change', (change) => {
  if (change.operationType === 'insert') {
    // Send notification
    io.emit('newMessage', change.fullDocument)
  }
})
```

**Use cases:**
- Real-time chat
- Live dashboards
- Data synchronization
- Event-driven architectures
- Audit logging

---

### 24. How to prevent NoSQL injection?
**Answer:**

**Vulnerable code:**
```javascript
// User sends: { email: { $ne: null } }
const email = req.body.email
const user = await db.users.findOne({ email })  // Returns any user!
```

**Solutions:**
```javascript
// 1. Type validation
const email = String(req.body.email)
if (!/^\S+@\S+\.\S+$/.test(email)) {
  throw new Error('Invalid email')
}

// 2. Mongoose (auto-sanitizes)
const user = await User.findOne({ email: req.body.email })

// 3. Sanitization library
const mongoSanitize = require('express-mongo-sanitize')
app.use(mongoSanitize())
```

---

### 25. Connection pooling - what and why?
**Answer:** Connection pool maintains multiple open connections to MongoDB for reuse.

**Without pooling:**
```
Request 1: Open → Query → Close
Request 2: Open → Query → Close  (slow!)
```

**With pooling:**
```
Pool: [Conn1, Conn2, Conn3, ...]
Request 1: Use Conn1 → Release
Request 2: Reuse Conn1  (fast!)
```

**Configuration:**
```javascript
const client = new MongoClient(uri, {
  maxPoolSize: 10,    // Max connections
  minPoolSize: 2,     // Min connections
  maxIdleTimeMS: 60000
})
```

**Benefits:**
- Faster queries (no connection overhead)
- Resource efficiency
- Better concurrency

---

## 🎯 Quick Fire Round (Common Short Questions)

**Q: Default port?**  
A: 27017

**Q: Max document size?**  
A: 16MB

**Q: Max collection size?**  
A: No limit (except disk space)

**Q: ACID in MongoDB?**  
A: Single document always ACID. Multi-document requires transactions (4.0+)

**Q: CAP theorem - where does MongoDB stand?**  
A: CP (Consistency + Partition tolerance). Can configure for AP with eventual consistency.

**Q: What is oplog?**  
A: Operation log - capped collection storing all write operations for replication

**Q: Difference between MongoDB and MySQL?**  
A: MongoDB is NoSQL (flexible schema, JSON, horizontal scaling). MySQL is SQL (fixed schema, tables, vertical scaling).

**Q: What is mongos?**  
A: Query router in sharded clusters - routes queries to correct shards

**Q: Can you rename a collection?**  
A: Yes, `db.collection.renameCollection('newName')`

**Q: How to backup MongoDB?**  
A: `mongodump` and `mongorestore`

---

## 🔥 Behavioral Questions

**Q: "Describe a challenging MongoDB issue you faced"**

**Sample Answer:**
> "In our e-commerce application, we noticed slow query performance on the products page loading top-rated products. Using `.explain()`, I found we were doing a full collection scan on 100K products. I created a compound index on `{ category: 1, avgRating: -1, price: 1 }` following the ESR rule since we filtered by category, sorted by rating, and had price range filters. This reduced query time from 2 seconds to 50ms. I also implemented the Subset Pattern to keep only recent reviews in product documents, moving historical reviews to a separate collection to prevent document size issues."

**Q: "How do you ensure data consistency in MongoDB?"**

**Sample Answer:**
> "I use multiple strategies: For single-document operations, MongoDB's default atomicity is sufficient. For multi-document operations like order placement (update inventory, create order, process payment), I use transactions with `{ writeConcern: { w: 'majority' } }` to ensure durability. I also implement schema validation with Mongoose to enforce data integrity at the application level, use unique indexes to prevent duplicates, and design schemas carefully - using embedded documents when data is always accessed together to maintain consistency within a single atomic write."

---

**Practice these questions daily. Good luck with your placement! 🚀**
