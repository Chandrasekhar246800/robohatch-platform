# Remove Mock Data & Add Real Products - Step-by-Step Guide

## 🎯 Goal
Remove all Unsplash placeholder products and add real RoboHatch products through the admin panel.

---

## Step 1: Clear Mock Products from Database

Run this command to remove all placeholder products:

```bash
cd apps/api
npx tsx prisma/clear-products.ts
```

**What this does:**
- ✅ Deletes all product images
- ✅ Deletes product-category relationships  
- ✅ Deletes cart items (if any)
- ✅ Deletes all products
- ✅ Keeps categories intact

**Verify it worked:**
```bash
npx tsx check-products.ts
```
Should show: `Total Products: 0`

---

## Step 2: Prepare Your Product Photos

**Before uploading, gather:**

1. **Real product photos** (not stock images from Unsplash)
2. **Image requirements:**
   - Format: JPG, PNG, or WebP
   - Minimum: 800x800 pixels
   - Recommended: 1200x1200 pixels
   - File size: < 5MB per image
   - Multiple angles: 2-4 images per product

3. **Product information for each:**
   - Product name
   - Detailed description (150-300 words)
   - Price in INR
   - Stock quantity
   - Category

---

## Step 3: Start Servers & Access Admin Panel

```bash
# Terminal 1 - API Server
cd apps/api
npm run dev

# Terminal 2 - Web Server  
cd apps/web
npm run dev
```

Then visit: http://localhost:3000/admin/products/add

---

## Step 4: Upload Your First Product

**Example: Custom Name Keychain**

1. **Product Name:** `Custom Name Keychain`

2. **Description:**
   ```
   Personalized 3D printed keychain with your name or text. Made from premium PLA material - durable, lightweight, and eco-friendly. Available in multiple vibrant colors including red, blue, green, yellow, and black. Perfect gift for friends, family, or corporate giveaways.

   Features:
   • Maximum 10 characters
   • High-quality 3D printing
   • Sturdy keyring attachment
   • Smooth finish
   • Lightweight (15g)
   • Dimensions: 5cm x 3cm x 0.5cm

   Processing time: 2-3 business days
   ```

3. **Price:** `149`

4. **Stock:** `50`

5. **Category:** Check ☑️ Keychains

6. **Images:** Upload 2-4 real photos of your keychains

7. **Click "Add Product"**

---

## Step 5: Add More Products

**Recommended for launch:**

| Category | Examples | Minimum |
|----------|----------|---------|
| **Keychains** | Custom Name, Logo, Models | 3-5 |
| **Lamps** | Moon, Photo, Geometric | 2-3 |
| **Anime Things** | Figurines, Stands | 2-3 |
| **Devotional Idols** | Ganesha, Buddha | 2-3 |
| **Mobile Accessories** | Stands, Holders | 2-3 |
| **TOTAL** | | **12-17** |

---

## Step 6: Verify on Frontend

Visit http://localhost:3000/products

**Check:**
- ✅ All products show with real images
- ✅ Prices display correctly
- ✅ Categories filter works
- ✅ Product details page loads
- ✅ "Add to Cart" works

---

## ⚠️ Common Mistakes to Avoid

| ❌ Don't | ✅ Do |
|---------|-------|
| Use stock images | Upload real photos |
| Generic descriptions | Unique details |
| Unrealistic prices | Cost + profit |
| All 0 stock | Real inventory |
| Vague names | Specific names |
| Low-res images | 800x800px+ |

---

## ✅ Quality Checklist

Before publishing each product:

- [ ] Real product photo (not placeholder)
- [ ] Multiple angles (2-4 images)
- [ ] Detailed description (150+ words)
- [ ] Accurate pricing
- [ ] Realistic stock
- [ ] Correct category
- [ ] Features list
- [ ] Dimensions specified
- [ ] Material mentioned
- [ ] Processing time stated

---

## 🚀 After Adding Products

1. **Test complete flow:**
   - Browse products
   - View product details
   - Add to cart
   - Complete checkout (test mode)

2. **Deploy to production:**
   - Push to GitHub
   - Vercel auto-deploys frontend
   - Railway auto-deploys backend

3. **Verify production site:**
   - Check all products display
   - Test checkout flow
   - Verify images load

---

## 💡 Quick Tips

**Photography:**
- Natural lighting near window
- White background or clean surface
- Multiple angles for trust
- Show scale with common items

**Descriptions:**
- Start with benefit (not features)
- Be specific about dimensions
- Mention use cases
- Include care instructions

**Pricing:**
- Material + Time + Overhead + Profit
- Check competitor prices
- Use ₹149, ₹299, ₹499 endings

---

## Success Criteria

Ready when you have:

- [ ] 12-17 real products added
- [ ] All real photos (0 placeholders)
- [ ] Detailed descriptions
- [ ] Accurate pricing
- [ ] Realistic stock
- [ ] Mobile tested
- [ ] Test order completed

---

**Estimated time:** 3-6 hours for 12-15 products with photos

**Ready?** Run the clear command and start uploading! 🚀
