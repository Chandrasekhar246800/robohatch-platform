# Bambu Slicer System Rebuild - Complete

**Date:** March 2, 2026  
**Commit:** `a52032c`  
**Status:** ✅ Rebuilt from scratch, deployed to Railway

---

## 🎯 Overview

Complete rebuild of the STL slicing system to use **OrcaSlicer with real Bambu printer profiles** for accurate filament usage, print time, and pricing calculations.

---

## ✅ What Was Completed

### Phase 1: Cleanup
- ❌ **Deleted** `slicer.service.ts` (old JavaScript STL parser)
- ❌ **Deleted** `stl-analyzer.service.ts` (volume estimation logic)
- ❌ **Removed** `node-stl` dependency
- ✅ System now has **zero old implementation code**

### Phase 2: Docker Setup
**File:** [Dockerfile](apps/api/Dockerfile)

```dockerfile
# Installed dependencies:
- wget, unzip (for AppImage extraction)
- libgtk-3-0, libgl1, libglu1-mesa (GUI libraries)
- libfuse2 (FUSE filesystem for AppImage)
- xvfb (virtual display for headless operation)

# OrcaSlicer installation:
- Downloaded OrcaSlicer v2.1.1 AppImage
- Extracted to /opt/orcaslicer
- Symlinked to /usr/local/bin/orca-slicer
- Created /tmp/slicer for temp G-code files
```

### Phase 3: Printer Profiles
**Directory:** [config/](apps/api/config/)

Created placeholder profiles (⚠️ **MUST BE REPLACED WITH REAL PROFILES**):
- `p1s.ini` - Bambu Lab P1S
- `a1.ini` - Bambu Lab A1
- `a1mini.ini` - Bambu Lab A1 Mini
- `README.md` - Export instructions

### Phase 4: Bambu Slicer Service
**File:** [bambuSlicer.service.ts](apps/api/src/services/bambuSlicer.service.ts)

**Key Functions:**
1. **`getPrinterProfile(printerType)`** - Validates and returns profile path
2. **`parseFilamentGrams(gcode)`** - Extracts filament usage from G-code comments
3. **`parsePrintTimeSeconds(gcode)`** - Parses print time (supports `1h 2m 3s` format)
4. **`calculatePrice()`** - Industrial pricing with profit margin
5. **`sliceModel()`** - Main slicing function with OrcaSlicer CLI

**Execution:**
```javascript
xvfb-run -a orca-slicer \
  --load config/p1s.ini \
  --export-gcode input.stl \
  --output /tmp/slicer/output.gcode
```

**Concurrency Control:**
- Max 2 simultaneous slicing jobs
- 90-second timeout per job
- Guaranteed temp file cleanup

### Phase 5: Industrial Pricing Logic

**Material Costs (per gram):**
- PLA: ₹1.2
- ABS: ₹1.5
- PETG: ₹1.8
- TPU: ₹2.5

**Operating Costs:**
- Machine: ₹25/hour
- Electricity: ₹5/hour
- Profit margin: 40%

**Formula:**
```
materialCost = filamentGrams × materialCostPerGram
machineCost = printTimeHours × 25
electricityCost = printTimeHours × 5

baseCost = materialCost + machineCost + electricityCost
finalPrice = baseCost × 1.4 × quantity
```

### Phase 6: Controller Integration
**File:** [customDesign.controller.ts](apps/api/src/controllers/customDesign.controller.ts)

- Imports `sliceModel()` instead of old `slice3DFile()`
- Downloads STL from S3 to temp location
- Calls OrcaSlicer with printer profile
- Stores accurate metrics in database:
  - `filament_grams`
  - `print_time_seconds`
  - `final_price`
- Returns `accurate: true` on success
- Falls back to file-size estimation if slicing fails

### Phase 7: Frontend Updates
**Files:**
- [upload-3d-file/page.tsx](apps/web/src/app/upload-3d-file/page.tsx)
- [api-client.ts](apps/web/src/lib/api-client.ts)

**UI Improvements:**
1. **Printer Selector Added:**
   - Bambu P1S (high speed, enclosed)
   - Bambu A1 (standard build volume)
   - Bambu A1 Mini (compact size)

2. **Results Display:**
   - ✅ Filament Weight (grams)
   - ✅ Print Time (hours)
   - ✅ Total Price (₹)
   - ✅ "Accurate via Bambu Profile" badge

3. **Form State:**
   - Added `printerType: 'p1s'` to formData
   - Updated API client to send printerType

---

## ⚠️ CRITICAL - Action Required

### 1. Export Real Bambu Profiles

**Current Status:** Placeholder `.ini` files exist but are **NOT FUNCTIONAL**

**How to Export from Bambu Studio:**

1. Open **Bambu Studio**
2. Select printer:
   - Bambu Lab P1S
   - Bambu Lab A1
   - Bambu Lab A1 Mini
3. Configure settings:
   - Material: PLA (or ABS/PETG/TPU)
   - Layer height: 0.2mm
   - Infill: 20%
   - Support: Auto
4. Go to **File → Export → Export Config**
5. Save as:
   - `p1s.ini` for P1S
   - `a1.ini` for A1
   - `a1mini.ini` for A1 Mini
6. Replace placeholder files in `apps/api/config/`

**Alternative:** Export from OrcaSlicer (same process)

### 2. Test OrcaSlicer in Railway

**After deployment, monitor Railway logs for:**

```
✅ SUCCESS indicators:
🔧 Starting slicing job (1/2 active)
📋 Using profile: /app/apps/api/config/p1s.ini
🚀 Slicing with OrcaSlicer...
📊 G-code size: X KB
✅ Slicing complete!
   Filament: X.Xg
   Print time: X.XXh
   Price: ₹XXX

❌ FAILURE indicators:
❌ Slicing failed: Profile not found
❌ OrcaSlicer did not generate G-code file
⚠️  Failed to parse filament usage or print time from G-code
```

**If you see errors:**
- Check OrcaSlicer installation: `xvfb-run -a orca-slicer --version`
- Verify profile files exist: `ls -la apps/api/config/`
- Check profile format compatibility

---

## 🚀 Deployment Status

**Pushed to:** `origin/main` (commit `a52032c`)  
**Railway Status:** Building now  
**Expected Build Time:** 5-8 minutes (OrcaSlicer AppImage download + extraction)

**Monitor deployment:**
1. Go to Railway dashboard
2. Check build logs for:
   ```
   Downloading OrcaSlicer AppImage...
   Extracting AppImage...
   Creating symlink to /usr/local/bin/orca-slicer
   ```
3. Wait for "Deployment successful"

---

## 📊 How It Works Now

### User Flow:

1. **User uploads** `.stl` file on frontend
2. **Frontend** sends to `/api/custom-designs` with:
   - File
   - Printer type (p1s/a1/a1mini)
   - Material (pla/abs/petg/tpu)
   - Quantity
3. **Backend** (Railway):
   - Downloads STL from S3
   - Runs OrcaSlicer with Bambu profile
   - Generates G-code
   - Parses metadata (filament, time)
   - Calculates price
   - Stores in database
4. **Frontend** displays:
   - Weight: X.Xg
   - Time: X.XXh
   - Price: ₹XXX
   - Badge: "Accurate via Bambu Profile"

### Technical Details:

**Slicing Command:**
```bash
xvfb-run -a orca-slicer \
  --load apps/api/config/p1s.ini \
  --export-gcode /tmp/stl-uploads/model.stl \
  --output /tmp/slicer/output.gcode
```

**G-code Parsing:**
Extracts from comments:
```gcode
; filament used [g] = 45.2
; estimated printing time = 2h 15m 30s
```

**Result:**
```json
{
  "accurate": true,
  "filament_grams": 45.2,
  "print_time_seconds": 8130,
  "final_price": 198
}
```

---

## 🔧 System Requirements

### Docker Container (Railway):
- Node.js 20
- OrcaSlicer v2.1.1 AppImage
- xvfb (virtual display)
- FUSE filesystem support
- 2GB RAM minimum (for slicing)

### Supported:
- **Printers:** P1S, A1, A1 Mini
- **Materials:** PLA, ABS, PETG, TPU
- **File formats:** `.stl` only (for accuracy)

### Not Supported:
- `.3mf` files (ZIP archives, not binary STL)
- `.obj`, `.gcode` (use file-size estimation)

---

## 🐛 Debugging Guide

### If filament/time shows "--" or "0":

1. **Check Railway logs:**
   ```
   ❌ Slicing failed: [error message]
   ```

2. **Common issues:**
   - Profile not found → Export real profiles
   - OrcaSlicer timeout → Increase timeout or reduce STL complexity
   - G-code parsing failed → Check G-code format compatibility

3. **Manual test:**
   SSH into Railway container:
   ```bash
   xvfb-run -a orca-slicer --version
   xvfb-run -a orca-slicer --load config/p1s.ini --export-gcode test.stl --output test.gcode
   grep "filament used" test.gcode
   grep "printing time" test.gcode
   ```

### If pricing seems wrong:

1. **Check material costs** in `bambuSlicer.service.ts`:
   ```typescript
   const MATERIAL_COSTS = {
     pla: 1.2,  // ← Adjust if needed
     abs: 1.5,
     petg: 1.8,
     tpu: 2.5,
   };
   ```

2. **Check operating costs:**
   ```typescript
   const MACHINE_COST_PER_HOUR = 25;  // ← Adjust
   const ELECTRICITY_COST_PER_HOUR = 5;  // ← Adjust
   const PROFIT_MARGIN = 0.40;  // 40% ← Adjust
   ```

---

## 📝 Next Steps

### Immediate (REQUIRED):
1. ✅ **Export real Bambu profiles** from Bambu Studio
2. ✅ **Replace placeholder `.ini` files** in `apps/api/config/`
3. ✅ **Test with real STL file** after Railway deployment
4. ✅ **Verify pricing accuracy** matches expectations

### Optional Improvements:
- Add multi-material support (if needed)
- Add custom profile upload (for advanced users)
- Add slicing progress indicator (for large files)
- Add G-code preview (3D visualization)
- Add error retry mechanism (for network failures)

---

## 📚 Reference Files

### Backend:
- [bambuSlicer.service.ts](apps/api/src/services/bambuSlicer.service.ts) - Main slicing logic
- [customDesign.controller.ts](apps/api/src/controllers/customDesign.controller.ts) - API endpoint
- [Dockerfile](apps/api/Dockerfile) - OrcaSlicer installation
- [config/](apps/api/config/) - Printer profiles

### Frontend:
- [upload-3d-file/page.tsx](apps/web/src/app/upload-3d-file/page.tsx) - Upload UI
- [api-client.ts](apps/web/src/lib/api-client.ts) - API integration

---

## ✅ Success Criteria

System is working correctly when:
1. ✅ Railway deployment succeeds
2. ✅ OrcaSlicer installed and accessible
3. ✅ Real Bambu profiles loaded
4. ✅ STL upload returns actual values (not "--" or "0")
5. ✅ Pricing matches Bambu Studio estimates
6. ✅ "Accurate via Bambu Profile" badge shows
7. ✅ No slicing errors in Railway logs

---

**System Status:** 🟡 Deployed, awaiting real profiles  
**Next Action:** Export and replace Bambu profiles  
**Documentation:** Complete ✅
