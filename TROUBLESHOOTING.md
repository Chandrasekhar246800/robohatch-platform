# Deployment Troubleshooting Guide

## Common Frontend Errors and Solutions

### 1. "HTTP 405: Request timeout. Please try again."

**Causes:**
- CORS preflight request timeout
- API server not responding
- Wrong API URL in Vercel environment variables
- Network/firewall blocking requests

**Solutions:**

#### Check API URL in Vercel
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Verify `NEXT_PUBLIC_API_URL` is set correctly
3. Example: `https://robohatch-api-production.up.railway.app`
4. **Important:** No trailing slash!
5. Redeploy after changing environment variables

#### Check Railway API is Running
1. Go to Railway Dashboard → Your API Project
2. Check the deployment logs for errors
3. Visit your API health endpoint: `https://your-api.railway.app/health`
4. Should return: `{"status":"OK","environment":"production","timestamp":"..."}`

#### Verify CORS Configuration in Railway
1. Railway Dashboard → Your API Project → Variables
2. Ensure `ALLOWED_ORIGINS` includes your Vercel domain:
   ```
   ALLOWED_ORIGINS=https://your-app.vercel.app,https://*.vercel.app
   ```
3. If using custom domain, add it too:
   ```
   ALLOWED_ORIGINS=https://your-app.vercel.app,https://custom-domain.com
   ```

### 2. "Unexpected end of JSON input"

**Causes:**
- API returning empty response
- CORS blocking the response body
- API error without proper JSON response

**Solutions:**
- Check Railway logs for API errors
- Verify DATABASE_URL is configured
- Check JWT_SECRET is set
- Review API CORS configuration

### 3. "Failed to fetch" or "Network error"

**Causes:**
- API is down
- Wrong API URL
- CORS misconfiguration
- Railway service sleeping (free tier)

**Solutions:**
1. **Test API directly:**
   ```bash
   curl https://your-api.railway.app/health
   ```

2. **Check Railway logs:**
   - Look for startup errors
   - Verify database connection
   - Check for missing environment variables

3. **Wake up Railway service:**
   - Railway free tier may sleep after inactivity
   - Visit the API URL directly to wake it up

### 4. "CORS policy: No 'Access-Control-Allow-Origin' header"

**Causes:**
- `ALLOWED_ORIGINS` not configured in Railway
- Vercel preview deployment URL not in allowed origins
- Typo in domain name

**Solutions:**
1. **For production:**
   ```
   ALLOWED_ORIGINS=https://your-app.vercel.app
   ```

2. **For preview deployments:**
   ```
   ALLOWED_ORIGINS=https://your-app.vercel.app,https://*.vercel.app
   ```

3. **For development (UNSAFE for production):**
   ```
   ALLOWED_ORIGINS=http://localhost:3000,https://your-app.vercel.app,https://*.vercel.app
   ```

## Debugging Steps

### 1. Open Browser DevTools (F12)

**Network Tab:**
- Look for red failed requests
- Click on a failed request
- Check:
  - Request URL (is it correct?)
  - Request Method
  - Status Code
  - Response headers (look for CORS headers)
  - Response body (error message)

**Console Tab:**
- Look for error messages
- Check for CORS errors
- Note the exact error message

### 2. Check API Logs in Railway

1. Railway Dashboard → Your API Project → Deployments
2. Click on the latest deployment
3. View logs for:
   - Startup errors
   - Database connection errors
   - CORS blocked requests (look for `⚠️  CORS blocked`)
   - Missing environment variables

### 3. Test API Health Endpoint

Open in browser or use curl:
```bash
curl https://your-api.railway.app/health
```

Expected response:
```json
{"status":"OK","environment":"production","timestamp":"2026-02-09T10:30:00.000Z"}
```

### 4. Test Categories Endpoint

```bash
curl https://your-api.railway.app/api/categories
```

Expected response:
```json
{"success":true,"data":[...]}
```

## Environment Variables Checklist

### Railway (API) - Required:
- ✅ `NODE_ENV=production`
- ✅ `DATABASE_URL` (auto-provided by MySQL plugin)
- ✅ `JWT_SECRET` (use: `openssl rand -hex 32`)
- ✅ `ALLOWED_ORIGINS` (your Vercel URL)
- ✅ `AWS_ACCESS_KEY_ID`
- ✅ `AWS_SECRET_ACCESS_KEY`
- ✅ `AWS_REGION`
- ✅ `AWS_S3_BUCKET`

### Vercel (Frontend) - Required:
- ✅ `NEXT_PUBLIC_API_URL` (your Railway API URL)

## Quick Fixes

### Reset and Redeploy Everything

1. **Railway:**
   ```bash
   # Trigger a new deployment
   git commit --allow-empty -m "Redeploy API"
   git push
   ```

2. **Vercel:**
   - Go to Deployments tab
   - Click "..." on latest deployment
   - Click "Redeploy"

### Test Locally First

1. **Start API locally:**
   ```bash
   cd apps/api
   npm install
   npm run dev
   ```

2. **Start Web locally:**
   ```bash
   cd apps/web
   npm install
   npm run dev
   ```

3. **Test the connection:**
   - Open http://localhost:3000
   - Check if products/categories load
   - If it works locally, issue is with deployment config

## Still Having Issues?

1. **Check browser console** for exact error messages
2. **Check Railway logs** for API errors
3. **Verify environment variables** are set correctly
4. **Test API endpoints directly** with curl
5. **Check ALLOWED_ORIGINS** includes your exact Vercel URL
6. **Ensure no trailing slashes** in URLs
