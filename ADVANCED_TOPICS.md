# 🔥 MongoDB Advanced Topics & Real Interview Scenarios

> **Missing pieces that interviewers LOVE to ask!**
> These topics separate good candidates from GREAT ones.

---

## 📋 Table of Contents

1. [MongoDB vs SQL - Deep Comparison](#mongodb-vs-sql-deep-comparison)
2. [Query Optimization Techniques](#query-optimization-techniques)
3. [Data Modeling - When to Use MongoDB](#when-to-use-mongodb)
4. [Mongoose vs Native Driver](#mongoose-vs-native-driver)
5. [Error Handling & Validation](#error-handling--validation)
6. [Testing MongoDB Applications](#testing-mongodb-applications)
7. [Deployment & Production Best Practices](#deployment--production)
8. [MongoDB Atlas Features](#mongodb-atlas-features)
9. [Common Production Issues & Solutions](#common-production-issues)
10. [Tricky Interview Scenarios](#tricky-interview-scenarios)

---

## 1. MongoDB vs SQL - Deep Comparison

### Interview Question: "When would you choose MongoDB over PostgreSQL/MySQL?"

**Perfect Answer Framework:**

> "I choose based on these factors:
>
> **Choose MongoDB when:**
> 1. **Flexible Schema Needed**
>    - Product catalog with varying attributes
>    - Rapid prototyping with changing requirements
>    - Content management systems
>
> 2. **Horizontal Scalability Required**
>    - High traffic applications (millions of users)
>    - Geographic distribution (sharding by region)
>    - Social media, IoT applications
>
> 3. **Document-Oriented Data**
>    - Data naturally nested (blog posts with comments)
>    - JSON API responses
>    - Real-time analytics
>
> 4. **Developer Velocity**
>    - JavaScript/Node.js stack (MERN)
>    - Agile development
>    - Quick iterations
>
> **Choose SQL when:**
> 1. **Complex Transactions**
>    - Banking, financial systems
>    - Multi-table ACID requirements
>    - Strict consistency needed
>
> 2. **Complex Joins**
>    - Reporting systems with 10+ table joins
>    - Data warehousing
>    - Business intelligence
>
> 3. **Mature Ecosystem**
>    - Legacy systems integration
>    - Standard SQL tools
>    - Regulatory compliance (healthcare, finance)
>
> 4. **Fixed Schema Advantage**
>    - Strict data validation
>    - Government systems
>    - When schema rarely changes

### Detailed Comparison Table

| Feature | MongoDB | SQL (PostgreSQL/MySQL) |
|---------|---------|----------------------|
| **Data Model** | Document (BSON) | Relational (Tables) |
| **Schema** | Flexible, dynamic | Fixed, predefined |
| **Scaling** | Horizontal (sharding) | Vertical (bigger server) |
| **Joins** | $lookup (slower) | Native joins (optimized) |
| **Transactions** | Single doc atomic, multi-doc (4.0+) | Multi-table ACID |
| **Query Language** | MongoDB Query Language | SQL (standardized) |
| **Use Cases** | Content mgmt, real-time, IoT | ERP, CRM, accounting |
| **Learning Curve** | Easier for JS devs | Standard, well-known |
| **Consistency** | Eventual (configurable) | Immediate |
| **Schema Changes** | No migration needed | ALTER TABLE required |

### Real-World Example Answer:

> "In my e-commerce project, I used **both**:
>
> **MongoDB for:**
> - Product catalog (varying attributes: electronics vs clothing)
> - User sessions and cart (temporary data)
> - Product reviews (high volume, read-heavy)
>
> **PostgreSQL for:**
> - Order transactions (need ACID across tables)
> - Payment processing (strict consistency)
> - Inventory management (prevent overselling)
>
> This hybrid approach gave us flexibility where needed and consistency where critical."

---

## 2. Query Optimization Techniques

### Explain() Method - Your Best Friend

**Interview Scenario:** "The product search page is slow. How do you debug?"

**Perfect Answer:**

```javascript
// Step 1: Run explain to see execution plan
const explain = await db.products.find({
  category: 'electronics',
  price: { $gte: 500, $lte: 1500 }
}).explain('executionStats')

// Check these key metrics:
console.log('Stage:', explain.executionStats.executionStages.stage)
// COLLSCAN = Bad (full collection scan)
// IXSCAN = Good (using index)

console.log('Docs Examined:', explain.executionStats.totalDocsExamined)
console.log('Docs Returned:', explain.executionStats.nReturned)
// Should be close! If examined >> returned = inefficient

console.log('Time:', explain.executionStats.executionTimeMillis)
// Target: < 100ms for most queries
```

### Optimization Checklist

```javascript
// ❌ SLOW QUERY
db.products.find({
  category: 'electronics',
  price: { $gte: 500 },
  'reviews.rating': { $gte: 4 }
})

// Problems:
// 1. No index
// 2. Fetching all fields
// 3. Embedded array query without index

// ✅ OPTIMIZED QUERY
// 1. Create compound index
db.products.createIndex({ 
  category: 1, 
  'reviews.rating': 1, 
  price: 1 
})

// 2. Use projection (fetch only needed fields)
db.products.find(
  {
    category: 'electronics',
    price: { $gte: 500 },
    'reviews.rating': { $gte: 4 }
  },
  {
    name: 1,
    price: 1,
    thumbnail: 1,
    avgRating: 1,
    _id: 0
  }
).limit(20)

// 3. Consider denormalizing avgRating to avoid array scan
```

### Query Optimization Patterns

#### Pattern 1: Projection (Select Only Needed Fields)

```javascript
// ❌ BAD: Fetch everything
const products = await db.products.find({ category: 'electronics' })
// Returns 50 fields, 100KB per document

// ✅ GOOD: Fetch only what you need
const products = await db.products.find(
  { category: 'electronics' },
  { name: 1, price: 1, thumbnail: 1, _id: 0 }
)
// Returns 3 fields, 1KB per document
// 100x faster network transfer!
```

#### Pattern 2: Limit + Sort

```javascript
// ❌ BAD: Sort entire collection then limit
db.products.find({ category: 'electronics' })
  .sort({ price: -1 })  // Sorts ALL products
  .limit(10)

// ✅ GOOD: Index supports sort
db.products.createIndex({ category: 1, price: -1 })
db.products.find({ category: 'electronics' })
  .sort({ price: -1 })
  .limit(10)
// Index allows "top-K" optimization - only finds top 10!
```

#### Pattern 3: Avoid $where and $regex without index

```javascript
// ❌ VERY SLOW: JavaScript evaluation
db.products.find({
  $where: function() {
    return this.price > 100
  }
})

// ✅ FAST: Use query operators
db.products.find({ price: { $gt: 100 } })

// ❌ SLOW: Regex without index
db.users.find({ email: /.*@gmail\.com/ })

// ✅ FASTER: Text index
db.users.createIndex({ email: 'text' })
db.users.find({ $text: { $search: 'gmail.com' } })
```

#### Pattern 4: Aggregation with Early $match

```javascript
// ❌ BAD: Match after heavy processing
db.orders.aggregate([
  {
    $lookup: {
      from: 'users',
      localField: 'userId',
      foreignField: '_id',
      as: 'user'
    }
  },
  { $unwind: '$user' },
  { $match: { status: 'completed' } }  // Too late!
])

// ✅ GOOD: Match early to reduce documents
db.orders.aggregate([
  { $match: { status: 'completed' } },  // Filter first!
  {
    $lookup: {
      from: 'users',
      localField: 'userId',
      foreignField: '_id',
      as: 'user'
    }
  },
  { $unwind: '$user' }
])
```

### Monitoring & Profiling

```javascript
// Enable profiling (level 2 = all operations)
db.setProfilingLevel(2)

// Or profile only slow queries (> 100ms)
db.setProfilingLevel(1, { slowms: 100 })

// Check slow queries
db.system.profile.find({ millis: { $gt: 100 } }).sort({ ts: -1 }).limit(10)

// Find queries without indexes
db.system.profile.find({
  'planSummary': { $ne: 'IXSCAN' }
}).limit(10)
```

**Interview Tip:**
> "In production, I monitor slow queries using MongoDB Atlas Performance Advisor or by enabling profiling on a replica set secondary to avoid impacting primary performance. I set alerts for queries exceeding 100ms and create indexes proactively."

---

## 3. Data Modeling - When to Use MongoDB

### Decision Tree

```
Does your data have a fixed schema that rarely changes?
│
├─ YES → Do you need complex multi-table joins?
│   │
│   ├─ YES → Use SQL (PostgreSQL/MySQL)
│   │
│   └─ NO → Do you need strict ACID across multiple entities?
│       │
│       ├─ YES → Use SQL
│       └─ NO → MongoDB might work
│
└─ NO (Schema changes frequently)
    │
    Do you need horizontal scaling?
    │
    ├─ YES → Use MongoDB ✅
    │
    └─ NO → Either works, choose based on team expertise
```

### Real Scenarios

#### Scenario 1: E-commerce Product Catalog

**Use MongoDB ✅**

**Why:**
- Products have varying attributes (laptop vs t-shirt)
- Rapid product additions (new categories)
- High read volume (product views)
- Need to scale horizontally

```javascript
// Easy to add new product types
{
  name: 'Smart Watch',
  category: 'electronics',
  // New attributes - no migration!
  batteryLife: '48 hours',
  waterResistant: true,
  compatibleOS: ['iOS', 'Android']
}
```

#### Scenario 2: Banking Transactions

**Use SQL (PostgreSQL) ✅**

**Why:**
- Strict ACID requirements
- Money transfer across accounts (multi-table transaction)
- Fixed schema (account, transaction, user)
- Regulatory compliance

```sql
-- Need atomic operations across tables
BEGIN TRANSACTION;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
INSERT INTO transactions (from_account, to_account, amount) VALUES (1, 2, 100);
COMMIT;
```

#### Scenario 3: Content Management System (CMS)

**Use MongoDB ✅**

**Why:**
- Content types vary (articles, videos, galleries)
- Nested data (article with paragraphs, images, quotes)
- Version history
- Full-text search

```javascript
{
  type: 'article',
  title: 'MongoDB Guide',
  author: { name: 'John', bio: '...' },  // Embedded
  content: [
    { type: 'paragraph', text: '...' },
    { type: 'image', url: '...', caption: '...' },
    { type: 'code', language: 'js', code: '...' }
  ],
  tags: ['mongodb', 'database'],
  publishedAt: ISODate('2024-11-02')
}
```

#### Scenario 4: Analytics Dashboard

**Use Time-Series Database or MongoDB (with Bucket Pattern) ✅**

**Why:**
- High write volume (millions of events/day)
- Time-based queries
- Aggregation for charts
- Data retention policies

```javascript
// Bucket pattern for efficiency
{
  metric: 'page_views',
  hour: ISODate('2024-11-02T10:00:00'),
  data: [
    { minute: 0, value: 1250 },
    { minute: 1, value: 1180 },
    // ... 60 minutes
  ],
  stats: {
    total: 72000,
    avg: 1200,
    max: 1500,
    min: 900
  }
}
```

---

## 4. Mongoose vs Native Driver

### When to Use Each

#### Use Mongoose When:
- ✅ Need schema validation
- ✅ Want ORM-like features (models, methods)
- ✅ Building complex applications
- ✅ Need middleware (pre/post hooks)
- ✅ Want virtual properties
- ✅ Need populate() for easy joins

#### Use Native Driver When:
- ✅ Maximum performance needed
- ✅ Simple CRUD operations
- ✅ Microservices (lightweight)
- ✅ Full control over queries
- ✅ Smaller bundle size

### Code Comparison

```javascript
// ============ NATIVE DRIVER ============
const { MongoClient } = require('mongodb')

const client = new MongoClient('mongodb://localhost:27017')
await client.connect()
const db = client.db('myapp')
const users = db.collection('users')

// Create
await users.insertOne({
  name: 'John',
  email: 'john@example.com',
  age: 25
})

// Read
const user = await users.findOne({ email: 'john@example.com' })

// Update
await users.updateOne(
  { email: 'john@example.com' },
  { $set: { age: 26 } }
)

// Delete
await users.deleteOne({ email: 'john@example.com' })

// ============ MONGOOSE ============
const mongoose = require('mongoose')

await mongoose.connect('mongodb://localhost:27017/myapp')

// Define schema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: 2
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: /^\S+@\S+\.\S+$/
  },
  age: {
    type: Number,
    min: 18,
    max: 120
  }
}, {
  timestamps: true
})

// Virtual property
userSchema.virtual('isAdult').get(function() {
  return this.age >= 18
})

// Instance method
userSchema.methods.greet = function() {
  return `Hello, I'm ${this.name}`
}

// Static method
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email })
}

// Middleware
userSchema.pre('save', function(next) {
  console.log('About to save:', this.name)
  next()
})

const User = mongoose.model('User', userSchema)

// Create (with validation)
const user = new User({
  name: 'John',
  email: 'john@example.com',
  age: 25
})
await user.save()  // Validates before saving

// Or
await User.create({
  name: 'Jane',
  email: 'jane@example.com',
  age: 30
})

// Read
const user = await User.findOne({ email: 'john@example.com' })
console.log(user.isAdult)  // Virtual property
console.log(user.greet())  // Instance method

// Update
user.age = 26
await user.save()  // Or
await User.updateOne({ email: 'john@example.com' }, { age: 26 })

// Delete
await User.deleteOne({ email: 'john@example.com' })
```

### Mongoose Advanced Features

```javascript
// Population (auto-join)
const postSchema = new mongoose.Schema({
  title: String,
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
})

const Post = mongoose.model('Post', postSchema)

// Populate author
const post = await Post.findById(postId).populate('author')
console.log(post.author.name)  // Automatically joined!

// Validation
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    validate: {
      validator: function(v) {
        return /^\S+@\S+\.\S+$/.test(v)
      },
      message: props => `${props.value} is not a valid email!`
    }
  }
})

// Virtuals (computed properties)
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`
})

// Middleware (hooks)
userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10)
  }
  next()
})
```

**Interview Answer:**
> "I use Mongoose for full-stack applications because the schema validation prevents bad data, populate makes joins easy, and middleware handles tasks like password hashing. For microservices or performance-critical operations, I use the native driver to avoid Mongoose overhead. In my last project, the main API used Mongoose, but the analytics service used native driver for 30% better performance."

---

## 5. Error Handling & Validation

### Common Errors & How to Handle

```javascript
// ============ Connection Errors ============
const mongoose = require('mongoose')

mongoose.connect('mongodb://localhost:27017/myapp')
  .then(() => console.log('Connected'))
  .catch(err => {
    if (err.name === 'MongoServerError') {
      console.error('MongoDB server error:', err.message)
    } else if (err.name === 'MongoNetworkError') {
      console.error('Network error - is MongoDB running?')
    }
    process.exit(1)
  })

// Handle disconnection
mongoose.connection.on('disconnected', () => {
  console.error('MongoDB disconnected')
})

mongoose.connection.on('error', (err) => {
  console.error('MongoDB error:', err)
})

// ============ Validation Errors ============
try {
  await User.create({
    name: 'J',  // Too short
    email: 'invalid-email',  // Invalid format
    age: 15  // Below minimum
  })
} catch (error) {
  if (error.name === 'ValidationError') {
    // Mongoose validation error
    const errors = Object.values(error.errors).map(err => err.message)
    console.error('Validation failed:', errors)
    // Send to client: { errors: ['Name must be at least 2 characters', ...] }
  }
}

// ============ Duplicate Key Error ============
try {
  await User.create({
    email: 'existing@example.com'  // Already exists (unique index)
  })
} catch (error) {
  if (error.code === 11000) {
    console.error('Duplicate key:', Object.keys(error.keyPattern))
    // Send to client: 'Email already exists'
  }
}

// ============ Cast Error ============
try {
  await User.findById('invalid-objectid')
} catch (error) {
  if (error.name === 'CastError') {
    console.error('Invalid ID format')
    // Send to client: 'Invalid user ID'
  }
}

// ============ Document Not Found ============
const user = await User.findById(userId)
if (!user) {
  throw new Error('User not found')  // Or send 404
}
```

### Centralized Error Handler (Express)

```javascript
// middleware/errorHandler.js
function errorHandler(err, req, res, next) {
  console.error(err)

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: Object.values(err.errors).map(e => e.message)
    })
  }

  // Duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0]
    return res.status(400).json({
      error: `${field} already exists`
    })
  }

  // Cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid ID format'
    })
  }

  // Default error
  res.status(500).json({
    error: 'Internal server error'
  })
}

module.exports = errorHandler

// app.js
app.use(errorHandler)
```

### Validation Best Practices

```javascript
// Schema-level validation (Mongoose)
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  age: {
    type: Number,
    min: [18, 'Must be at least 18 years old'],
    max: [120, 'Invalid age']
  },
  role: {
    type: String,
    enum: {
      values: ['user', 'admin', 'moderator'],
      message: '{VALUE} is not a valid role'
    },
    default: 'user'
  },
  website: {
    type: String,
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+/.test(v)
      },
      message: 'Must be a valid URL'
    }
  }
})

// Application-level validation (express-validator)
const { body, validationResult } = require('express-validator')

app.post('/users',
  [
    body('email').isEmail().normalizeEmail(),
    body('age').isInt({ min: 18, max: 120 }),
    body('password').isLength({ min: 8 })
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    // Create user
    const user = await User.create(req.body)
    res.json(user)
  }
)
```

---

## 6. Testing MongoDB Applications

### Testing Strategy

```javascript
// test/setup.js
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

let mongoServer

// Before all tests
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  await mongoose.connect(mongoServer.getUri())
})

// After each test (clean database)
afterEach(async () => {
  const collections = await mongoose.connection.db.collections()
  for (let collection of collections) {
    await collection.deleteMany({})
  }
})

// After all tests
afterAll(async () => {
  await mongoose.disconnect()
  await mongoServer.stop()
})
```

### Unit Tests (Jest)

```javascript
// models/User.js
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  age: Number
})

userSchema.methods.isAdult = function() {
  return this.age >= 18
}

const User = mongoose.model('User', userSchema)

// tests/user.test.js
const User = require('../models/User')

describe('User Model', () => {
  test('should create a user', async () => {
    const user = await User.create({
      name: 'John',
      email: 'john@example.com',
      age: 25
    })

    expect(user.name).toBe('John')
    expect(user.email).toBe('john@example.com')
  })

  test('should validate email format', async () => {
    await expect(User.create({
      name: 'John',
      email: 'invalid-email'
    })).rejects.toThrow()
  })

  test('isAdult should return true for age >= 18', () => {
    const user = new User({ name: 'John', age: 25 })
    expect(user.isAdult()).toBe(true)
  })

  test('should find user by email', async () => {
    await User.create({
      name: 'John',
      email: 'john@example.com',
      age: 25
    })

    const user = await User.findOne({ email: 'john@example.com' })
    expect(user).toBeTruthy()
    expect(user.name).toBe('John')
  })
})
```

### Integration Tests

```javascript
// tests/api.test.js
const request = require('supertest')
const app = require('../app')

describe('User API', () => {
  test('POST /users should create user', async () => {
    const res = await request(app)
      .post('/users')
      .send({
        name: 'John',
        email: 'john@example.com',
        age: 25
      })

    expect(res.status).toBe(201)
    expect(res.body.name).toBe('John')
    expect(res.body.email).toBe('john@example.com')
  })

  test('GET /users should return all users', async () => {
    // Create test data
    await User.create({ name: 'John', email: 'john@example.com' })
    await User.create({ name: 'Jane', email: 'jane@example.com' })

    const res = await request(app).get('/users')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
  })

  test('GET /users/:id should return user', async () => {
    const user = await User.create({ name: 'John', email: 'john@example.com' })

    const res = await request(app).get(`/users/${user._id}`)

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('John')
  })

  test('should return 404 for non-existent user', async () => {
    const fakeId = new mongoose.Types.ObjectId()
    const res = await request(app).get(`/users/${fakeId}`)

    expect(res.status).toBe(404)
  })
})
```

**Interview Tip:**
> "I use mongodb-memory-server for testing because it creates an in-memory MongoDB instance, making tests fast and isolated. Each test runs against a clean database. For CI/CD, I use Docker containers with MongoDB for integration tests that mirror production more closely."

---

## 7. Deployment & Production Best Practices

### Connection Pooling & Configuration

```javascript
// production-config.js
const mongoose = require('mongoose')

const options = {
  // Connection pool settings
  maxPoolSize: 10,        // Max connections
  minPoolSize: 2,         // Min connections
  maxIdleTimeMS: 60000,   // Close idle connections after 60s
  
  // Timeout settings
  serverSelectionTimeoutMS: 5000,  // Give up initial connect after 5s
  socketTimeoutMS: 45000,          // Close sockets after 45s
  
  // Retry logic
  retryWrites: true,
  retryReads: true,
  
  // Monitoring
  heartbeatFrequencyMS: 10000,  // Check replica set health every 10s
  
  // Write concerns
  w: 'majority',  // Wait for majority acknowledgment
  j: true         // Wait for journal
}

mongoose.connect(process.env.MONGODB_URI, options)
```

### Environment-Based Configuration

```javascript
// config/database.js
const config = {
  development: {
    url: 'mongodb://localhost:27017/myapp_dev',
    options: {
      maxPoolSize: 5
    }
  },
  
  test: {
    url: 'mongodb://localhost:27017/myapp_test',
    options: {
      maxPoolSize: 3
    }
  },
  
  production: {
    url: process.env.MONGODB_URI,  // From environment variable
    options: {
      maxPoolSize: 20,
      minPoolSize: 5,
      retryWrites: true,
      w: 'majority',
      readPreference: 'secondaryPreferred'  // Read from secondaries
    }
  }
}

const env = process.env.NODE_ENV || 'development'
module.exports = config[env]
```

### Security Best Practices

```javascript
// 1. Never expose MongoDB directly
// Use firewall/VPC - only allow application servers

// 2. Use authentication
const uri = `mongodb://${username}:${password}@host:27017/database?authSource=admin`

// 3. Encrypt connections (TLS/SSL)
const options = {
  ssl: true,
  sslCA: fs.readFileSync('/path/to/ca.pem')
}

// 4. Input validation (prevent NoSQL injection)
const sanitize = require('express-mongo-sanitize')
app.use(sanitize())  // Removes $ and . from req.body/params

// 5. Rate limiting
const rateLimit = require('express-rate-limit')
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100  // Limit each IP to 100 requests per windowMs
})
app.use('/api/', limiter)

// 6. Environment variables
require('dotenv').config()
const dbUri = process.env.MONGODB_URI  // Never hardcode!

// 7. Least privilege principle
// Create user with specific permissions only
db.createUser({
  user: 'appUser',
  pwd: 'securePassword',
  roles: [
    { role: 'readWrite', db: 'myapp' }  // Only this database
  ]
})
```

### Backup Strategy

```bash
# Automated daily backups
mongodump --uri="mongodb://user:pass@host:27017/myapp" --out=/backups/$(date +%Y-%m-%d)

# Restore from backup
mongorestore --uri="mongodb://user:pass@host:27017/myapp" /backups/2024-11-02
```

### Monitoring & Alerting

```javascript
// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping()
    res.json({
      status: 'healthy',
      database: 'connected',
      uptime: process.uptime()
    })
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message
    })
  }
})

// Log slow queries
mongoose.set('debug', (collectionName, method, query, doc) => {
  console.log(`${collectionName}.${method}`, JSON.stringify(query))
})
```

---

## 8. MongoDB Atlas Features

### Why Atlas? (Interview Answer)

> "MongoDB Atlas is the managed cloud database service. I prefer it over self-hosted because:
>
> **Benefits:**
> 1. **Auto-scaling** - Handles traffic spikes automatically
> 2. **Automated backups** - Point-in-time recovery
> 3. **Built-in monitoring** - Performance insights, slow query detection
> 4. **Global clusters** - Deploy across regions for low latency
> 5. **Security** - VPC peering, encryption at rest, IP whitelisting
> 6. **No ops overhead** - No patching, upgrading, or maintenance
>
> **Free Tier:** Perfect for learning and small projects (512MB storage)
>
> **When I'd self-host:**
> - Very high cost sensitivity
> - Regulatory requirements (data must stay on-premise)
> - Full control needed over hardware"

### Atlas-Specific Features to Mention

```javascript
// 1. Connection String (Replica Set)
const uri = 'mongodb+srv://user:pass@cluster.mongodb.net/myapp?retryWrites=true&w=majority'

// 2. Global Clusters (Multi-region)
// Users in India → Read from Mumbai
// Users in US → Read from Virginia
// Automatic routing based on location

// 3. Online Archive
// Move old data to cheap S3 storage
// Still queryable but slower

// 4. Full-Text Search (Atlas Search - Lucene based)
db.products.aggregate([
  {
    $search: {
      text: {
        query: 'laptop gaming',
        path: ['name', 'description'],
        fuzzy: { maxEdits: 1 }
      }
    }
  }
])

// 5. Charts (Built-in visualization)
// No code - drag and drop dashboards

// 6. Realm (Mobile sync)
// Offline-first mobile apps with automatic sync
```

---

## 9. Common Production Issues & Solutions

### Issue 1: Connection Pool Exhaustion

**Symptom:** "MongoServerError: connection pool is full"

**Cause:** Not closing connections, too many concurrent requests

**Solution:**
```javascript
// ❌ BAD: Creating new connection per request
app.get('/users', async (req, res) => {
  const client = new MongoClient(uri)
  await client.connect()  // New connection!
  // ... query
  await client.close()
})

// ✅ GOOD: Reuse connection pool
const client = new MongoClient(uri, { maxPoolSize: 10 })
await client.connect()  // Once at startup

app.get('/users', async (req, res) => {
  const db = client.db('myapp')  // Reuse connection
  // ... query
})
```

### Issue 2: Slow Queries

**Symptom:** Requests timing out, high response times

**Solution:**
```javascript
// 1. Check indexes
db.users.find({ email: 'john@example.com' }).explain('executionStats')

// 2. Add missing indexes
db.users.createIndex({ email: 1 })

// 3. Use projection
db.users.find({ email: 'john@example.com' }, { name: 1, email: 1 })

// 4. Implement caching (Redis)
const cachedUser = await redis.get(`user:${email}`)
if (cachedUser) return JSON.parse(cachedUser)

const user = await db.users.findOne({ email })
await redis.setex(`user:${email}`, 3600, JSON.stringify(user))
```

### Issue 3: Memory Issues

**Symptom:** Application crashes, out of memory errors

**Cause:** Loading too much data at once

**Solution:**
```javascript
// ❌ BAD: Load all users into memory
const users = await db.users.find().toArray()  // 1M users = crash!

// ✅ GOOD: Use cursor (streams)
const cursor = db.users.find()
for await (const user of cursor) {
  // Process one at a time
  await processUser(user)
}

// Or with limit
const users = await db.users.find().limit(100).toArray()
```

### Issue 4: Write Contention (Hot Documents)

**Symptom:** Slow writes, lock timeouts

**Cause:** Many concurrent updates to same document

**Solution:**
```javascript
// ❌ BAD: Update same counter document
await db.stats.updateOne(
  { _id: 'pageViews' },
  { $inc: { count: 1 } }
)  // 1000 concurrent requests = bottleneck!

// ✅ GOOD: Sharded counters
const shardId = Math.floor(Math.random() * 10)
await db.stats.updateOne(
  { _id: `pageViews_${shardId}` },
  { $inc: { count: 1 } }
)

// Aggregate when needed
const total = await db.stats.aggregate([
  { $match: { _id: /^pageViews_/ } },
  { $group: { _id: null, total: { $sum: '$count' } } }
])
```

---

## 10. Tricky Interview Scenarios

### Scenario 1: "Design a real-time chat application database"

**Perfect Answer:**

```javascript
// Collections:
// 1. Users
{
  _id: ObjectId(),
  username: 'john',
  status: 'online',  // online, offline, away
  lastSeen: ISODate()
}

// 2. Conversations
{
  _id: ObjectId(),
  type: 'direct',  // direct or group
  participants: [ObjectId('user1'), ObjectId('user2')],
  lastMessage: {
    text: 'Hey!',
    senderId: ObjectId('user1'),
    timestamp: ISODate()
  },
  unreadCount: {
    'user1': 0,
    'user2': 3
  }
}

// 3. Messages
{
  _id: ObjectId(),
  conversationId: ObjectId(),
  senderId: ObjectId(),
  text: 'Hello!',
  timestamp: ISODate(),
  status: 'delivered',  // sent, delivered, read
  reactions: [
    { userId: ObjectId(), emoji: '👍' }
  ]
}

// Why this design?
// 1. Conversations collection: Fast to load chat list
// 2. Messages separate: Unbounded growth, paginated loading
// 3. lastMessage denormalized: Show preview without querying messages
// 4. unreadCount embedded: Fast badge display

// Indexes:
db.conversations.createIndex({ participants: 1, 'lastMessage.timestamp': -1 })
db.messages.createIndex({ conversationId: 1, timestamp: -1 })

// Real-time: Use Change Streams
const changeStream = db.collection('messages').watch()
changeStream.on('change', (change) => {
  if (change.operationType === 'insert') {
    // Emit to socket.io
    io.to(change.fullDocument.conversationId).emit('newMessage', change.fullDocument)
  }
})
```

### Scenario 2: "Handle 1 million concurrent users viewing a live counter"

**Perfect Answer:**

```javascript
// ❌ WRONG: Update database on every view
app.get('/video/:id', async (req, res) => {
  await db.videos.updateOne(
    { _id: req.params.id },
    { $inc: { views: 1 } }
  )  // 1M writes/sec = impossible!
})

// ✅ RIGHT: Buffer in Redis, batch update to MongoDB
const Redis = require('ioredis')
const redis = new Redis()

app.get('/video/:id', async (req, res) => {
  // Increment in Redis (fast!)
  await redis.incr(`video:${req.params.id}:views`)
  
  // Serve video
  res.send(video)
})

// Background job (every 5 minutes)
setInterval(async () => {
  const keys = await redis.keys('video:*:views')
  
  for (const key of keys) {
    const videoId = key.split(':')[1]
    const views = await redis.get(key)
    
    // Batch update to MongoDB
    await db.videos.updateOne(
      { _id: videoId },
      { $inc: { views: parseInt(views) } }
    )
    
    // Clear Redis counter
    await redis.del(key)
  }
}, 5 * 60 * 1000)

// Result:
// - Redis handles high write volume
// - MongoDB updated every 5 mins (much less load)
// - View count eventually consistent (acceptable for this use case)
```

### Scenario 3: "Prevent overselling products (race condition)"

**Perfect Answer:**

```javascript
// ❌ WRONG: Check then update (race condition!)
app.post('/order', async (req, res) => {
  const product = await db.products.findOne({ _id: productId })
  
  if (product.stock >= quantity) {
    // RACE CONDITION! Another request can get here too
    await db.products.updateOne(
      { _id: productId },
      { $inc: { stock: -quantity } }
    )
    // Created order
  }
})

// ✅ RIGHT: Atomic update with condition
app.post('/order', async (req, res) => {
  const result = await db.products.updateOne(
    { 
      _id: productId,
      stock: { $gte: quantity }  // Condition!
    },
    { 
      $inc: { stock: -quantity }
    }
  )
  
  if (result.modifiedCount === 0) {
    return res.status(400).json({ error: 'Insufficient stock' })
  }
  
  // Create order (stock already decremented atomically)
})

// Even better: Use transaction for order + inventory
const session = await mongoose.startSession()
session.startTransaction()

try {
  const product = await Product.findOneAndUpdate(
    { _id: productId, stock: { $gte: quantity } },
    { $inc: { stock: -quantity } },
    { session, new: true }
  )
  
  if (!product) throw new Error('Insufficient stock')
  
  await Order.create([{
    userId,
    productId,
    quantity,
    total: product.price * quantity
  }], { session })
  
  await session.commitTransaction()
  res.json({ success: true })
} catch (error) {
  await session.abortTransaction()
  res.status(400).json({ error: error.message })
} finally {
  session.endSession()
}
```

### Scenario 4: "Implement friend suggestions (social media)"

**Perfect Answer:**

```javascript
// Collections:
// users: { _id, name, interests: ['coding', 'gaming'] }
// follows: { followerId, followingId }

// Find mutual friends approach:
db.follows.aggregate([
  // Get my following
  { $match: { followerId: myUserId } },
  
  // Join with their following
  {
    $lookup: {
      from: 'follows',
      let: { followingId: '$followingId' },
      pipeline: [
        {
          $match: {
            $expr: { $eq: ['$followerId', '$$followingId'] },
            followingId: { $ne: myUserId }  // Not myself
          }
        }
      ],
      as: 'theirFollowing'
    }
  },
  
  { $unwind: '$theirFollowing' },
  
  // Group to count mutual connections
  {
    $group: {
      _id: '$theirFollowing.followingId',
      mutualCount: { $sum: 1 }
    }
  },
  
  // Exclude already following
  {
    $lookup: {
      from: 'follows',
      let: { suggestedId: '$_id' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$followerId', myUserId] },
                { $eq: ['$followingId', '$$suggestedId'] }
              ]
            }
          }
        }
      ],
      as: 'alreadyFollowing'
    }
  },
  { $match: { alreadyFollowing: { $size: 0 } } },
  
  // Sort by mutual friends
  { $sort: { mutualCount: -1 } },
  { $limit: 10 },
  
  // Get user details
  {
    $lookup: {
      from: 'users',
      localField: '_id',
      foreignField: '_id',
      as: 'user'
    }
  },
  { $unwind: '$user' }
])
```

---

## 📋 Quick Reference Cheat Sheet

### When to Use What?

| Use Case | Solution |
|----------|----------|
| User profile & address | Embed (1:1, 1:Few) |
| User & orders | Reference (1:Many) |
| Product & millions of views | Reverse reference (1:Squillions) |
| Students & courses | Junction collection (M:N with attributes) |
| Product with 10K reviews | Subset pattern |
| Real-time view counter | Redis buffer + batch update |
| Prevent overselling | Atomic update with condition |
| Chat messages | Separate collection + Change Streams |
| Time-series data | Bucket pattern |
| Search functionality | Text index or Atlas Search |
| High write volume | Sharded counters |
| Authentication | Mongoose + bcrypt + JWT |
| Testing | mongodb-memory-server |
| Production | MongoDB Atlas + connection pooling |

---

## 🎯 Final Interview Tips

1. **Always ask about requirements first**
   - "What are the access patterns?"
   - "What's the expected scale?"
   - "Is real-time needed?"

2. **Think out loud**
   - Explain your reasoning
   - Discuss trade-offs
   - Mention alternatives

3. **Relate to your projects**
   - "In my e-commerce project, I used..."
   - Show real experience

4. **Know the why, not just the how**
   - Don't just say "I'll use indexes"
   - Explain WHY and WHICH indexes

5. **Discuss scalability**
   - "This works for 1000 users, but for 1M users I'd..."
   - Show you think about growth

---

**You now have EVERYTHING needed for MongoDB interviews! 🚀**

**Missing something? Let me know!**
