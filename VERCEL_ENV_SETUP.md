# 🚀 Vercel Environment Setup - Fix Production Categories

## Issue
Your deployed site (https://www.robohatch.in) can't load categories because Vercel doesn't have the API URL configured.

## Quick Fix - Set Vercel Environment Variables

### Step 1: Go to Vercel Dashboard

1. Visit: https://vercel.com/dashboard
2. Select your project: **robohatch-platform** (or whatever your project is called)
3. Click on **"Settings"** tab
4. Click on **"Environment Variables"** in the left sidebar

### Step 2: Add Environment Variable

Add the following environment variable:

**Variable Name:**
```
NEXT_PUBLIC_API_URL
```

**Value:**
```
https://robohatchapi-production.up.railway.app
```

**Environment:** 
- ✅ Production
- ✅ Preview  
- ✅ Development

Click **"Save"**

### Step 3: Redeploy

After adding the environment variable, you need to redeploy:

**Option A - Via Vercel Dashboard:**
1. Go to **"Deployments"** tab
2. Find the latest deployment
3. Click the **3 dots (⋮)** menu
4. Click **"Redeploy"**
5. Check **"Use existing Build Cache"** (optional)
6. Click **"Redeploy"**

**Option B - Via Git Push:**
```bash
git commit --allow-empty -m "Trigger Vercel redeploy"
git push
```

### Step 4: Test

1. Wait for deployment to complete (1-2 minutes)
2. Visit: https://www.robohatch.in/admin/products/add
3. You should now see all 14 categories! 🎉

---

## Verify Setup

After redeployment, check:

1. **API Endpoint:**
   ```bash
   curl https://robohatchapi-production.up.railway.app/api/categories
   ```
   Should return 14 categories

2. **Frontend Browser Console:**
   - Open https://www.robohatch.in/admin/products/add
   - Press F12 to open DevTools
   - Check Console tab
   - Should see: "Loading categories from: https://robohatchapi-production.up.railway.app/api/categories"
   - Should see: "Loaded categories: 14"

---

## Summary

✅ Railway API has 14 categories (we just seeded it)  
❌ Vercel doesn't know where the API is  
✅ Set `NEXT_PUBLIC_API_URL` in Vercel  
✅ Redeploy to apply changes  

---

## Local vs Production

| Environment | API URL | File |
|------------|---------|------|
| Local Dev | `http://localhost:5000` | `.env.local` |
| Vercel Production | `https://robohatchapi-production.up.railway.app` | Vercel Dashboard → Environment Variables |

DO NOT commit `.env.local` to git - it's for local development only!
