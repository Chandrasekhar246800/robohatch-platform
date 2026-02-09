# Vercel Deployment Guide

## Environment Variables Setup

### Required Environment Variable

Add this in your Vercel project settings:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables

2. Add the following variable:

   **Variable Name:** `NEXT_PUBLIC_API_URL`
   
   **Value:** Your Railway API URL (e.g., `https://robohatch-api.railway.app`)
   
   **Environments:** Select `Production`, `Preview`, and `Development`

### Important Notes

- The `NEXT_PUBLIC_` prefix makes the variable available in the browser
- Do NOT add any sensitive keys with `NEXT_PUBLIC_` prefix
- After adding variables, redeploy your project

## Verifying the Configuration

### 1. Check Build Logs

In Vercel dashboard → Deployments → Latest deployment → Build logs

Look for:
```
✓ Compiled successfully
✓ Collecting page data
✓ Generating static pages
```

### 2. Check Runtime Logs

After deployment, check the browser console on your deployed site:

You should see:
```
[API Client] Base URL: https://your-railway-api.railway.app
```

If you see `http://localhost:5000`, the environment variable is not set correctly.

### 3. Test API Connection

Open browser console on your deployed Vercel site and run:

```javascript
console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);
```

Or check the Network tab to see which URLs are being called.

## Common Issues

### Issue: API calls go to localhost

**Symptom:** Browser console shows `[API Client] Base URL: http://localhost:5000`

**Solution:**
1. Add `NEXT_PUBLIC_API_URL` in Vercel environment variables
2. Make sure it's enabled for `Production` environment
3. Trigger a new deployment (Deployments → ⋮ → Redeploy)

### Issue: CORS errors in production

**Symptom:** 
```
Access to fetch at 'https://...' from origin 'https://your-app.vercel.app' 
has been blocked by CORS policy
```

**Solution:**
1. Add your Vercel URL to Railway's `ALLOWED_ORIGINS` variable:
   ```
   ALLOWED_ORIGINS=https://your-app.vercel.app,https://*.vercel.app
   ```
2. Redeploy Railway API
3. Clear browser cache and try again

### Issue: Build fails with module errors

**Symptom:**
```
Module not found: Can't resolve 'react'
Type errors in source code
```

**Solution:**
1. Check that all dependencies are in package.json
2. Ensure `package-lock.json` is committed to git
3. Try local build first: `npm run build`
4. If local build works, push to git and redeploy

## Deployment Commands

### Manual Redeploy

```bash
# On Vercel CLI
vercel --prod

# Or use Git
git add .
git commit -m "trigger redeploy"
git push
```

### Force Fresh Build

In Vercel dashboard:
1. Go to Deployments
2. Click latest deployment → ⋮ → Redeploy
3. Check "Use existing Build Cache" → OFF
4. Click "Redeploy"

## Turbo Monorepo Configuration

This project uses Turborepo. Vercel should automatically detect it.

If build fails:
1. Check that `turbo.json` is in the root
2. Verify root `package.json` has:
   ```json
   {
     "packageManager": "npm@10.2.4",
     "devDependencies": {
       "turbo": "2.8.3"
     }
   }
   ```

## Build Settings in Vercel

Recommended settings:

- **Framework Preset:** Next.js
- **Root Directory:** `apps/web`
- **Build Command:** Leave empty (auto-detected)
- **Install Command:** Leave empty (auto-detected)
- **Output Directory:** Leave empty (auto-detected)

Vercel will automatically use Turbo for the build.

## Testing the Deployment

### 1. Homepage Test
Visit `https://your-app.vercel.app`

Should load without errors.

### 2. API Connection Test
Visit `https://your-app.vercel.app/products`

Open browser console:
- Check for `[API] Requesting: https://...` logs
- Check for `[API] Response: 200 OK` logs
- Check Network tab for successful API calls

### 3. Full Flow Test
1. Visit homepage
2. Navigate to products page
3. Check browser console for any errors
4. Verify products load correctly

## Monitoring

### Check Vercel Analytics
1. Go to your project dashboard
2. Click "Analytics" tab
3. View:
   - Page views
   - Performance metrics
   - Error rates

### Check Browser Console
Always check browser console on production:
```
F12 → Console tab
```

Common log messages:
- ✅ `[API Client] Base URL: https://...railway.app`
- ✅ `[API] Response: 200 OK`
- ❌ `Failed to fetch`
- ❌ `Request timeout`

## Troubleshooting Checklist

- [ ] `NEXT_PUBLIC_API_URL` is set in Vercel
- [ ] Value is your Railway API URL (not localhost)
- [ ] Variable is enabled for Production environment
- [ ] Latest deployment is using the variable (check build logs)
- [ ] Railway API `ALLOWED_ORIGINS` includes your Vercel URL
- [ ] Railway API `/health` endpoint responds with 200 OK
- [ ] Browser console shows correct API URL
- [ ] No CORS errors in browser console
- [ ] Network tab shows successful API requests

## Support

If issues persist:
1. Check Vercel status: https://www.vercel-status.com
2. Review build and runtime logs in Vercel dashboard
3. Test Railway API independently (see RAILWAY_TROUBLESHOOTING.md)
4. Check browser console for specific error messages
