import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface SlicerResult {
  filament_grams: number;
  print_time_seconds: number;
  price_inr: number;
  success: boolean;
  error?: string;
}

const MATERIAL_COSTS: Record<string, number> = {
  pla: 1.2,
  abs: 1.5,
  petg: 1.8,
  tpu: 2.5,
};

export class OrcaSlicerService {
  static async analyze3DFileFromPath(
    filePath: string,
    options: { material: string; infill?: number; layerHeight?: number; quantity?: number }
  ): Promise<SlicerResult> {
    const { material, infill = 20, layerHeight = 0.2, quantity = 1 } = options;
    const allowed = ['pla', 'abs', 'petg', 'tpu'];
    if (!allowed.includes(material.toLowerCase())) {
      return { success: false, error: 'Only PLA, ABS, PETG, TPU are supported', filament_grams: 0, print_time_seconds: 0, price_inr: 0 };
    }
    // Build OrcaSlicer CLI command
    const outputPath = filePath + '.gcode';
    const args = [
      '--slice',
      filePath,
      '--output',
      outputPath,
      '--filament-type',
      material.toUpperCase(),
      '--infill',
      infill.toString(),
      '--layer-height',
      layerHeight.toString(),
      '--no-gui',
    ];
    return new Promise((resolve) => {
      execFile('orcaslicer', args, { timeout: 120000 }, (error, stdout, stderr) => {
        if (error) {
          resolve({ success: false, error: error.message, filament_grams: 0, print_time_seconds: 0, price_inr: 0 });
          return;
        }
        // Parse G-code for stats (weight, time)
        fs.readFile(outputPath, 'utf8', (err, data) => {
          if (err) {
            resolve({ success: false, error: 'Failed to read G-code output', filament_grams: 0, print_time_seconds: 0, price_inr: 0 });
            return;
          }
          // Example: Parse for filament used and print time
          const filamentMatch = data.match(/; filament used = ([\d.]+) mm/);
          const timeMatch = data.match(/; estimated printing time \(normal mode\) = ([\d:]+)/);
          let filament_grams = 0;
          let print_time_seconds = 0;
          if (filamentMatch) {
            // Convert mm to grams (assume 1.24g/m for PLA, adjust for others)
            const mm = parseFloat(filamentMatch[1]);
            const density = 1.24; // g/m
            filament_grams = (mm / 1000) * density;
          }
          if (timeMatch) {
            // Convert HH:MM:SS to seconds
            const parts = timeMatch[1].split(':').map(Number);
            if (parts.length === 3) {
              print_time_seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
            } else if (parts.length === 2) {
              print_time_seconds = parts[0] * 60 + parts[1];
            }
          }
          // Calculate price
          const materialCost = filament_grams * (MATERIAL_COSTS[material.toLowerCase()] || 1.2);
          const machineCost = (print_time_seconds / 3600) * 30;
          const electricityCost = (print_time_seconds / 3600) * 6;
          let price_inr = (materialCost + machineCost + electricityCost) * 1.45 * quantity;
          resolve({ success: true, filament_grams, print_time_seconds, price_inr });
        });
      });
    });
  }
}
