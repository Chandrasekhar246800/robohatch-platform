# 🔒 SECURITY HARDENING — MIGRATION GUIDE

## 📋 Overview
This guide explains how to integrate all hardened security files into your production system.

---

## ✅ FILES CREATED

### Authentication (Phase 1)
- ✅ `auth.service.hardened.ts` - httpOnly cookies, no JWT in response
- ✅ `auth.middleware.hardened.ts` - Reads JWT from cookies
- ✅ `auth.controller.hardened.ts` - Sets httpOnly cookies
- ✅ `auth.validator.ts` - Strong password validation (8+ chars, complexity)

### Input Validation (Phase 2)
- ✅ `order.validator.ts` - Shipping address & payment validation
- ✅ `product.validator.ts` - Product & custom design validation

### Database (Phase 3)
- ✅ `schema.hardened.prisma` - ShippingAddress model, stock field, refund tracking

### Payment (Phase 4)
- ✅ `payment.service.hardened.ts` - 
  - Atomic shipping address storage
  - Stock reservation/release
  - Idempotency support
  - Refund implementation
  - Webhook secret enforcement at startup

### Security Infrastructure (Phase 5)
- ✅ `requestId.middleware.ts` - Request ID tracking
- ✅ `errorHandler.middleware.ts` - Sanitized errors, no stack traces in prod
- ✅ `environment.hardened.ts` - Environment validation, fail-fast
- ✅ `logger.ts` - Centralized logging, sensitive data redaction

---

## 🚀 MIGRATION STEPS

### 1. Install Required Dependencies

```bash
cd apps/api
npm install cookie-parser zod
npm install --save-dev @types/cookie-parser
```

### 2. Apply Database Migration

```bash
# Backup current database first!
cd apps/api

# Replace schema
cp prisma/schema.hardened.prisma prisma/schema.prisma

# Generate migration
npx prisma migrate dev --name add_shipping_address_and_security_fields

# This will:
# - Add ShippingAddress table
# - Add stock field to Product
# - Add refundId, refundedAt to Payment
# - Add new order statuses (PROCESSING, OUT_FOR_DELIVERY, REFUNDED)
# - Add new payment methods (CARD, NET_BANKING, WALLET)
```

### 3. Update Environment Variables

Add these to your `.env` file:

```env
# Existing (ensure they exist)
DATABASE_URL="mysql://..."
JWT_SECRET="your-super-secure-jwt-secret-at-least-32-characters-long"
JWT_EXPIRES_IN="7d"
BCRYPT_ROUNDS="12"

# Razorpay (ensure all are set)
RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="your_razorpay_secret"
RAZORPAY_WEBHOOK_SECRET="your_webhook_secret_minimum_16_chars"

# CORS (important!)
CORS_ORIGIN="http://localhost:3000"
FRONTEND_URL="http://localhost:3000"

# Node
NODE_ENV="development"  # or "production"
PORT="5000"
```

**🔒 CRITICAL REQUIREMENTS:**
- `JWT_SECRET` must be ≥32 characters
- `RAZORPAY_WEBHOOK_SECRET` must be ≥16 characters
- No fallback values - server will crash if missing

### 4. Replace Service Files

**Option A: Direct Replacement (Recommended)**
```bash
cd apps/api/src

# Backup originals
mv services/auth.service.ts services/auth.service.backup.ts
mv services/payment.service.ts services/payment.service.backup.ts
mv middlewares/auth.middleware.ts middlewares/auth.middleware.backup.ts
mv controllers/auth.controller.ts controllers/auth.controller.backup.ts

# Use hardened versions
cp services/auth.service.hardened.ts services/auth.service.ts
cp services/payment.service.hardened.ts services/payment.service.ts
cp middlewares/auth.middleware.hardened.ts middlewares/auth.middleware.ts
cp controllers/auth.controller.hardened.ts controllers/auth.controller.ts
```

**Option B: Gradual Migration**
- Keep both files
- Update imports in `app.ts` to use `.hardened` versions
- Test thoroughly before removing originals

### 5. Update app.ts

Replace `apps/api/src/app.ts` with this hardened version:

```typescript
import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser'; // ✅ NEW
import dotenv from 'dotenv';

// ✅ PHASE 5: Environment validation at startup
import { validateEnvironment } from './config/environment.hardened';

// ✅ PHASE 5: Middleware
import { requestIdMiddleware } from './middlewares/requestId.middleware';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.middleware';

// Rate limiting
import { generalLimiter, authLimiter, sensitiveLimiter } from './middlewares/rateLimiter';

// Routes
import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import cartRoutes from './routes/cart.routes';
import orderRoutes from './routes/order.routes';
import paymentRoutes from './routes/payment.routes';
import categoryRoutes from './routes/category.routes';
import adminRoutes from './routes/admin.routes';

// Load environment
dotenv.config();

// ✅ VALIDATE ENVIRONMENT: Server crashes if critical vars missing
const env = validateEnvironment();

const app: Express = express();

// ✅ PHASE 5: Request ID middleware (FIRST)
app.use(requestIdMiddleware);

// Security headers
app.use(helmet());

// ✅ CRITICAL: CORS with credentials enabled
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true, // ✅ Required for httpOnly cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ PHASE 1: Cookie parsing (required for auth)
app.use(cookieParser());

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'RoboHatch API is running',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// Rate limiting
app.use(generalLimiter);

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', sensitiveLimiter, paymentRoutes);
app.use('/api/admin', adminRoutes);

// ✅ PHASE 5: Error handlers (LAST)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
```

### 6. Update Frontend (Next.js)

**Update API client to send credentials:**

```typescript
// apps/web/src/lib/api.ts (or wherever you make API calls)

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  withCredentials: true, // ✅ CRITICAL: Send cookies with requests
});

// Remove manual Authorization header setting
// The JWT is now in httpOnly cookies, handled automatically
```

**Update auth store to NOT store JWT:**

```typescript
// apps/web/src/store/authStore.ts

interface AuthState {
  user: User | null;
  // ❌ REMOVE: token field (no longer stored in frontend)
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      
      login: async (email, password) => {
        const response = await apiClient.post('/auth/login', { email, password });
        // ✅ JWT is in httpOnly cookie, only store user data
        set({ user: response.data.data.user });
      },
      
      register: async (data) => {
        const response = await apiClient.post('/auth/register', data);
        // ✅ JWT is in httpOnly cookie, only store user data
        set({ user: response.data.data.user });
      },
      
      logout: async () => {
        await apiClient.post('/auth/logout');
        set({ user: null });
      },
    }),
    {
      name: 'auth-storage',
      // ✅ Only persist user data, not token
      partialize: (state) => ({ user: state.user }),
    }
  )
);
```

### 7. Test Authentication Flow

```bash
# Start backend
cd apps/api
npm run dev

# Start frontend  
cd apps/web
npm run dev

# Test flow:
# 1. Register new user → Check browser DevTools → Application → Cookies
#    Should see: auth_token (httpOnly, secure if HTTPS)
# 2. Login → Cookie should update
# 3. Access protected route → Should work automatically
# 4. Logout → Cookie should be cleared
```

### 8. Test Payment Flow

```bash
# Test order creation with shipping address:
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=YOUR_JWT" \
  -d '{
    "shippingAddress": {
      "fullName": "John Doe",
      "email": "john@example.com",
      "phone": "+919876543210",
      "addressLine1": "123 Main St",
      "city": "Mumbai",
      "state": "Maharashtra",
      "postalCode": "400001",
      "country": "India"
    }
  }'

# Check database - should have Order + ShippingAddress + stock reserved
```

### 9. Production Deployment

**Railway/Vercel Environment Variables:**

```env
NODE_ENV=production
DATABASE_URL=<your-production-db-url>
JWT_SECRET=<generate-strong-secret-32+-chars>
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=<your-live-secret>
RAZORPAY_WEBHOOK_SECRET=<generate-strong-secret-16+-chars>
CORS_ORIGIN=https://your-domain.com
FRONTEND_URL=https://your-domain.com
PORT=5000
```

**Vercel (Next.js frontend):**

```env
NEXT_PUBLIC_API_URL=https://your-api.railway.app/api
```

---

## 🔍 VERIFICATION CHECKLIST

### ✅ Authentication Security
- [ ] JWT stored in httpOnly cookie (check DevTools → Application → Cookies)
- [ ] Cookie has `HttpOnly` flag (not accessible via JavaScript)
- [ ] Cookie has `Secure` flag in production (HTTPS only)
- [ ] Cookie has `SameSite=Strict` (CSRF protection)
- [ ] Login response does NOT include token in body
- [ ] Password validation rejects weak passwords

### ✅ Database Security
- [ ] ShippingAddress table exists
- [ ] Orders have shipping addresses
- [ ] Products have stock field
- [ ] Stock decrements on order creation
- [ ] Stock restored on payment failure
- [ ] Refund fields exist on Payment table

### ✅ Payment Security
- [ ] Razorpay webhook secret enforced at startup
- [ ] Server crashes if webhook secret missing
- [ ] Idempotency prevents duplicate orders
- [ ] Signature verification uses timing-safe comparison
- [ ] Refund endpoint works correctly

### ✅ Input Validation
- [ ] Password must have 8+ chars, uppercase, lowercase, number, special
- [ ] Email validation works
- [ ] Phone validation works (10 digits)
- [ ] Postal code validation works (6 digits)
- [ ] All fields have max length limits

### ✅ Security Infrastructure
- [ ] Every request has X-Request-Id header
- [ ] Errors show generic messages in production
- [ ] No stack traces in production errors
- [ ] Security events logged to console
- [ ] Environment validation runs at startup

### ✅ Frontend Integration
- [ ] API client has `withCredentials: true`
- [ ] Auth store doesn't store JWT
- [ ] Login/register store only user data
- [ ] Protected routes work automatically
- [ ] Logout clears cookie

---

## 🚨 CRITICAL SECURITY NOTES

### DO NOT:
❌ Store JWT in localStorage/sessionStorage
❌ Send JWT in response body
❌ Use fallback values for JWT_SECRET
❌ Skip environment validation
❌ Log sensitive data (passwords, tokens)
❌ Return stack traces in production

### ALWAYS:
✅ Use httpOnly cookies for JWTs
✅ Validate all user inputs with Zod
✅ Use timing-safe comparison for signatures
✅ Atomically update database in transactions
✅ Log security events with request IDs
✅ Crash server if critical env vars missing

---

## 📊 EXPECTED AUDIT SCORE

**Before:** 6.5/10 (5 CRITICAL, 5 HIGH, 10 MEDIUM issues)

**After:** 9-10/10 ✅
- JWT in localStorage → httpOnly cookies ✅
- No input validation → Zod validation ✅
- Missing shipping address → ShippingAddress model ✅
- Weak JWT secret → Enforced 32+ chars ✅
- Webhook secret not enforced → Enforced at startup ✅

---

## 🛠️ ROLLBACK PLAN

If issues occur, restore backup files:

```bash
cd apps/api/src

# Restore originals
mv services/auth.service.backup.ts services/auth.service.ts
mv services/payment.service.backup.ts services/payment.service.ts
mv middlewares/auth.middleware.backup.ts middlewares/auth.middleware.ts
mv controllers/auth.controller.backup.ts controllers/auth.controller.ts

# Rollback database
npx prisma migrate reset
# Then reapply only necessary migrations

# Restart server
npm run dev
```

---

## 📞 SUPPORT

If you encounter issues during migration:
1. Check server logs for specific error messages
2. Verify all environment variables are set correctly
3. Ensure database migration completed successfully
4. Test authentication flow in isolation first
5. Check browser DevTools for cookie issues

---

## ✅ NEXT STEPS

After successful migration:
1. Run comprehensive re-audit (see FINAL_AUDIT.md)
2. Perform load testing
3. Set up monitoring (request IDs help with tracing)
4. Implement remaining Phase 6 tasks:
   - Email notifications (order confirmations, shipping updates)
   - Image optimization (Cloudinary/AWS S3)
   - Basic Jest tests for critical paths
5. Run penetration testing before production launch

**Target:** Achieve 9-10/10 audit score before production deployment.
