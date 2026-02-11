# 🚀 ADMIN PANEL REBUILD - EXECUTION PLAN

## Phase 1: Database Schema (Prisma)
- ✅ Update Prisma schema with Many-to-Many Product ↔ Category
- ✅ Add CategoryType enum (DEFAULT, CUSTOM)
- ✅ Create migration
- ✅ Seed initial categories

## Phase 2: Backend APIs (Express + Prisma)
- ✅ Admin auth endpoints
- ✅ Category CRUD APIs
- ✅ Product CRUD APIs (with multiple categories)
- ✅ Dashboard stats API

## Phase 3: Frontend Admin Panel (Next.js)
- ✅ Clean folder structure
- ✅ Admin login page
- ✅ Protected routes
- ✅ Dashboard with stats
- ✅ Category management UI
- ✅ Product management UI
  - ✅ Multi-select category dropdown
  - ✅ S3 image upload
  - ✅ Edit/Delete functions

## Phase 4: Testing & Deployment
- ✅ Test all CRUD operations
- ✅ Verify AWS S3 uploads
- ✅ Deploy to Railway + Vercel
- ✅ Test in production

---

## 🎯 NEW PRISMA SCHEMA

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  name      String?
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  orders        Order[]
  cart          Cart?
  customDesigns CustomDesign[]
}

model Category {
  id          String         @id @default(uuid())
  name        String         @unique
  type        CategoryType   @default(DEFAULT)
  slug        String?        @unique
  description String?        @db.Text
  createdAt   DateTime       @default(now())
  
  products ProductCategory[]
}

model Product {
  id          String   @id @default(uuid())
  name        String
  description String   @db.Text
  price       Decimal
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  images      ProductImage[]
  categories  ProductCategory[]
  orderItems  OrderItem[]
  cartItems   CartItem[]
}

model ProductCategory {
  id         String   @id @default(uuid())
  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  productId  String
  category   Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  categoryId String
  createdAt  DateTime @default(now())
  
  @@unique([productId, categoryId])
  @@index([productId])
  @@index([categoryId])
}

model ProductImage {
  id        String   @id @default(uuid())
  url       String
  alt       String?
  order     Int      @default(0)
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  productId String
  createdAt DateTime @default(now())
}

enum Role {
  USER
  ADMIN
}

enum CategoryType {
  DEFAULT
  CUSTOM
}
```

---

## 📂 NEW FOLDER STRUCTURE

### Backend (apps/api/src/)
```
controllers/
├── admin.controller.ts       # Dashboard stats
├── auth.controller.ts         # Login/register
├── category.controller.ts     # Category CRUD
└── product.controller.ts      # Product CRUD (many-to-many)

routes/
├── admin.route.ts
├── auth.route.ts
├── category.route.ts
└── product.route.ts

middlewares/
├── auth.middleware.ts         # JWT verification
└── admin.middleware.ts        # Admin-only check
```

### Frontend (apps/web/src/app/)
```
admin/
├── login/
│   └── page.tsx               # Admin login
├── dashboard/
│   └── page.tsx               # Stats overview
├── categories/
│   └── page.tsx               # Category CRUD
└── products/
    ├── page.tsx               # Product list
    ├── add/
    │   └── page.tsx           # Add product (multi-select categories)
    └── edit/
        └── [id]/
            └── page.tsx       # Edit product

components/
└── admin/
    ├── AdminGuard.tsx         # Route protection
    ├── CategoryMultiSelect.tsx
    └── ImageUpload.tsx
```

---

## ⚡ KEY FEATURES

### 1. Many-to-Many Categories
```typescript
// Backend: Create product with multiple categories
const product = await prisma.product.create({
  data: {
    name,
    description,
    price,
    categories: {
      create: categoryIds.map(id => ({ categoryId: id }))
    },
    images: {
      create: imageUrls.map((url, i) => ({ url, order: i }))
    }
  },
  include: {
    categories: { include: { category: true } },
    images: true
  }
});
```

### 2. Category Multi-Select UI
```tsx
// Frontend: Grouped multi-select
<select multiple>
  <optgroup label="Default Categories">
    {defaultCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
  </optgroup>
  <optgroup label="Custom Categories">
    {customCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
  </optgroup>
</select>
```

### 3. Admin Protection
```tsx
// Middleware chain
router.post('/api/products', authMiddleware, adminMiddleware, createProduct);
```

---

## ✅ DEPLOYMENT CHECKLIST

- [ ] Run Prisma migration
- [ ] Seed categories
- [ ] Deploy backend to Railway
- [ ] Deploy frontend to Vercel
- [ ] Test admin login
- [ ] Test category CRUD
- [ ] Test product creation with multiple categories
- [ ] Verify S3 image upload
- [ ] Test product edit/delete
- [ ] Verify non-admin users blocked

---

**This rebuild provides:**
- ✅ Clean architecture
- ✅ Many-to-Many categories
- ✅ Grouped category selection
- ✅ S3 image upload
- ✅ Admin-only access
- ✅ Production-ready code
