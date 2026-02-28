import { execFile, exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface SlicerResult {
  accurate: boolean;
  filament_grams: number;
  print_time_seconds: number;
  final_price: number;
  error?: string;
  logs?: string;
  debug?: boolean;
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

// Check if xvfb-run is available (for headless OrcaSlicer)
let hasXvfb: boolean | null = null;
async function checkXvfb(): Promise<boolean> {
  if (hasXvfb !== null) return hasXvfb;
  try {
    await execAsync('which xvfb-run');
    hasXvfb = true;
    console.log('✓ xvfb-run available for headless slicing');
  } catch {
    hasXvfb = false;
    console.log('⚠ xvfb-run not available, using direct orcaslicer');
  }
  return hasXvfb;
}

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
    // Check if we should use xvfb-run for headless execution
    const useXvfb = await checkXvfb();
    
    // Build command and args
    const slicerCmd = useXvfb ? 'xvfb-run' : 'orcaslicer';
    const args: string[] = [];
    
    // If using xvfb-run, add xvfb args and orcaslicer command
    if (useXvfb) {
      args.push('-a', 'orcaslicer');
    }
    
    // Add slicer arguments  
    args.push('--export-gcode', inputPath, '--output', outputPath);
    
    try {
      const profilePath = getProfile(printerType);
      if (fs.existsSync(profilePath)) {
        // Insert profile args before export-gcode
        const exportIndex = args.indexOf('--export-gcode');
        args.splice(exportIndex, 0, '--load', profilePath);
        console.log(`Using profile: ${profilePath}`);
      } else {
        console.log(`Profile not found: ${profilePath}, using defaults`);
      }
    } catch (profileError) {
      console.log('Profile loading skipped:', profileError);
    }
    
    console.log(`Executing: ${slicerCmd} ${args.join(' ')}`);
    
    const { stdout, stderr } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      execFile(slicerCmd, args, { timeout: 90000 }, (error, stdout, stderr) => {
        if (error) {
          reject({ error, stdout, stderr });
        } else {
          resolve({ stdout, stderr });
        }
      });
    }).catch((e) => {
      throw new Error(e.error ? e.error.message : 'Slicing failed');
    });
    // STEP 1: Log raw slicer output
    console.log("=== RAW SLICER STDOUT ===");
    console.log(stdout);
    console.log("=== RAW SLICER STDERR ===");
    console.log(stderr);

    // STEP 2: Parse filament weight (both formats)
    const gcode = fs.readFileSync(outputPath, 'utf8');
    let filament_grams: number | null = null;
    let match1 = gcode.match(/; filament used \[g\] = ([\d.]+)/);
    let match2 = gcode.match(/; total filament used = [\d.]+mm \(([\d.]+)g\)/);
    if (match1) {
      filament_grams = parseFloat(match1[1]);
      console.log("Parsed filament grams (format 1):", filament_grams);
    } else if (match2) {
      filament_grams = parseFloat(match2[1]);
      console.log("Parsed filament grams (format 2):", filament_grams);
    } else {
      console.log("Filament weight not found in G-code");
      filament_grams = 0;
    }

    // STEP 3: Parse print time (both formats)
    let print_time_seconds: number | null = null;
    let timeMatch1 = gcode.match(/; estimated printing time = ([^\n]+)/);
    let timeMatch2 = gcode.match(/; estimated printing time \(normal mode\) = ([^\n]+)/);
    let timeStr = timeMatch1 ? timeMatch1[1] : (timeMatch2 ? timeMatch2[1] : null);
    if (timeStr) {
      print_time_seconds = parseTimeToSeconds(timeStr);
      console.log("Parsed print time seconds:", print_time_seconds);
    } else {
      console.log("Print time not found in G-code");
      print_time_seconds = 0;
    }

    // STEP 4: Return only weight and time
    fs.rmSync(tempDir, { recursive: true, force: true });
    activeJobs--;
    return {
      accurate: true,
      debug: true,
      filament_grams: filament_grams || 0,
      print_time_seconds: print_time_seconds || 0,
      final_price: 0,
    };
  } catch (err: any) {
    // Log detailed error for debugging
    console.error('=== SLICER ERROR ===');
    console.error('Error message:', err.message);
    console.error('Error details:', err);
    console.error('Input path:', inputPath);
    console.error('Material:', material);
    console.error('Printer type:', printerType);
    console.error('==================');
    
    // Fallback estimation
    let fallbackPrice = 300 * quantity;
    fs.rmSync(tempDir, { recursive: true, force: true });
    activeJobs--;
    return {
      accurate: false,
      filament_grams: 0,
      print_time_seconds: 0,
      final_price: fallbackPrice,
      error: `Slicer failed: ${err.message}`,
      logs,
    };
  }
}
