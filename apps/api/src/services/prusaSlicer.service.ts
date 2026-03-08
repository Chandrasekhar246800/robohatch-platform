import { exec } from "child_process";
import fs from "fs";
import path from "path";

export async function runPrusaSlicer(filePath: string) {
  return new Promise((resolve, reject) => {

    try {

      // Generate gcode path (works for both .stl and .3mf)
      const ext = path.extname(filePath);
      const gcodePath = filePath.replace(ext, ".gcode");

      const configPath = path.join(
        process.cwd(),
        "src/slicer/default_config.ini"
      );

      // Run PrusaSlicer to generate gcode and extract volume data
      const command = `prusa-slicer --load "${configPath}" "${filePath}" --export-gcode --output "${gcodePath}"`;

      console.log(`   Running command: prusa-slicer --load ${configPath} ${filePath}`);

      exec(command, (error) => {

        if (error) {
          console.error(`   ❌ PrusaSlicer error: ${error.message}`);
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
        
        // Parse volumes (can be comma-separated for multi-extruder: "50.5, 30.2")
        const volumes = volumeStr.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
        const totalVolume = volumes.reduce((sum, v) => sum + v, 0);
        
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
        
        // Model weight = total - tower - support - purge
        // This gives us the actual part weight excluding all waste
        const modelVolume = totalVolume - towerVolume - supportVolume - purgeVolume;
        const modelWeight = modelVolume * PLA_DENSITY;
        
        // Total weight (everything that goes through the nozzle)
        const totalWeight = totalVolume * PLA_DENSITY;
        
        console.log(`   📊 Volume Breakdown (exact decimal values):`);
        console.log(`      • Total: ${totalVolume.toFixed(4)} cm³ → ${totalWeight.toFixed(4)}g`);
        console.log(`      • Model: ${modelVolume.toFixed(4)} cm³ → ${modelWeight.toFixed(4)}g (actual part)`);
        if (supportWeight > 0) console.log(`      • Support: ${supportVolume.toFixed(4)} cm³ → ${supportWeight.toFixed(4)}g`);
        if (towerWeight > 0) console.log(`      • Tower: ${towerVolume.toFixed(4)} cm³ → ${towerWeight.toFixed(4)}g (wipe tower)`);
        if (purgeWeight > 0) console.log(`      • Purged: ${purgeVolume.toFixed(4)} cm³ → ${purgeWeight.toFixed(4)}g (waste)`);
        if (volumes.length > 1) console.log(`      • Extruders: ${volumes.length} colors/materials`);
        
        // Verification: model + support + tower + purge should equal total
        const calculatedTotal = modelWeight + supportWeight + towerWeight + purgeWeight;
        if (Math.abs(calculatedTotal - totalWeight) > 0.5) {
          console.warn(`      ⚠️  Weight mismatch: calculated ${calculatedTotal.toFixed(4)}g vs total ${totalWeight.toFixed(4)}g`);
        }

        // Clean up gcode file
        try {
          fs.unlinkSync(gcodePath);
        } catch (cleanupError) {
          console.error('Failed to cleanup gcode file:', cleanupError);
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

      });

    } catch (err) {
      reject(err);
    }

  });
}
