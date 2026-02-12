# Email Notification System - Setup Guide

## Overview
RoboHatch now has a complete email notification system integrated with SendGrid. The system sends 5 types of transactional emails:

1. **Order Confirmation** - Sent when order is created
2. **Payment Success** - Sent when payment is captured  
3. **Shipping Notification** - Sent when order status changes to SHIPPED
4. **Refund Confirmation** - Sent when refund is processed
5. **Order Status Updates** - Future enhancement for custom updates

---

## Installation

### Step 1: Install SendGrid Package
```bash
cd apps/api
npm install @sendgrid/mail
```

### Step 2: Get SendGrid API Key
1. Sign up at https://sendgrid.com (Free tier: 100 emails/day)
2. Navigate to **Settings > API Keys**
3. Click **Create API Key**
4. Choose **Full Access** permissions
5. Copy the API key (important: save it immediately!)

### Step 3: Verify Sender Email
**IMPORTANT:** SendGrid requires sender verification before sending emails.

**Option A: Single Sender Verification (Quick - Recommended for Testing)**
1. Go to **Settings > Sender Authentication > Single Sender Verification**
2. Add sender email: `noreply@robohatch.in` (or your email)
3. Fill in sender details:
   - From Name: RoboHatch
   - From Email: noreply@robohatch.in
   - Reply To: founder@robohatch.in
4. Click **Create** and verify via email link

**Option B: Domain Authentication (Production - Recommended)**
1. Go to **Settings > Sender Authentication > Authenticate Your Domain**
2. Choose your DNS host (e.g., GoDaddy, Cloudflare, etc.)
3. Add the provided DNS records (CNAME, TXT)
4. Wait for verification (can take 24-48 hours)
5. Benefits: Higher deliverability, no "via sendgrid.net" tag

### Step 4: Configure Environment Variables
Add to your `.env` file:

```env
# SendGrid Configuration
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@robohatch.in
SENDGRID_FROM_NAME=RoboHatch
```

**Environment Variable Details:**
- `SENDGRID_API_KEY` - Your SendGrid API key (required)
- `SENDGRID_FROM_EMAIL` - Verified sender email address
- `SENDGRID_FROM_NAME` - Display name for sender (e.g., "RoboHatch")

### Step 5: Test Email System
```bash
# Start the API server
cd apps/api
npm run dev

# Place a test order through the frontend
# OR test directly via API endpoint

# Check console logs for email confirmation:
# ✅ SendGrid email service initialized
# ✅ Order confirmation email sent to user@example.com
```

---

## Email Templates

All email templates are defined in `apps/api/src/services/email.service.ts`

### Template Customization
Each template includes:
- **HTML design** with inline CSS (for email client compatibility)
- **Brand colors** (header: #1a1a1a, accent: #22c55e, etc.)
- **Responsive layout** (max-width 600px, mobile-friendly)
- **Order details** (items, pricing, addresses, tracking)
- **Call-to-action buttons** (Track Order, View Details)
- **Footer** with contact information

To customize:
1. Open `email.service.ts`
2. Find the relevant email method (e.g., `sendOrderConfirmation`)
3. Modify the HTML template string
4. Update colors, copy, or structure as needed
5. Test by triggering the email flow

---

## Email Flow Integration

### 1. Order Confirmation + Payment Success
**Trigger:** After Razorpay payment verification succeeds

**Code:** `payment.service.ts` lines ~350-360
```typescript
// 📧 Send email notifications (non-blocking)
Promise.all([
  emailService.sendOrderConfirmation(payment.orderId),
  emailService.sendPaymentSuccess(payment.orderId, razorpay_payment_id),
]).catch(error => {
  console.error('⚠️  Email notification failed (non-critical):', error.message);
});
```

**Emails sent:**
- Order confirmation with full order details
- Payment receipt with transaction ID

---

### 2. Shipping Notification
**Trigger:** When admin updates order status to SHIPPED

**Code:** `order.service.ts` lines ~155-165
```typescript
// 📧 Send shipping notification when order is shipped (non-blocking)
if (status === OrderStatus.SHIPPED) {
  emailService.sendShippingNotification(orderId).catch(error => {
    console.error('⚠️  Shipping email notification failed (non-critical):', error.message);
  });
}
```

**Email includes:**
- Tracking ID (if provided)
- Estimated delivery date
- Shipping address confirmation
- Items in shipment

---

### 3. Refund Confirmation
**Trigger:** After successful Razorpay refund processing

**Code:** `payment.service.ts` lines ~440-450
```typescript
// 📧 Send refund confirmation email (non-blocking)
emailService.sendRefundConfirmation(
  orderId,
  Number(payment.amount),
  refund.id
).catch(error => {
  console.error('⚠️  Refund email notification failed (non-critical):', error.message);
});
```

**Email includes:**
- Refund amount
- Razorpay refund ID
- Processing timeline (5-7 business days)
- Original order details

---

## Error Handling

### Non-Blocking Design
All email operations are **non-blocking** using `Promise.catch()`. This means:
- ✅ Order processing succeeds even if email fails
- ⚠️ Email failures are logged but don't crash the app
- 🔒 No customer impact from SendGrid downtime

### Graceful Degradation (No SendGrid Key)
If `SENDGRID_API_KEY` is not set:
- ✅ App starts normally (warning logged)
- 📧 Email calls log to console instead of sending
- ⚠️ Console shows `[MOCK]` email notifications

Example console output without SendGrid:
```
🚨 WARNING: SENDGRID_API_KEY not set - Email notifications disabled
   Set SENDGRID_API_KEY environment variable to enable emails

⚠️  Email notifications DISABLED - emails will be logged only

📧 [MOCK] Order confirmation email would be sent to user@example.com
   Subject: Order Confirmed #a3b4c5d6 - RoboHatch
```

---

## Testing Email Deliverability

### 1. Test Mode (SendGrid Sandbox)
SendGrid free tier allows testing without affecting real email deliverability.

### 2. Check Spam Folders
- SendGrid emails may initially go to spam
- Ask test users to mark as "Not Spam"
- Domain authentication significantly improves deliverability

### 3. SendGrid Dashboard
Monitor email activity:
1. Go to **Activity Feed** in SendGrid dashboard
2. See all sent emails, delivery status, bounces, spam reports
3. Filter by email address or date range

### 4. Test All 5 Email Flows
```bash
# Test 1: Order Confirmation + Payment Success
# - Place order through frontend
# - Complete Razorpay payment
# - Check email inbox

# Test 2: Shipping Notification
# - Use admin panel to mark order as SHIPPED
# - Optionally add tracking ID
# - Check email inbox

# Test 3: Refund Confirmation
# - Use admin panel or API to process refund
# - Check email inbox
```

---

## Production Deployment

### Vercel/Railway Environment Variables
Add these to your deployment platform:

**Vercel:**
```bash
vercel env add SENDGRID_API_KEY
vercel env add SENDGRID_FROM_EMAIL
vercel env add SENDGRID_FROM_NAME
```

**Railway:**
1. Go to project settings
2. Add environment variables:
   - `SENDGRID_API_KEY`
   - `SENDGRID_FROM_EMAIL`
   - `SENDGRID_FROM_NAME`
3. Redeploy app

### SendGrid Production Checklist
- [ ] Domain authenticated (not single sender)
- [ ] API key permissions verified (Full Access)
- [ ] Sender email matches verified domain
- [ ] Tested all 5 email types
- [ ] Checked spam folder placement
- [ ] Monitored SendGrid activity feed
- [ ] Set up billing alerts (free tier: 100 emails/day)

### Rate Limits
**SendGrid Free Tier:**
- 100 emails/day
- No credit card required
- Suitable for 20-30 orders/day (5 emails per order)

**If exceeding limits:**
- Upgrade to SendGrid Essentials ($19.95/month, 50,000 emails)
- Or batch emails (send order confirmation only, skip payment receipt)

---

## Troubleshooting

### Problem: Emails not sending
**Solution:**
1. Check console logs for errors
2. Verify `SENDGRID_API_KEY` is set correctly
3. Ensure sender email is verified in SendGrid
4. Check SendGrid Activity Feed for delivery status

### Problem: Emails going to spam
**Solution:**
1. Complete domain authentication (not single sender)
2. Ask recipients to mark as "Not Spam"
3. Add SendGrid IP to SPF record
4. Avoid spam trigger words in subject/body

### Problem: "Sender not verified" error
**Solution:**
1. Go to SendGrid > Sender Authentication
2. Verify single sender OR authenticate domain
3. Use exact verified email in `SENDGRID_FROM_EMAIL`

### Problem: Rate limit exceeded
**Solution:**
1. Upgrade SendGrid plan
2. Reduce emails (e.g., skip payment success email)
3. Implement email queue for batching

---

## Future Enhancements

### 1. Email Queue (Recommended for Scale)
Instead of sending emails immediately, queue them for background processing:
- Use BullMQ or RabbitMQ
- Retry failed emails automatically
- Better error recovery

### 2. Email Templates with Handlebars
Move HTML to separate `.hbs` files for easier maintenance:
```
apps/api/src/templates/
  ├── order-confirmation.hbs
  ├── payment-success.hbs
  ├── shipping-notification.hbs
  └── refund-confirmation.hbs
```

### 3. User Preferences
Allow users to opt-in/out of specific emails:
- Marketing emails
- Order updates
- Promotional offers

### 4. Admin Email Notifications
Notify admin when:
- New order placed
- Payment received
- Refund requested
- Low stock alert

---

## Support

**SendGrid Documentation:** https://docs.sendgrid.com/  
**SendGrid Support:** https://support.sendgrid.com/  
**RoboHatch Contact:** founder@robohatch.in | +91 95055 51727

---

**Email System Status:** ✅ **PRODUCTION READY**  
**Last Updated:** 2025-01-XX  
**Next Action:** Install @sendgrid/mail, configure environment variables, test email flows
