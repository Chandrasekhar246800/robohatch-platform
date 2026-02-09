# 🚨 CRITICAL: Vercel Environment Variable Configuration Error

## The Problem

Your frontend is making requests to:
```
https://robohatch-platform-web.vercel.app/robohatchapi-production.up.railway.app/api/auth/login
```

This is **WRONG**! It should be:
```
https://robohatchapi-production.up.railway.app/api/auth/login
```

## Why This Happens

The `NEXT_PUBLIC_API_URL` environment variable in Vercel is either:
1. **Not set at all** (defaults to relative path)
2. **Missing the `https://` protocol** 
3. **Set incorrectly as a relative path**

When the protocol is missing, the browser treats it as a relative URL and appends it to the current domain.

## Exact Fix Steps

### Step 1: Go to Vercel Dashboard

1. Open https://vercel.com/dashboard
2. Click on your project: `robohatch-platform-web`
3. Click **Settings**
4. Click **Environment Variables** in the left sidebar

### Step 2: Check Existing Variable

Look for `NEXT_PUBLIC_API_URL`. It's probably:
- **Not set** (most likely)
- Set to: `robohatchapi-production.up.railway.app` (missing `https://`)
- Set to: `/api` (relative path)

### Step 3: Set Correct Value

Click **Add New** or **Edit** the existing variable:

**Variable Name:**
```
NEXT_PUBLIC_API_URL
```

**Value (EXACT format - copy/paste):**
```
https://robohatchapi-production.up.railway.app
```

**CRITICAL REQUIREMENTS:**
- ✅ Must start with `https://` 
- ✅ Must be ONLY the Railway domain
- ✅ NO trailing slash
- ✅ NO `/api` at the end
- ❌ Do NOT include the Vercel domain
- ❌ Do NOT use relative paths

**Which Environments:**
- ✅ Production
- ✅ Preview  
- ✅ Development (optional, for preview deployments)

### Step 4: Redeploy

After saving the environment variable:

1. Go to **Deployments** tab
2. Click the **"..."** menu on the latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete (~2-3 minutes)

## Verification Steps

### 1. Check Browser Console

After redeployment, open your site and browser DevTools (F12):

**Console Tab - Look for:**
```
🌐 API URL: https://robohatchapi-production.up.railway.app
[API Client] Base URL: https://robohatchapi-production.up.railway.app
```

**If you see:**
```
❌ CRITICAL ERROR: API URL must be absolute
```
The environment variable is still not set correctly!

### 2. Check Network Tab

Try to login again:

**Request URL should be:**
```
https://robohatchapi-production.up.railway.app/api/auth/login
```

**NOT:**
```
https://robohatch-platform-web.vercel.app/robohatchapi-production.up.railway.app/api/auth/login
```

### 3. Test Direct API Call

Open DevTools Console and run:
```javascript
console.log('API URL:', process.env.NEXT_PUBLIC_API_URL)
```

**Expected output:**
```
API URL: https://robohatchapi-production.up.railway.app
```

## Common Mistakes to Avoid

### ❌ WRONG Examples:

```bash
# Missing protocol
NEXT_PUBLIC_API_URL=robohatchapi-production.up.railway.app

# Relative path
NEXT_PUBLIC_API_URL=/api

# Trailing slash (works but not recommended)
NEXT_PUBLIC_API_URL=https://robohatchapi-production.up.railway.app/

# Including /api path (wrong!)
NEXT_PUBLIC_API_URL=https://robohatchapi-production.up.railway.app/api

# Mixed domains (malformed!)
NEXT_PUBLIC_API_URL=https://robohatch-platform-web.vercel.app/robohatchapi-production.up.railway.app
```

### ✅ CORRECT Example:

```bash
NEXT_PUBLIC_API_URL=https://robohatchapi-production.up.railway.app
```

## How to Find Your Railway API URL

1. Go to https://railway.app/dashboard
2. Click on your API project
3. Click on **Settings** tab
4. Look for **Public Networking** or **Domains** section
5. Copy the domain (should end with `.railway.app`)
6. Add `https://` in front

**Example:**
- Railway shows: `robohatchapi-production.up.railway.app`
- You set in Vercel: `https://robohatchapi-production.up.railway.app`

## Still Not Working?

### Check Vercel Build Logs

1. Go to Vercel → Deployments
2. Click on latest deployment
3. Click **View Build Logs**
4. Search for "NEXT_PUBLIC_API_URL"
5. Should see the correct URL being used during build

### Check Runtime Logs

1. Go to Vercel → Deployments
2. Click **Runtime Logs** tab
3. Look for errors related to API calls

### Hard Refresh Browser

After fixing the environment variable:
- Chrome/Edge: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
- Firefox: `Ctrl + F5`
- Safari: `Cmd + Option + R`

## Prevention

To prevent this in the future:

1. **Always use absolute URLs** for external APIs
2. **Always include protocol** (`https://` or `http://`)
3. **Test environment variables** immediately after deployment
4. **Check browser console** on every deployment

## Quick Test Command

After setting the variable, you can test it works by deploying and running this in browser console:

```javascript
// This should return your Railway API URL
fetch(process.env.NEXT_PUBLIC_API_URL + '/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

Expected response:
```json
{"status":"OK","environment":"production","timestamp":"..."}
```

## Summary Checklist

- [ ] Environment variable `NEXT_PUBLIC_API_URL` is set in Vercel
- [ ] Value starts with `https://`
- [ ] Value is ONLY the Railway domain
- [ ] No trailing slash
- [ ] Applied to Production, Preview, and Development environments
- [ ] Redeployed after setting variable
- [ ] Browser console shows correct API URL
- [ ] Network requests go to Railway domain, not Vercel domain
- [ ] Login works without 405 error

---

**CRITICAL:** The environment variable MUST be an absolute URL with protocol. Without `https://`, the browser treats it as a relative path and appends it to the current page URL, causing the exact error you're experiencing.
