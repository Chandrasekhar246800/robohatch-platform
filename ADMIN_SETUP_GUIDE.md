# 🎯 Admin Setup Guide - Products Management

## Overview

The admin panel provides a streamlined workflow for managing products. Categories are **automatically seeded** during database setup, so you can start adding products immediately after the initial migration.

---

## 📋 Quick Start

### 1. First Time Setup (After Fresh Database)

1. **Run Database Migration & Seed**
   ```bash
   cd apps/api
   npm run prisma:migrate
   npm run prisma:seed
   ```

   This will:
   - Create database tables
   - Create admin user: `Admin@robohatch.in`
   - Create all 14 categories (5 Custom + 9 Default)

2. **Login to Admin Panel**
   - Go to: `http://localhost:3000/login`
   - Email: `Admin@robohatch.in`
   - Password: `Admin@123456789090`

3. **Start Adding Products**
   - Click **"Add New Product"** button in the Products tab
   - Or go to: `http://localhost:3000/admin/products/add`
   - Categories are already available in the form

---

## 📦 Categories Structure

The system includes **14 predefined categories** automatically created during seed:

### 🎨 Custom Categories (5)
Products that require personalization:
- **Keychains (Custom)** - Personalized keychains with your design
- **Logo Keychains** - Custom keychains with your logo
- **Moon Lamps** - Personalized moon lamps with photos
- **Photo Frames** - Custom 3D printed photo frames
- **Self Miniatures** - Miniature figures of yourself

### 🏪 Default Categories (9)
Ready-made products:
- **Keychains** - Ready-made 3D printed keychains
- **Lamps** - Decorative 3D printed lamps
- **Anime Things** - Anime character figures and accessories
- **Desk Accessories** - Organizers, pen holders, and desk items
- **Devotional Idols** - Religious idols and figurines
- **Fidget Toys** - Stress relief and fidget toys
- **Flower Pots & Vases** - 3D printed planters and vases
- **Mobile Accessories** - Phone stands, cases, and holders
- **Temple Models** - Miniature temple replicas

---

## 🔧 Admin Panel Features

### 🏠 Main Admin Dashboard (`/admin`)

#### Products Tab
- **Add New Product** - Create products with images and category selection
- **Product List** - View all products with search and filters

#### Dashboard Tab
- View recent orders
- See product statistics
- Monitor inventory status

#### Orders Tab
- Manage customer orders
- Update order status
- View order details

#### Upload Approvals Tab
- Review custom design uploads
- Approve or reject submissions

---

### 📝 Add Product Page (`/admin/products/add`)

Complete product creation form with:

#### 1. Product Details
- **Name** - Product name (required)
- **Description** - Detailed product description
- **Price** - Product price in ₹ (required)

#### 2. Category Selection (required)
Categories are automatically loaded from the database and displayed in two sections:
- **Custom Categories** (highlighted in gold)
- **Default Categories** (in gray)

✅ Multiple categories can be selected
✅ At least one category is required

#### 3. Image Upload (required)
- Upload up to **10 images**
- Supported formats: PNG, JPG, WEBP
- Maximum size: **5MB per image**
- Images are stored in AWS S3
- First image becomes the primary product image

#### 4. Validation
The form validates:
- Product name is not empty
- Price is a positive number
- At least one category is selected
- At least one image is uploaded

---

## 🔄 Workflow Example

### First Time Setup
```
1. Run migrations & seed → 2. Login → 3. Add products
```

### Daily Usage
```
1. Login to admin panel → 2. Products Tab → 3. Add New Product →
4. Fill details → 5. Select categories → 6. Upload images →
7. Create Product
```

---

## 🚀 API Endpoints

### Public Endpoints
- `GET /api/categories` - Get all categories (sorted: CUSTOM first, then DEFAULT)
- `GET /api/products` - Get all products with categories
- `GET /api/products/:id` - Get single product details

### Admin Endpoints (require authentication + admin role)
- `POST /api/admin/products` - Create product (with file upload)

---

## 📊 Database Schema

### Category Model
```prisma
model Category {
  id          String       @id @default(uuid())
  name        String       @unique
  type        CategoryType @default(DEFAULT)
  slug        String?      @unique
  description String?      @db.Text
  createdAt   DateTime     @default(now())
  products    ProductCategory[]
}

enum CategoryType {
  DEFAULT  // Ready-made products
  CUSTOM   // Personalized products
}
```

### Product-Category Relationship
- **Many-to-Many** - Each product can have multiple categories
- **ProductCategory** junction table manages the relationship
- Categories are sorted: CUSTOM first, then DEFAULT alphabetically

---

## ✅ Features Implemented

### ✨ Category Management
- [x] Predefined categories (5 Custom + 9 Default)
- [x] Category types (CUSTOM/DEFAULT)
- [x] Auto-seeded with database initialization
- [x] Categories grouped by type in product form

### 📦 Product Management
- [x] Create products with multiple images
- [x] Multi-category selection per product
- [x] Image upload to AWS S3
- [x] Form validation
- [x] Product listing
- [x] Category filtering

### 🔒 Security
- [x] Admin authentication required
- [x] Role-based access control (ADMIN only)
- [x] JWT token authentication
- [x] Protected API routes

---

## 🎓 User Access

### For Customers
- Browse products by category
- View products in CUSTOM categories (for personalized orders)
- View products in DEFAULT categories (for ready-made purchases)
- Filter products by category type
- Add products to cart and checkout

### For Admin
- Full CRUD on categories and products
- Seed categories on first setup
- Upload product images
- Manage orders and uploads
- Update product inventory

---

## 📝 Important Notes

1. **Auto-Seeding**: Categories are automatically created when you run `npm run prisma:seed`. No manual setup required.

2. **Fixed Categories**: The 14 categories are predefined and managed through the seed script. They cannot be added or removed via the admin UI.

3. **Custom vs Default**: The distinction between CUSTOM and DEFAULT categories helps users understand which products can be personalized.

4. **Multiple Categories**: Products can belong to multiple categories (e.g., a custom keychain could be in both "Keychains (Custom)" and "Logo Keychains").

---

## 🐛 Troubleshooting

### Categories not showing?
1. Check if you've run the seed script: `npm run prisma:seed`
2. Verify API is running: `http://localhost:5000/api/categories`
3. Check browser console for errors
4. Verify authentication token is valid

### Can't add products?
1. Ensure you're logged in as admin
2. Check if categories exist (run seed operation)
3. Verify all required fields are filled
4. Check file sizes (max 5MB per image)
5. Ensure at least one category is selected

### Images not uploading?
1. Verify AWS S3 credentials in `.env`
2. Check file formats (PNG, JPG, WEBP only)
3. Ensure file sizes are under 5MB
4. Check API logs for upload errors

---

## 🔗 Quick Links

- **Admin Dashboard**: `http://localhost:3000/admin`
- **Add Product**: `http://localhost:3000/admin/products/add`
- **API Documentation**: See `ADMIN_PRODUCT_UPLOAD_GUIDE.md`

---

## 📞 Support

For issues or questions:
1. Check existing documentation in project root
2. Review API logs: `apps/api/logs`
3. Check browser console for frontend errors
4. Verify environment variables are set correctly

---

**Last Updated**: February 11, 2026
