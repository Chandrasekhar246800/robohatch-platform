import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

export interface SlicerResult {
  accurate: boolean;
  filament_grams: number;
  print_time_seconds: number;
  final_price: number;
  error?: string;
  logs?: string;
}

const MATERIAL_COSTS: Record<string, number> = {
  pla: 1.2,
  abs: 1.5,
  petg: 1.8,
  tpu: 2.5,
};

const MACHINE_COST_PER_HOUR = 25;
const ELECTRICITY_COST_PER_HOUR = 5;
const PROFIT_MARGIN = 1.4;
const MAX_CONCURRENT_JOBS = 2;
let activeJobs = 0;

function getProfile(printerType: string): string {
  switch (printerType) {
    case 'p1s':
      return path.resolve(__dirname, '../../config/p1s-profile.ini');
    case 'a1':
      return path.resolve(__dirname, '../../config/a1-profile.ini');
    case 'a1mini':
      return path.resolve(__dirname, '../../config/a1mini-profile.ini');
    default:
      throw new Error('Invalid printerType. Supported: p1s, a1, a1mini');
  }
  // This line is unreachable but required for TS return type
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  return '';
}

function parseTimeToSeconds(timeStr: string): number {
  // Format: 1h 23m 45s or 23m 45s or 45s
  let seconds = 0;
  const h = /([0-9]+)h/.exec(timeStr);
  const m = /([0-9]+)m/.exec(timeStr);
  const s = /([0-9]+)s/.exec(timeStr);
  if (h) seconds += parseInt(h[1]) * 3600;
  if (m) seconds += parseInt(m[1]) * 60;
  if (s) seconds += parseInt(s[1]);
  return seconds;
}

export async function slice3DFile({
  inputPath,
  material,
  quantity = 1,
  printerType,
}: {
  inputPath: string;
  material: string;
  quantity?: number;
  printerType: string;
}): Promise<SlicerResult> {
  if (activeJobs >= MAX_CONCURRENT_JOBS) {
    return {
      accurate: false,
      filament_grams: 0,
      print_time_seconds: 0,
      final_price: 0,
      error: 'Too many concurrent slicing jobs',
    };
  }
  activeJobs++;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'slicer-'));
  const outputPath = path.join(tempDir, 'output.gcode');
  let logs = '';
  try {
    const profilePath = getProfile(printerType);
    const args = [
      '--load', profilePath,
      '--export-gcode',
      inputPath,
      '--output', outputPath,
    ];
    const execResult = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      execFile('orca-slicer', args, { timeout: 90000 }, (error, stdout, stderr) => {
        logs += stderr;
        if (error) {
          reject({ error, stdout, stderr });
        } else {
          resolve({ stdout, stderr });
        }
      });
    }).catch((e) => {
      logs += e.stderr || '';
      throw new Error(e.error ? e.error.message : 'Slicing failed');
    });
    // Parse G-code output
    const gcode = fs.readFileSync(outputPath, 'utf8');
    // Log first 30 header lines for debug
    const gcodeHeaderLines = gcode.split('\n').slice(0, 30).join('\n');
    logs += '\n--- GCODE HEADER START ---\n' + gcodeHeaderLines + '\n--- GCODE HEADER END ---\n';
    const filamentMatch = gcode.match(/; filament used \[g\] = ([\d.]+)/);
    const timeMatch = gcode.match(/; estimated printing time = ([^\n]+)/);
    let filament_grams = 0;
    let print_time_seconds = 0;
    if (filamentMatch) {
      filament_grams = parseFloat(filamentMatch[1]);
    }
    if (timeMatch) {
      print_time_seconds = parseTimeToSeconds(timeMatch[1]);
    }
    // Pricing
    const matKey = material.toLowerCase();
    const materialCost = filament_grams * (MATERIAL_COSTS[matKey] || 1.2);
    const hours = print_time_seconds / 3600;
    const machineCost = hours * MACHINE_COST_PER_HOUR;
    const electricityCost = hours * ELECTRICITY_COST_PER_HOUR;
    // LOG all parsed and calculated values
    logs += `\n[DEBUG] filament_grams: ${filament_grams}`;
    logs += `\n[DEBUG] print_time_seconds: ${print_time_seconds}`;
    logs += `\n[DEBUG] quantity: ${quantity}`;
    logs += `\n[DEBUG] materialCost: ${materialCost}`;
    logs += `\n[DEBUG] machineCost: ${machineCost}`;
    logs += `\n[DEBUG] electricityCost: ${electricityCost}`;
    let final_price = (materialCost + machineCost + electricityCost) * PROFIT_MARGIN;
    logs += `\n[DEBUG] finalPrice (before quantity): ${final_price}`;
    final_price = final_price * quantity;
    logs += `\n[DEBUG] finalPrice (after quantity): ${final_price}`;
    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });
    activeJobs--;
    return {
      accurate: true,
      filament_grams,
      print_time_seconds,
      final_price: Math.round(final_price),
      logs,
    };
  } catch (err: any) {
    // Fallback estimation
    let fallbackPrice = 300 * quantity;
    fs.rmSync(tempDir, { recursive: true, force: true });
    activeJobs--;
    return {
      accurate: false,
      filament_grams: 0,
      print_time_seconds: 0,
      final_price: fallbackPrice,
      error: err.message,
      logs,
    };
  }
}
