import { execFile } from "child_process";
import fs from "fs";
import path from "path";

import { logger } from '../utils/logger';

export async function runPrusaSlicer(filePath: string) {
  return new Promise((resolve, reject) => {

    try {

      const allowedDir = path.resolve(process.env.UPLOAD_DIR || '/tmp/stl-uploads');
      const resolvedFilePath = path.resolve(filePath);
      if (!resolvedFilePath.startsWith(allowedDir + path.sep) && resolvedFilePath !== allowedDir) {
        reject(new Error('Invalid file path'));
        return;
      }

      // Generate gcode path (works for both .stl and .3mf)
      const ext = path.extname(resolvedFilePath);
      const gcodePath = path.join(path.dirname(resolvedFilePath), `${path.basename(resolvedFilePath, ext)}.gcode`);

      const configPath = path.join(
        process.cwd(),
        "src/slicer/default_config.ini"
      );

      // Run PrusaSlicer with execFile to avoid shell interpolation/injection
      logger.info(`   Running command: prusa-slicer --load ${configPath} ${resolvedFilePath}`);

      execFile(
        "prusa-slicer",
        ["--load", configPath, resolvedFilePath, "--export-gcode", "--output", gcodePath],
        { timeout: 120000 },
        (error) => {

          if (error) {
            logger.error(`   ❌ PrusaSlicer error: ${error.message}`);
            reject(new Error(`PrusaSlicer failed: ${error.message}`));
            return;
          }

          if (!fs.existsSync(gcodePath)) {
            reject(new Error('PrusaSlicer did not generate gcode file'));
            return;
          }

          const gcode = fs.readFileSync(gcodePath, "utf8");

        // Extract time
        const timeMatch = gcode.match(/; estimated printing time \(normal mode\) = (.+)/);
        
        // PLA density for weight calculations
        const PLA_DENSITY = 1.24; // g/cm³
        
        // Extract multi-material weight breakdown from gcode comments
        // PrusaSlicer outputs detailed breakdown for multi-color prints
        
        // Try to extract total filament used volumes (handles single and multi-extruder)
        const volumeMatch = gcode.match(/; filament used \[cm3\] = ([\d\.,\s]+)/);
        const volumeStr = volumeMatch ? volumeMatch[1].trim() : '';

        // Try to extract total filament used in grams directly from slicer output.
        const gramsMatch = gcode.match(/; filament used \[g\] = ([\d\.,\s]+)/i);
        const gramsStr = gramsMatch ? gramsMatch[1].trim() : '';
        
        // Parse values (can be comma-separated for multi-extruder: "50.5, 30.2")
        const volumes = volumeStr.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
        const grams = gramsStr.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
        const totalVolume = volumes.reduce((sum, v) => sum + v, 0);
        const totalGramsFromSlicer = grams.reduce((sum, v) => sum + v, 0);
        
        // Extract wipe tower volume if present (multi-color prints)
        const towerVolumeMatch = gcode.match(/; wipe tower used \[cm3\] = ([\d\.]+)/);
        const towerVolume = towerVolumeMatch ? parseFloat(towerVolumeMatch[1]) : 0;
        
        // Extract support volume if present
        const supportVolumeMatch = gcode.match(/; support material used \[cm3\] = ([\d\.]+)/);
        const supportVolume = supportVolumeMatch ? parseFloat(supportVolumeMatch[1]) : 0;
        
        // Extract purge/waste info if available
        // Note: PrusaSlicer may not output this, but Bambu/Orca slicers do
        const purgeMatch = gcode.match(/; filament purged \[cm3\] = ([\d\.]+)/);
        const purgeVolume = purgeMatch ? parseFloat(purgeMatch[1]) : 0;
        
        // Calculate weights with high precision (keep exact decimal values)
        const towerWeight = towerVolume * PLA_DENSITY;
        const supportWeight = supportVolume * PLA_DENSITY;
        const purgeWeight = purgeVolume * PLA_DENSITY;
        
        // Total weight (everything that goes through the nozzle)
        // Prefer slicer-reported grams when available because it is more accurate for
        // multi-color/multi-material jobs than density conversion from cm3.
        const totalWeight = totalGramsFromSlicer > 0
          ? totalGramsFromSlicer
          : (totalVolume * PLA_DENSITY);

        // Model weight = total - support - tower - purge
        // Clamp at zero to avoid negatives from missing/partial metadata lines.
        const modelWeight = Math.max(0, totalWeight - supportWeight - towerWeight - purgeWeight);
        
        logger.info(`   📊 Volume Breakdown (exact decimal values):`);
        logger.info(`      • Total: ${totalVolume.toFixed(4)} cm³ → ${totalWeight.toFixed(4)}g`);
        logger.info(`      • Model: ${modelWeight.toFixed(4)}g (actual part)`);
        if (supportWeight > 0) logger.info(`      • Support: ${supportVolume.toFixed(4)} cm³ → ${supportWeight.toFixed(4)}g`);
        if (towerWeight > 0) logger.info(`      • Tower: ${towerVolume.toFixed(4)} cm³ → ${towerWeight.toFixed(4)}g (wipe tower)`);
        if (purgeWeight > 0) logger.info(`      • Purged: ${purgeVolume.toFixed(4)} cm³ → ${purgeWeight.toFixed(4)}g (waste)`);
        if (totalGramsFromSlicer > 0) logger.info(`      • Total grams from slicer metadata: ${totalGramsFromSlicer.toFixed(4)}g`);
        if (volumes.length > 1) logger.info(`      • Extruders: ${volumes.length} colors/materials`);
        
        // Verification: model + support + tower + purge should equal total
        const calculatedTotal = modelWeight + supportWeight + towerWeight + purgeWeight;
        if (Math.abs(calculatedTotal - totalWeight) > 0.5) {
          logger.warn(`      ⚠️  Weight mismatch: calculated ${calculatedTotal.toFixed(4)}g vs total ${totalWeight.toFixed(4)}g`);
        }

          // Clean up gcode file
          try {
            fs.unlinkSync(gcodePath);
          } catch (cleanupError) {
            logger.error('Failed to cleanup gcode file:', cleanupError);
          }

          resolve({
            modelWeight: modelWeight,
            supportWeight: supportWeight,
            towerWeight: towerWeight,
            purgeWeight: purgeWeight,
            totalWeight: totalWeight,
            extruderCount: volumes.length,
            printTime: timeMatch ? timeMatch[1] : null
          });

        }
      );

    } catch (err) {
      reject(err);
    }

  });
}
