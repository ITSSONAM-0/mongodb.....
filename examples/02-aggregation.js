// ========================================
// MongoDB Aggregation Framework Examples
// Run: node 02-aggregation.js
// ========================================

const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function aggregationExamples() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('ecommerce_db');
    
    // Setup sample data
    await setupSampleData(db);

    // ==================== Example 1: Basic Grouping ====================
    console.log('\n--- Example 1: Sales by Category ---');
    
    const salesByCategory = await db.collection('products').aggregate([
      {
        $group: {
          _id: '$category',
          totalProducts: { $sum: 1 },
          avgPrice: { $avg: '$price' },
          maxPrice: { $max: '$price' },
          minPrice: { $min: '$price' },
          totalValue: { $sum: '$price' }
        }
      },
      {
        $sort: { totalValue: -1 }
      }
    ]).toArray();

    console.log(salesByCategory);

    // ==================== Example 2: Match and Project ====================
    console.log('\n--- Example 2: Expensive Electronics ---');
    
    const expensiveElectronics = await db.collection('products').aggregate([
      {
        $match: {
          category: 'electronics',
          price: { $gt: 500 }
        }
      },
      {
        $project: {
          name: 1,
          price: 1,
          discount: { $multiply: ['$price', 0.1] },  // 10% discount
          finalPrice: { $subtract: ['$price', { $multiply: ['$price', 0.1] }] }
        }
      }
    ]).toArray();

    console.log(expensiveElectronics);

    // ==================== Example 3: Lookup (JOIN) ====================
    console.log('\n--- Example 3: Orders with User Details ---');
    
    const ordersWithUsers = await db.collection('orders').aggregate([
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
      },
      {
        $project: {
          orderNumber: 1,
          total: 1,
          'userDetails.name': 1,
          'userDetails.email': 1
        }
      },
      {
        $limit: 5
      }
    ]).toArray();

    console.log(ordersWithUsers);

    // ==================== Example 4: Complex Pipeline ====================
    console.log('\n--- Example 4: Monthly Revenue Report ---');
    
    const monthlyRevenue = await db.collection('orders').aggregate([
      {
        $match: {
          status: 'completed'
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          totalRevenue: { $sum: '$total' },
          orderCount: { $sum: 1 },
          avgOrderValue: { $avg: '$total' }
        }
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1 }
      },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month',
          totalRevenue: { $round: ['$totalRevenue', 2] },
          orderCount: 1,
          avgOrderValue: { $round: ['$avgOrderValue', 2] }
        }
      }
    ]).toArray();

    console.log(monthlyRevenue);

    // ==================== Example 5: Array Operations ====================
    console.log('\n--- Example 5: Products with Reviews ---');
    
    const productsWithReviews = await db.collection('products').aggregate([
      {
        $match: {
          reviews: { $exists: true, $ne: [] }
        }
      },
      {
        $project: {
          name: 1,
          avgRating: { $avg: '$reviews.rating' },
          reviewCount: { $size: '$reviews' },
          latestReview: { $arrayElemAt: ['$reviews', -1] }
        }
      },
      {
        $sort: { avgRating: -1 }
      },
      {
        $limit: 3
      }
    ]).toArray();

    console.log(productsWithReviews);

    // ==================== Example 6: Faceted Search ====================
    console.log('\n--- Example 6: Product Analytics Dashboard ---');
    
    const dashboard = await db.collection('products').aggregate([
      {
        $facet: {
          // Price ranges
          priceRanges: [
            {
              $bucket: {
                groupBy: '$price',
                boundaries: [0, 100, 500, 1000, 10000],
                default: 'Other',
                output: {
                  count: { $sum: 1 },
                  products: { $push: '$name' }
                }
              }
            }
          ],
          // Category summary
          categoryStats: [
            {
              $group: {
                _id: '$category',
                count: { $sum: 1 }
              }
            }
          ],
          // Overall stats
          overallStats: [
            {
              $group: {
                _id: null,
                totalProducts: { $sum: 1 },
                avgPrice: { $avg: '$price' },
                totalValue: { $sum: '$price' }
              }
            }
          ]
        }
      }
    ]).toArray();

    console.log(JSON.stringify(dashboard, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\n✅ Connection closed');
  }
}

async function setupSampleData(db) {
  // Clear existing data
  await db.collection('users').deleteMany({});
  await db.collection('products').deleteMany({});
  await db.collection('orders').deleteMany({});

  // Insert users
  const usersResult = await db.collection('users').insertMany([
    { _id: 1, name: 'John Doe', email: 'john@example.com' },
    { _id: 2, name: 'Jane Smith', email: 'jane@example.com' },
    { _id: 3, name: 'Bob Wilson', email: 'bob@example.com' }
  ]);

  // Insert products
  await db.collection('products').insertMany([
    {
      name: 'Laptop',
      category: 'electronics',
      price: 999,
      stock: 50,
      reviews: [
        { rating: 5, comment: 'Great!' },
        { rating: 4, comment: 'Good' }
      ]
    },
    {
      name: 'Mouse',
      category: 'electronics',
      price: 25,
      stock: 200,
      reviews: [
        { rating: 5, comment: 'Perfect' }
      ]
    },
    {
      name: 'Desk',
      category: 'furniture',
      price: 350,
      stock: 30,
      reviews: []
    },
    {
      name: 'Chair',
      category: 'furniture',
      price: 200,
      stock: 40,
      reviews: [
        { rating: 4, comment: 'Comfortable' }
      ]
    },
    {
      name: 'Book',
      category: 'books',
      price: 15,
      stock: 100,
      reviews: []
    }
  ]);

  // Insert orders
  await db.collection('orders').insertMany([
    {
      orderNumber: 'ORD-001',
      userId: 1,
      total: 999,
      status: 'completed',
      createdAt: new Date('2024-10-15')
    },
    {
      orderNumber: 'ORD-002',
      userId: 2,
      total: 550,
      status: 'completed',
      createdAt: new Date('2024-10-20')
    },
    {
      orderNumber: 'ORD-003',
      userId: 1,
      total: 25,
      status: 'completed',
      createdAt: new Date('2024-11-01')
    },
    {
      orderNumber: 'ORD-004',
      userId: 3,
      total: 200,
      status: 'pending',
      createdAt: new Date('2024-11-02')
    }
  ]);

  console.log('✅ Sample data created');
}

aggregationExamples();