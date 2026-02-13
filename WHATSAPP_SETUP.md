# WhatsApp Notifications Setup Guide

Your RoboHatch platform now supports sending WhatsApp notifications for:
- 📦 New orders (sent to orders WhatsApp group)
- 📬 Contact form submissions (sent to contacts WhatsApp group)

## Features Added

### 1. Order Notifications
When a customer completes payment, your team receives a WhatsApp message with:
- Order ID and customer details
- Itemized list with quantities and prices
- Subtotal, GST (18%), and total
- Complete shipping address
- Timestamp and direct link to admin panel

### 2. Contact Form Notifications  
When someone submits the contact form, you receive:
- Name, email, and phone (if provided)
- Subject and message
- Timestamp
- Reminder to reply to the customer

## Supported WhatsApp Providers

Choose any ONE of these providers (we recommend Interakt or WATI for India):

### 1. **Interakt** (interakt.ai) ⭐ Recommended for India
- **Free Tier**: 1,000 messages/month
- **Pricing**: Pay-as-you-go after free tier
- **Setup Time**: 10-15 minutes
- **Best For**: Indian businesses, excellent support

**Steps:**
1. Sign up at https://app.interakt.ai/signup
2. Complete WhatsApp Business API verification (1-2 days)
3. Go to Settings → API Keys → Generate API Key
4. Get your API URL (usually `https://api.interakt.ai/v1/public/message/`)
5. Create/join WhatsApp groups for orders and contacts
6. Get group chat IDs from Interakt dashboard

### 2. **WATI** (wati.io) ⭐ Team Inbox
- **Free Tier**: 1,000 messages/month  
- **Pricing**: Starting from $50/month for more features
- **Setup Time**: 10-15 minutes
- **Best For**: Teams with shared inbox needs

**Steps:**
1. Sign up at https://app.wati.io/signup
2. Connect your WhatsApp Business number
3. Go to Settings → API Docs → Get API Key
4. API URL: `https://live-server-{your-instance}.wati.io/api/v1`
5. Create broadcast lists or groups
6. Note down the group/list IDs

### 3. **AiSensy** (aisensy.com) 🇮🇳 Indian Company
- **Free Tier**: 1,000 messages/month
- **Pricing**: ₹1,500/month for advanced features
- **Setup Time**: 10-15 minutes
- **Best For**: Indian businesses preferring local support

**Steps:**
1. Sign up at https://app.aisensy.com/signup
2. Complete WhatsApp Business verification
3. Go to API Settings → Generate API Key
4. Get API endpoint URL
5. Create campaigns for orders and contacts

### 4. **Twilio** (twilio.com) 🌍 Global
- **Free Trial**: $15 credit
- **Pricing**: $0.005/message (expensive for India)
- **Setup Time**: 20 minutes
- **Best For**: Global businesses, need international messaging

**Steps:**
1. Sign up at https://www.twilio.com/try-twilio
2. Get WhatsApp Sandbox number (for testing)
3. For production: Apply for WhatsApp Business API approval
4. Get Account SID and Auth Token
5. API URL: `https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json`

## Environment Variables Setup

Add these variables to your Railway backend (Production):

```bash
# Choose your provider: interakt, wati, aisensy, twilio
WHATSAPP_PROVIDER=interakt

# Your provider's API key (get from provider dashboard)
WHATSAPP_API_KEY=your_api_key_here

# Your provider's API endpoint URL
WHATSAPP_API_URL=https://api.interakt.ai/v1/public/message/

# WhatsApp group/number for order notifications
# Format depends on provider (usually phone number with country code)
WHATSAPP_ORDERS_GROUP=919876543210

# WhatsApp group/number for contact form notifications
WHATSAPP_CONTACTS_GROUP=919876543211
```

### How to Add to Railway:

1. Go to https://railway.app
2. Open your `robohatch-api` project
3. Click **Variables** tab
4. Click **+ New Variable** for each variable above
5. Click **Deploy** to apply changes

## Step-by-Step Setup (Interakt Example)

### Step 1: Sign Up for Interakt

1. Visit https://app.interakt.ai/signup
2. Enter your business details:
   - Business Name: RoboHatch
   - Email: admin@robohatch.in
   - Phone: Your business number
3. Verify your email

### Step 2: Connect WhatsApp

1. In Interakt dashboard, click **Connect WhatsApp**
2. Choose **WhatsApp Business API** (not regular WhatsApp)
3. Upload required documents:
   - Business registration certificate (if registered)
   - OR PAN card + Aadhaar (for proprietorship)
4. Verification takes 1-2 business days

### Step 3: Get API Credentials

1. Go to **Settings** → **Integrations** → **API**
2. Click **Generate API Key**
3. Copy the API Key: `Basic dGVzdDp0ZXN0MTIz...`
4. Note the API URL: `https://api.interakt.ai/v1/public/message/`

### Step 4: Create WhatsApp Groups

**For Orders Group:**
1. On your phone, create a WhatsApp group: "RoboHatch Orders"
2. Add team members who should receive order notifications
3. In Interakt dashboard, sync your WhatsApp contacts
4. Find the group and note its ID (usually your number with country code)

**For Contacts Group:**
1. Create another group: "RoboHatch Contacts"
2. Add customer support team members
3. Note this group's ID as well

### Step 5: Add to Railway

Go to Railway → robohatch-api → Variables:

```bash
WHATSAPP_PROVIDER=interakt
WHATSAPP_API_KEY=Basic dGVzdDp0ZXN0MTIz...
WHATSAPP_API_URL=https://api.interakt.ai/v1/public/message/
WHATSAPP_ORDERS_GROUP=919876543210
WHATSAPP_CONTACTS_GROUP=919876543211
```

Click **Deploy** and wait 1-2 minutes.

### Step 6: Test It!

1. **Test Contact Form:**
   - Go to https://www.robohatch.in/contact
   - Fill out the form and submit
   - Check your Contacts WhatsApp group for the message

2. **Test Order:**
   - Add a product to cart
   - Complete checkout with test address
   - Use Razorpay test card: `4111 1111 1111 1111`
   - CVV: Any 3 digits, Expiry: Any future date
   - Check your Orders WhatsApp group for the notification

## Troubleshooting

### Issue: No WhatsApp messages received

**Check Railway Logs:**
1. Go to Railway → robohatch-api → Deployments
2. Click latest deployment → View Logs
3. Look for:
   - `✅ WhatsApp notifications ENABLED` ← Good!
   - `⚠️  WhatsApp notifications DISABLED` ← Missing config

**If DISABLED, check:**
- All 5 environment variables are set in Railway
- No typos in variable names
- WHATSAPP_PROVIDER matches your choice exactly (lowercase)
- Redeploy after adding variables

### Issue: "WhatsApp notification failed" in logs

**Common causes:**
1. **Invalid API Key**: Double-check key from provider dashboard
2. **Wrong API URL**: Verify endpoint URL format
3. **Wrong Group ID**: Ensure group/number format matches provider requirements
4. **Provider account inactive**: Check your provider dashboard
5. **API quota exceeded**: Check your provider's usage limits

**Provider-specific troubleshooting:**

**Interakt:**
- Group ID should be phone number with country code: `919876543210`
- API Key starts with `Basic `
- Make sure WhatsApp Business API is approved (not just signed up)

**WATI:**
- Group ID is from broadcast list, not regular WhatsApp group
- API URL includes your instance: `https://live-server-1234.wati.io/api/v1`
- Check if template "custom_message" exists in WATI dashboard

**AiSensy:**
- Need to create a campaign first
- Use campaign name in group ID
- Template must be pre-approved

**Twilio:**
- For testing, use Twilio Sandbox number
- For production, need sender number approval (2-3 weeks)
- Group ID should be in format: `whatsapp:+919876543210`

### Issue: Messages go to wrong group

- Double-check `WHATSAPP_ORDERS_GROUP` and `WHATSAPP_CONTACTS_GROUP`
- Make sure they're swapped correctly
- Redeploy after fixing

## Message Format Examples

### Order Notification:
```
🛒 NEW ORDER RECEIVED

📦 Order ID: abc123-def456-ghi789

👤 Customer Details:
Name: Rahul Sharma
Phone: +91 98765 43210
Email: rahul@example.com

📝 Items:
• Lord Ganesh Yellow Idol x1 - ₹649
• Customized Business Card x2 - ₹1000

💰 Payment Summary:
Subtotal: ₹1649
GST (18%): ₹297
Total: ₹1946

📍 Shipping Address:
123, MG Road
Bangalore, Karnataka - 560001
India

⏰ Time: 13/02/2026, 10:30:45 AM

🌐 View Order: https://www.robohatch.in/admin/orders
```

### Contact Form Notification:
```
📬 NEW CONTACT FORM SUBMISSION

👤 From:
Name: Priya Reddy
Email: priya@example.com
Phone: +91 98765 43210

📋 Subject: Product Inquiry

💬 Message:
Hi, I'm interested in customized business cards for my startup. Can you provide bulk pricing for 1000 cards?

⏰ Time: 13/02/2026, 2:15:30 PM

💡 Tip: Reply to customer at priya@example.com
```

## Cost Estimation

### Monthly Message Volume (Estimated):
- **Orders**: ~100-200 orders/month = 100-200 messages
- **Contact Forms**: ~50-100 submissions/month = 50-100 messages
- **Total**: ~150-300 messages/month

### Provider Costs:

| Provider | Free Tier | After Free Tier | Best For |
|----------|-----------|-----------------|----------|
| **Interakt** | 1,000 msgs/month | ₹0.35/msg | Indian businesses, Best value |
| **WATI** | 1,000 msgs/month | $50/month (₹4,150) | Teams, Shared inbox |
| **AiSensy** | 1,000 msgs/month | ₹1,500/month | Indian support |
| **Twilio** | $15 credit | $0.005/msg (₹0.40/msg) | Global reach |

**Conclusion**: For RoboHatch, any provider's free tier (1,000 messages) will be more than enough!

## Alternative: Email Notifications

If WhatsApp setup seems complex, you can use email notifications instead:

1. **SendGrid Setup** (Simpler, Free tier: 100 emails/day):
   - Sign up at https://signup.sendgrid.com
   - Verify sender email: admin@robohatch.in
   - Get API key
   - Add to Railway:
     ```bash
     SENDGRID_API_KEY=SG.xxx...
     SENDGRID_FROM_EMAIL=noreply@robohatch.in
     SENDGRID_FROM_NAME=RoboHatch
     ```

2. Email notifications already implemented in code
3. Less real-time than WhatsApp, but still effective

## Support

If you face any issues:
1. Check Railway logs first
2. Verify all environment variables
3. Test with provider's dashboard/console first
4. Contact your provider's support (they're usually very helpful)

## Next Steps

After setting up WhatsApp notifications:
1. ✅ Test both order and contact form notifications
2. ✅ Add 11-16 more products to your store
3. ✅ Configure SendGrid for backup email notifications
4. ✅ Submit Razorpay Live form (needs 12+ products)
5. ✅ Go LIVE! 🎉

---

**Need Help?** Test the contact form at https://www.robohatch.in/contact - you'll receive the WhatsApp notification if setup correctly!
