# Multi-Color Weight Calculation Implementation

**Date**: March 17, 2026  
**Objective**: Fix weight variance between Bambu and website by only including Tower + Purge for multi-color prints

---

## Problem Statement

**Before**: Website charged for ALL filament (model + support + tower + purge) regardless of print type  
**Result**: Single-color prints overcharged by 14.7% vs Bambu's calculation

**Example**: Leg Amputee.stl
- Bambu: 80.54g (model) + 13.33g (support) = **93.88g total**
- Website (old): 80.54g + 13.33g + 7g (tower) + 6.8g (purge) = **107.7g** ❌

---

## Solution: Conditional Tower + Purge Inclusion

**Logic**:
- User selects "Multi-Color" option → `isMultiColor = true` → Include tower + purge
- User selects single color → `isMultiColor = false` → Exclude tower + purge, match Bambu

---

## Files Modified

### 1. Frontend: Upload Form (`apps/web/src/app/upload-3d-file/page.tsx`)

#### Change 1: Add Multi-Color Option to Color Palette
```typescript
// BEFORE: Started with White
const colors = [
  { id: 'white', name: 'White', hex: '#FFFFFF' },
  ...
];

// AFTER: Multi-Color first, with gradient
const colors = [
  { id: 'multi-color', name: 'Multi-Color', hex: 'linear-gradient(45deg, #EF4444, #3B82F6, #10B981, #F59E0B)' },
  { id: 'white', name: 'White', hex: '#FFFFFF' },
  ...
];
```

#### Change 2: Render Gradient for Multi-Color Option
```typescript
// Updated color swatch rendering to handle both solid colors AND gradients
style={{ 
  background: color.hex.startsWith('linear-gradient') ? color.hex : undefined,
  backgroundColor: color.hex.startsWith('linear-gradient') ? undefined : color.hex
}}
```

#### Change 3: Pass `isMultiColor` Flag in Form Submission
```typescript
// BEFORE: No isMultiColor field
const result = await apiClient.upload3DDesign({
  file,
  name: formData.name,
  ...
});

// AFTER: Derive isMultiColor from color selection
const result = await apiClient.upload3DDesign({
  file,
  name: formData.name,
  ...,
  isMultiColor: formData.color === 'multi-color',
  ...
});
```

---

### 2. API Client (`apps/web/src/lib/api-client.ts`)

#### Updated Type Signature & FormData Handling
```typescript
// BEFORE: No isMultiColor in type
async upload3DDesign(data: {
  file: File;
  name: string;
  ...,
  color: string;
  quantity: number;
  ...
})

// AFTER: Added optional isMultiColor field
async upload3DDesign(data: {
  file: File;
  name: string;
  ...,
  color: string;
  isMultiColor?: boolean;
  quantity: number;
  ...
})

// And in FormData construction:
if (data.isMultiColor !== undefined) {
  formData.append('isMultiColor', data.isMultiColor.toString());
}
```

---

### 3. Backend Controller (`apps/api/src/controllers/customDesign.controller.ts`)

#### Change 1: Update Validation Schema
```typescript
// BEFORE: No isMultiColor field
const customDesignInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  ...,
  quantity: z.coerce.number().int().min(1).max(1000).default(1),
  infillPercentage: z.coerce.number().min(5).max(100).optional(),
  ...
});

// AFTER: Added isMultiColor as coerced boolean (default false)
const customDesignInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  ...,
  quantity: z.coerce.number().int().min(1).max(1000).default(1),
  isMultiColor: z.coerce.boolean().default(false),
  infillPercentage: z.coerce.number().min(5).max(100).optional(),
  ...
});
```

#### Change 2: Extract `isMultiColor` from Parsed Request
```typescript
// BEFORE: No isMultiColor
const {
  name,
  description,
  material,
  color,
  size,
  quantity,
  infillPercentage,
  layerHeight,
} = parsedInput.data;

// AFTER: Extract isMultiColor
const {
  name,
  description,
  material,
  color,
  size,
  quantity,
  isMultiColor,
  infillPercentage,
  layerHeight,
} = parsedInput.data;
```

#### Change 3: Conditional Tower + Purge Weight Calculation
```typescript
// BEFORE: Always included tower + purge
const componentTotalWeight =
  (Number(slicerResult.modelWeight) || 0) +
  (Number(slicerResult.supportWeight) || 0) +
  (Number(slicerResult.towerWeight) || 0) +
  (Number(slicerResult.purgeWeight) || 0);

// AFTER: Only add tower + purge if isMultiColor is true
let componentTotalWeight =
  (Number(slicerResult.modelWeight) || 0) +
  (Number(slicerResult.supportWeight) || 0);

if (isMultiColor) {
  componentTotalWeight +=
    (Number(slicerResult.towerWeight) || 0) +
    (Number(slicerResult.purgeWeight) || 0);
}
```

#### Change 4: Conditional Weight Component Assignment
```typescript
// BEFORE: Always set exact values
const modelWtExact = slicerResult.modelWeight;
const supportWtExact = slicerResult.supportWeight;
const towerWtExact = slicerResult.towerWeight;
const purgeWtExact = slicerResult.purgeWeight;

// AFTER: Set tower/purge to 0 if single-color
const modelWtExact = slicerResult.modelWeight;
const supportWtExact = slicerResult.supportWeight;
const towerWtExact = isMultiColor ? slicerResult.towerWeight : 0;
const purgeWtExact = isMultiColor ? slicerResult.purgeWeight : 0;
```

#### Change 5: Enhanced Logging
```typescript
logger.info(`   📊 Weight Breakdown (isMultiColor: ${isMultiColor}):`);
logger.info(`      • Model: ${modelWtExact.toFixed(4)}g exact → ${modelWt}g DB (actual part)`);
logger.info(`      • Support: ${supportWtExact.toFixed(4)}g exact → ${supportWt}g DB`);
if (isMultiColor) {
  logger.info(`      • Tower: ${towerWtExact <= 0 ? 0 : towerWtExact.toFixed(4)}g exact → ${towerWt}g DB (wipe tower - INCLUDED)`);
  logger.info(`      • Purged: ${purgeWtExact <= 0 ? 0 : purgeWtExact.toFixed(4)}g exact → ${purgeWt}g DB (waste - INCLUDED)`);
} else {
  logger.info(`      • Tower: 0g (EXCLUDED - single color)`);
  logger.info(`      • Purged: 0g (EXCLUDED - single color)`);
}
logger.info(`   Multi-Color Selected: ${isMultiColor ? 'YES - Tower & Purge INCLUDED' : 'NO - Tower & Purge EXCLUDED'}`);
```

---

## Weight Calculation Flow

### Single-Color Print (Example: Leg Amputee)
```
User selects: White (or any single color)
↓
isMultiColor = false
↓
Weight Calculation:
  Model: 80.54g
  Support: 13.33g
  Tower: 0g (excluded)
  Purge: 0g (excluded)
  ─────────── 
  TOTAL: 93.88g ✓ Matches Bambu!
```

### Multi-Color Print (Example: Rainbow Vase)
```
User selects: Multi-Color
↓
isMultiColor = true
↓
Weight Calculation:
  Model: 45.20g
  Support: 8.15g
  Tower: 6.50g (included - color changeover waste)
  Purge: 4.80g (included - nozzle cleaning)
  ─────────── 
  TOTAL: 64.65g ✓ Includes operational costs!
```

---

## Testing Checklist

- [ ] **Deploy backend** to Railway
- [ ] **Deploy frontend** to Vercel
- [ ] Test **single-color upload** (e.g., white figurine):
  - Expected weight: ~94g (model + support only)
  - Should match Bambu's total
- [ ] Test **multi-color upload** (e.g., rainbow model):
  - Expected weight: Higher than Bambu (includes tower + purge)
  - Should show justified cost breakdown
- [ ] Verify UI:
  - Multi-Color option appears first in color picker with gradient
  - Price preview updates based on selection
- [ ] Check logs:
  - `isMultiColor` flag correctly logged
  - Weight breakdown shows inclusion/exclusion of tower + purge

---

## Deployment Steps

1. **Commit changes**:
   ```bash
   git add apps/web apps/api
   git commit -m "feat: add conditional tower+purge weight for multi-color prints"
   ```

2. **Push to main**:
   ```bash
   git push origin main
   ```

3. **Monitor Railway** (API):
   - Watch for `custom_design_slicing_complete` logs
   - Verify `isMultiColor` flag is being parsed

4. **Monitor Vercel** (Frontend):
   - Check build succeeds
   - Verify color picker displays Multi-Color gradient option

5. **Manual testing**:
   - Upload single-color file → expect 93.88g for Leg Amputee equivalent
   - Upload multi-color file → expect higher weight with clear breakdown
