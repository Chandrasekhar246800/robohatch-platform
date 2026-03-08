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
        
        // Calculate weights
        const towerWeight = Math.round(towerVolume * PLA_DENSITY * 100) / 100;
        const supportWeight = Math.round(supportVolume * PLA_DENSITY * 100) / 100;
        
        // Model weight = total - tower - support
        const modelVolume = totalVolume - towerVolume - supportVolume;
        const modelWeight = Math.round(modelVolume * PLA_DENSITY * 100) / 100;
        
        // Total weight
        const totalWeight = Math.round(totalVolume * PLA_DENSITY * 100) / 100;
        
        // Extract purge/waste info if available (some slicers log this separately)
        const purgeMatch = gcode.match(/; filament purged \[cm3\] = ([\d\.]+)/);
        const purgeVolume = purgeMatch ? parseFloat(purgeMatch[1]) : 0;
        const purgeWeight = Math.round(purgeVolume * PLA_DENSITY * 100) / 100;
        
        console.log(`   📊 Volume Breakdown:`);
        console.log(`      • Total: ${totalVolume.toFixed(2)} cm³ → ${totalWeight}g`);
        console.log(`      • Model: ${modelVolume.toFixed(2)} cm³ → ${modelWeight}g`);
        if (supportWeight > 0) console.log(`      • Support: ${supportVolume.toFixed(2)} cm³ → ${supportWeight}g`);
        if (towerWeight > 0) console.log(`      • Wipe Tower: ${towerVolume.toFixed(2)} cm³ → ${towerWeight}g`);
        if (purgeWeight > 0) console.log(`      • Purged: ${purgeVolume.toFixed(2)} cm³ → ${purgeWeight}g`);
        if (volumes.length > 1) console.log(`      • Extruders: ${volumes.length} colors/materials`);

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
