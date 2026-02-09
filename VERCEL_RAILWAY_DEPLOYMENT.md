# 🚀 Complete Deployment Guide: Vercel + Railway + Database

## 📋 Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Architecture](#architecture)
4. [Database Setup](#database-setup)
5. [Backend Deployment (Railway)](#backend-deployment-railway)
6. [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
7. [Domain Configuration](#domain-configuration)
8. [Environment Variables](#environment-variables)
9. [Testing & Verification](#testing--verification)
10. [Monitoring & Maintenance](#monitoring--maintenance)
11. [Troubleshooting](#troubleshooting)
12. [Cost Estimation](#cost-estimation)

---

## 📖 Overview

This guide will walk you through deploying the RoboHatch e-commerce platform using:
- **Vercel**: Frontend hosting (Next.js)
- **Railway**: Backend API hosting (Express.js)
- **AWS RDS MySQL**: Production database (already configured)
- **Alternative**: Railway MySQL/PostgreSQL

### Deployment Flow
```
User Request
     ↓
Vercel (Frontend - Next.js) → CDN → Global Edge Network
     ↓
Railway (Backend - Express.js) → API Processing
     ↓
AWS RDS MySQL (Database) → Data Storage
     ↓
AWS S3 (Images) → Static Assets
```

---

## ✅ Prerequisites

### Required Accounts
- [ ] **Vercel Account** - Sign up at [vercel.com](https://vercel.com) (Free tier available)
- [ ] **Railway Account** - Sign up at [railway.app](https://railway.app) (Free $5 credit)
- [ ] **GitHub Account** - For repository connection
- [ ] **AWS Account** - For RDS database (already have) and S3 bucket
- [ ] **Domain Name** (Optional but recommended)

### Required Tools
- [ ] **Git** installed and configured
- [ ] **Node.js** 18+ installed
- [ ] **npm/yarn** package manager
- [ ] **VS Code** or preferred IDE
- [ ] **Vercel CLI** (optional): `npm install -g vercel`
- [ ] **Railway CLI** (optional): `npm install -g @railway/cli`

### Project Requirements
- [ ] Code committed to Git repository
- [ ] GitHub repository created
- [ ] All environment variables documented
- [ ] Database migrations ready
- [ ] AWS S3 bucket configured
- [ ] Build tested locally

---

## 🏗️ Architecture

### Current Setup
```
┌─────────────────────────────────────────────────────┐
│                   Internet Users                     │
└───────────────────┬─────────────────────────────────┘
                    │
         ┌──────────┴──────────┐
         │                     │
    ┌────▼────┐          ┌─────▼─────┐
    │ Vercel  │          │  Railway  │
    │Frontend │          │  Backend  │
    │Next.js  │◄────────►│ Express.js│
    │Port:3000│          │ Port:5000 │
    └─────────┘          └─────┬─────┘
         │                     │
         │              ┌──────┴──────┐
         │              │             │
         │         ┌────▼─────┐  ┌───▼────┐
         │         │AWS RDS   │  │AWS S3  │
         │         │MySQL 8.0 │  │Images  │
         │         │Database  │  │Bucket  │
         │         └──────────┘  └────────┘
         │
    ┌────▼─────┐
    │Vercel CDN│
    │Analytics │
    └──────────┘
```

### Data Flow
1. User visits domain → Vercel serves Next.js app via CDN
2. User actions (login, add to cart) → Frontend calls Railway API
3. API processes request → Queries AWS RDS MySQL
4. Product images loaded → Served from AWS S3
5. Response sent back → User sees result

---

## 💾 Database Setup

### Option 1: AWS RDS MySQL (Recommended - Already Configured)

You already have AWS RDS configured with these credentials:
```
Host: robohatch-mysql.c344g8euk9qw.eu-north-1.rds.amazonaws.com
Port: 3306
Database: robohatch_db
Username: admin
Password: Admin246800864200
Region: eu-north-1
```

**Connection String:**
```
DATABASE_URL="mysql://admin:Admin246800864200@robohatch-mysql.c344g8euk9qw.eu-north-1.rds.amazonaws.com:3306/robohatch_db"
```

#### ✅ AWS RDS - Pre-Deployment Checklist

1. **Verify Database Access:**
```bash
# Test connection from your local machine
mysql -h robohatch-mysql.c344g8euk9qw.eu-north-1.rds.amazonaws.com -u admin -p robohatch_db
# Enter password: Admin246800864200
```

2. **Check Security Group Rules:**
   - Login to AWS Console → RDS → Databases → robohatch-mysql
   - Click on VPC security group
   - Ensure inbound rules allow:
     - **Your IP** (for testing): `YOUR_IP/32` on port 3306
     - **Railway IP range** (for production): `0.0.0.0/0` on port 3306
     - ⚠️ **Security Note**: In production, restrict to Railway's IP range

3. **Verify Database Tables:**
```bash
# Connect and check tables
mysql -h robohatch-mysql.c344g8euk9qw.eu-north-1.rds.amazonaws.com -u admin -p -e "USE robohatch_db; SHOW TABLES;"
```

Expected tables:
```
User, Product, Category, Cart, CartItem, Order, OrderItem, 
Payment, CustomDesign, _prisma_migrations
```

4. **Backup Database:**
```bash
# Create backup before deployment
mysqldump -h robohatch-mysql.c344g8euk9qw.eu-north-1.rds.amazonaws.com -u admin -p robohatch_db > backup_$(date +%Y%m%d).sql
```

5. **Enable Encryption (Recommended):**
   - AWS Console → RDS → robohatch-mysql → Configuration
   - Enable encryption at rest
   - Enable automatic backups (7-day retention)
   - Enable deletion protection

---

### Option 2: Railway MySQL (Alternative)

If you want to use Railway's managed database instead:

#### Step-by-Step Railway Database Setup

1. **Create Railway MySQL Database:**
   - Login to [Railway Dashboard](https://railway.app/dashboard)
   - Click **"New Project"**
   - Select **"Provision MySQL"**
   - Database will be created automatically

2. **Get Database Credentials:**
   - Click on MySQL service
   - Go to **"Variables"** tab
   - Railway provides these variables:
     ```
     MYSQLHOST=containers-us-west-xxx.railway.app
     MYSQLPORT=6789
     MYSQLDATABASE=railway
     MYSQLUSER=root
     MYSQLPASSWORD=xxxxx
     DATABASE_URL=mysql://root:xxxxx@containers-us-west-xxx.railway.app:6789/railway
     ```

3. **Copy DATABASE_URL** for later use

4. **Connect and Initialize:**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Run migrations
railway run npx prisma migrate deploy
```

---

### Option 3: Railway PostgreSQL

If you prefer PostgreSQL:

1. **Provision PostgreSQL:**
   - Railway Dashboard → New Project → Provision PostgreSQL

2. **Update Prisma Schema:**
```bash
# Edit apps/api/prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

3. **Regenerate Prisma Client:**
```bash
cd apps/api
npx prisma generate
npx prisma migrate dev --name init
```

---

## 🚂 Backend Deployment (Railway)

### Step 1: Prepare Repository

1. **Ensure Code is Committed:**
```bash
cd c:\Users\mcsr8\OneDrive\Desktop\robohatch-platform

# Check status
git status

# Add all changes
git add .

# Commit changes
git commit -m "feat: Add production deployment configuration with Helmet.js security, rate limiting, and Docker support"

# Push to GitHub
git push origin main
```

2. **Verify .gitignore:**
Ensure these are in `.gitignore`:
```
node_modules
.env
.env.local
dist
.next
*.log
```

### Step 2: Create Railway Project

1. **Visit Railway Dashboard:**
   - Go to [railway.app/new](https://railway.app/new)
   - Click **"Deploy from GitHub repo"**

2. **Connect GitHub:**
   - Click **"Login with GitHub"**
   - Authorize Railway to access repositories
   - Select **robohatch-platform** repository

3. **Configure Build Settings:**
   - Click **"Add variables"** first (before deployment)

### Step 3: Configure Environment Variables

Click on **"Variables"** tab and add these **EXACTLY**:

#### Required Backend Variables

```bash
# Environment
NODE_ENV=production
PORT=5000

# Database - AWS RDS (Use your existing database)
DATABASE_URL=mysql://admin:Admin246800864200@robohatch-mysql.c344g8euk9qw.eu-north-1.rds.amazonaws.com:3306/robohatch_db

# JWT Authentication - GENERATE NEW SECRET
JWT_SECRET=your-super-secure-random-string-min-64-chars-use-openssl-rand-hex-32
JWT_EXPIRES_IN=7d

# AWS S3 Configuration - Your existing bucket
AWS_ACCESS_KEY_ID=AKIA5VPCUNTELKIP5NWJ
AWS_SECRET_ACCESS_KEY=wyrvWE9lYWCB2k036VAjIzps5pjLPr550XoyN8JY
AWS_REGION=eu-north-1
AWS_S3_BUCKET=robohatch-product-images

# CORS - Will update after getting Railway URL
FRONTEND_URL=https://your-app.vercel.app
ALLOWED_ORIGINS=https://your-app.vercel.app,https://www.your-domain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security
BCRYPT_ROUNDS=12
```

#### 🔐 Generate Secure JWT Secret

**Option 1: Using OpenSSL (Recommended)**
```bash
# Windows (PowerShell)
-join ((1..64) | ForEach-Object { '{0:X}' -f (Get-Random -Max 16) })

# Windows (Git Bash) or Mac/Linux
openssl rand -hex 32
```

**Option 2: Online Generator**
- Visit [randomkeygen.com](https://randomkeygen.com/)
- Copy a "Fort Knox Password" (504-bit)
- Use that as JWT_SECRET

**Example Output:**
```
c886e244faeb41cce262b411a04b628d26dab6aaf565de7e2173cd39bc977731
```

⚠️ **NEVER use the example above in production** - Generate your own!

### Step 4: Configure Build Settings

1. **Railway Settings:**
   - Click **"Settings"** tab
   - **Root Directory**: Leave empty (monorepo handled by Railway)
   - **Build Command**: `cd apps/api && npm install && npx prisma generate && npm run build`
   - **Start Command**: `cd apps/api && npm start`
   - **Watch Paths**: `apps/api/**`

2. **Advanced Settings:**
   - **Region**: Select closest to your users (e.g., US West, Europe)
   - **Restart Policy**: Always
   - **Health Check Path**: `/health`
   - **Health Check Timeout**: 300 seconds (for initial deployment)

### Step 5: Deploy Backend

1. **Trigger Deployment:**
   - Click **"Deploy"** button
   - Railway will:
     - Clone your repository
     - Install dependencies
     - Generate Prisma client
     - Build TypeScript
     - Start the server

2. **Monitor Build Logs:**
   - Click **"Deployments"** tab
   - Watch real-time logs
   - Look for:
     ```
     ✓ Dependencies installed
     ✓ Prisma client generated
     ✓ TypeScript compiled
     ✓ Server started on port 5000
     ```

3. **Common Build Issues:**

   **Issue: Prisma Client Not Generated**
   ```bash
   # Solution: Update Build Command
   cd apps/api && npm install && npx prisma generate && npm run build
   ```

   **Issue: TypeScript Errors**
   ```bash
   # Check locally first
   cd apps/api
   npm run build
   ```

   **Issue: Database Connection Timeout**
   - Check AWS RDS security group allows Railway IPs
   - Verify DATABASE_URL is correct
   - Test connection with MySQL client

### Step 6: Run Database Migrations

1. **Using Railway CLI:**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# Run migrations
railway run npx prisma migrate deploy --schema=./apps/api/prisma/schema.prisma
```

2. **Using Railway Dashboard:**
   - Go to **"Settings"** → **"One-off Commands"**
   - Enter: `cd apps/api && npx prisma migrate deploy`
   - Click **"Run"**

3. **Verify Migrations:**
```bash
railway run npx prisma studio --schema=./apps/api/prisma/schema.prisma
```

### Step 7: Get Railway URL

1. **Generate Public URL:**
   - Railway Dashboard → Your Project
   - Click **"Settings"** → **"Networking"**
   - Click **"Generate Domain"**
   - You'll get: `your-app-production.up.railway.app`

2. **Test Backend API:**
```bash
# Health check
curl https://your-app-production.up.railway.app/health

# Should return:
{
  "status": "OK",
  "environment": "production",
  "timestamp": "2026-02-09T10:00:00.000Z"
}
```

3. **Save Railway URL** - You'll need it for Vercel frontend

### Step 8: Update CORS Settings

1. **After getting Vercel URL (in next section), update Railway variables:**
   - Railway Dashboard → Variables
   - Update:
     ```
     FRONTEND_URL=https://your-app.vercel.app
     ALLOWED_ORIGINS=https://your-app.vercel.app,https://www.yourdomain.com
     ```
   - Click **"Update Variables"**
   - Railway will automatically restart

---

## 🎨 Frontend Deployment (Vercel)

### Step 1: Prepare Frontend

1. **Update Next.js Config for Production:**

Already configured in `apps/web/next.config.js`:
```javascript
output: 'standalone',  // ✓ Already added
compress: true,        // ✓ Already added
swcMinify: true,       // ✓ Already added
```

2. **Verify Environment Variables:**

Create `apps/web/.env.production` (optional, for local testing):
```bash
NEXT_PUBLIC_API_URL=https://your-app-production.up.railway.app
```

### Step 2: Connect to Vercel

1. **Visit Vercel Dashboard:**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Click **"Add New Project"**

2. **Import Git Repository:**
   - Click **"Import Git Repository"**
   - Select **"GitHub"**
   - Authorize Vercel if needed
   - Search for **"robohatch-platform"**
   - Click **"Import"**

### Step 3: Configure Vercel Project

1. **Framework Preset:**
   - Vercel should auto-detect: **Next.js**
   - If not, select manually

2. **Root Directory:**
   - Click **"Edit"** next to Root Directory
   - Select: `apps/web`
   - ✅ **This is critical for monorepo**

3. **Build Settings:**
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)
   - **Install Command**: `npm install` (auto-detected)
   - **Development Command**: `npm run dev`

### Step 4: Configure Environment Variables

Click **"Environment Variables"** section:

#### Add These Variables:

1. **NEXT_PUBLIC_API_URL** (Required)
   ```
   Key: NEXT_PUBLIC_API_URL
   Value: https://your-app-production.up.railway.app
   Environment: Production
   ```

   ⚠️ **Replace with your actual Railway URL**

2. **Node Environment (Optional but recommended)**
   ```
   Key: NODE_ENV
   Value: production
   Environment: Production
   ```

### Step 5: Deploy Frontend

1. **Click "Deploy" Button**
   - Vercel will:
     - Clone repository
     - Install dependencies
     - Build Next.js app
     - Deploy to global CDN
     - Generate preview URL

2. **Monitor Build:**
   - Watch build logs in real-time
   - Look for:
     ```
     ✓ Collecting page data
     ✓ Generating static pages (XX/XX)
     ✓ Finalizing page optimization
     ✓ Build completed successfully
     ```

3. **Build Time:** 
   - First deployment: 3-5 minutes
   - Subsequent deployments: 1-2 minutes

### Step 6: Get Vercel URL

1. **After Successful Deployment:**
   - Vercel shows: **"Your project is deployed!"**
   - Default URL: `https://your-app-name.vercel.app`
   - Or: `https://your-app-name-username.vercel.app`

2. **Visit Your Site:**
   - Click the URL preview
   - Test homepage loads
   - Check browser console for errors

### Step 7: Test Frontend-Backend Connection

1. **Open Browser Console (F12)**

2. **Test API Connection:**
   - Go to Products page
   - Open Network tab
   - Look for requests to Railway URL
   - Verify status 200 responses

3. **Common Issues:**

   **Issue: CORS Error**
   ```
   Access to fetch at 'https://railway-url' from origin 'https://vercel-url' 
   has been blocked by CORS policy
   ```
   
   **Solution:**
   - Go to Railway → Variables
   - Update `ALLOWED_ORIGINS` to include Vercel URL
   - Wait 30 seconds for restart

   **Issue: API Not Found (404)**
   ```
   Failed to fetch: https://vercel-url/api/products
   ```
   
   **Solution:**
   - Check `NEXT_PUBLIC_API_URL` in Vercel
   - Should point to Railway, not Vercel domain
   - Add `/api` prefix if needed

### Step 8: Update Railway CORS (Critical!)

1. **Now that you have both URLs, update Railway:**
   - Railway Dashboard → Your Project → Variables
   - Update:
     ```
     FRONTEND_URL=https://your-app.vercel.app
     ALLOWED_ORIGINS=https://your-app.vercel.app
     ```
   - Click **"Update Variables"**

2. **Verify Update:**
   - Railway will restart automatically
   - Check logs: `✓ CORS configuration updated`

---

## 🌐 Domain Configuration

### Option 1: Use Free Vercel Domain

**Vercel provides free subdomain:**
- Format: `your-app-name.vercel.app`
- SSL/TLS included automatically
- No configuration needed
- **Pros**: Free, instant, managed
- **Cons**: Branded URL, not custom

### Option 2: Custom Domain (Recommended for Production)

#### Step 2.1: Purchase Domain

**Recommended Registrars:**
- **Namecheap** - $8-15/year, great support
- **GoDaddy** - $12-20/year, beginner-friendly
- **Google Domains** - $12/year, simple interface
- **Cloudflare** - $8-10/year, best for advanced users

**Example Domains:**
- `robohatch.com`
- `robohatch.store`
- `robo3d.shop`

#### Step 2.2: Configure Domain for Vercel

1. **Add Domain to Vercel:**
   - Vercel Dashboard → Your Project → **"Settings"**
   - Click **"Domains"** tab
   - Enter your domain: `yourdomain.com`
   - Click **"Add"**

2. **Choose DNS Configuration Method:**

   **Option A: Vercel Nameservers (Recommended)**
   - Vercel shows nameservers:
     ```
     ns1.vercel-dns.com
     ns2.vercel-dns.com
     ```
   - Go to your domain registrar
   - Update nameservers to Vercel's
   - Wait 24-48 hours for propagation

   **Option B: Custom DNS Records (Faster)**
   - Keep your registrar's nameservers
   - Add these DNS records:
     ```
     Type  Name  Value                     TTL
     A     @     76.76.21.21              3600
     CNAME www   cname.vercel-dns.com.    3600
     ```

3. **SSL Certificate:**
   - Vercel auto-generates Let's Encrypt SSL
   - Usually ready in 1-5 minutes
   - Check status: Domains → Certificate status

4. **Add www Subdomain:**
   - Vercel → Domains → Add `www.yourdomain.com`
   - Configure redirect: www → apex (or vice versa)

#### Step 2.3: Configure Custom Domain for Railway

1. **Generate Railway Custom Domain:**
   - Railway Dashboard → Settings → **"Networking"**
   - Enter: `api.yourdomain.com`
   - Railway shows DNS records to add

2. **Add DNS Records at Registrar:**
   ```
   Type   Name  Value                              TTL
   CNAME  api   your-app-production.up.railway.app 3600
   ```

3. **Update Environment Variables:**
   - **Railway Variables:**
     ```
     FRONTEND_URL=https://yourdomain.com
     ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
     ```
   - **Vercel Variables:**
     ```
     NEXT_PUBLIC_API_URL=https://api.yourdomain.com
     ```

4. **Force Redeploy Both:**
   - Vercel → Deployments → Click ⋯ → Redeploy
   - Railway → Deployments → Redeploy

#### Step 2.4: Verify Domain

1. **Check DNS Propagation:**
```bash
# Windows
nslookup yourdomain.com

# Should show Vercel IP: 76.76.21.21
```

2. **Test HTTPS:**
```bash
curl https://yourdomain.com
curl https://api.yourdomain.com/health
```

3. **Browser Test:**
   - Visit `https://yourdomain.com`
   - Check for SSL padlock 🔒
   - Verify no mixed content warnings

---

## 🔐 Environment Variables Reference

### Complete Railway Environment Variables

```bash
# Copy these to Railway Dashboard → Variables

# Environment
NODE_ENV=production
PORT=5000

# Database - AWS RDS (Your Production Database)
DATABASE_URL=mysql://admin:Admin246800864200@robohatch-mysql.c344g8euk9qw.eu-north-1.rds.amazonaws.com:3306/robohatch_db

# JWT - REPLACE WITH YOUR SECURE SECRET
JWT_SECRET=GENERATE_YOUR_OWN_64_CHAR_SECRET_USE_openssl_rand_hex_32
JWT_EXPIRES_IN=7d

# AWS S3 - Your Existing Configuration
AWS_ACCESS_KEY_ID=AKIA5VPCUNTELKIP5NWJ
AWS_SECRET_ACCESS_KEY=wyrvWE9lYWCB2k036VAjIzps5pjLPr550XoyN8JY
AWS_REGION=eu-north-1
AWS_S3_BUCKET=robohatch-product-images

# CORS - Update after Vercel deployment
FRONTEND_URL=https://your-app.vercel.app
ALLOWED_ORIGINS=https://your-app.vercel.app,https://www.yourdomain.com

# Rate Limiting (Production Values)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security
BCRYPT_ROUNDS=12
```

### Complete Vercel Environment Variables

```bash
# Add these in Vercel Dashboard → Settings → Environment Variables

# API URL - Your Railway Backend
NEXT_PUBLIC_API_URL=https://your-app-production.up.railway.app

# Or with custom domain:
# NEXT_PUBLIC_API_URL=https://api.yourdomain.com

# Environment (Optional)
NODE_ENV=production
```

### ⚠️ Security Checklist for Environment Variables

- [ ] ✅ JWT_SECRET is randomly generated (min 64 characters)
- [ ] ✅ Database password is strong (AWS RDS checked)
- [ ] ✅ AWS credentials restricted to S3 bucket only
- [ ] ✅ ALLOWED_ORIGINS only includes your domains
- [ ] ✅ No sensitive data in Vercel (public variables)
- [ ] ✅ All `.env` files in `.gitignore`
- [ ] ✅ Railway variables marked as sensitive
- [ ] ✅ Rate limiting enabled in production
- [ ] ✅ BCRYPT_ROUNDS set to 12 (production)

---

## 🧪 Testing & Verification

### Step 1: Backend Health Check

1. **Test Railway API:**
```bash
# Replace with your Railway URL
curl https://your-app-production.up.railway.app/health

# Expected Response:
{
  "status": "OK",
  "environment": "production",
  "timestamp": "2026-02-09T12:00:00.000Z"
}
```

2. **Test Authentication:**
```bash
# Register new user
curl -X POST https://your-app-production.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456",
    "name": "Test User"
  }'

# Expected: 201 Created with user details and token
```

3. **Test Products API:**
```bash
curl https://your-app-production.up.railway.app/api/products/all

# Expected: JSON array of products
```

### Step 2: Frontend Testing

1. **Visit Homepage:**
   - Go to `https://your-app.vercel.app`
   - Should load within 2-3 seconds
   - Check all images load from S3

2. **Test User Registration:**
   - Click "Register"
   - Fill form with test data
   - Submit and verify redirect to homepage
   - Check browser console for errors

3. **Test Product Browsing:**
   - Navigate to Products page
   - Verify product images load
   - Check product details page
   - Test category filtering

4. **Test Cart Functionality:**
   - Add products to cart
   - Update quantities
   - Remove items
   - Verify cart persists on page refresh

5. **Test Checkout Flow:**
   - Proceed to checkout
   - Fill in shipping details
   - Test mock payment (UPI)
   - Verify order creation

6. **Test Admin Panel:**
   - Login with admin credentials:
     ```
     Email: Admin@robohatch.in
     Password: Admin@123456789090
     ```
   - Verify admin dashboard access
   - Test product management
   - Check order management

### Step 3: Performance Testing

1. **Lighthouse Audit:**
   - Open Chrome DevTools (F12)
   - Go to "Lighthouse" tab
   - Run audit on:
     - Homepage
     - Product listing page
     - Product detail page
     - Cart page

   **Target Scores:**
   - Performance: 90+
   - Accessibility: 90+
   - Best Practices: 100
   - SEO: 90+

2. **Check Core Web Vitals:**
   - Visit [PageSpeed Insights](https://pagespeed.web.dev/)
   - Enter your Vercel URL
   - Check scores:
     - LCP (Largest Contentful Paint): < 2.5s
     - FID (First Input Delay): < 100ms
     - CLS (Cumulative Layout Shift): < 0.1

3. **Network Performance:**
```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s https://your-app.vercel.app
```

Create `curl-format.txt`:
```
time_namelookup:  %{time_namelookup}\n
time_connect:     %{time_connect}\n
time_starttransfer: %{time_starttransfer}\n
time_total:       %{time_total}\n
```

### Step 4: Cross-Browser Testing

Test on:
- [ ] **Chrome** (Latest)
- [ ] **Firefox** (Latest)
- [ ] **Safari** (MacOS/iOS)
- [ ] **Edge** (Latest)
- [ ] **Mobile Chrome** (Android)
- [ ] **Mobile Safari** (iOS)

**Test Checklist:**
- [ ] Homepage loads correctly
- [ ] Images display properly
- [ ] Navigation works
- [ ] Forms submit successfully
- [ ] Cart operations work
- [ ] Checkout flow completes
- [ ] Responsive design on mobile
- [ ] Touch interactions work

### Step 5: Security Testing

1. **SSL Certificate:**
```bash
# Check SSL
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Look for:
# - Valid certificate
# - TLS 1.2 or 1.3
# - Strong cipher suite
```

2. **Security Headers:**
```bash
curl -I https://your-app-production.up.railway.app

# Should see:
# Strict-Transport-Security: max-age=31536000
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# X-XSS-Protection: 1; mode=block
```

3. **Rate Limiting Test:**
```bash
# Make 10 rapid requests
for i in {1..10}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    https://your-app-production.up.railway.app/api/products/all
done

# Should see:
# 200 (first 5-10 requests)
# 429 (subsequent requests - rate limited)
```

4. **CORS Test:**
```bash
curl -H "Origin: https://malicious-site.com" \
  -H "Access-Control-Request-Method: POST" \
  -X OPTIONS \
  https://your-app-production.up.railway.app/api/auth/login

# Should return 403 or no CORS headers (blocked)
```

### Step 6: Database Verification

1. **Connect to Production Database:**
```bash
mysql -h robohatch-mysql.c344g8euk9qw.eu-north-1.rds.amazonaws.com -u admin -p robohatch_db
```

2. **Check Data Integrity:**
```sql
-- Verify tables exist
SHOW TABLES;

-- Check product count
SELECT COUNT(*) FROM Product;

-- Check users (should have test user)
SELECT id, email, name, role FROM User;

-- Check orders
SELECT COUNT(*) FROM Order;

-- Check migrations
SELECT * FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5;
```

3. **Monitor Database Connections:**
```sql
-- Check active connections
SHOW PROCESSLIST;

-- Should see Railway connections
```

---

## 📊 Monitoring & Maintenance

### Vercel Analytics

1. **Enable Vercel Analytics:**
   - Vercel Dashboard → Your Project → **"Analytics"**
   - Click **"Enable Analytics"**
   - Free tier includes:
     - Page views
     - Unique visitors
     - Top pages
     - Referrers

2. **Add Web Vitals Monitoring:**
```javascript
// apps/web/src/app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

3. **Monitor Real User Monitoring (RUM):**
   - Dashboard shows:
     - Core Web Vitals
     - Performance by country
     - Device breakdown
     - Browser stats

### Railway Monitoring

1. **Railway Metrics:**
   - Railway Dashboard → Your Project → **"Metrics"**
   - Monitor:
     - CPU usage (should be < 80%)
     - Memory usage (should be < 80%)
     - Network I/O
     - Disk usage

2. **Railway Logs:**
   - Click **"Logs"** tab
   - Filter by:
     - Error level
     - Time range
     - Search terms

3. **Set Up Alerts:**
   - Railway → Settings → **"Webhooks"**
   - Configure Discord/Slack notifications for:
     - Deployment failures
     - High error rates
     - Resource warnings

### Database Monitoring

1. **AWS RDS CloudWatch:**
   - AWS Console → RDS → robohatch-mysql → **"Monitoring"**
   - Watch:
     - CPU Utilization (< 80%)
     - Database Connections (< max)
     - Read/Write IOPS
     - Storage space

2. **Enable Enhanced Monitoring:**
   - RDS → Modify → Enhanced Monitoring
   - Granularity: 60 seconds
   - View OS-level metrics

3. **Set Up CloudWatch Alarms:**
```bash
# Example: CPU > 80% alert
aws cloudwatch put-metric-alarm \
  --alarm-name robohatch-high-cpu \
  --alarm-description "Alert when CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold
```

### Error Tracking (Optional but Recommended)

1. **Add Sentry:**
```bash
# Install Sentry
cd apps/api
npm install @sentry/node

cd ../web
npm install @sentry/nextjs
```

2. **Configure Sentry (Backend):**
```javascript
// apps/api/src/server.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

3. **Configure Sentry (Frontend):**
```javascript
// apps/web/next.config.js
const { withSentryConfig } = require('@sentry/nextjs');

module.exports = withSentryConfig(nextConfig, {
  org: 'your-org',
  project: 'robohatch-web',
});
```

### Regular Maintenance Tasks

**Daily:**
- [ ] Check Railway logs for errors
- [ ] Monitor Vercel deployment status
- [ ] Review visitor analytics

**Weekly:**
- [ ] Check database disk space in AWS RDS
- [ ] Review error rates and fix issues
- [ ] Update dependencies if needed
- [ ] Backup database

**Monthly:**
- [ ] Review Railway/Vercel costs
- [ ] Rotate JWT secrets (good practice)
- [ ] Update SSL certificates (auto-renewed by Let's Encrypt)
- [ ] Performance audit with Lighthouse
- [ ] Security audit (check for vulnerabilities)

---

## 🔧 Troubleshooting

### Issue 1: Railway Build Fails

**Error:** `npm ERR! missing script: build`

**Solution:**
```bash
# Update Railway Settings → Build Command
cd apps/api && npm install && npx prisma generate && npm run build
```

---

### Issue 2: Prisma Client Generation Fails

**Error:** `PrismaClient is unable to be run in the browser`

**Solution:**
1. Ensure `@prisma/client` is in dependencies (not devDependencies)
2. Railway → Build Command:
```bash
cd apps/api && npm install && npx prisma generate && npm run build
```

---

### Issue 3: Database Connection Timeout

**Error:** `Can't reach database server at robohatch-mysql.c344g8euk9qw.eu-north-1.rds.amazonaws.com`

**Solutions:**

1. **Check AWS RDS Security Group:**
   - AWS Console → EC2 → Security Groups
   - Find RDS security group
   - Add inbound rule:
     - Type: MySQL/Aurora
     - Protocol: TCP
     - Port: 3306
     - Source: `0.0.0.0/0` (or Railway IP range)

2. **Verify Database URL:**
```bash
# Railway → Variables → DATABASE_URL should be:
mysql://admin:Admin246800864200@robohatch-mysql.c344g8euk9qw.eu-north-1.rds.amazonaws.com:3306/robohatch_db
```

3. **Test Connection:**
```bash
# From Railway CLI
railway run npx prisma db pull --schema=./apps/api/prisma/schema.prisma
```

---

### Issue 4: CORS Errors on Frontend

**Error:** `Access to fetch at 'https://railway-url' has been blocked by CORS`

**Solutions:**

1. **Update Railway ALLOWED_ORIGINS:**
   - Railway → Variables
   - Set: `ALLOWED_ORIGINS=https://your-app.vercel.app`
   - Redeploy

2. **Check Vercel API URL:**
   - Vercel → Settings → Environment Variables
   - Ensure: `NEXT_PUBLIC_API_URL=https://railway-url`
   - Redeploy

3. **Verify CORS Middleware:**
```javascript
// apps/api/src/app.ts should have:
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || environment.ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
```

---

### Issue 5: Vercel Build Fails

**Error:** `Module not found: Can't resolve '@robohatch/ui'`

**Solution:**

1. **Check Root Directory:**
   - Vercel → Settings → General
   - Root Directory: `apps/web` ✅

2. **Install Dependencies:**
```bash
# Vercel Settings → Build & Development Settings
# Install Command: npm install --prefix ../../ && npm install
```

---

### Issue 6: Images Not Loading from S3

**Error:** `Failed to load resource: net::ERR_BLOCKED_BY_CLIENT`

**Solutions:**

1. **Check S3 Bucket Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::robohatch-product-images/*"
    }
  ]
}
```

2. **Check CORS Configuration:**
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": [
      "https://your-app.vercel.app",
      "https://yourdomain.com"
    ],
    "ExposeHeaders": []
  }
]
```

3. **Verify Next.js Image Config:**
```javascript
// apps/web/next.config.js
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'robohatch-product-images.s3.eu-north-1.amazonaws.com',
    }
  ]
}
```

---

### Issue 7: Rate Limiting Too Strict

**Error:** `429 Too Many Requests`

**Solution:**

Adjust rate limits in Railway:
```bash
# Increase limits for testing
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=500  # Increased from 100

# Or disable for specific IPs in development
# Update apps/api/src/middlewares/security.middleware.ts
```

---

### Issue 8: Environment Variables Not Working

**Symptoms:** App works locally but not in production

**Solutions:**

1. **Check Variable Names:**
   - Must be EXACT (case-sensitive)
   - Railway: `JWT_SECRET` not `jwt_secret`
   - Vercel: `NEXT_PUBLIC_API_URL` (must start with `NEXT_PUBLIC_`)

2. **Redeploy After Adding Variables:**
   - Railway: Auto-redeploys
   - Vercel: Manual redeploy required
     - Deployments → Latest → ⋯ → Redeploy

3. **Check Variable Scope:**
   - Vercel: Production / Preview / Development
   - Ensure "Production" is checked

---

### Issue 9: Port Already in Use (Local Testing)

**Error:** `Port 5000 is already in use`

**Solution:**
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Or change port
# Railway → Variables → PORT=5001
```

---

### Issue 10: Payment Gateway Not Working

**Error:** Mock payment stuck or not processing

**Solution:**

1. **Check Order Creation:**
```bash
curl -X POST https://railway-url/api/orders \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [...],
    "shippingDetails": {...}
  }'
```

2. **Verify Payment Webhook:**
   - Mock payment uses `paymentMethod: "UPI"`
   - Check Railway logs for payment processing

---

## 💰 Cost Estimation

### Free Tier (Testing/Low Traffic)

**Vercel Free Tier:**
- ✅ Unlimited personal projects
- ✅ 100 GB bandwidth/month
- ✅ Automatic HTTPS
- ✅ Edge network
- ✅ Analytics (basic)
- **Cost:** $0/month

**Railway Free Tier:**
- ✅ $5 free credit/month
- ✅ ~500 hours runtime (with sleep)
- ✅ Automatic deployments
- ✅ Metrics and logs
- **Cost:** $0-5/month (depends on usage)

**AWS RDS (Current Setup):**
- db.t3.micro (free tier eligible for 12 months)
- 20 GB storage
- **Cost:** $0/month (first year) → ~$15/month after

**AWS S3:**
- 5 GB storage
- 20,000 GET requests
- 2,000 PUT requests
- **Cost:** $0-1/month

**Total Free Tier:** $0-6/month

---

### Production Tier (1,000-10,000 visitors/month)

**Vercel Pro:**
- All features
- 1 TB bandwidth
- Advanced analytics
- Password protection
- **Cost:** $20/month

**Railway Pro:**
- $5 starting credit/month
- Plus usage-based pricing
- ~$20/month for API (24/7 uptime)
- **Cost:** $20-30/month

**AWS RDS:**
- db.t3.small (2 vCPU, 2 GB RAM)
- 50 GB storage
- Multi-AZ optional
- **Cost:** $30-50/month

**AWS S3:**
- 50 GB storage
- 500,000 GET requests
- 50,000 PUT requests
- CloudFront CDN (optional)
- **Cost:** $5-10/month

**Total Production:** $75-110/month

---

### Enterprise Tier (100,000+ visitors/month)

**Vercel Enterprise:**
- Custom pricing
- Dedicated support
- SLA guarantees
- **Cost:** $300+/month

**Railway:**
- Multiple instances
- Auto-scaling
- **Cost:** $100-200/month

**AWS RDS:**
- db.r5.large (2 vCPU, 16 GB RAM)
- 200 GB storage
- Multi-AZ
- Read replicas
- **Cost:** $200-400/month

**AWS S3 + CloudFront:**
- 500 GB storage
- 10M+ requests
- Global CDN
- **Cost:** $50-100/month

**Total Enterprise:** $650-1,000+/month

---

### Cost Optimization Tips

1. **Use Vercel Free Tier** for frontend (personal projects)
2. **Enable Railway Sleep** for development environments
3. **Use AWS RDS Reserved Instances** (save 30-60%)
4. **Implement S3 Lifecycle Policies** to move old images to Glacier
5. **Use CloudFront CDN** to reduce S3 GET requests
6. **Monitor and optimize** database queries
7. **Implement caching** (Redis) for frequently accessed data
8. **Use Vercel Edge Functions** for simple API calls

---

## 📚 Additional Resources

### Official Documentation
- **Vercel Docs**: https://vercel.com/docs
- **Railway Docs**: https://docs.railway.app
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **Prisma Deployment**: https://www.prisma.io/docs/guides/deployment
- **AWS RDS Guide**: https://docs.aws.amazon.com/rds/

### Tutorials
- Vercel YouTube: https://www.youtube.com/c/Vercel
- Railway Tutorials: https://blog.railway.app
- Next.js Deployment: https://www.youtube.com/watch?v=2HBIzEx6IZA

### Community Support
- Vercel Discord: https://vercel.com/discord
- Railway Discord: https://discord.gg/railway
- Stack Overflow: Tag with `vercel`, `railway`, `nextjs`

### Tools
- **SSL Labs**: https://www.ssllabs.com/ssltest/ - Test SSL configuration
- **PageSpeed Insights**: https://pagespeed.web.dev - Performance testing
- **GTmetrix**: https://gtmetrix.com - Detailed performance analysis
- **Uptime Robot**: https://uptimerobot.com - Free uptime monitoring
- **Sentry**: https://sentry.io - Error tracking (free tier available)

---

## 🎉 Deployment Checklist

### Pre-Deployment
- [ ] Code pushed to GitHub
- [ ] Environment variables documented
- [ ] Database migrations tested
- [ ] Build tested locally (`npm run build`)
- [ ] All tests passing
- [ ] Security audit completed
- [ ] Backup database created

### Railway Deployment
- [ ] Railway account created
- [ ] Project connected to GitHub
- [ ] Environment variables configured
- [ ] Build command set correctly
- [ ] Database migrations run
- [ ] Health check passing
- [ ] Railway URL obtained
- [ ] API tested with curl/Postman

### Vercel Deployment
- [ ] Vercel account created
- [ ] Project imported from GitHub
- [ ] Root directory set to `apps/web`
- [ ] `NEXT_PUBLIC_API_URL` configured
- [ ] Build successful
- [ ] Vercel URL obtained
- [ ] Frontend loads correctly
- [ ] Frontend-backend connection tested

### Domain Configuration (Optional)
- [ ] Domain purchased
- [ ] DNS records added for Vercel
- [ ] DNS records added for Railway API
- [ ] SSL certificate active
- [ ] www redirect configured
- [ ] Domain verified working

### Post-Deployment
- [ ] All pages load correctly
- [ ] User registration works
- [ ] User login works
- [ ] Products display correctly
- [ ] Cart functionality works
- [ ] Checkout completes successfully
- [ ] Admin panel accessible
- [ ] Images loading from S3
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Cross-browser tested
- [ ] Performance scores good (Lighthouse)
- [ ] No security warnings

### Monitoring Setup
- [ ] Vercel Analytics enabled
- [ ] Railway metrics monitored
- [ ] AWS CloudWatch alarms configured
- [ ] Error tracking setup (Sentry optional)
- [ ] Uptime monitoring configured
- [ ] Backup strategy in place

---

## 🚀 Quick Start Summary

**1. Railway Backend (15 minutes):**
```bash
# Deploy to Railway
railway login
railway link
railway up

# Add environment variables in Railway Dashboard
# Run migrations
railway run npx prisma migrate deploy
```

**2. Vercel Frontend (10 minutes):**
```bash
# Deploy to Vercel
cd apps/web
vercel --prod

# Add NEXT_PUBLIC_API_URL in Vercel Dashboard
# Redeploy if needed
```

**3. Update CORS (5 minutes):**
```bash
# In Railway Variables, add:
FRONTEND_URL=https://your-app.vercel.app
ALLOWED_ORIGINS=https://your-app.vercel.app
```

**4. Test (10 minutes):**
- Visit Vercel URL
- Register test user
- Browse products
- Add to cart
- Test checkout

**Total Time: ~40 minutes** 🎉

---

## 📞 Support & Help

If you encounter issues:

1. **Check this guide's Troubleshooting section**
2. **Review deployment logs** (Railway/Vercel dashboards)
3. **Test API endpoints** with curl/Postman
4. **Verify environment variables** are correct
5. **Check database connectivity** from Railway
6. **Review CORS settings** match between services

**Good luck with your deployment!** 🚀

---

**Last Updated:** February 9, 2026  
**Version:** 1.0  
**Status:** Production Ready ✅
