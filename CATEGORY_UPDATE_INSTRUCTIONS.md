# Category Update & Custom Design Setup Instructions

## Overview
This guide walks you through updating the categories and enabling the custom design features.

## Step 1: Run Database Migration

Navigate to the API directory and run the migration:

```bash
cd apps/api
npx prisma migrate dev --name update_categories_and_custom_designs
```

This migration will:
- Add `type`, `slug`, and `description` fields to the Category model
- Create a new CustomDesign model for handling custom product requests
- Add CategoryType enum (DEFAULT, CUSTOM)
- Add CustomDesignStatus enum

## Step 2: Update Categories

After the migration completes, run the category update script:

```bash
cd apps/api
npx ts-node prisma/update-categories.ts
```

This will:
- Remove all old categories
- Create 14 new categories:
  
  **Custom Categories (5):**
  - Keychains (Custom)
  - Logo Keychains
  - Moon Lamps
  - Photo Frames
  - Self Miniatures
  
  **Default Categories (9):**
  - Keychains
  - Lamps
  - Flower Pots & Vases
  - Devotional Idols
  - Temple Models
  - Anime Things
  - Mobile Accessories
  - Desk Accessories
  - Fidget Toys

## Step 3: Regenerate Prisma Client

After migration, regenerate the Prisma client:

```bash
cd apps/api
npx prisma generate
```

## Step 4: Restart the API Server

Restart your API server to use the new schema:

```bash
cd apps/api
npm run dev
```

## Step 5: Test the New Features

### Frontend Pages Added:

1. **Custom Design Page** (`/custom-design`)
   - Multi-step form for requesting custom 3D printed products
   - Material, color, and size selection
   - Price estimation
   - Design details and notes

2. **Upload 3D File Page** (`/upload-3d-file`)
   - Upload STL, 3MF, OBJ, or GCODE files
   - Drag & drop support
   - Print settings configuration (material, color, infill, layer height)
   - Price estimation based on selections

3. **Navigation Updates**
   - Added "Custom Design" link in profile dropdown
   - Added "Upload 3D File" link in profile dropdown

### API Endpoints Added:

- `POST /api/custom-designs` - Submit custom design request
- `GET /api/custom-designs/my-designs` - Get user's custom designs
- `GET /api/custom-designs/:id` - Get specific custom design
- `GET /api/custom-designs` - Get all custom designs (Admin)
- `PATCH /api/custom-designs/:id/status` - Update design status (Admin)

## Features

### Custom Design Workflow:
1. User selects category (Custom type)
2. Provides design details and requirements
3. Chooses material, color, and size options
4. Submits request with estimated price
5. Admin reviews and provides quote
6. User approves and order begins production

### 3D File Upload Workflow:
1. User uploads their 3D file (.stl, .3mf, .obj, .gcode)
2. Configures print settings
3. Submits for printing
4. Admin reviews file and confirms price
5. Production begins after approval

## Database Schema

### Category Table:
```prisma
model Category {
  id          String       @id @default(uuid())
  name        String       @unique
  type        CategoryType @default(DEFAULT)
  slug        String?      @unique
  description String?      @db.Text
  createdAt   DateTime     @default(now())
  products    Product[]
}
```

### CustomDesign Table:
```prisma
model CustomDesign {
  id             String              @id @default(uuid())
  user           User                @relation(fields: [userId], references: [id])
  userId         String
  name           String
  description    String?             @db.Text
  material       String?
  color          String?
  size           String?
  quantity       Int                 @default(1)
  fileUrl        String?
  status         CustomDesignStatus  @default(PENDING)
  estimatedPrice Decimal?
  createdAt      DateTime            @default(now())
  updatedAt      DateTime            @updatedAt
}
```

## Troubleshooting

### Migration Fails
If migration fails, you can:
1. Reset the database: `npx prisma migrate reset`
2. Run the migration again
3. Run the category update script

### TypeScript Errors
After migration, if you see TypeScript errors:
1. Make sure Prisma client is regenerated: `npx prisma generate`
2. Restart your TypeScript server/IDE
3. Restart the dev server

### Categories Not Showing
1. Check if migration ran successfully
2. Verify category update script completed
3. Check API logs for errors
4. Verify database connection

## Next Steps

1. Upload product images to S3 for new categories
2. Create products for each category
3. Test custom design submission flow
4. Test 3D file upload flow
5. Configure admin panel to manage custom design requests

## Admin Tasks

Admins can now:
- View all custom design requests
- Update request status (PENDING → QUOTED → APPROVED → IN_PRODUCTION → COMPLETED)
- Set estimated prices for custom designs
- Review uploaded 3D files
- Manage custom vs default categories

## Notes

- Custom categories are for personalized items requiring user input
- Default categories are for ready-made products
- File uploads require S3 or file storage configuration
- Email notifications can be added for status updates
- Payment integration needed for custom orders
