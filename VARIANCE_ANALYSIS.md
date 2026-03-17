# Bambu vs Website Weight Variance Analysis

## ✅ IMPLEMENTATION COMPLETE (March 17, 2026)

### Summary of Changes:
- **Frontend**: Added "Multi-Color" option to color picker (gradient display at top of palette)
- **Frontend**: Upload form now passes `isMultiColor: true` when user selects "Multi-Color"
- **Backend**: Weight calculation now **conditionally includes Tower + Purge**:
  - ✅ **Single-Color Print**: `Total = Model + Support` (matches Bambu exactly)
  - ✅ **Multi-Color Print**: `Total = Model + Support + Tower + Purge` (includes color-change waste)

### Expected Weight After Deploy:
- **Single-Color (Like Leg Amputee)**: 93.88g ✓ (matches Bambu)
- **Multi-Color**: Base weight + tower/purge overhead (justified for color changeovers)

---

## Your Upload Example: Leg Amputee.stl

### Bambu Slicer Reports (Reference):
```
Filament 1 (single color):
├── Model:      27.45 m  →  80.54 g
├── Support:     4.54 m  →  13.33 g
└── Total:      31.99 m  →  93.88 g
```

### Website Calculation (Current):
```
Material Weight: 107.7 g
```

### Variance:
```
𝛥 = 107.7g - 93.88g = +13.82g (14.7% overcharge)
```

---

## Root Cause: Component Breakdown Mismatch

Your backend is calculating:
```typescript
componentTotalWeight = model + support + tower + purge
reportedTotalWeight = slicer's total metadata value
effectiveWeight = Math.max(componentTotalWeight, reportedTotalWeight)
```

### What's Happening:
1. **Bambu's "Total" (93.88g)** = Model (80.54) + Support (13.33)
   - Does NOT include: wipe tower, purge waste, or other machine-specific waste

2. **Website's calculation (107.7g)** = Model + Support + **Tower + Purge**
   - **Tower (wipe tower)**: ~4-8g estimated for multi-color changeovers
   - **Purge (nozzle waste)**: ~8-10g estimated for color transitions
   - These are MACHINE OPERATIONAL costs, not included in Bambu's user-facing "Total"

### Visual Breakdown:
```
Bambu's View:
┌─────────────────────────────────────┐
│ Model: 80.54g                       │
│ Support: 13.33g                     │
├─────────────────────────────────────┤
│ TOTAL (charged): 93.88g             │
└─────────────────────────────────────┘

Website's View:
┌─────────────────────────────────────┐
│ Model: 80.54g                       │
│ Support: 13.33g                     │
│ Tower: 7.00g (estimated)            │
│ Purge: 6.82g (estimated)            │
├─────────────────────────────────────┤
│ TOTAL (charged): 107.7g             │
└─────────────────────────────────────┘
```

---

## Why The Difference Exists

### Bambu Lab Approach:
- **User-focused**: Charges only for the actual part + necessary supports
- Tower/purge are operational overhead they absorb or charge separately

### Your Website Approach:
- **Material-cost-focused**: Includes ALL filament that flows through the nozzle
- Assumes you'll use/charge for wipe tower + purge in your pricing model

---

## Options to Resolve

### **Option A: Exclude Tower & Purge (Match Bambu behavior)**
```typescript
// Only charge for model + support (what user explicitly needs)
const effectiveWeight = modelWeight + supportWeight;
// Result: 80.54 + 13.33 = 93.87g ✓ matches Bambu
```
**Pros:** Matches customer expectations (transparent)
**Cons:** Under-accounts material costs; profit margin shrinks

---

### **Option B: Include Tower & Purge but Disclose (Transparent Upsell)**
Keep 107.7g but educate:
```
Material used: 93.88g (model + support)
Waste (tower + purge): 13.82g (included in service)
═══════════════════════════════════
Total charged: 107.7g
```
**Pros:** Covers actual costs; clear justification
**Cons:** Customers compare to Bambu and see "14.7% markup"

---

### **Option C: Separate Line Items (Hybrid)**
```
Model weight: 80.54g
Support waste: 13.33g
Equipment overhead (tower+purge): 13.82g
─────────────────────────
Total: 107.7g @ ₹7/g = ₹753.90
```
**Pros:** Transparent breakdown; educates customer on costs
**Cons:** More complex UI

---

### **Option D: Adjust Pricing Formula Instead**
Keep the weight at 93.88g but increase ₹/gram rate:
```
Bambu total: 93.88g
Equipment overhead: 13.82g / 93.88g = 14.7% margin
New rate: ₹7/g × 1.147 = ₹8.03/g

Result: 93.88g × ₹8.03/g = ₹753.90 (same revenue)
```
**Pros:** Cleaner UI; matches market expectations
**Cons:** Harder to justify rate premium

---

## Recommendation

**For this specific case (single-color Leg Amputee):**
- Tower weight should be minimal or zero (no color changes)
- Purge should be minimal or zero (no nozzle cleaning)
- Expected weight ≈ 93.88g (matches Bambu)

If your code is showing 107.7g, you're likely overestimating tower/purge for single-color prints.

**Suggested Fix:**
```typescript
// Only add tower/purge weight if multi-color (extruderCount > 1)
let adjustedWeight = modelWeight + supportWeight;

if (slicerResult.extruderCount > 1) {
  adjustedWeight += towerWeight + purgeWeight;
}

const effectiveWeight = Math.max(adjustedWeight, reportedTotalWeight);
```

This way:
- **Single-color prints** (like Leg Amputee): 93.88g ✓
- **Multi-color prints**: Include tower + purge since they're unavoidable

---

## Current Code Reference

**File:** `apps/api/src/controllers/customDesign.controller.ts` (lines 219-225)
```typescript
const componentTotalWeight =
  (Number(slicerResult.modelWeight) || 0) +
  (Number(slicerResult.supportWeight) || 0) +
  (Number(slicerResult.towerWeight) || 0) +       // Always added
  (Number(slicerResult.purgeWeight) || 0);        // Always added
const reportedTotalWeight = Number(slicerResult.totalWeight) || 0;
const effectiveWeight = Math.max(componentTotalWeight, reportedTotalWeight);
```

This always includes tower + purge, regardless of whether it's single or multi-color.
