/**
 * 🔥 CONCURRENCY STRESS TEST - Stock Management
 * 
 * Tests the atomic stock reservation system under high concurrent load.
 * Simulates multiple buyers attempting to purchase the same products simultaneously.
 * 
 * This test validates that:
 * 1. Stock never goes negative
 * 2. Total items sold never exceeds initial stock
 * 3. Race conditions are properly handled
 * 4. Users receive clear error messages when stock is insufficient
 * 
 * HOW TO RUN:
 * ===========
 * 
 * 1. Prerequisites:
 *    - Backend API running (npm run dev)
 *    - Test users created in database
 *    - Test products with known stock levels
 * 
 * 2. Setup test data:
 *    npx tsx apps/api/tests/setup-concurrency-test-data.ts
 * 
 * 3. Run test:
 *    npx tsx apps/api/tests/concurrency-test.ts
 * 
 * 4. Verify results in console and database
 * 
 * @author RoboHatch Backend Team
 * @version 1.0.0
 */

import axios, { AxiosError } from 'axios';

// =============================================================================
// CONFIGURATION
// =============================================================================

const API_BASE_URL = process.env.API_URL || 'http://localhost:5000';
const TEST_PRODUCT_ID = process.env.TEST_PRODUCT_ID || 'test-product-1';
const INITIAL_STOCK = 10; // We'll set this in our test product
const CONCURRENT_BUYERS = 15; // More buyers than stock (should cause failures)
const ITEMS_PER_BUYER = 1; // Each buyer wants 1 item

// Test user credentials (create these beforehand)
const TEST_USERS = [
  { email: 'buyer1@test.com', password: 'Test123!@#' },
  { email: 'buyer2@test.com', password: 'Test123!@#' },
  { email: 'buyer3@test.com', password: 'Test123!@#' },
  { email: 'buyer4@test.com', password: 'Test123!@#' },
  { email: 'buyer5@test.com', password: 'Test123!@#' },
  { email: 'buyer6@test.com', password: 'Test123!@#' },
  { email: 'buyer7@test.com', password: 'Test123!@#' },
  { email: 'buyer8@test.com', password: 'Test123!@#' },
  { email: 'buyer9@test.com', password: 'Test123!@#' },
  { email: 'buyer10@test.com', password: 'Test123!@#' },
  { email: 'buyer11@test.com', password: 'Test123!@#' },
  { email: 'buyer12@test.com', password: 'Test123!@#' },
  { email: 'buyer13@test.com', password: 'Test123!@#' },
  { email: 'buyer14@test.com', password: 'Test123!@#' },
  { email: 'buyer15@test.com', password: 'Test123!@#' },
];

// Test shipping address
const TEST_SHIPPING_ADDRESS = {
  fullName: 'Test Buyer',
  email: 'test@robohatch.in',
  phone: '9876543210',
  addressLine1: '123 Test Street',
  addressLine2: 'Apartment 4B',
  city: 'Mumbai',
  state: 'Maharashtra',
  postalCode: '400001',
  country: 'India',
};

// =============================================================================
// TEST RESULT TRACKING
// =============================================================================

interface TestResult {
  userId: string;
  userEmail: string;
  success: boolean;
  orderId?: string;
  error?: string;
  duration: number;
  timestamp: Date;
}

const testResults: TestResult[] = [];

// =============================================================================
// API CLIENT FUNCTIONS
// =============================================================================

/**
 * Login user and get JWT token
 */
async function loginUser(email: string, password: string): Promise<string> {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      email,
      password,
    });
    return response.data.token;
  } catch (error) {
    throw new Error(`Login failed for ${email}`);
  }
}

/**
 * Add item to cart
 */
async function addToCart(token: string, productId: string, quantity: number): Promise<void> {
  try {
    await axios.post(
      `${API_BASE_URL}/api/cart/add`,
      { productId, quantity },
      { headers: { Authorization: `Bearer ${token}` } }
    );
  } catch (error) {
    throw new Error('Failed to add item to cart');
  }
}

/**
 * Create order from cart (this is where stock reservation happens)
 */
async function createOrder(token: string, shippingAddress: any): Promise<string> {
  const response = await axios.post(
    `${API_BASE_URL}/api/payment/orders`,
    { shippingAddress },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data.id;
}

/**
 * Get current product stock
 */
async function getProductStock(productId: string): Promise<number> {
  const response = await axios.get(`${API_BASE_URL}/api/products/${productId}`);
  return response.data.stock;
}

// =============================================================================
// CONCURRENT BUYER SIMULATION
// =============================================================================

/**
 * Simulate a single buyer's checkout flow
 */
async function simulateBuyer(userEmail: string, password: string, productId: string, quantity: number): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // 1. Login
    const token = await loginUser(userEmail, password);
    
    // 2. Add item to cart
    await addToCart(token, productId, quantity);
    
    // 3. Attempt to create order (CRITICAL: This is where stock is reserved)
    const orderId = await createOrder(token, TEST_SHIPPING_ADDRESS);
    
    const duration = Date.now() - startTime;
    
    return {
      userId: token.split('.')[1], // Simplified userId extraction
      userEmail,
      success: true,
      orderId,
      duration,
      timestamp: new Date(),
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof AxiosError 
      ? error.response?.data?.error || error.message
      : String(error);
    
    return {
      userId: userEmail,
      userEmail,
      success: false,
      error: errorMessage,
      duration,
      timestamp: new Date(),
    };
  }
}

/**
 * Run concurrent buyer simulation
 */
async function runConcurrencyTest() {
  console.log('🔥 CONCURRENCY STRESS TEST - Starting...\n');
  console.log('Configuration:');
  console.log(`  - Initial Stock: ${INITIAL_STOCK}`);
  console.log(`  - Concurrent Buyers: ${CONCURRENT_BUYERS}`);
  console.log(`  - Items per Buyer: ${ITEMS_PER_BUYER}`);
  console.log(`  - Expected Outcomes: ${INITIAL_STOCK} success, ${CONCURRENT_BUYERS - INITIAL_STOCK} failures`);
  console.log(`  - Product ID: ${TEST_PRODUCT_ID}\n`);

  // Get initial stock
  console.log('📊 Checking initial stock...');
  const initialStock = await getProductStock(TEST_PRODUCT_ID);
  console.log(`  ✅ Initial stock: ${initialStock}\n`);

  if (initialStock !== INITIAL_STOCK) {
    console.warn(`  ⚠️  WARNING: Initial stock (${initialStock}) doesn't match expected (${INITIAL_STOCK})`);
  }

  // Launch all buyers simultaneously
  console.log('🚀 Launching concurrent buyers...\n');
  const startTime = Date.now();

  const buyerPromises = TEST_USERS.slice(0, CONCURRENT_BUYERS).map((user, index) => {
    console.log(`  👤 Buyer ${index + 1}: ${user.email}`);
    return simulateBuyer(user.email, user.password, TEST_PRODUCT_ID, ITEMS_PER_BUYER);
  });

  // Wait for all buyers to complete
  const results = await Promise.all(buyerPromises);
  const totalDuration = Date.now() - startTime;

  // Store results
  testResults.push(...results);

  // Get final stock
  console.log('\n📊 Checking final stock...');
  const finalStock = await getProductStock(TEST_PRODUCT_ID);
  console.log(`  ✅ Final stock: ${finalStock}\n`);

  // Analyze results
  analyzeResults(results, initialStock, finalStock, totalDuration);
}

// =============================================================================
// RESULTS ANALYSIS
// =============================================================================

function analyzeResults(results: TestResult[], initialStock: number, finalStock: number, totalDuration: number) {
  console.log('=' .repeat(80));
  console.log('📊 TEST RESULTS');
  console.log('=' .repeat(80));

  const successfulOrders = results.filter(r => r.success);
  const failedOrders = results.filter(r => !r.success);

  console.log(`\n✅ Successful Orders: ${successfulOrders.length}`);
  successfulOrders.forEach((result, index) => {
    console.log(`   ${index + 1}. ${result.userEmail} - Order: ${result.orderId} (${result.duration}ms)`);
  });

  console.log(`\n❌ Failed Orders: ${failedOrders.length}`);
  failedOrders.forEach((result, index) => {
    console.log(`   ${index + 1}. ${result.userEmail} - Error: ${result.error} (${result.duration}ms)`);
  });

  // Stock analysis
  console.log('\n' + '=' .repeat(80));
  console.log('📦 STOCK INTEGRITY ANALYSIS');
  console.log('=' .repeat(80));

  const expectedFinalStock = initialStock - successfulOrders.length;
  const actualStockDecrement = initialStock - finalStock;
  const totalItemsSold = successfulOrders.length * ITEMS_PER_BUYER;

  console.log(`\n  Initial Stock: ${initialStock}`);
  console.log(`  Final Stock: ${finalStock}`);
  console.log(`  Expected Final Stock: ${expectedFinalStock}`);
  console.log(`  Actual Stock Decrement: ${actualStockDecrement}`);
  console.log(`  Total Items Sold: ${totalItemsSold}`);

  // Validation checks
  console.log('\n' + '=' .repeat(80));
  console.log('🔍 VALIDATION CHECKS');
  console.log('=' .repeat(80));

  const checks = [
    {
      name: 'Stock Never Goes Negative',
      passed: finalStock >= 0,
      details: `Final stock: ${finalStock}`,
    },
    {
      name: 'Items Sold Equals Stock Decrease',
      passed: totalItemsSold === actualStockDecrement,
      details: `Sold: ${totalItemsSold}, Decreased: ${actualStockDecrement}`,
    },
    {
      name: 'Total Items Sold Does Not Exceed Initial Stock',
      passed: totalItemsSold <= initialStock,
      details: `Sold: ${totalItemsSold}, Initial: ${initialStock}`,
    },
    {
      name: 'Expected vs Actual Final Stock Match',
      passed: finalStock === expectedFinalStock,
      details: `Expected: ${expectedFinalStock}, Actual: ${finalStock}`,
    },
    {
      name: 'Success Count Matches Available Stock',
      passed: successfulOrders.length <= initialStock,
      details: `Success: ${successfulOrders.length}, Stock: ${initialStock}`,
    },
  ];

  checks.forEach(check => {
    const icon = check.passed ? '✅' : '❌';
    console.log(`\n  ${icon} ${check.name}`);
    console.log(`     ${check.details}`);
  });

  // Performance metrics
  console.log('\n' + '=' .repeat(80));
  console.log('⚡ PERFORMANCE METRICS');
  console.log('=' .repeat(80));

  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  const maxDuration = Math.max(...results.map(r => r.duration));
  const minDuration = Math.min(...results.map(r => r.duration));

  console.log(`\n  Total Test Duration: ${totalDuration}ms`);
  console.log(`  Average Request Duration: ${avgDuration.toFixed(2)}ms`);
  console.log(`  Fastest Request: ${minDuration}ms`);
  console.log(`  Slowest Request: ${maxDuration}ms`);
  console.log(`  Requests per Second: ${((CONCURRENT_BUYERS / totalDuration) * 1000).toFixed(2)}`);

  // Final verdict
  console.log('\n' + '=' .repeat(80));
  console.log('🎯 FINAL VERDICT');
  console.log('=' .repeat(80));

  const allChecksPassed = checks.every(c => c.passed);

  if (allChecksPassed) {
    console.log('\n  ✅ ✅ ✅ ALL TESTS PASSED! ✅ ✅ ✅');
    console.log('  Stock management system is race-condition-free!');
    console.log('  System correctly handled concurrent checkout requests.');
  } else {
    console.log('\n  ❌ ❌ ❌ TESTS FAILED! ❌ ❌ ❌');
    console.log('  Stock management has race conditions or integrity issues!');
    console.log('  DO NOT deploy to production until fixed.');
  }

  console.log('\n' + '=' .repeat(80));
}

// =============================================================================
// RUN TEST
// =============================================================================

runConcurrencyTest()
  .then(() => {
    console.log('\n✅ Test completed successfully\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
