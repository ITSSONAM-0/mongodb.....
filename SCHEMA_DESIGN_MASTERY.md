# MongoDB Schema Design & Relationships - Complete Mastery

> **Most Important Topic for Interviews!** 
> 
> Schema design questions are asked in **90% of MongoDB interviews** because they test your real understanding, not just syntax knowledge.

---

##  Table of Contents

1. [Why Schema Design is Critical](#why-schema-design-is-critical)
2. [The Golden Rule of MongoDB Schema](#the-golden-rule)
3. [Relationship Types Deep Dive](#relationship-types)
4. [Embedded vs Referenced - Complete Guide](#embedded-vs-referenced)
5. [Schema Design Patterns (12 Patterns)](#schema-design-patterns)
6. [Real-World Schema Examples](#real-world-schema-examples)
7. [Interview Questions on Schema](#interview-questions)
8. [Common Mistakes to Avoid](#common-mistakes)
9. [How to Explain Schema Decisions](#how-to-explain)

---

## Why Schema Design is Critical

### What Interviewers Ask (Real Questions):

1. ❓ "Design a database for an e-commerce platform"
2. ❓ "How would you store users and their posts in a social media app?"
3. ❓ "Should you embed comments in posts or keep them separate?"
4. ❓ "How do you handle one-to-many relationships?"
5. ❓ "Design a schema for Netflix/Uber/Twitter"

### Why This is Hard:

**In SQL:** You normalize everything (fixed rules)  
**In MongoDB:** You decide based on **access patterns** (requires thinking!)

**The Interview Trap:**
- Most candidates say "I'll use references" (SQL thinking)
- Smart candidates ask: **"How will the application query this data?"**

---

## The Golden Rule of MongoDB Schema

### ❌ WRONG Approach (SQL Thinking):
> "Let me normalize the data and create separate collections for everything"

### ✅ RIGHT Approach (MongoDB Thinking):
> "Let me understand the access patterns first, then design the schema"

### The Rule:

```
MongoDB Schema Design = 
    Access Patterns + 
    Data Growth + 
    Read/Write Ratio +
    Atomicity Requirements
```

**NOT just data relationships!**

---

## Relationship Types

### 1. One-to-One (1:1)

**Example:** User → User Profile

**Access Pattern:** Profile is ALWAYS accessed with user

**Solution:** **EMBED**

```javascript
// ✅ BEST: Embedded
{
  _id: ObjectId('user1'),
  name: 'John Doe',
  email: 'john@example.com',
  profile: {                    // Embedded 1:1
    bio: 'Software Developer',
    avatar: 'avatar.jpg',
    dateOfBirth: ISODate('1995-01-01'),
    phone: '1234567890'
  }
}
```

**Why embed?**
- Single query to get all data
- Atomic updates
- Better performance
- Profile can't exist without user

**When to reference (rare):**
- Profile data is HUGE (close to 16MB)
- Profile is accessed separately sometimes
- Different access control requirements

```javascript
// ⚠️ Reference (only if needed)
// Users collection
{
  _id: ObjectId('user1'),
  name: 'John Doe',
  profileId: ObjectId('profile1')
}

// Profiles collection
{
  _id: ObjectId('profile1'),
  bio: 'Software Developer',
  userId: ObjectId('user1')
}
```

---

### 2. One-to-Few (1:Few)

**Example:** User → Addresses (2-5 addresses max)

**Access Pattern:** Addresses accessed WITH user profile

**Solution:** **EMBED as ARRAY**

```javascript
// ✅ BEST: Embedded array
{
  _id: ObjectId('user1'),
  name: 'John Doe',
  email: 'john@example.com',
  addresses: [                  // Embedded array (1:Few)
    {
      type: 'home',
      street: '123 Main St',
      city: 'New York',
      zipCode: '10001',
      isDefault: true
    },
    {
      type: 'work',
      street: '456 Office Ave',
      city: 'New York',
      zipCode: '10002',
      isDefault: false
    }
  ]
}
```

**Why embed?**
- Few items (won't hit 16MB limit)
- Always accessed together
- Single atomic update
- No need for separate queries

**Querying embedded arrays:**
```javascript
// Find users in NYC
db.users.find({ 'addresses.city': 'New York' })

// Find user's default address
db.users.findOne(
  { _id: userId },
  { 'addresses.$': 1 }  // Project only matching address
)

// Update specific address
db.users.updateOne(
  { _id: userId, 'addresses.type': 'home' },
  { $set: { 'addresses.$.street': 'New Street' } }
)
```

---

### 3. One-to-Many (1:Many)

**Example:** User → Orders (hundreds/thousands of orders)

**Access Pattern:** Orders queried separately, not always with user

**Solution:** **REFERENCE**

```javascript
// ✅ BEST: Referenced
// Users collection
{
  _id: ObjectId('user1'),
  name: 'John Doe',
  email: 'john@example.com'
  // NO orders array! (would grow unbounded)
}

// Orders collection
{
  _id: ObjectId('order1'),
  userId: ObjectId('user1'),     // Reference to user
  orderNumber: 'ORD-2024-001',
  items: [...],
  total: 500,
  createdAt: ISODate('2024-11-01')
}
```

**Why reference?**
- Unbounded growth (user can have 10,000 orders)
- Orders accessed separately (order history page)
- Would exceed 16MB if embedded
- Different query patterns

**Querying referenced data:**
```javascript
// Get user's orders
const user = await db.users.findOne({ _id: userId })
const orders = await db.orders.find({ userId: user._id })

// Or with aggregation ($lookup)
db.users.aggregate([
  { $match: { _id: userId } },
  {
    $lookup: {
      from: 'orders',
      localField: '_id',
      foreignField: 'userId',
      as: 'orders'
    }
  }
])
```

**Interview Tip:**
> "I use references for one-to-many because embedding would cause unbounded array growth, potentially exceeding MongoDB's 16MB document limit and degrading performance."

---

### 4. One-to-Squillions (1:Massive)

**Example:** Product → Page Views (millions of views)

**Access Pattern:** Never need ALL views together

**Solution:** **REFERENCE FROM CHILD (Reverse Reference)**

```javascript
// ✅ BEST: Parent reference in child
// Products collection
{
  _id: ObjectId('product1'),
  name: 'Laptop',
  price: 999,
  totalViews: 5000000,          // Just count, not all views!
  viewsToday: 1234
}

// PageViews collection (separate, massive)
{
  _id: ObjectId('view1'),
  productId: ObjectId('product1'),  // Reference to product
  userId: ObjectId('user123'),
  timestamp: ISODate('2024-11-02'),
  sessionId: 'abc123'
}
```

**Why this design?**
- Product document stays small
- Can query recent views separately
- Aggregate stats stored in product (totalViews)
- Scales to billions of views

**Pattern: Store summary, not details**
```javascript
// Product with aggregated stats
{
  _id: ObjectId('product1'),
  name: 'Laptop',
  stats: {
    totalViews: 5000000,
    viewsToday: 1234,
    viewsThisWeek: 8900,
    uniqueViewers: 120000
  }
  // Don't embed millions of view records!
}
```

---

### 5. Many-to-Many (M:N)

**Example:** Students ↔ Courses

**Access Patterns:** 
- Show student's courses
- Show course's students

**Solution:** Depends on access pattern!

#### Option A: Embed Array of IDs (Common)

```javascript
// Students collection
{
  _id: ObjectId('student1'),
  name: 'John',
  courseIds: [                    // Array of course IDs
    ObjectId('course1'),
    ObjectId('course2'),
    ObjectId('course3')
  ]
}

// Courses collection
{
  _id: ObjectId('course1'),
  name: 'MongoDB Mastery',
  studentIds: [                   // Array of student IDs
    ObjectId('student1'),
    ObjectId('student2')
  ]
}
```

**When to use:**
- Limited number of relationships (< 100)
- Need quick lookup from both sides
- Data rarely changes

**Query:**
```javascript
// Get student's courses
const student = await db.students.findOne({ _id: studentId })
const courses = await db.courses.find({ 
  _id: { $in: student.courseIds } 
})
```

#### Option B: Junction Collection (Better for complex M:N)

```javascript
// Students collection
{
  _id: ObjectId('student1'),
  name: 'John'
}

// Courses collection
{
  _id: ObjectId('course1'),
  name: 'MongoDB Mastery'
}

// Enrollments collection (junction)
{
  _id: ObjectId('enroll1'),
  studentId: ObjectId('student1'),
  courseId: ObjectId('course1'),
  enrolledDate: ISODate('2024-09-01'),
  grade: 'A',
  status: 'active',
  progress: 75
}
```

**When to use:**
- Relationship has attributes (enrolledDate, grade, progress)
- Many relationships (thousands)
- Complex queries on relationship
- Need to track relationship history

**Query with aggregation:**
```javascript
// Get student's courses with enrollment details
db.enrollments.aggregate([
  { $match: { studentId: ObjectId('student1') } },
  {
    $lookup: {
      from: 'courses',
      localField: 'courseId',
      foreignField: '_id',
      as: 'courseDetails'
    }
  },
  { $unwind: '$courseDetails' }
])
```

**Interview Tip:**
> "For many-to-many, I use a junction collection when the relationship itself has attributes like enrolledDate or grade. If it's just a simple link, I use arrays of IDs on both sides."

---

## Embedded vs Referenced - Complete Decision Framework

### Decision Tree:

```
Is data ALWAYS accessed together?
│
├─ YES → Is it 1:1 or 1:Few (< 10)?
│   │
│   ├─ YES → EMBED ✅
│   │
│   └─ NO → Does it grow unbounded?
│       │
│       ├─ YES → REFERENCE ✅
│       └─ NO → Can EMBED (with limits) ⚠️
│
└─ NO → Will it exceed 16MB?
    │
    ├─ YES → REFERENCE ✅
    │
    └─ NO → Check access pattern
        │
        ├─ Read-heavy → Consider EMBED
        └─ Write-heavy → Consider REFERENCE
```

### Complete Comparison Table:

| Factor | Embed | Reference |
|--------|-------|-----------|
| **Relationship** | 1:1, 1:Few | 1:Many, M:N |
| **Access Pattern** | Always together | Separate queries |
| **Data Growth** | Bounded (< 16MB) | Unbounded |
| **Queries** | Single query | Multiple queries / $lookup |
| **Atomicity** | ✅ Atomic updates | ❌ No atomicity (need transactions) |
| **Performance** | 🚀 Faster reads | Slower (joins) |
| **Duplication** | ⚠️ Possible | ✅ No duplication |
| **Flexibility** | ❌ Rigid structure | ✅ Flexible queries |
| **When to Use** | User profile, addresses | Orders, comments, reviews |

---

## Schema Design Patterns (12 Patterns)

### Pattern 1: Subset Pattern

**Problem:** Large array of data, but only need subset frequently

**Example:** Product with 10,000 reviews

**Solution:** Store recent/important subset in document, rest in separate collection

```javascript
// Products collection
{
  _id: ObjectId('product1'),
  name: 'Laptop',
  price: 999,
  // Only recent 10 reviews embedded
  recentReviews: [
    { user: 'John', rating: 5, comment: 'Great!', date: ISODate('2024-11-01') },
    { user: 'Jane', rating: 4, comment: 'Good', date: ISODate('2024-10-30') }
    // ... 8 more recent reviews
  ],
  reviewStats: {
    total: 10000,
    avgRating: 4.5,
    distribution: {
      5: 6000,
      4: 3000,
      3: 800,
      2: 150,
      1: 50
    }
  }
}

// Reviews collection (full history)
{
  _id: ObjectId('review1'),
  productId: ObjectId('product1'),
  userId: ObjectId('user1'),
  rating: 5,
  comment: 'Great product!',
  helpful: 45,
  createdAt: ISODate('2024-01-15')
}
```

**Benefits:**
- Fast product page load (only 10 reviews)
- Full history available when needed
- Stats pre-calculated
- Document stays under 16MB

**When to use:**
- Social media posts with millions of comments
- Products with thousands of reviews
- Articles with many revisions

---

### Pattern 2: Extended Reference Pattern

**Problem:** Frequently need few fields from referenced document

**Example:** Order needs user's email for confirmation (not entire user object)

**Solution:** Duplicate frequently accessed fields

```javascript
// Orders collection
{
  _id: ObjectId('order1'),
  orderNumber: 'ORD-001',
  userId: ObjectId('user1'),        // Reference
  // Denormalized user data (frequently needed)
  userName: 'John Doe',
  userEmail: 'john@example.com',
  userPhone: '1234567890',
  items: [...],
  total: 500
}
```

**Benefits:**
- No join needed for common queries
- Order has user info even if user deleted
- Faster order confirmations/emails

**Trade-off:**
- Data duplication
- Must update if user changes email (rarely happens)

**When to use:**
- Shipping labels (need address snapshot)
- Invoices (need price at purchase time)
- Historical records

**Interview Answer:**
> "I use the Extended Reference pattern when I need to frequently access a few fields from a related document without fetching the entire document. For example, in orders, I denormalize the user's email and name because I need them for every order confirmation, but I don't need the user's full profile, password, or preferences."

---

### Pattern 3: Bucket Pattern

**Problem:** Time-series data creates millions of documents

**Example:** IoT sensor readings every 10 seconds

**Solution:** Group data into time-based buckets

```javascript
// ❌ BAD: One document per reading (86,400 docs/day!)
{
  sensorId: 123,
  temperature: 20,
  timestamp: ISODate('2024-11-02T10:00:00')
}

// ✅ GOOD: Bucket by hour (24 docs/day)
{
  _id: ObjectId('bucket1'),
  sensorId: 123,
  date: ISODate('2024-11-02T10:00:00'),  // Hour bucket
  readings: [
    { minute: 0, second: 0, temp: 20.1, humidity: 65 },
    { minute: 0, second: 10, temp: 20.2, humidity: 65 },
    { minute: 0, second: 20, temp: 20.1, humidity: 66 },
    // ... 360 readings in this hour
  ],
  count: 360,
  stats: {
    avgTemp: 20.5,
    maxTemp: 22.1,
    minTemp: 19.8
  }
}
```

**Benefits:**
- 360x fewer documents (360 readings → 1 bucket)
- Faster queries
- Pre-calculated stats
- Better index efficiency

**When to use:**
- IoT sensor data
- Stock market ticks
- Application logs
- Website analytics

**Bucket size options:**
- Minute buckets (for high-frequency data)
- Hour buckets (most common)
- Day buckets (for low-frequency data)

---

### Pattern 4: Attribute Pattern

**Problem:** Documents have different fields (polymorphic data)

**Example:** Products have different specifications

**Solution:** Store varying attributes in flexible array

```javascript
// ❌ BAD: Different schemas for each product type
// Electronics
{
  _id: 1,
  name: 'Laptop',
  category: 'electronics',
  ram: '16GB',
  storage: '512GB',
  processor: 'i7'
}

// Clothing
{
  _id: 2,
  name: 'T-Shirt',
  category: 'clothing',
  size: 'L',
  color: 'Blue',
  material: 'Cotton'
}

// ✅ GOOD: Uniform schema with attributes array
{
  _id: 1,
  name: 'Laptop',
  category: 'electronics',
  price: 999,
  attributes: [
    { key: 'RAM', value: '16GB', type: 'string' },
    { key: 'Storage', value: '512GB', type: 'string' },
    { key: 'Processor', value: 'i7', type: 'string' }
  ]
}

{
  _id: 2,
  name: 'T-Shirt',
  category: 'clothing',
  price: 25,
  attributes: [
    { key: 'Size', value: 'L', type: 'string' },
    { key: 'Color', value: 'Blue', type: 'string' },
    { key: 'Material', value: 'Cotton', type: 'string' }
  ]
}
```

**Benefits:**
- Flexible schema
- Easy to add new attributes
- Can index on attributes.key
- Uniform query pattern

**Index for fast queries:**
```javascript
db.products.createIndex({ 'attributes.key': 1, 'attributes.value': 1 })

// Query products with 16GB RAM
db.products.find({
  attributes: {
    $elemMatch: { key: 'RAM', value: '16GB' }
  }
})
```

**When to use:**
- E-commerce with varied products
- Content management systems
- Multi-tenant applications
- When schema changes frequently

---

### Pattern 5: Outlier Pattern

**Problem:** Most documents are small, but few are huge

**Example:** Most users have 5 friends, but celebrities have millions

**Solution:** Handle outliers differently

```javascript
// Regular users (< 1000 friends)
{
  _id: ObjectId('user1'),
  name: 'John',
  friendIds: [ObjectId('u2'), ObjectId('u3'), ...],  // Array of IDs
  friendCount: 150
}

// Celebrity (millions of friends) - OUTLIER
{
  _id: ObjectId('celebrity1'),
  name: 'Famous Person',
  hasMany: true,              // Flag for outlier
  friendCount: 5000000,
  // NO friendIds array! (would exceed 16MB)
}

// Separate collection for celebrity friends
{
  _id: ObjectId('cf1'),
  userId: ObjectId('celebrity1'),
  friendIds: [/* batch of 1000 friend IDs */],
  batch: 1
}
```

**Query logic:**
```javascript
async function getFriends(userId) {
  const user = await db.users.findOne({ _id: userId })
  
  if (user.hasMany) {
    // Outlier: query separate collection
    return db.celebrityFriends.find({ userId }).toArray()
  } else {
    // Normal: return embedded array
    return user.friendIds
  }
}
```

**When to use:**
- Social networks (most users vs celebrities)
- E-commerce (most products vs viral products)
- Any scenario with power-law distribution

---

### Pattern 6: Computed Pattern

**Problem:** Expensive calculations done repeatedly

**Example:** Product average rating calculated on every view

**Solution:** Pre-compute and store

```javascript
// ❌ BAD: Calculate on every read
{
  _id: ObjectId('product1'),
  name: 'Laptop',
  reviews: [
    { rating: 5 },
    { rating: 4 },
    { rating: 5 },
    // ... 1000 reviews
  ]
}
// Application calculates average every time! (slow)

// ✅ GOOD: Pre-computed stats
{
  _id: ObjectId('product1'),
  name: 'Laptop',
  reviewCount: 1000,
  avgRating: 4.7,              // Pre-computed
  ratingDistribution: {
    5: 600,
    4: 300,
    3: 80,
    2: 15,
    1: 5
  },
  lastUpdated: ISODate('2024-11-02')
}

// Reviews in separate collection
```

**Update pattern:**
```javascript
// When new review added
db.products.updateOne(
  { _id: productId },
  {
    $inc: { 
      reviewCount: 1,
      [`ratingDistribution.${rating}`]: 1
    },
    $set: { lastUpdated: new Date() }
  }
)

// Recalculate average
const product = await db.products.findOne({ _id: productId })
const avgRating = calculateAverage(product.ratingDistribution)
await db.products.updateOne(
  { _id: productId },
  { $set: { avgRating } }
)
```

**When to use:**
- Dashboard statistics
- Leaderboards
- Popularity scores
- Engagement metrics

---

### Pattern 7: Document Versioning Pattern

**Problem:** Need to track document history

**Example:** Article with revisions

**Solution:** Embed recent version, store history separately

```javascript
// Articles collection (current version)
{
  _id: ObjectId('article1'),
  title: 'MongoDB Schema Design',
  content: 'Latest content here...',
  author: ObjectId('user1'),
  version: 5,
  updatedAt: ISODate('2024-11-02'),
  // Store only current version
}

// ArticleHistory collection
{
  _id: ObjectId('history1'),
  articleId: ObjectId('article1'),
  version: 4,
  title: 'MongoDB Schema Design',
  content: 'Previous content...',
  updatedAt: ISODate('2024-11-01'),
  updatedBy: ObjectId('user1')
}
```

**Alternative: All versions in array (for limited versions)**
```javascript
{
  _id: ObjectId('article1'),
  currentVersion: 5,
  versions: [
    {
      version: 5,
      title: 'Latest title',
      content: 'Latest content',
      timestamp: ISODate('2024-11-02')
    },
    {
      version: 4,
      title: 'Previous title',
      content: 'Previous content',
      timestamp: ISODate('2024-11-01')
    }
    // ... keep last 10 versions only
  ]
}
```

---

### Pattern 8: Pre-allocation Pattern

**Problem:** Document grows over time, causing moves

**Solution:** Pre-allocate space for future growth

```javascript
// ✅ Pre-allocate array with nulls
{
  _id: ObjectId('user1'),
  name: 'John',
  dailyStats: [
    { date: '2024-11-01', views: 100 },
    { date: '2024-11-02', views: 150 },
    null, null, null  // Pre-allocated for next 3 days
    // ... more nulls
  ]
}
```

**When to use:**
- Known growth pattern
- Performance-critical applications
- Reduce document moves

**Note:** Less common in modern MongoDB (WiredTiger handles this better)

---

### Pattern 9: Tree/Hierarchical Pattern

**Problem:** Represent hierarchical data (categories, org charts)

**Example:** Product categories

**Solution A: Parent Reference**
```javascript
{
  _id: ObjectId('cat1'),
  name: 'Electronics',
  parent: null  // Top level
}

{
  _id: ObjectId('cat2'),
  name: 'Laptops',
  parent: ObjectId('cat1')  // Child of Electronics
}

{
  _id: ObjectId('cat3'),
  name: 'Gaming Laptops',
  parent: ObjectId('cat2')  // Child of Laptops
}
```

**Solution B: Child References**
```javascript
{
  _id: ObjectId('cat1'),
  name: 'Electronics',
  children: [ObjectId('cat2'), ObjectId('cat3')]
}
```

**Solution C: Array of Ancestors (Best for queries)**
```javascript
{
  _id: ObjectId('cat3'),
  name: 'Gaming Laptops',
  ancestors: [
    ObjectId('cat1'),  // Electronics
    ObjectId('cat2')   // Laptops
  ],
  parent: ObjectId('cat2')
}

// Easy to find all descendants of Electronics
db.categories.find({ ancestors: ObjectId('cat1') })
```

**Solution D: Materialized Path**
```javascript
{
  _id: ObjectId('cat3'),
  name: 'Gaming Laptops',
  path: '/Electronics/Laptops/Gaming Laptops'
}

// Find all under Electronics
db.categories.find({ path: /^\/Electronics/ })
```

---

### Pattern 10: Polymorphic Pattern

**Problem:** Store different types in same collection

**Example:** Social media feed with different content types

```javascript
// Posts collection (polymorphic)
{
  _id: ObjectId('post1'),
  type: 'text',
  userId: ObjectId('user1'),
  content: 'Hello world!',
  likes: 10,
  createdAt: ISODate('2024-11-02')
}

{
  _id: ObjectId('post2'),
  type: 'image',
  userId: ObjectId('user1'),
  imageUrl: 'photo.jpg',
  caption: 'Check this out!',
  dimensions: { width: 1920, height: 1080 },
  likes: 50,
  createdAt: ISODate('2024-11-02')
}

{
  _id: ObjectId('post3'),
  type: 'video',
  userId: ObjectId('user1'),
  videoUrl: 'video.mp4',
  duration: 120,
  thumbnail: 'thumb.jpg',
  likes: 100,
  createdAt: ISODate('2024-11-02')
}
```

**Benefits:**
- Single collection for all post types
- Uniform querying
- Type-specific fields only when needed

**Index:**
```javascript
db.posts.createIndex({ type: 1, createdAt: -1 })
```

---

### Pattern 11: Approximation Pattern

**Problem:** Exact count is expensive for large datasets

**Solution:** Store approximate count, update periodically

```javascript
{
  _id: ObjectId('video1'),
  title: 'MongoDB Tutorial',
  viewCount: 1234567,      // Approximate (updated hourly)
  exactCount: 1234932,     // Exact (background job)
  lastCountUpdate: ISODate('2024-11-02T10:00:00')
}

// Increment approximate count
db.videos.updateOne(
  { _id: videoId },
  { $inc: { viewCount: 1 } }
)

// Background job updates exact count periodically
```

**When to use:**
- View counts
- Like counts  
- Follower counts
- When accuracy isn't critical

---

### Pattern 12: Schema Versioning Pattern

**Problem:** Need to migrate schema over time

**Solution:** Add version field, handle in application

```javascript
// Version 1 (old)
{
  _id: ObjectId('user1'),
  schemaVersion: 1,
  name: 'John Doe',
  email: 'john@example.com'
}

// Version 2 (new)
{
  _id: ObjectId('user2'),
  schemaVersion: 2,
  firstName: 'Jane',
  lastName: 'Smith',
  email: 'jane@example.com'
}

// Application handles both
function getFullName(user) {
  if (user.schemaVersion === 1) {
    return user.name
  } else {
    return `${user.firstName} ${user.lastName}`
  }
}
```

---

## Real-World Schema Examples

### Example 1: E-Commerce Platform

```javascript
// ============ USERS COLLECTION ============
{
  _id: ObjectId('user1'),
  email: 'john@example.com',
  password: 'hashed_password',
  
  // Embedded profile (1:1, always accessed together)
  profile: {
    firstName: 'John',
    lastName: 'Doe',
    phone: '1234567890',
    avatar: 'avatar.jpg',
    dateOfBirth: ISODate('1990-01-01')
  },
  
  // Embedded addresses (1:Few, max 5 addresses)
  addresses: [
    {
      _id: ObjectId('addr1'),
      type: 'home',
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'USA',
      isDefault: true
    },
    {
      _id: ObjectId('addr2'),
      type: 'work',
      street: '456 Office Ave',
      city: 'New York',
      state: 'NY',
      zipCode: '10002',
      country: 'USA',
      isDefault: false
    }
  ],
  
  // Referenced cart (1:1 but separate queries)
  cartId: ObjectId('cart1'),
  
  // Stats (computed pattern)
  stats: {
    totalOrders: 45,
    totalSpent: 12500,
    memberSince: ISODate('2022-01-15')
  },
  
  createdAt: ISODate('2022-01-15'),
  lastLogin: ISODate('2024-11-02')
}

// ============ PRODUCTS COLLECTION ============
{
  _id: ObjectId('prod1'),
  name: 'Gaming Laptop',
  slug: 'gaming-laptop-asus-rog',
  
  // Product details
  description: 'High-performance gaming laptop',
  brand: 'ASUS',
  category: ObjectId('cat1'),  // Reference to categories
  
  // Pricing
  price: 1299.99,
  salePrice: 1199.99,
  currency: 'USD',
  
  // Inventory
  stock: 50,
  sku: 'LAPTOP-001',
  
  // Attributes pattern (polymorphic specs)
  specifications: [
    { key: 'RAM', value: '16GB', displayOrder: 1 },
    { key: 'Storage', value: '512GB SSD', displayOrder: 2 },
    { key: 'Processor', value: 'Intel i7', displayOrder: 3 },
    { key: 'GPU', value: 'NVIDIA RTX 3060', displayOrder: 4 }
  ],
  
  // Images
  images: [
    { url: 'laptop-front.jpg', alt: 'Front view', isPrimary: true },
    { url: 'laptop-side.jpg', alt: 'Side view', isPrimary: false }
  ],
  
  // Subset pattern - Recent reviews only
  recentReviews: [
    {
      userId: ObjectId('user2'),
      userName: 'Jane Smith',
      rating: 5,
      comment: 'Excellent laptop!',
      helpful: 15,
      createdAt: ISODate('2024-10-25')
    },
    {
      userId: ObjectId('user3'),
      userName: 'Bob Wilson',
      rating: 4,
      comment: 'Good performance',
      helpful: 8,
      createdAt: ISODate('2024-10-20')
    }
    // Only last 10 reviews embedded
  ],
  
  // Computed pattern - Pre-calculated stats
  reviewStats: {
    total: 234,
    avgRating: 4.6,
    distribution: {
      5: 150,
      4: 60,
      3: 18,
      2: 4,
      1: 2
    }
  },
  
  // SEO
  seo: {
    metaTitle: 'Best Gaming Laptop 2024',
    metaDescription: 'High-performance gaming laptop...',
    keywords: ['gaming', 'laptop', 'asus']
  },
  
  isActive: true,
  createdAt: ISODate('2024-01-01'),
  updatedAt: ISODate('2024-11-01')
}

// ============ REVIEWS COLLECTION (Full history) ============
{
  _id: ObjectId('review1'),
  productId: ObjectId('prod1'),
  userId: ObjectId('user1'),
  rating: 5,
  title: 'Best laptop ever!',
  comment: 'This laptop exceeded my expectations...',
  helpful: 45,
  notHelpful: 2,
  verified: true,  // Verified purchase
  images: ['review1.jpg', 'review2.jpg'],
  createdAt: ISODate('2024-01-15'),
  updatedAt: ISODate('2024-01-16')
}

// ============ ORDERS COLLECTION ============
{
  _id: ObjectId('order1'),
  orderNumber: 'ORD-2024-001234',
  
  // Extended reference pattern - User info snapshot
  userId: ObjectId('user1'),
  userEmail: 'john@example.com',
  userName: 'John Doe',
  
  // Order items (embedded, snapshot of product at order time)
  items: [
    {
      productId: ObjectId('prod1'),
      productName: 'Gaming Laptop',  // Snapshot
      sku: 'LAPTOP-001',
      price: 1199.99,  // Price at purchase time
      quantity: 1,
      subtotal: 1199.99
    },
    {
      productId: ObjectId('prod2'),
      productName: 'Wireless Mouse',
      sku: 'MOUSE-001',
      price: 29.99,
      quantity: 2,
      subtotal: 59.98
    }
  ],
  
  // Pricing
  subtotal: 1259.97,
  tax: 100.80,
  shipping: 0,
  discount: 50,  // Coupon applied
  total: 1310.77,
  
  // Shipping address (embedded snapshot)
  shippingAddress: {
    name: 'John Doe',
    street: '123 Main St',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    country: 'USA',
    phone: '1234567890'
  },
  
  // Billing (can be different)
  billingAddress: {
    // Same structure
  },
  
  // Payment
  paymentMethod: 'credit_card',
  paymentStatus: 'paid',
  paymentId: 'stripe_ch_xyz',
  
  // Order status
  status: 'shipped',  // pending → processing → shipped → delivered
  trackingNumber: 'TRACK123456',
  
  // Timeline (subdocument array)
  timeline: [
    { status: 'pending', timestamp: ISODate('2024-11-01T10:00:00') },
    { status: 'processing', timestamp: ISODate('2024-11-01T11:00:00') },
    { status: 'shipped', timestamp: ISODate('2024-11-02T09:00:00') }
  ],
  
  createdAt: ISODate('2024-11-01T10:00:00'),
  updatedAt: ISODate('2024-11-02T09:00:00')
}

// ============ CART COLLECTION (Temporary) ============
{
  _id: ObjectId('cart1'),
  userId: ObjectId('user1'),
  
  items: [
    {
      productId: ObjectId('prod1'),
      quantity: 1,
      addedAt: ISODate('2024-11-02T08:00:00')
    }
  ],
  
  updatedAt: ISODate('2024-11-02T08:00:00'),
  expiresAt: ISODate('2024-11-09T08:00:00')  // TTL index (7 days)
}

// ============ CATEGORIES COLLECTION (Tree pattern) ============
{
  _id: ObjectId('cat1'),
  name: 'Electronics',
  slug: 'electronics',
  parent: null,  // Top level
  ancestors: [],  // Array of ancestors pattern
  path: '/electronics',  // Materialized path
  level: 0,
  order: 1,
  icon: 'electronics.svg',
  isActive: true
}

{
  _id: ObjectId('cat2'),
  name: 'Laptops',
  slug: 'laptops',
  parent: ObjectId('cat1'),
  ancestors: [ObjectId('cat1')],
  path: '/electronics/laptops',
  level: 1,
  order: 1,
  icon: 'laptop.svg',
  isActive: true
}
```

**Indexes for E-commerce:**
```javascript
// Products
db.products.createIndex({ slug: 1 }, { unique: true })
db.products.createIndex({ category: 1, price: 1 })
db.products.createIndex({ 'reviewStats.avgRating': -1 })
db.products.createIndex({ name: 'text', description: 'text' })

// Orders
db.orders.createIndex({ userId: 1, createdAt: -1 })
db.orders.createIndex({ orderNumber: 1 }, { unique: true })
db.orders.createIndex({ status: 1, createdAt: -1 })

// Cart
db.carts.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })  // TTL
```

---

### Example 2: Social Media Platform

```javascript
// ============ USERS COLLECTION ============
{
  _id: ObjectId('user1'),
  username: 'johndoe',
  email: 'john@example.com',
  password: 'hashed',
  
  profile: {
    displayName: 'John Doe',
    bio: 'Software Developer',
    avatar: 'avatar.jpg',
    coverPhoto: 'cover.jpg',
    location: 'New York, USA',
    website: 'johndoe.com',
    dateOfBirth: ISODate('1995-01-01')
  },
  
  // Computed stats (updated via background jobs)
  stats: {
    followers: 1250,
    following: 340,
    posts: 89,
    verified: true
  },
  
  // Privacy settings
  privacy: {
    profileVisibility: 'public',  // public, friends, private
    showEmail: false,
    showLocation: true
  },
  
  createdAt: ISODate('2022-01-01'),
  lastActive: ISODate('2024-11-02')
}

// ============ POSTS COLLECTION (Polymorphic) ============
{
  _id: ObjectId('post1'),
  type: 'text',  // text, image, video, link
  userId: ObjectId('user1'),
  
  // Extended reference - denormalized user data
  username: 'johndoe',
  userAvatar: 'avatar.jpg',
  
  content: 'Just finished learning MongoDB schema design! 🚀',
  
  // Media (for type = image/video)
  media: {
    url: 'image.jpg',
    thumbnail: 'thumb.jpg',
    width: 1920,
    height: 1080,
    type: 'image/jpeg'
  },
  
  // Hashtags (for fast queries)
  hashtags: ['mongodb', 'database', 'learning'],
  
  // Mentions
  mentions: [ObjectId('user2'), ObjectId('user3')],
  
  // Engagement (computed)
  likes: 150,
  comments: 25,
  shares: 10,
  
  // Subset pattern - Recent likes only
  recentLikes: [
    { userId: ObjectId('user2'), timestamp: ISODate('2024-11-02T10:00:00') },
    { userId: ObjectId('user3'), timestamp: ISODate('2024-11-02T09:00:00') }
    // ... only last 20 likes
  ],
  
  visibility: 'public',
  createdAt: ISODate('2024-11-02T08:00:00'),
  updatedAt: ISODate('2024-11-02T10:00:00')
}

// ============ LIKES COLLECTION (For full history) ============
{
  _id: ObjectId('like1'),
  postId: ObjectId('post1'),
  userId: ObjectId('user2'),
  createdAt: ISODate('2024-11-02T10:00:00')
}
// Compound index: { postId: 1, userId: 1 } (unique)

// ============ COMMENTS COLLECTION (Referenced 1:Many) ============
{
  _id: ObjectId('comment1'),
  postId: ObjectId('post1'),
  userId: ObjectId('user2'),
  username: 'janedoe',
  userAvatar: 'avatar2.jpg',
  
  content: 'Great explanation!',
  
  likes: 5,
  
  // Nested comments (parent-child)
  parentCommentId: null,  // null = top-level comment
  
  createdAt: ISODate('2024-11-02T09:00:00')
}

// ============ FOLLOWS COLLECTION (M:N relationship) ============
{
  _id: ObjectId('follow1'),
  followerId: ObjectId('user2'),    // Who is following
  followingId: ObjectId('user1'),   // Who is being followed
  createdAt: ISODate('2024-01-15')
}
// Indexes: { followerId: 1, followingId: 1 }, { followingId: 1, followerId: 1 }

// ============ NOTIFICATIONS COLLECTION (TTL) ============
{
  _id: ObjectId('notif1'),
  userId: ObjectId('user1'),        // Recipient
  type: 'like',  // like, comment, follow, mention
  actorId: ObjectId('user2'),       // Who triggered
  actorName: 'Jane Doe',
  actorAvatar: 'avatar2.jpg',
  postId: ObjectId('post1'),
  message: 'liked your post',
  read: false,
  createdAt: ISODate('2024-11-02T10:00:00'),
  expiresAt: ISODate('2024-12-02T10:00:00')  // Auto-delete after 30 days
}
```

---

## Interview Questions on Schema

### Q1: "Design a schema for Twitter/X"

**Perfect Answer Structure:**

> "Great! Let me start by understanding the requirements and access patterns.
>
> **Key Features:**
> - Users can post tweets (280 chars)
> - Follow other users
> - Like and retweet
> - Reply to tweets (threads)
> - Timeline (see tweets from followed users)
>
> **Access Patterns:**
> 1. Most common: Load user timeline (tweets from followed users)
> 2. Load user profile with their tweets
> 3. Load individual tweet with replies
> 4. Search tweets by hashtags
>
> **My Design:**
>
> **Users Collection:**
> ```javascript
> {
>   _id: ObjectId(),
>   username: 'unique_username',
>   email: 'email',
>   profile: { /* embedded 1:1 */ },
>   stats: {
>     followers: 1000,  // Computed
>     following: 500,
>     tweets: 2000
>   }
> }
> ```
>
> **Tweets Collection:**
> ```javascript
> {
>   _id: ObjectId(),
>   userId: ObjectId(),
>   // Denormalized user data (extended reference)
>   username: 'johndoe',
>   userAvatar: 'avatar.jpg',
>   content: 'Tweet text...',
>   hashtags: ['mongodb'],  // For fast hashtag search
>   likes: 100,  // Count only
>   retweets: 50,
>   replies: 10,
>   createdAt: Date
> }
> ```
>
> **Follows Collection (M:N):**
> ```javascript
> {
>   followerId: ObjectId(),
>   followingId: ObjectId()
> }
> // Indexes: Both directions for fast queries
> ```
>
> **Likes Collection (1:Squillions - separate):**
> ```javascript
> {
>   tweetId: ObjectId(),
>   userId: ObjectId()
> }
> // Why separate? A tweet can have millions of likes
> ```
>
> **Key Decisions:**
> 1. **Denormalized username in tweets** - Don't need to join for timeline
> 2. **Separate likes collection** - Unbounded growth
> 3. **Hashtags array** - Fast hashtag search with index
> 4. **Computed stats** - Background job updates follower counts
> 5. **Follows as separate collection** - Efficient M:N queries
>
> **Indexes:**
> ```javascript
> db.tweets.createIndex({ userId: 1, createdAt: -1 })  // User tweets
> db.tweets.createIndex({ hashtags: 1, createdAt: -1 }) // Hashtag search
> db.follows.createIndex({ followerId: 1 })  // Get following
> db.follows.createIndex({ followingId: 1 }) // Get followers
> ```
>
> **Timeline Query:**
> ```javascript
> // Get IDs of users I follow
> const following = await db.follows.find(
>   { followerId: myUserId }
> ).toArray()
> const userIds = following.map(f => f.followingId)
>
> // Get their tweets
> const timeline = await db.tweets.find({
>   userId: { $in: userIds }
> }).sort({ createdAt: -1 }).limit(20).toArray()
> ```
>
> **Why this design?**
> - Timeline loads fast (single query, no joins)
> - User data denormalized (no join needed)
> - Scales to millions of users
> - Follows both directions indexed"

---

### Q2: "Should you embed or reference product reviews?"

**Perfect Answer:**

> "It depends on the scale and access patterns. Let me explain both approaches:
>
> **Scenario A: Small Scale (< 100 reviews per product)**
> **Embed:** 
> ```javascript
> {
>   _id: ObjectId(),
>   name: 'Product',
>   reviews: [
>     { user: 'John', rating: 5, comment: 'Great!' },
>     // ... < 100 reviews
>   ]
> }
> ```
> **Why:** Single query, atomic updates, fast product page load
>
> **Scenario B: Large Scale (1000s of reviews)**
> **Use Subset Pattern:**
> ```javascript
> // Product document
> {
>   _id: ObjectId(),
>   name: 'Product',
>   recentReviews: [/* 10 recent */],
>   reviewStats: {
>     total: 5000,
>     avgRating: 4.5
>   }
> }
>
> // Reviews collection
> { productId: ObjectId(), /* full review */ }
> ```
> **Why:**
> - Product page shows 10 recent reviews (fast)
> - Full reviews paginated separately
> - Document stays small
> - Can query/filter all reviews independently
>
> **My Recommendation:**
> Start with Subset Pattern even for small scale because:
> 1. Future-proof (scales to millions)
> 2. Product document stays small
> 3. Can implement advanced review features (sorting, filtering)
> 4. Only slightly more complex
>
> **Trade-off:**
> - Embedding: Simpler but doesn't scale
> - Subset: Slightly complex but production-ready"

---

### Q3: "How do you handle user followers in social media?"

**Perfect Answer:**

> "There are three approaches based on scale:
>
> **Approach 1: Embedded Arrays (Small Scale < 1000)**
> ```javascript
> {
>   _id: ObjectId('user1'),
>   name: 'John',
>   followers: [ObjectId('u2'), ObjectId('u3')],
>   following: [ObjectId('u4'), ObjectId('u5')]
> }
> ```
> **Problem:** Doesn't scale - celebrities have millions of followers
>
> **Approach 2: Separate Follows Collection (Most Common)**
> ```javascript
> {
>   _id: ObjectId(),
>   followerId: ObjectId('user2'),  // Who follows
>   followingId: ObjectId('user1'), // Who is followed
>   createdAt: Date
> }
> ```
> **Indexes:**
> ```javascript
> db.follows.createIndex({ followerId: 1 })  // My following
> db.follows.createIndex({ followingId: 1 }) // My followers
> ```
> **Benefits:**
> - Scales infinitely
> - Fast queries both directions
> - Can add metadata (followedAt, notifications)
>
> **Approach 3: Outlier Pattern (Best for Real Systems)**
> ```javascript
> // Regular users
> {
>   _id: ObjectId('user1'),
>   followers: [/* array < 5000 */],
>   isOutlier: false
> }
>
> // Celebrities
> {
>   _id: ObjectId('celebrity'),
>   isOutlier: true,
>   followerCount: 5000000
>   // No array! Query separate collection
> }
> ```
>
> **My Recommendation:**
> Approach 2 (Separate Collection) because:
> 1. Works for all users (no special handling)
> 2. Easy to query: 'Who follows me?' and 'Who do I follow?'
> 3. Scales to millions
> 4. Can track follow date
>
> **Stats Storage:**
> Store counts in user document (computed pattern):
> ```javascript
> {
>   _id: ObjectId('user1'),
>   stats: {
>     followers: 1250,  // Updated by background job
>     following: 340
>   }
> }
> ```
> This avoids counting millions of documents on every profile view."

---

## Common Mistakes to Avoid

### Mistake 1: Always Normalizing (SQL Thinking)

```javascript
// ❌ BAD: Over-normalized
// Users
{ _id: 1, name: 'John' }
// Addresses
{ _id: 1, userId: 1, street: '...' }
// Phones
{ _id: 1, userId: 1, number: '...' }

// ✅ GOOD: Embed 1:Few relationships
{
  _id: 1,
  name: 'John',
  addresses: [{ street: '...' }],
  phones: ['123-456', '789-012']
}
```

### Mistake 2: Embedding Unbounded Arrays

```javascript
// ❌ BAD: Will exceed 16MB
{
  _id: 'user1',
  name: 'Celebrity',
  followers: [/* 5 million follower IDs! */]
}

// ✅ GOOD: Separate collection
{
  followerId: ObjectId(),
  followingId: ObjectId()
}
```

### Mistake 3: Not Considering Access Patterns

```javascript
// ❌ BAD: Embedded when accessed separately
{
  _id: 'user1',
  orders: [/* 1000s of orders always fetched with user! */]
}

// ✅ GOOD: Reference when queried separately
// Users: { _id: 'user1', name: 'John' }
// Orders: { userId: 'user1', ... }
```

### Mistake 4: Duplicating Data Without Reason

```javascript
// ❌ BAD: Full user object in every post
{
  _id: 'post1',
  user: {
    _id: 'user1',
    name: 'John',
    email: 'john@email.com',
    password: 'hash',
    // ... 50 more fields
  }
}

// ✅ GOOD: Only frequently accessed fields
{
  _id: 'post1',
  userId: ObjectId('user1'),
  username: 'johndoe',  // Denormalized
  userAvatar: 'avatar.jpg'  // Denormalized
  // Can fetch full user if needed
}
```

### Mistake 5: Not Using Indexes

```javascript
// ❌ BAD: No index on frequently queried field
db.orders.find({ userId: 'user1' })  // Full collection scan!

// ✅ GOOD: Index on foreign key
db.orders.createIndex({ userId: 1, createdAt: -1 })
```

---

## How to Explain Schema Decisions in Interviews

### Framework: DAPTE

**D - Define** the relationship  
**A - Access** patterns  
**P - Pros/Cons** of each approach  
**T - Trade-offs**  
**E - Example** from your project

### Example: "Why did you embed addresses?"

**Using DAPTE:**

**D - Define:**
> "User to addresses is a 1:Few relationship - typically 1-5 addresses per user."

**A - Access Patterns:**
> "Addresses are always displayed with user profile, never queried independently. When a user checks out, we need their shipping addresses immediately."

**P - Pros/Cons:**
> **Embedded Pros:**
> - Single query (fast checkout)
> - Atomic updates (add/update address)
> - No joins needed
>
> **Reference Pros:**
> - None in this case (addresses don't need separate queries)

**T - Trade-offs:**
> "The trade-off is data duplication if we use addresses in orders, but we handle that with the Extended Reference pattern - we snapshot the address in the order document so we have it even if user deletes the address."

**E - Example:**
> "In my e-commerce project, this design gave us sub-100ms checkout times because we fetch user and addresses in one query. When user places order, we copy the selected address to the order document as a snapshot, so the order always has the correct shipping address even if user changes their saved addresses later."

---

## 🎯 Schema Design Checklist (Print This!)

Before finalizing any schema, ask:

- [ ] What are the access patterns? (How will data be queried?)
- [ ] What is the relationship type? (1:1, 1:Few, 1:Many, M:N)
- [ ] Will the embedded data grow unbounded?
- [ ] Is data always accessed together?
- [ ] Will document exceed 16MB?
- [ ] Do I need atomic updates?
- [ ] Is this read-heavy or write-heavy?
- [ ] Do I need to query related data independently?
- [ ] What fields should I denormalize?
- [ ] What indexes do I need?

---

## 🚀 Practice Exercise

**Design schemas for these scenarios:**

1. **Netflix** - Users, Movies, Watch History, Recommendations
2. **Uber** - Riders, Drivers, Trips, Ratings
3. **LinkedIn** - Users, Connections, Jobs, Applications
4. **Airbnb** - Users, Listings, Bookings, Reviews

**For each:**
- Define collections
- Choose embed vs reference
- Identify patterns used
- List required indexes
- Explain access patterns

---

**Now you have complete schema design mastery! This is THE most important topic for MongoDB interviews. Practice explaining your decisions clearly! 🎯**
