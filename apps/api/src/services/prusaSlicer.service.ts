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

        // DEBUG: Check both start and end for filament stats (only specific keywords)
        console.log(`   🔍 Searching for filament stats in gcode...`);
        const gcodeLines = gcode.split('\n');
        
        // Check first 100 lines for summary stats
        const headerLines = gcodeLines.slice(0, 100);
        headerLines.forEach((line, idx) => {
          const lower = line.toLowerCase();
          if ((lower.includes('filament') && (lower.includes('used') || lower.includes('weight') || lower.includes('g]'))) 
              || (lower.includes('time') && lower.includes('print'))) {
            console.log(`   Header ${idx}: ${line}`);
          }
        });
        
        // Check last 50 lines for stats (not config)
        const footerLines = gcodeLines.slice(-50);
        footerLines.forEach((line, idx) => {
          const lower = line.toLowerCase();
          if ((lower.includes('filament') && (lower.includes('used') || lower.includes('weight'))) 
              || (lower.includes('time') && lower.includes('print'))) {
            console.log(`   Footer ${gcodeLines.length - 50 + idx}: ${line}`);
          }
        });

        // Try multiple regex patterns for filament weight (different PrusaSlicer versions)
        const filamentMatch = gcode.match(/filament used \[g\] = ([\d\.]+)/) ||
                            gcode.match(/filament_used_g = ([\d\.]+)/) ||
                            gcode.match(/total filament used \[g\] = ([\d\.]+)/) ||
                            gcode.match(/; filament used \[g\] = ([\d\.]+)/);
        
        const supportMatch = gcode.match(/support material = ([\d\.]+)/) ||
                           gcode.match(/support_material_used \[g\] = ([\d\.]+)/);
        
        const timeMatch = gcode.match(/estimated printing time.*= (.+)/) ||
                         gcode.match(/; estimated printing time \(normal mode\) = (.+)/);

        const modelWeight = filamentMatch ? parseFloat(filamentMatch[1]) : 0;
        const supportWeight = supportMatch ? parseFloat(supportMatch[1]) : 0;
        
        console.log(`   📊 Extracted from gcode: modelWeight=${modelWeight}g, supportWeight=${supportWeight}g`);

        // Clean up gcode file
        try {
          fs.unlinkSync(gcodePath);
        } catch (cleanupError) {
          console.error('Failed to cleanup gcode file:', cleanupError);
        }

        resolve({
          modelWeight,
          supportWeight,
          totalWeight: modelWeight + supportWeight,
          printTime: timeMatch ? timeMatch[1] : null
        });

      });

    } catch (err) {
      reject(err);
    }

  });
}
