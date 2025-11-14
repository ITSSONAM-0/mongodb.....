# MongoDB Mastery for MERN Stack Interviews 🚀

> **Goal**: Master MongoDB concepts to crack 10 LPA+ placements with confidence

---

## 📚 Table of Contents

1. [MongoDB Fundamentals](#1-mongodb-fundamentals)
2. [CRUD Operations (Advanced)](#2-crud-operations-advanced)
3. [Indexing & Performance](#3-indexing--performance)
4. [Aggregation Framework](#4-aggregation-framework)
5. [Schema Design Patterns](#5-schema-design-patterns)
6. [Transactions & ACID](#6-transactions--acid)
7. [Replication & Sharding](#7-replication--sharding)
8. [Security Best Practices](#8-security-best-practices)
9. [Interview Questions & Answers](#9-interview-questions--answers)
10. [Real-World Project Examples](#10-real-world-project-examples)

---

## 1. MongoDB Fundamentals

### What is MongoDB?
MongoDB is a **NoSQL document database** that stores data in flexible, JSON-like documents (BSON format).

### Key Concepts You MUST Know:

#### **Database → Collections → Documents**
```
Database (e.g., "ecommerce")
  └── Collection (e.g., "users")
        └── Document (e.g., { _id: 1, name: "John" })
```

#### **BSON vs JSON**
- **JSON**: Human-readable, text-based
- **BSON**: Binary JSON, supports more data types (Date, ObjectId, Binary, etc.)

#### **Interview Answer Template:**
> "MongoDB is a NoSQL document database that stores data in BSON format. Unlike SQL databases with rigid schemas, MongoDB offers flexible schema design, making it ideal for applications with evolving data models. It's horizontally scalable through sharding and provides high availability through replica sets."

---

## 2. CRUD Operations (Advanced)

### Read Operations (Beyond .find())

#### **Comparison Operators**
```javascript
// Greater than, Less than
db.products.find({ price: { $gt: 100, $lt: 500 } })

// In array
db.users.find({ status: { $in: ['active', 'pending'] } })

// Not equal
db.products.find({ category: { $ne: 'electronics' } })

// Exists
db.users.find({ email: { $exists: true } })
```

#### **Logical Operators**
```javascript
// AND
db.products.find({
  $and: [
    { price: { $gt: 100 } },
    { category: 'electronics' }
  ]
})

// OR
db.products.find({
  $or: [
    { category: 'books' },
    { price: { $lt: 50 } }
  ]
})

// NOT
db.products.find({ price: { $not: { $gt: 100 } } })
```

#### **Array Query Operators**
```javascript
// Array contains element
db.users.find({ hobbies: 'reading' })

// All elements match
db.users.find({ hobbies: { $all: ['reading', 'coding'] } })

// Array size
db.users.find({ hobbies: { $size: 3 } })

// Element match (complex)
db.students.find({
  scores: {
    $elemMatch: { subject: 'math', score: { $gt: 80 } }
  }
})
```

#### **Projection (Select specific fields)**
```javascript
// Include only name and email
db.users.find({}, { name: 1, email: 1, _id: 0 })

// Exclude password
db.users.find({}, { password: 0 })
```

### Write Operations (Advanced)

#### **Update Operators**
```javascript
// $set - Set field value
db.users.updateOne(
  { _id: 1 },
  { $set: { status: 'active', lastLogin: new Date() } }
)

// $inc - Increment value
db.products.updateOne(
  { _id: 1 },
  { $inc: { views: 1, stock: -1 } }
)

// $push - Add to array
db.users.updateOne(
  { _id: 1 },
  { $push: { hobbies: 'gaming' } }
)

// $addToSet - Add to array (no duplicates)
db.users.updateOne(
  { _id: 1 },
  { $addToSet: { tags: 'premium' } }
)

// $pull - Remove from array
db.users.updateOne(
  { _id: 1 },
  { $pull: { hobbies: 'reading' } }
)

// $unset - Remove field
db.users.updateOne(
  { _id: 1 },
  { $unset: { tempField: '' } }
)

// $rename - Rename field
db.users.updateMany(
  {},
  { $rename: { 'name': 'fullName' } }
)
```

#### **Upsert (Update + Insert)**
```javascript
db.users.updateOne(
  { email: 'john@example.com' },
  { $set: { name: 'John', status: 'active' } },
  { upsert: true }  // Creates if not exists
)
```

#### **Bulk Write Operations**
```javascript
db.products.bulkWrite([
  {
    insertOne: {
      document: { name: 'Product A', price: 100 }
    }
  },
  {
    updateOne: {
      filter: { name: 'Product B' },
      update: { $set: { price: 200 } }
    }
  },
  {
    deleteOne: {
      filter: { name: 'Product C' }
    }
  }
])
```

---

## 3. Indexing & Performance

### Why Indexes Matter?
Without index: **O(n)** - Full collection scan  
With index: **O(log n)** - Binary search

### Creating Indexes

```javascript
// Single field index
db.users.createIndex({ email: 1 })  // 1 = ascending, -1 = descending

// Compound index
db.orders.createIndex({ userId: 1, orderDate: -1 })

// Unique index
db.users.createIndex({ email: 1 }, { unique: true })

// Text index (for search)
db.products.createIndex({ name: 'text', description: 'text' })

// TTL index (auto-delete after time)
db.sessions.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 3600 }  // 1 hour
)

// Partial index (conditional)
db.users.createIndex(
  { status: 1 },
  { partialFilterExpression: { status: 'active' } }
)
```

### Index Best Practices

1. **ESR Rule**: Equality → Sort → Range
```javascript
// Query
db.users.find({ country: 'USA', age: { $gt: 25 } }).sort({ name: 1 })

// Optimal index
db.users.createIndex({ country: 1, name: 1, age: 1 })
```

2. **Covered Queries** (All fields in index)
```javascript
db.users.createIndex({ name: 1, email: 1 })
db.users.find({ name: 'John' }, { name: 1, email: 1, _id: 0 })
// Never touches documents!
```

3. **Check Index Usage**
```javascript
db.users.find({ email: 'john@example.com' }).explain('executionStats')
```

### Interview Answer:
> "Indexes in MongoDB work like book indexes - they create a sorted data structure pointing to documents. I use single-field indexes for simple queries and compound indexes following the ESR rule (Equality, Sort, Range) for complex queries. For text search, I implement text indexes, and for temporary data like sessions, I use TTL indexes that auto-delete expired documents. I always verify index usage with .explain() to ensure optimal performance."

---

## 4. Aggregation Framework

The aggregation pipeline is MongoDB's **most powerful feature** for data processing.

### Pipeline Stages

#### **$match** - Filter documents
```javascript
db.orders.aggregate([
  { $match: { status: 'completed', total: { $gt: 100 } } }
])
```

#### **$group** - Group and accumulate
```javascript
// Total sales by category
db.products.aggregate([
  {
    $group: {
      _id: '$category',
      totalSales: { $sum: '$price' },
      avgPrice: { $avg: '$price' },
      count: { $sum: 1 },
      maxPrice: { $max: '$price' },
      minPrice: { $min: '$price' }
    }
  }
])
```

#### **$project** - Reshape documents
```javascript
db.users.aggregate([
  {
    $project: {
      fullName: { $concat: ['$firstName', ' ', '$lastName'] },
      year: { $year: '$createdAt' },
      isAdult: { $gte: ['$age', 18] }
    }
  }
])
```

#### **$lookup** - Join collections (SQL JOIN equivalent)
```javascript
db.orders.aggregate([
  {
    $lookup: {
      from: 'users',
      localField: 'userId',
      foreignField: '_id',
      as: 'userDetails'
    }
  },
  {
    $unwind: '$userDetails'  // Convert array to object
  }
])
```

#### **$sort** and **$limit**
```javascript
db.products.aggregate([
  { $sort: { price: -1 } },
  { $limit: 10 }  // Top 10 expensive products
])
```

#### **$unwind** - Deconstruct arrays
```javascript
// User has hobbies: ['reading', 'coding']
db.users.aggregate([
  { $unwind: '$hobbies' }
])
// Creates separate document for each hobby
```

### Real-World Aggregation Examples

#### **E-commerce: Monthly Sales Report**
```javascript
db.orders.aggregate([
  {
    $match: {
      orderDate: {
        $gte: new Date('2024-01-01'),
        $lt: new Date('2025-01-01')
      }
    }
  },
  {
    $group: {
      _id: {
        year: { $year: '$orderDate' },
        month: { $month: '$orderDate' }
      },
      totalRevenue: { $sum: '$total' },
      orderCount: { $sum: 1 },
      avgOrderValue: { $avg: '$total' }
    }
  },
  {
    $sort: { '_id.year': 1, '_id.month': 1 }
  }
])
```

#### **Social Media: Top 5 Users by Engagement**
```javascript
db.posts.aggregate([
  {
    $group: {
      _id: '$userId',
      totalLikes: { $sum: '$likes' },
      totalComments: { $sum: { $size: '$comments' } },
      postCount: { $sum: 1 }
    }
  },
  {
    $addFields: {
      engagementScore: {
        $add: ['$totalLikes', { $multiply: ['$totalComments', 2] }]
      }
    }
  },
  {
    $sort: { engagementScore: -1 }
  },
  {
    $limit: 5
  },
  {
    $lookup: {
      from: 'users',
      localField: '_id',
      foreignField: '_id',
      as: 'userInfo'
    }
  }
])
```

### Interview Answer:
> "The aggregation framework is MongoDB's equivalent to SQL's GROUP BY but far more powerful. I use it for complex data transformations like generating reports, analytics, and joining collections. For example, in an e-commerce project, I used $lookup to join orders with users, $group to calculate monthly revenue, and $project to compute derived fields. The key advantage is that aggregation happens on the database server, reducing network overhead."

---

## 5. Schema Design Patterns

### Embedded vs Referenced (Most Important!)

#### **Embedded Documents** (Denormalization)
**When to use:** 1-to-1 or 1-to-few relationships, data accessed together

```javascript
// User with embedded address
{
  _id: ObjectId('...'),
  name: 'John Doe',
  email: 'john@example.com',
  address: {
    street: '123 Main St',
    city: 'New York',
    zipCode: '10001'
  },
  orders: [
    { orderId: 1, total: 100, date: ISODate('...') },
    { orderId: 2, total: 200, date: ISODate('...') }
  ]
}
```

**Pros:**
- Single query to get all data
- Atomic updates
- Better performance

**Cons:**
- Document size limit (16MB)
- Data duplication
- Hard to query embedded data independently

#### **Referenced Documents** (Normalization)
**When to use:** 1-to-many or many-to-many, data grows unbounded

```javascript
// Users collection
{
  _id: ObjectId('user1'),
  name: 'John Doe',
  email: 'john@example.com'
}

// Orders collection
{
  _id: ObjectId('order1'),
  userId: ObjectId('user1'),  // Reference
  total: 100,
  items: [...]
}
```

**Pros:**
- No duplication
- No document size limit
- Flexible querying

**Cons:**
- Multiple queries or $lookup needed
- No atomic updates across collections

### Common Design Patterns

#### **1. Bucket Pattern** (Time-series data)
```javascript
// Instead of one document per reading
{
  sensor_id: 123,
  timestamp: ISODate('2024-01-01T00:00:00Z'),
  temperature: 20
}

// Bucket by hour
{
  sensor_id: 123,
  date: ISODate('2024-01-01T00:00:00Z'),
  readings: [
    { time: '00:00', temp: 20 },
    { time: '00:15', temp: 21 },
    // ... more readings
  ],
  count: 96,  // readings in this hour
  avgTemp: 20.5
}
```

#### **2. Subset Pattern** (Large arrays)
```javascript
// Instead of embedding all 10,000 reviews
{
  _id: ObjectId('product1'),
  name: 'Laptop',
  // Only recent 10 reviews
  recentReviews: [...],
  reviewCount: 10000,
  avgRating: 4.5
}

// Full reviews in separate collection
{
  productId: ObjectId('product1'),
  reviews: [...]
}
```

#### **3. Extended Reference Pattern**
```javascript
// Order with user reference + frequently accessed data
{
  _id: ObjectId('order1'),
  userId: ObjectId('user1'),
  // Denormalize frequently accessed user data
  userName: 'John Doe',
  userEmail: 'john@example.com',
  items: [...],
  total: 500
}
```

### Interview Answer:
> "Schema design in MongoDB depends on access patterns. I use embedded documents when data is always accessed together and has 1-to-few relationships, like user profiles with addresses. For 1-to-many relationships like users and orders, I use references to avoid document size limits. I've also implemented the Bucket pattern for IoT sensor data to reduce document count, and the Subset pattern to show recent reviews while keeping full reviews separate. The key is to design based on how the application queries the data, not just data relationships."

---

## 6. Transactions & ACID

### Single Document Transactions (Atomic by default)
```javascript
// Always atomic - all or nothing
db.accounts.updateOne(
  { _id: 1 },
  {
    $inc: { balance: -100 },
    $push: { transactions: { type: 'debit', amount: 100 } }
  }
)
```

### Multi-Document Transactions (MongoDB 4.0+)
```javascript
const session = db.getMongo().startSession()

session.startTransaction()

try {
  const accountsCol = session.getDatabase('bank').accounts
  
  // Debit from account A
  accountsCol.updateOne(
    { _id: 'accountA' },
    { $inc: { balance: -100 } },
    { session }
  )
  
  // Credit to account B
  accountsCol.updateOne(
    { _id: 'accountB' },
    { $inc: { balance: 100 } },
    { session }
  )
  
  session.commitTransaction()
} catch (error) {
  session.abortTransaction()
  throw error
} finally {
  session.endSession()
}
```

### In Node.js (Mongoose)
```javascript
const session = await mongoose.startSession()
session.startTransaction()

try {
  await User.updateOne(
    { _id: userId },
    { $inc: { credits: -10 } },
    { session }
  )
  
  await Product.create(
    [{ name: 'Item', userId }],
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

### Interview Answer:
> "MongoDB provides ACID guarantees at the document level by default. For operations spanning multiple documents, I use multi-document transactions introduced in MongoDB 4.0. For example, in a banking app, transferring money between accounts requires a transaction to ensure both debit and credit happen atomically. However, I avoid transactions when possible by designing schemas with embedded documents, as transactions have performance overhead and require replica sets."

---

## 7. Replication & Sharding

### Replication (High Availability)

**Replica Set:** Group of MongoDB instances with same data

```
Primary (Read/Write) ──┐
                       ├──> Automatic Failover
Secondary (Read) ──────┤
Secondary (Read) ──────┘
```

**Benefits:**
- High availability (automatic failover)
- Data redundancy
- Read scaling (read from secondaries)
- Zero downtime maintenance

**Connection String:**
```javascript
mongodb://host1:27017,host2:27017,host3:27017/mydb?replicaSet=rs0
```

### Sharding (Horizontal Scaling)

**Sharding:** Distributing data across multiple machines

```
Router (mongos)
    ├──> Shard 1 (users with _id < 1000)
    ├──> Shard 2 (users with _id 1000-2000)
    └──> Shard 3 (users with _id > 2000)
```

**Shard Key Selection:**
```javascript
// Good shard key: High cardinality, good distribution
db.users.createIndex({ userId: 1 })
sh.shardCollection('mydb.users', { userId: 1 })

// Bad: Low cardinality (few unique values)
// sh.shardCollection('mydb.users', { status: 1 })  ❌
```

### Interview Answer:
> "MongoDB uses replica sets for high availability - a primary node handles writes and automatically fails over to a secondary if it goes down. For horizontal scaling, MongoDB uses sharding to distribute data across multiple servers based on a shard key. In a high-traffic application, I'd configure a replica set with 3 nodes for redundancy and implement sharding on a high-cardinality field like userId or orderId to distribute load evenly across shards."

---

## 8. Security Best Practices

### 1. Authentication & Authorization
```javascript
// Create user with specific roles
db.createUser({
  user: 'appUser',
  pwd: 'securePassword',
  roles: [
    { role: 'readWrite', db: 'myapp' },
    { role: 'read', db: 'analytics' }
  ]
})

// Connection string with auth
mongodb://appUser:securePassword@localhost:27017/myapp
```

### 2. Network Security
- Enable authentication (`--auth`)
- Use TLS/SSL for connections
- Bind to specific IP addresses
- Use VPC/firewall rules

### 3. Input Validation (Prevent Injection)
```javascript
// ❌ DANGEROUS - NoSQL Injection
const email = req.body.email  // Could be { $ne: null }
db.users.findOne({ email })

// ✅ SAFE - Validate input
const email = String(req.body.email)
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  throw new Error('Invalid email')
}
db.users.findOne({ email })
```

### 4. Field-Level Encryption
```javascript
// Encrypt sensitive fields
{
  _id: ObjectId('...'),
  name: 'John Doe',
  ssn: Binary(encrypt('123-45-6789')),  // Encrypted
  creditCard: Binary(encrypt('4111-1111-1111-1111'))
}
```

### Interview Answer:
> "MongoDB security involves multiple layers. I implement role-based access control (RBAC) with principle of least privilege, use TLS for encrypted connections, and enable authentication on all deployments. For applications, I validate and sanitize all user inputs to prevent NoSQL injection attacks, use connection string credentials stored in environment variables, and enable field-level encryption for sensitive data like passwords or payment info using libraries like bcrypt for hashing."

---

## 9. Interview Questions & Answers

### Q1: "Explain the difference between SQL and NoSQL databases."

**Answer:**
> "SQL databases like MySQL use fixed schemas with tables and rows, enforce strict relationships through foreign keys, and are vertically scalable. They're ideal for complex transactions and structured data. NoSQL databases like MongoDB use flexible schemas with collections and documents, are horizontally scalable through sharding, and excel at handling unstructured or semi-structured data with high read/write throughput. I choose SQL when ACID compliance across multiple tables is critical, and NoSQL when I need schema flexibility, horizontal scaling, or rapid development cycles."

### Q2: "How do you optimize MongoDB performance?"

**Answer:**
> "I optimize MongoDB through multiple strategies:
> 1. **Indexing**: Create indexes on frequently queried fields using the ESR rule
> 2. **Schema Design**: Use embedded documents for data accessed together to reduce joins
> 3. **Aggregation**: Push data processing to the database rather than application
> 4. **Connection Pooling**: Reuse connections to reduce overhead
> 5. **Projection**: Fetch only required fields to minimize network transfer
> 6. **Monitoring**: Use explain() to analyze query plans and identify slow queries
> 7. **Caching**: Implement Redis for frequently accessed read-heavy data"

### Q3: "What is the difference between find() and aggregate()?"

**Answer:**
> "find() is for simple queries - filtering, sorting, and projecting documents. It's optimized for retrieving documents matching criteria. aggregate() is for complex data processing using a pipeline of stages like $match, $group, $lookup. For example, find() retrieves all orders, but aggregate() can calculate monthly revenue grouped by category with user details joined from another collection. I use find() for CRUD operations and aggregate() for analytics and reporting."

### Q4: "How do you handle large files in MongoDB?"

**Answer:**
> "For files larger than 16MB (document size limit), I use GridFS, which splits files into chunks (255KB each) and stores them across two collections: fs.files (metadata) and fs.chunks (binary data). For smaller files under 16MB, I store them as binary data in documents or use cloud storage like AWS S3 and store only the URL in MongoDB. GridFS is ideal for video streaming or large documents where I need to retrieve parts of files."

### Q5: "Explain MongoDB Write Concern and Read Concern."

**Answer:**
> "Write Concern determines acknowledgment level for write operations:
> - `w: 1` (default): Acknowledged by primary only
> - `w: 'majority'`: Acknowledged by majority of replica set members (safer)
> - `w: 0`: No acknowledgment (fastest but risky)
> 
> Read Concern determines data staleness:
> - `local`: Returns most recent data (might be rolled back)
> - `majority`: Returns data acknowledged by majority (durable)
> 
> For financial transactions, I use `{ w: 'majority', j: true }` for writes (wait for majority + journal) and `{ readConcern: 'majority' }` for reads to ensure consistency."

### Q6: "What happens if a document exceeds 16MB?"

**Answer:**
> "MongoDB has a 16MB document size limit. If I anticipate large documents, I:
> 1. Use **GridFS** for files (videos, images)
> 2. Implement the **Subset Pattern** - store recent/relevant data in the document and move historical data to separate collections
> 3. Use **references** instead of embedding large arrays
> 4. Store large binary data in cloud storage and keep only metadata in MongoDB
> For example, instead of embedding 10,000 product reviews in a product document, I'd store recent 10 reviews and create a separate reviews collection."

### Q7: "How do you ensure data consistency in MongoDB?"

**Answer:**
> "MongoDB ensures consistency through:
> 1. **Atomic Operations**: Single document updates are always atomic
> 2. **Transactions**: Multi-document ACID transactions for operations spanning documents
> 3. **Schema Validation**: Define validation rules to enforce data integrity
> 4. **Write Concerns**: Use `w: 'majority'` for durable writes
> 5. **Unique Indexes**: Prevent duplicate data
> 
> For example, in an e-commerce app, I use transactions for order placement (update inventory, create order, deduct payment) and unique indexes on email fields to prevent duplicate user accounts."

### Q8: "Difference between updateOne() and findOneAndUpdate()?"

**Answer:**
> "`updateOne()` updates a document and returns the count of modified documents. `findOneAndUpdate()` updates and returns the actual document (either original or updated based on options). I use `updateOne()` when I only need to know if the update succeeded, and `findOneAndUpdate()` when I need the document data, like updating and immediately displaying the updated user profile without a separate query."

### Q9: "How do you implement pagination in MongoDB?"

**Answer:**
> "I use two approaches:
> 
> **1. Offset-based (skip/limit):**
> ```javascript
> const page = 2, pageSize = 10
> db.products.find().skip((page - 1) * pageSize).limit(pageSize)
> ```
> Simple but slow for large datasets.
> 
> **2. Cursor-based (recommended):**
> ```javascript
> // First page
> db.products.find().sort({ _id: -1 }).limit(10)
> // Next page (using last _id from previous page)
> db.products.find({ _id: { $lt: lastId } }).sort({ _id: -1 }).limit(10)
> ```
> Faster and consistent even with new data. I use cursor-based for infinite scroll and offset-based for traditional pagination with page numbers."

### Q10: "What are MongoDB Change Streams?"

**Answer:**
> "Change Streams allow applications to listen to real-time data changes in collections. They're built on the oplog and enable event-driven architectures. For example, in a chat application, I use Change Streams to push new messages to connected clients:
> ```javascript
> const changeStream = db.collection('messages').watch()
> changeStream.on('change', (change) => {
>   if (change.operationType === 'insert') {
>     io.emit('newMessage', change.fullDocument)
>   }
> })
> ```
> This eliminates polling and provides instant updates. I've used this for real-time notifications, collaborative editing, and synchronizing data across microservices."

---

## 10. Real-World Project Examples

### Project 1: E-Commerce Platform

#### Collections Design
```javascript
// users collection
{
  _id: ObjectId('...'),
  email: 'john@example.com',
  password: 'hashed_password',
  profile: {
    firstName: 'John',
    lastName: 'Doe',
    phone: '1234567890'
  },
  addresses: [
    {
      type: 'shipping',
      street: '123 Main St',
      city: 'New York',
      isDefault: true
    }
  ],
  createdAt: ISODate('2024-01-01'),
  lastLogin: ISODate('2024-11-02')
}

// products collection
{
  _id: ObjectId('...'),
  name: 'Laptop',
  slug: 'laptop-dell-xps-13',
  category: 'electronics',
  price: 999.99,
  stock: 50,
  images: ['url1.jpg', 'url2.jpg'],
  specifications: {
    brand: 'Dell',
    model: 'XPS 13',
    ram: '16GB',
    storage: '512GB SSD'
  },
  reviews: [
    {
      userId: ObjectId('...'),
      rating: 5,
      comment: 'Great laptop!',
      createdAt: ISODate('2024-10-01')
    }
  ],
  avgRating: 4.5,
  reviewCount: 120,
  createdAt: ISODate('2024-01-01')
}

// orders collection
{
  _id: ObjectId('...'),
  orderNumber: 'ORD-2024-001',
  userId: ObjectId('...'),
  // Denormalized user data
  userEmail: 'john@example.com',
  items: [
    {
      productId: ObjectId('...'),
      name: 'Laptop',  // Snapshot at order time
      price: 999.99,
      quantity: 1
    }
  ],
  subtotal: 999.99,
  tax: 79.99,
  shipping: 20.00,
  total: 1099.98,
  status: 'pending',  // pending → processing → shipped → delivered
  shippingAddress: { /* address */ },
  paymentMethod: 'card',
  paymentStatus: 'paid',
  createdAt: ISODate('2024-11-01'),
  updatedAt: ISODate('2024-11-02')
}

// cart collection (temporary)
{
  _id: ObjectId('...'),
  userId: ObjectId('...'),
  items: [
    {
      productId: ObjectId('...'),
      quantity: 2
    }
  ],
  updatedAt: ISODate('2024-11-02'),
  expiresAt: ISODate('2024-11-09')  // TTL index for auto-cleanup
}
```

#### Key Queries

```javascript
// 1. Product search with filters
db.products.find({
  $text: { $search: 'laptop' },
  category: 'electronics',
  price: { $gte: 500, $lte: 1500 },
  stock: { $gt: 0 }
}).sort({ avgRating: -1 })

// 2. User order history with product details
db.orders.aggregate([
  { $match: { userId: ObjectId('...') } },
  { $sort: { createdAt: -1 } },
  { $limit: 10 },
  { $unwind: '$items' },
  {
    $lookup: {
      from: 'products',
      localField: 'items.productId',
      foreignField: '_id',
      as: 'productDetails'
    }
  }
])

// 3. Top-selling products
db.orders.aggregate([
  { $match: { status: 'delivered' } },
  { $unwind: '$items' },
  {
    $group: {
      _id: '$items.productId',
      totalSold: { $sum: '$items.quantity' },
      revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
    }
  },
  { $sort: { totalSold: -1 } },
  { $limit: 10 },
  {
    $lookup: {
      from: 'products',
      localField: '_id',
      foreignField: '_id',
      as: 'product'
    }
  }
])

// 4. Inventory management - low stock alert
db.products.find({
  stock: { $lt: 10 },
  status: 'active'
}).sort({ stock: 1 })
```

### Project 2: Social Media Platform

#### Collections Design
```javascript
// users collection
{
  _id: ObjectId('...'),
  username: 'johndoe',
  email: 'john@example.com',
  profile: {
    bio: 'Developer',
    avatar: 'url.jpg',
    followers: 1250,
    following: 340
  }
}

// posts collection
{
  _id: ObjectId('...'),
  userId: ObjectId('...'),
  // Denormalized user info
  username: 'johndoe',
  userAvatar: 'url.jpg',
  content: 'Hello world!',
  images: ['url1.jpg'],
  likes: ['userId1', 'userId2'],  // Limited to recent
  likeCount: 150,
  commentCount: 25,
  shares: 10,
  visibility: 'public',  // public, friends, private
  createdAt: ISODate('2024-11-01')
}

// comments collection
{
  _id: ObjectId('...'),
  postId: ObjectId('...'),
  userId: ObjectId('...'),
  username: 'janedoe',
  content: 'Great post!',
  likes: 10,
  parentCommentId: null,  // For nested comments
  createdAt: ISODate('2024-11-01')
}

// follows collection
{
  _id: ObjectId('...'),
  followerId: ObjectId('...'),  // Who is following
  followingId: ObjectId('...'),  // Who is being followed
  createdAt: ISODate('2024-11-01')
}

// notifications collection (TTL)
{
  _id: ObjectId('...'),
  userId: ObjectId('...'),  // Recipient
  type: 'like',  // like, comment, follow, mention
  actorId: ObjectId('...'),  // Who triggered
  actorName: 'janedoe',
  postId: ObjectId('...'),
  message: 'janedoe liked your post',
  read: false,
  createdAt: ISODate('2024-11-01'),
  expiresAt: ISODate('2024-12-01')  // Auto-delete after 30 days
}
```

#### Key Queries

```javascript
// 1. User feed (posts from followed users)
db.posts.aggregate([
  {
    $lookup: {
      from: 'follows',
      let: { postUserId: '$userId' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$followingId', '$$postUserId'] },
                { $eq: ['$followerId', ObjectId('currentUserId')] }
              ]
            }
          }
        }
      ],
      as: 'isFollowing'
    }
  },
  { $match: { isFollowing: { $ne: [] } } },
  { $sort: { createdAt: -1 } },
  { $limit: 20 }
])

// 2. Trending posts (last 24 hours)
db.posts.aggregate([
  {
    $match: {
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }
  },
  {
    $addFields: {
      engagementScore: {
        $add: [
          '$likeCount',
          { $multiply: ['$commentCount', 2] },
          { $multiply: ['$shares', 3] }
        ]
      }
    }
  },
  { $sort: { engagementScore: -1 } },
  { $limit: 10 }
])

// 3. Mutual followers
db.follows.aggregate([
  { $match: { followerId: ObjectId('userId1') } },
  {
    $lookup: {
      from: 'follows',
      let: { followingId: '$followingId' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$followerId', '$$followingId'] },
                { $eq: ['$followingId', ObjectId('userId1')] }
              ]
            }
          }
        }
      ],
      as: 'mutual'
    }
  },
  { $match: { mutual: { $ne: [] } } }
])

// 4. User activity statistics
db.posts.aggregate([
  { $match: { userId: ObjectId('...') } },
  {
    $group: {
      _id: null,
      totalPosts: { $sum: 1 },
      totalLikes: { $sum: '$likeCount' },
      totalComments: { $sum: '$commentCount' },
      avgLikes: { $avg: '$likeCount' }
    }
  }
])
```

### Project 3: Analytics Dashboard (Time-Series Data)

```javascript
// pageViews collection (Bucket Pattern)
{
  _id: ObjectId('...'),
  url: '/products/laptop',
  date: ISODate('2024-11-01T00:00:00Z'),
  views: [
    { minute: 0, count: 45, uniqueUsers: 30 },
    { minute: 1, count: 52, uniqueUsers: 35 },
    // ... 60 entries for each minute
  ],
  hourlyTotal: 2500,
  hourlyUnique: 1200
}

// Query: Get hourly page views for last 24 hours
db.pageViews.aggregate([
  {
    $match: {
      date: {
        $gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
      },
      url: '/products/laptop'
    }
  },
  {
    $group: {
      _id: {
        $dateToString: { format: '%Y-%m-%d %H:00', date: '$date' }
      },
      totalViews: { $sum: '$hourlyTotal' },
      uniqueUsers: { $sum: '$hourlyUnique' }
    }
  },
  { $sort: { _id: 1 } }
])
```

---

## 🎯 Interview Preparation Checklist

### Must Know Topics:
- [ ] CRUD operations with all operators
- [ ] Indexing strategies and performance optimization
- [ ] Aggregation pipeline (at least 5 stages)
- [ ] Embedded vs Referenced design pattern
- [ ] Transactions and ACID properties
- [ ] Replication and Sharding concepts
- [ ] Security best practices
- [ ] Real-world schema design examples

### Practice Tasks:
1. Design a complete e-commerce database schema
2. Write aggregation pipeline for sales report
3. Optimize a slow query using indexes
4. Implement a transaction in Node.js
5. Build a pagination system (both types)

### Common Mistakes to Avoid:
- ❌ Not using indexes on frequently queried fields
- ❌ Embedding unbounded arrays (reviews, comments)
- ❌ Using $where or $regex without indexes
- ❌ Not validating user input (NoSQL injection)
- ❌ Fetching all fields when only few are needed
- ❌ Using skip() for large offsets

---

## 🚀 Next Steps

1. **Practice**: Set up MongoDB locally and run all examples
2. **Build**: Create a small project implementing 3+ concepts
3. **Read**: MongoDB official documentation for advanced topics
4. **Mock Interview**: Practice explaining concepts out loud

**Good luck with your placement! 🎉**

Remember: The key is not just knowing the syntax, but understanding **when** and **why** to use each feature!
