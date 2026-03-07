import { exec } from "child_process";
import fs from "fs";
import path from "path";

export async function runPrusaSlicer(stlPath: string) {
  return new Promise((resolve, reject) => {

    try {

      const gcodePath = stlPath.replace(".stl", ".gcode");

      const configPath = path.join(
        process.cwd(),
        "apps/api/src/slicer/default_config.ini"
      );

      const command = `
        prusa-slicer
        --load "${configPath}"
        "${stlPath}"
        --export-gcode
        --output "${gcodePath}"
      `;

      exec(command, (error) => {

        if (error) {
          reject(error);
          return;
        }

        const gcode = fs.readFileSync(gcodePath, "utf8");

        const filamentMatch = gcode.match(/filament used \[g\] = ([\d\.]+)/);
        const supportMatch = gcode.match(/support material = ([\d\.]+)/);
        const timeMatch = gcode.match(/estimated printing time.*= (.+)/);

        const modelWeight = filamentMatch ? parseFloat(filamentMatch[1]) : 0;
        const supportWeight = supportMatch ? parseFloat(supportMatch[1]) : 0;

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
