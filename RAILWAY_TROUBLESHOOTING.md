# Railway Deployment Troubleshooting Guide

## Common Issues and Solutions

### 1. 405 Method Not Allowed / CORS Errors

**Symptoms:**
- `HTTP 405: Method Not Allowed`
- `Request timeout. Please try again.`
- CORS policy errors in browser console

**Solutions:**

#### Check ALLOWED_ORIGINS in Railway
The API needs to know which frontend origins to allow. 

1. Go to your Railway project → API service → Variables
2. Add or update `ALLOWED_ORIGINS`:
   ```
   ALLOWED_ORIGINS=https://your-app.vercel.app,https://*.vercel.app
   ```
3. If you have a custom domain:
   ```
   ALLOWED_ORIGINS=https://your-app.vercel.app,https://yourdomain.com,https://*.vercel.app
   ```

#### Verify API is Running
Check your Railway API health endpoint:
```
https://your-railway-api.railway.app/health
```
Should return:
```json
{
  "status": "OK",
  "environment": "production",
  "timestamp": "2026-02-09T10:30:00.000Z"
}
```

### 2. Database Connection Issues

**Symptoms:**
- API crashes on startup
- 500 Internal Server Error
- "Cannot connect to database" errors

**Solutions:**

#### Add MySQL Database
1. In Railway project, click "New" → "Database" → "Add MySQL"
2. Railway will automatically inject `DATABASE_URL` variable
3. Or manually set:
   ```
   DATABASE_URL=mysql://username:password@host:port/database
   ```

#### Run Migrations
Railway should auto-run migrations, but if not:
1. In Railway → API service → Settings → Deploy
2. Add custom start command:
   ```
   npm run build && npx prisma migrate deploy && npm run start
   ```

### 3. Environment Variables Checklist

Required variables for Railway API deployment:

```bash
# ✅ CRITICAL - Must be set
DATABASE_URL=mysql://...  # Auto-set if Railway MySQL is added
JWT_SECRET=your-super-secret-jwt-key-minimum-32-chars
ALLOWED_ORIGINS=https://your-app.vercel.app,https://*.vercel.app

# ✅ AWS S3 (for image uploads)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=eu-north-1
AWS_S3_BUCKET=your-bucket-name

# ⚙️ OPTIONAL - Has defaults
NODE_ENV=production
PORT=5000  # Railway auto-sets this
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://your-app.vercel.app
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
BCRYPT_ROUNDS=10
```

### 4. Testing the Deployment

#### Test Health Endpoint
```bash
curl https://your-railway-api.railway.app/health
```

Expected: `200 OK` with JSON response

#### Test Categories Endpoint
```bash
curl https://your-railway-api.railway.app/api/categories
```

Expected: `200 OK` with categories array

#### Test CORS
Open browser console on your Vercel frontend and run:
```javascript
fetch('https://your-railway-api.railway.app/api/categories')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

If you see CORS errors, check `ALLOWED_ORIGINS` variable.

### 5. Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `Request timeout` | API not responding within 15s | Check Railway logs, verify API is running |
| `HTTP 405` | Method not allowed | Add `ALLOWED_ORIGINS` env var |
| `HTTP 404` | Route not found | Check API routes are properly configured |
| `HTTP 500` | Server error | Check Railway logs for stack trace |
| `Cannot connect to server` | Wrong API URL or API is down | Verify `NEXT_PUBLIC_API_URL` in Vercel |

### 6. Viewing Railway Logs

1. Go to Railway project → API service
2. Click "Deployments" tab
3. Click the latest deployment
4. View logs in real-time
5. Look for:
   - ✅ `Server started on port 5000`
   - ✅ `Database connected successfully`
   - ❌ `CORS blocked request from origin: ...`
   - ❌ `Critical environment variables are missing`

### 7. Quick Deploy Commands

If you need to redeploy:

```bash
# 1. Make changes locally
git add .
git commit -m "fix: your changes"
git push

# 2. Railway will auto-deploy from GitHub
# 3. Check deployment status in Railway dashboard
```

### 8. Rollback a Deployment

If the latest deployment breaks:

1. Go to Railway → API service → Deployments
2. Find the last working deployment
3. Click "⋮" → "Redeploy"

### 9. Contact Support

If issues persist:

1. Check Railway status: https://status.railway.app
2. Check Railway logs for specific errors
3. Verify all environment variables are set correctly
4. Test the API health endpoint directly
5. Check browser console for detailed error messages
