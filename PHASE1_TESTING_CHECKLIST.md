# ✅ Phase 1 Critical Fixes - Testing Checklist

**Completion Date:** February 11, 2026  
**Status:** ALL CRITICAL FIXES IMPLEMENTED ✅  
**Ready For:** Manual Testing → Staging Deployment

---

## 🎯 Implementation Summary

All Phase 1 critical fixes have been successfully implemented:

| # | Fix | Status | Files Modified |
|---|-----|--------|----------------|
| 1️⃣ | Prisma Migration | ✅ COMPLETE | `schema.prisma` + Database |
| 2️⃣ | Timing Attack Fix | ✅ COMPLETE | `payment.service.ts` |
| 3️⃣ | Idempotency Protection | ✅ COMPLETE | `payment.service.ts` |
| 4️⃣ | Rate Limiting | ✅ COMPLETE | `payment.route.ts` |
| 5️⃣ | Duplicate Submissions | ✅ COMPLETE | `checkout/page.tsx` |
| 6️⃣ | Double Order Prevention | ✅ COMPLETE | `payment.service.ts` |
| 7️⃣ | npm Vulnerabilities | ✅ COMPLETE | `package.json` (bcrypt updated to v6) |
| 8️⃣ | Request Timeout | ✅ COMPLETE | `checkout/page.tsx` |
| 9️⃣ | Order State Machine | ✅ VERIFIED | Correct PENDING→CREATED→CAPTURED→PAID |
| 🔟 | Webhook Endpoint | ✅ COMPLETE | `webhook.controller.ts`, `webhook.route.ts` |

---

## 📋 MANDATORY MANUAL TESTING CHECKLIST

### Before Testing Preparation

```bash
# 1. Set environment variables (if not already set)
# Backend (Railway/Local):
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your_test_secret_key
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
FRONTEND_URL=https://www.robohatch.in

# Frontend (Vercel/Local):
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxx
NEXT_PUBLIC_API_URL=https://robohatchapi-production.up.railway.app

# 2. Generate Prisma client
cd apps/api
npx prisma generate

# 3. Restart both servers
npm run dev
```

---

### 🧪 Test Suite 1: Normal Payment Flow

#### Test 1.1: Successful Payment (CRITICAL) ✅

**Steps:**
1. Login to account
2. Add 2-3 products to cart
3. Navigate to `/checkout`
4. Click "Proceed to Payment"
5. Wait for Razorpay modal to open
6. Use test card: `4111 1111 1111 1111`
   - Expiry: `12/25` (any future date)
   - CVV: `123` (any 3 digits)
   - Name: `Test User`
7. Click "Pay"
8. Wait for OTP screen (if shown)
   - Enter OTP: `123456`
9. Wait for verification
10. Confirm redirect to success page

**Expected Results:**
- ✅ Razorpay modal opens within 2 seconds
- ✅ Payment accepted by Razorpay
- ✅ "Verifying payment..." message shown
- ✅ Redirect to `/order-success?orderId=xxx` within 5 seconds
- ✅ Cart is empty after payment
- ✅ Backend logs show: `✓ Payment signature verified`

**Database Verification:**
```sql
-- Check payment status
SELECT id, orderId, status, gatewayOrderId, gatewayPaymentId, signature 
FROM Payment 
WHERE gatewayOrderId = 'order_xxx'
ORDER BY createdAt DESC LIMIT 1;

-- Expected: status = 'CAPTURED'

-- Check order status
SELECT id, status, total, createdAt 
FROM Order 
WHERE id = 'xxx'
ORDER BY createdAt DESC LIMIT 1;

-- Expected: status = 'PAID'

-- Check cart is cleared
SELECT COUNT(*) FROM CartItem WHERE cartId = (SELECT id FROM Cart WHERE userId = 'xxx');

-- Expected: 0
```

**Pass Criteria:**
- [ ] Payment completes successfully
- [ ] Order status = `PAID`
- [ ] Payment status = `CAPTURED`
- [ ] Cart cleared
- [ ] No errors in browser console
- [ ] No errors in backend logs

---

#### Test 1.2: Payment with UPI (TEST MODE) ✅

**Steps:**
1. Repeat Test 1.1 steps 1-4
2. In Razorpay modal, select "UPI"
3. Enter test UPI: `success@razorpay`
4. Click "Pay"
5. Wait for verification

**Expected Results:**
- ✅ Payment succeeds
- ✅ Same database state as Test 1.1

**Pass Criteria:**
- [ ] UPI payment works in test mode
- [ ] Payment status = `CAPTURED`

---

### 🧪 Test Suite 2: Security & Error Handling

#### Test 2.1: Invalid Signature (CRITICAL SECURITY TEST) 🔒

**Steps:**
1. Open browser DevTools → Network tab
2. Add items to cart and go to checkout
3. Click "Proceed to Payment"
4. Complete payment in Razorpay modal
5. In Network tab, find the `POST /api/payment/verify` request
6. Right-click → Copy → Copy as cURL
7. Modify the `razorpay_signature` field (change last character)
8. Send modified request

**Expected Results:**
- ✅ Backend returns `400 Bad Request`
- ✅ Response: `{"success": false, "message": "Invalid payment signature"}`
- ✅ Backend logs show: `🚨 SECURITY ALERT: Invalid payment signature`
- ✅ Payment status in DB = `FAILED`
- ✅ Order status in DB = `PENDING`
- ✅ Cart NOT cleared

**Backend Log Check:**
```bash
# Look for security alert
grep "SECURITY ALERT" /var/log/app.log

# Expected output:
# 🚨 SECURITY ALERT: Invalid payment signature
#    userId: xxx
#    razorpay_order_id: order_xxx
#    timestamp: 2026-02-11T...
```

**Pass Criteria:**
- [ ] Invalid signature rejected
- [ ] Security alert logged with userId and timestamp
- [ ] Payment marked as FAILED
- [ ] Cart NOT cleared
- [ ] Order remains PENDING

---

#### Test 2.2: User Cancels Payment ❌

**Steps:**
1. Add items to cart
2. Go to checkout
3. Click "Proceed to Payment"
4. Wait for Razorpay modal
5. Click the "X" button (close modal)

**Expected Results:**
- ✅ Modal closes
- ✅ Error message shown: "Payment cancelled. You can try again."
- ✅ Backend API called: `POST /api/payment/failure`
- ✅ Payment status in DB updates to `FAILED`
- ✅ Order status remains `PENDING`
- ✅ Cart NOT cleared (items still visible)
- ✅ "Proceed to Payment" button re-enabled

**Pass Criteria:**
- [ ] Modal closes cleanly
- [ ] Error message displayed
- [ ] Can retry payment
- [ ] Cart intact
- [ ] No JavaScript errors

---

#### Test 2.3: Double-Click Prevention (CRITICAL) 🔒

**Steps:**
1. Add items to cart
2. Go to checkout
3. **RAPIDLY** double-click "Proceed to Payment" button (click twice within 0.5 seconds)
4. Wait 5 seconds
5. Check backend logs
6. Check database

**Expected Results:**
- ✅ Button becomes disabled after first click
- ✅ Only ONE order created in database
- ✅ Backend logs show: `♻️ Reusing existing pending order: xxx` (on second request)
- ✅ Only ONE Razorpay order created
- ✅ Razorpay modal opens only once

**Database Verification:**
```sql
-- Count orders for user
SELECT COUNT(*) FROM Order 
WHERE userId = 'xxx' 
AND createdAt > NOW() - INTERVAL 1 MINUTE;

-- Expected: 1 (not 2!)
```

**Pass Criteria:**
- [ ] Only 1 order created
- [ ] No duplicate Razorpay orders
- [ ] Button disabled during processing
- [ ] Second click ignored

---

#### Test 2.4: Network Timeout Handling ⏱️

**Steps:**
1. Open browser DevTools → Network tab
2. Set network throttling to "Slow 3G"
3. Complete payment in Razorpay
4. Wait 30 seconds

**Expected Results:**
- ✅ After 30 seconds, error message shown: "Verification timeout. Please contact support."
- ✅ User NOT redirected to success page
- ✅ Payment processing state cleared
- ✅ Backend may still process payment (idempotency protection handles this)

**Pass Criteria:**
- [ ] Timeout triggers after 30 seconds
- [ ] User-friendly error message
- [ ] No infinite loading spinner
- [ ] User can contact support

---

### 🧪 Test Suite 3: Idempotency & Race Conditions

#### Test 3.1: Double Payment Verification (IDEMPOTENCY TEST) 🔒

**Steps:**
1. Complete a successful payment (Test 1.1)
2. Copy the `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature` from Network tab
3. Send the same verification request AGAIN using cURL:
   ```bash
   curl -X POST https://robohatchapi-production.up.railway.app/api/payment/verify \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{
       "razorpay_order_id": "order_xxx",
       "razorpay_payment_id": "pay_xxx",
       "razorpay_signature": "signature_xxx"
     }'
   ```

**Expected Results:**
- ✅ Backend returns `200 OK`
- ✅ Response includes: `"message": "Payment already processed"`
- ✅ Payment status remains `CAPTURED` (not changed)
- ✅ Order status remains `PAID` (not changed)
- ✅ Cart remains cleared (no duplicate cart clear)
- ✅ No errors or exceptions

**Pass Criteria:**
- [ ] Idempotent response returned
- [ ] No duplicate processing
- [ ] No errors in logs
- [ ] Database state unchanged

---

#### Test 3.2: Refresh During Payment 🔄

**Steps:**
1. Add items to cart
2. Go to checkout
3. Click "Proceed to Payment"
4. Wait for Razorpay modal to open
5. **IMMEDIATELY** press `F5` (refresh page)
6. Wait for page to reload
7. Click "Proceed to Payment" again
8. Complete payment

**Expected Results:**
- ✅ No duplicate orders created
- ✅ Backend reuses existing pending order
- ✅ Payment completes successfully
- ✅ Only ONE order in database

**Database Verification:**
```sql
SELECT id, status, createdAt FROM Order 
WHERE userId = 'xxx' 
ORDER BY createdAt DESC LIMIT 3;

-- Should see only 1 recent order
```

**Pass Criteria:**
- [ ] Page refreshes without errors
- [ ] Can complete payment after refresh
- [ ] No duplicate orders
- [ ] Cart data persists

---

### 🧪 Test Suite 4: Rate Limiting

#### Test 4.1: Rate Limit on Verify Endpoint 🚦

**Steps:**
1. Use a tool like Postman or write a script
2. Send **15 requests** to `POST /api/payment/verify` within 1 minute
3. Use valid authentication token
4. Monitor responses

**Expected Results:**
- ✅ First 10 requests: Normal processing (200, 400, etc.)
- ✅ Requests 11-15: `429 Too Many Requests`
- ✅ Response body: `{"success": false, "message": "Too many payment attempts. Please wait a moment and try again."}`
- ✅ Response headers include:
  ```
  RateLimit-Limit: 10
  RateLimit-Remaining: 0
  RateLimit-Reset: <timestamp>
  ```

**Pass Criteria:**
- [ ] Rate limit enforced at 10 requests/minute
- [ ] Clear error message returned
- [ ] Headers show rate limit info
- [ ] Normal operation resumes after 1 minute

---

### 🧪 Test Suite 5: Webhook Testing (Optional but Recommended)

#### Test 5.1: Test Webhook Endpoint 🪝

**Prerequisites:**
```bash
# Set webhook secret
RAZORPAY_WEBHOOK_SECRET=your_generated_secret
```

**Steps:**
1. Use Razorpay Dashboard → Webhooks → Test Webhook
2. Select event: `payment.captured`
3. Enter webhook URL: `https://robohatchapi-production.up.railway.app/api/webhook/razorpay`
4. Click "Send Test Webhook"
5. Check backend logs

**Expected Results:**
- ✅ Backend receives webhook
- ✅ Signature verified successfully
- ✅ Backend logs: `📨 Webhook received: payment.captured`
- ✅ Response: `200 OK`

**OR Manually Test:**
```bash
# Generate test webhook signature
echo -n '{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_test","order_id":"order_test","amount":10000}}}}' | \
  openssl dgst -sha256 -hmac "your_webhook_secret" | \
  awk '{print $2}'

# Send webhook request
curl -X POST https://robohatchapi-production.up.railway.app/api/webhook/razorpay \
  -H "Content-Type: application/json" \
  -H "X-Razorpay-Signature: <generated_signature>" \
  -d '{
    "event": "payment.captured",
    "payload": {
      "payment": {
        "entity": {
          "id": "pay_test123",
          "order_id": "order_test123",
          "amount": 10000
        }
      }
    }
  }'
```

**Pass Criteria:**
- [ ] Webhook endpoint accessible
- [ ] Signature verification works
- [ ] Events logged correctly
- [ ] Returns 200 OK

---

### 🧪 Test Suite 6: Edge Cases

#### Test 6.1: Empty Cart Checkout Attempt

**Steps:**
1. Login
2. Clear cart (remove all items)
3. Navigate to `/checkout` directly via URL

**Expected Results:**
- ✅ Automatic redirect to `/cart`
- ✅ Message: "Redirecting to cart..."

**Pass Criteria:**
- [ ] Cannot checkout with empty cart
- [ ] Graceful redirect

---

#### Test 6.2: Expired Razorpay Session

**Steps:**
1. Start payment flow
2. Keep Razorpay modal open for 20+ minutes (session expires)
3. Try to complete payment

**Expected Results:**
- ✅ Razorpay shows error: "Session expired"
- ✅ Can close modal and retry
- ✅ Retry creates new Razorpay order

**Pass Criteria:**
- [ ] Handles expired sessions
- [ ] Retry works

---

#### Test 6.3: Product Becomes Inactive During Checkout

**Steps:**
1. Add product to cart
2. Admin marks product as inactive
3. Try to checkout

**Expected Results:**
- ✅ Error: "Some products in cart are no longer available"
- ✅ Cannot proceed with payment

**Pass Criteria:**
- [ ] Validates product availability
- [ ] Clear error message

---

## 🎯 Final Production Checklist

Before switching to **LIVE** Razorpay keys:

### Environment Variables
- [ ] `RAZORPAY_KEY_ID` set (live: `rzp_live_xxxxx`)
- [ ] `RAZORPAY_KEY_SECRET` set (live secret)
- [ ] `RAZORPAY_WEBHOOK_SECRET` set
- [ ] `NEXT_PUBLIC_RAZORPAY_KEY_ID` set (live key)
- [ ] `FRONTEND_URL` matches production domain
- [ ] `DATABASE_URL` points to production database

### Testing Completed
- [ ] ✅ 20+ successful test payments completed
- [ ] ✅ 5+ failed payment simulations tested
- [ ] ✅ Double-click prevention verified
- [ ] ✅ Refresh during payment tested
- [ ] ✅ Invalid signature rejection confirmed
- [ ] ✅ Rate limiting enforced
- [ ] ✅ Webhook endpoint tested
- [ ] ✅ Idempotency verified

### Database
- [ ] Prisma migration applied to production DB
- [ ] Backup taken before migration
- [ ] Payment and Order tables verified
- [ ] Indexes present on gateway fields

### Monitoring
- [ ] Error tracking configured (Sentry/similar)
- [ ] Payment metrics dashboard set up
- [ ] Security alerts configured
- [ ] Log aggregation enabled

### Documentation
- [ ] Team trained on payment flow
- [ ] Support team has troubleshooting guide
- [ ] Razorpay webhook URL configured in dashboard
- [ ] Emergency rollback plan documented

### Go-Live Steps
1. [ ] Complete all above tests in TEST mode
2. [ ] Switch to LIVE keys during low-traffic hours
3. [ ] Make test payment of ₹10 with real card
4. [ ] Verify money received in bank account (2-3 days)
5. [ ] Monitor first 100 real transactions closely
6. [ ] Check for security alerts every 6 hours (first week)

---

## 📊 Test Results Summary

**Tester Name:** ________________  
**Test Date:** ________________  
**Environment:** [ ] Local [ ] Staging [ ] Production  

| Test Suite | Tests Passed | Tests Failed | Notes |
|------------|--------------|--------------|-------|
| Suite 1: Normal Flow | ___/2 | ___/2 | |
| Suite 2: Security | ___/4 | ___/4 | |
| Suite 3: Idempotency | ___/2 | ___/2 | |
| Suite 4: Rate Limiting | ___/1 | ___/1 | |
| Suite 5: Webhooks | ___/1 | ___/1 | |
| Suite 6: Edge Cases | ___/3 | ___/3 | |
| **TOTAL** | **___/13** | **___/13** | |

**Overall Status:** [ ] PASS [ ] FAIL  
**Ready for Production:** [ ] YES [ ] NO  

**Critical Issues Found:**
```
1. 
2. 
3. 
```

**Sign-off:**
- Developer: ________________ Date: ______
- QA Lead: _________________ Date: ______
- Product Owner: ___________ Date: ______

---

## 🚨 Emergency Contacts

**If Payment Issues Occur:**
1. Check backend logs: `grep "SECURITY ALERT" /var/log/app.log`
2. Check Razorpay Dashboard: https://dashboard.razorpay.com
3. Database query: `SELECT * FROM Payment WHERE status = 'FAILED' AND createdAt > NOW() - INTERVAL 1 HOUR`

**Rollback Command:**
```bash
# Revert to previous deployment
git revert HEAD~10..HEAD
git push origin main --force

# OR scale down payment features
# Set environment variable: RAZORPAY_ENABLED=false
```

**Support Contacts:**
- Razorpay Support: support@razorpay.com
- Emergency Hotline: 1800-102-1234 (India)
- Dashboard: https://dashboard.razorpay.com/support

---

## ✅ Testing Complete Signature

**All tests passed and ready for production deployment.**

Signed: ________________  
Date: ________________  
Environment: ________________
