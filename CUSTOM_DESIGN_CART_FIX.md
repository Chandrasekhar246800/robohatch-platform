# Custom Design Cart Integration Fix

## Problem

When users uploaded a 3D design and clicked "Add to Cart", the product wasn't appearing in the cart. The issue was:

1. Frontend created a product object using `customDesign.id` 
2. Backend cart API validated the product exists with `prisma.product.findUnique({ where: { id: productId } })`
3. This failed because custom design IDs don't exist in the Product table
4. Backend returned "Product not found" error (404)
5. Frontend cart removed the item

## Solution

Create a real Product record for each custom design after STL analysis completes. This integrates custom designs into the existing cart/order system seamlessly.

## Changes Made

### Backend Changes

#### 1. Custom Design Controller (`apps/api/src/controllers/customDesign.controller.ts`)

After creating a `CustomDesign` record, we now also create a `Product` record:

```typescript
// Create a Product for this custom design so it can be added to cart
// Store the customDesignId in the description for reference
const product = await prisma.product.create({
  data: {
    name: `Custom 3D Print: ${name}`,
    description: `[CUSTOM_DESIGN:${customDesign.id}] ${description || ...}`,
    price: estimatedPrice,
    stock: quantityInt, // Each custom design is unique
    isActive: true,
  },
});
```

**Key details:**
- Product name: `"Custom 3D Print: {user's design name}"`
- Product description: Contains `[CUSTOM_DESIGN:{id}]` prefix to link back to custom design
- Price: Uses the calculated estimated price from PrusaSlicer analysis
- Stock: Set to the quantity ordered (custom designs are unique items)
- The `productId` is returned in the API response: `customDesign.productId`

#### 2. API Response Structure

The `POST /api/custom-designs/upload` endpoint now returns:

```json
{
  "success": true,
  "message": "Custom design request submitted successfully",
  "customDesign": {
    "id": "custom-design-uuid",
    "productId": "product-uuid",  // NEW: Product ID for cart operations
    "name": "...",
    "estimatedPrice": 250,
    ...
  },
  "pricing": {
    "accurate": true,
    "final_price": 250,
    "filament_grams": 45.2,
    "print_time_seconds": 3600
  }
}
```

### Frontend Changes

#### 1. Upload Page State (`apps/web/src/app/upload-3d-file/page.tsx`)

Added new state to store the product ID:

```typescript
const [productId, setProductId] = useState<string | null>(null);
```

#### 2. Response Handling

Extract and store the product ID from the API response:

```typescript
// Store product ID for cart operations
if (result.customDesign?.productId) {
  setProductId(result.customDesign.productId);
}
```

#### 3. Add to Cart Button

Use the `productId` instead of `customDesignId`:

```typescript
onClick={async () => {
  if (!backendPrice || !productId) {
    toast.error('Product not ready. Please try uploading again.');
    return;
  }
  
  const customProduct: Product = {
    id: productId, // Use the created product ID
    name: formData.name,
    price: backendPrice,
    ...
  };
  
  await addItem(customProduct, formData.quantity, isAuthenticated);
  router.push('/cart');
}
```

## Benefits

1. **Seamless Integration**: Custom designs work with existing cart/order system
2. **No Schema Changes Required**: Works with current database permissions
3. **Trackable**: Product records allow order tracking and history
4. **Stock Management**: Each custom design has quantity-based stock
5. **Future-Proof**: Can easily add images, categories, or other product features later

## Testing

To test the fix:

1. Go to `/upload-3d-file`
2. Upload an STL file with details (name, material, color)
3. Wait for PrusaSlicer analysis to complete
4. Click "Add to Cart"
5. Verify the product appears in `/cart` with correct details
6. Proceed to checkout and place order

## Database State

No schema migrations were required since we don't have ALTER permissions on the production database. Instead:

- Custom designs are stored in the `CustomDesign` table (existing)
- Products are created in the `Product` table (existing)
- Link is maintained via `[CUSTOM_DESIGN:{id}]` prefix in product description
- Future: If we get ALTER permissions, we can add a `productId` foreign key to `CustomDesign`

## Deployment

Both frontend (Vercel) and backend (Railway) need to be redeployed for this fix:

```bash
# Frontend automatically deploys on push to main
# Backend deploys via Railway on push to main

git add .
git commit -m "Fix: Create Product records for custom designs to enable cart integration"
git push origin main
```

## Related Files

- `apps/api/src/controllers/customDesign.controller.ts` - Product creation logic
- `apps/web/src/app/upload-3d-file/page.tsx` - Frontend UI and cart integration
- `apps/api/src/services/cart.service.ts` - Cart validation (unchanged)
- `apps/api/src/controllers/cart.controller.ts` - Cart controller (unchanged)
