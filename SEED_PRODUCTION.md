# Seed Production Database (Railway)

## Quick Fix - Seed Railway Database

Your Railway API is deployed but the database doesn't have categories yet. Follow these steps:

### Option 1: Using Railway Dashboard (Easiest)

1. **Go to Railway Dashboard**
   - Visit: https://railway.app/dashboard
   - Select your `robohatch-api` project

2. **Open Railway Shell**
   - Click on your API service
   - Go to the **"Settings"** or **"Deployments"** tab
   - Look for **"Command"** or **"Shell"** option
   - OR click on the latest deployment and find "View Logs" then "Shell"

3. **Run Seed Command**
   ```bash
   npm run seed
   ```

4. **Verify**
   - Check the output shows: ✅ Created/Updated 14 categories
   - Test your deployed frontend

---

### Option 2: Using Railway CLI (If installed)

1. **Install Railway CLI** (if not installed)
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**
   ```bash
   railway login
   ```

3. **Link to your project**
   ```bash
   railway link
   ```
   - Select your robohatch API project

4. **Run Seed Command**
   ```bash
   railway run npm run seed
   ```

---

### Option 3: Trigger via Re-deployment

If Railway is configured to run migrations on deployment:

1. Go to Railway Dashboard
2. Click on your API service
3. Click **"Redeploy"** or push a new commit
4. Make sure your `package.json` has a `postdeploy` script:
   ```json
   {
     "scripts": {
       "postdeploy": "npx prisma db push && npm run seed"
     }
   }
   ```

---

## Verify Categories Were Created

After seeding, test the endpoint:

```bash
curl https://robohatchapi-production.up.railway.app/api/categories
```

You should see 14 categories returned (5 Custom + 9 Default).

---

## Note

Your **local database** (AWS RDS) already has categories - that's why localhost works.
Your **Railway production database** is separate and needs its own seeding.

---

## Future Deployments

To automatically seed on every deployment, add this to `apps/api/package.json`:

```json
{
  "scripts": {
    "build": "prisma generate && tsc",
    "start": "node dist/server.js",
    "postinstall": "prisma generate",
    "deploy": "prisma db push && npm run seed"
  }
}
```

Then set Railway's **Start Command** to:
```bash
npm run deploy && npm start
```
