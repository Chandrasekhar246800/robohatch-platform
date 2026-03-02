import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const execFileAsync = promisify(execFile);

// Material cost per gram (industrial pricing)
const MATERIAL_COSTS: Record<string, number> = {
  pla: 1.2,
  abs: 1.5,
  petg: 1.8,
  tpu: 2.5,
};

// Operating costs
const MACHINE_COST_PER_HOUR = 25;
const ELECTRICITY_COST_PER_HOUR = 5;
const PROFIT_MARGIN = 0.40; // 40%

// Concurrency control - max 2 simultaneous slicing jobs
let activeSlicingJobs = 0;
const MAX_CONCURRENT_JOBS = 2;

export interface BambuSlicerResult {
  accurate: boolean;
  filament_grams: number;
  print_time_seconds: number;
  final_price: number;
  error?: string;
}

/**
 * Get printer profile path based on printer type
 */
function getPrinterProfile(printerType: string): string {
  const profileMap: Record<string, string> = {
    p1s: path.resolve(__dirname, '../../config/p1s.ini'),
    a1: path.resolve(__dirname, '../../config/a1.ini'),
    a1mini: path.resolve(__dirname, '../../config/a1mini.ini'),
  };

  const profilePath = profileMap[printerType.toLowerCase()];
  
  if (!profilePath) {
    throw new Error(`Invalid printer type: ${printerType}. Supported: p1s, a1, a1mini`);
  }

  if (!fs.existsSync(profilePath)) {
    throw new Error(`Printer profile not found: ${profilePath}. Please export profile from Bambu Studio.`);
  }

  return profilePath;
}

/**
 * Parse filament usage from G-code comments
 */
function parseFilamentGrams(gcodeContent: string): number | null {
  // Pattern 1: ; filament used [g] = X
  const pattern1 = /;\s*filament used \[g\]\s*=\s*([\d.]+)/i;
  const match1 = gcodeContent.match(pattern1);
  if (match1) {
    return parseFloat(match1[1]);
  }

  // Pattern 2: ; total filament used = XXXXmm (Xg)
  const pattern2 = /;\s*total filament used\s*=\s*[\d.]+mm\s*\(([\d.]+)g\)/i;
  const match2 = gcodeContent.match(pattern2);
  if (match2) {
    return parseFloat(match2[1]);
  }

  // Pattern 3: ; filament_used_g = X
  const pattern3 = /;\s*filament_used_g\s*=\s*([\d.]+)/i;
  const match3 = gcodeContent.match(pattern3);
  if (match3) {
    return parseFloat(match3[1]);
  }

  return null;
}

/**
 * Parse print time from G-code comments
 * Converts various time formats to seconds
 */
function parsePrintTimeSeconds(gcodeContent: string): number | null {
  // Pattern 1: ; estimated printing time = 1h 2m 3s
  const pattern1 = /;\s*estimated printing time(?:\s*\(normal mode\))?\s*=\s*(.+)/i;
  const match1 = gcodeContent.match(pattern1);
  
  if (match1) {
    const timeStr = match1[1].trim();
    let totalSeconds = 0;

    // Parse hours
    const hourMatch = timeStr.match(/(\d+)h/);
    if (hourMatch) {
      totalSeconds += parseInt(hourMatch[1]) * 3600;
    }

    // Parse minutes
    const minMatch = timeStr.match(/(\d+)m/);
    if (minMatch) {
      totalSeconds += parseInt(minMatch[1]) * 60;
    }

    // Parse seconds
    const secMatch = timeStr.match(/(\d+)s/);
    if (secMatch) {
      totalSeconds += parseInt(secMatch[1]);
    }

    if (totalSeconds > 0) {
      return totalSeconds;
    }
  }

  // Pattern 2: ; print_time = X (seconds)
  const pattern2 = /;\s*print_time\s*=\s*([\d.]+)/i;
  const match2 = gcodeContent.match(pattern2);
  if (match2) {
    return Math.round(parseFloat(match2[1]));
  }

  return null;
}

/**
 * Calculate industrial pricing with profit margin
 */
function calculatePrice(
  filamentGrams: number,
  printTimeSeconds: number,
  material: string,
  quantity: number
): number {
  const materialCostPerGram = MATERIAL_COSTS[material.toLowerCase()] || MATERIAL_COSTS.pla;
  
  // Calculate base costs
  const materialCost = filamentGrams * materialCostPerGram;
  const printTimeHours = printTimeSeconds / 3600;
  const machineCost = printTimeHours * MACHINE_COST_PER_HOUR;
  const electricityCost = printTimeHours * ELECTRICITY_COST_PER_HOUR;

  // Total base cost
  const baseCost = materialCost + machineCost + electricityCost;

  // Apply profit margin and quantity
  const finalPrice = baseCost * (1 + PROFIT_MARGIN) * quantity;

  return Math.round(finalPrice);
}

/**
 * Slice STL model using OrcaSlicer and extract accurate metrics
 */
export async function sliceModel({
  stlPath,
  printerType,
  material,
  quantity = 1,
}: {
  stlPath: string;
  printerType: string;
  material: string;
  quantity?: number;
}): Promise<BambuSlicerResult> {
  // Check concurrency limit
  if (activeSlicingJobs >= MAX_CONCURRENT_JOBS) {
    throw new Error('Too many concurrent slicing jobs. Please try again in a moment.');
  }

  activeSlicingJobs++;
  console.log(`🔧 Starting slicing job (${activeSlicingJobs}/${MAX_CONCURRENT_JOBS} active)`);

  let tempGcodePath: string | null = null;

  try {
    // Validate input file exists
    if (!fs.existsSync(stlPath)) {
      throw new Error(`STL file not found: ${stlPath}`);
    }

    // Get printer profile
    const profilePath = getPrinterProfile(printerType);
    console.log(`📋 Using profile: ${profilePath}`);

    // Create unique temp G-code output path
    const uniqueId = crypto.randomUUID();
    tempGcodePath = path.join('/tmp/slicer', `${uniqueId}.gcode`);
    
    // Ensure temp directory exists
    fs.mkdirSync('/tmp/slicer', { recursive: true });

    console.log(`🚀 Slicing with OrcaSlicer...`);
    console.log(`   Input: ${path.basename(stlPath)}`);
    console.log(`   Printer: ${printerType}`);
    console.log(`   Material: ${material}`);
    console.log(`   Output: ${tempGcodePath}`);

    // Execute OrcaSlicer with xvfb (headless)
    const { stdout, stderr } = await execFileAsync(
      'xvfb-run',
      [
        '-a',
        'orca-slicer',
        '--load', profilePath,
        '--export-gcode',
        stlPath,
        '--output', tempGcodePath,
      ],
      {
        timeout: 90000, // 90 second timeout
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      }
    );

    if (stdout) console.log(`📤 OrcaSlicer stdout:`, stdout);
    if (stderr) console.log(`⚠️  OrcaSlicer stderr:`, stderr);

    // Verify G-code was generated
    if (!fs.existsSync(tempGcodePath)) {
      throw new Error('OrcaSlicer did not generate G-code file');
    }

    // Read and parse G-code
    const gcodeContent = fs.readFileSync(tempGcodePath, 'utf-8');
    console.log(`📊 G-code size: ${(gcodeContent.length / 1024).toFixed(2)} KB`);

    // Extract metadata
    const filamentGrams = parseFilamentGrams(gcodeContent);
    const printTimeSeconds = parsePrintTimeSeconds(gcodeContent);

    if (filamentGrams === null || printTimeSeconds === null) {
      console.error('❌ Failed to parse G-code metadata');
      console.log('First 2000 chars of G-code:');
      console.log(gcodeContent.substring(0, 2000));
      throw new Error('Failed to parse filament usage or print time from G-code');
    }

    console.log(`✅ Slicing complete!`);
    console.log(`   Filament: ${filamentGrams.toFixed(2)}g`);
    console.log(`   Print time: ${(printTimeSeconds / 3600).toFixed(2)}h (${printTimeSeconds}s)`);

    // Calculate pricing
    const finalPrice = calculatePrice(filamentGrams, printTimeSeconds, material, quantity);
    console.log(`   Price: ₹${finalPrice} (${quantity}x units)`);

    return {
      accurate: true,
      filament_grams: Math.round(filamentGrams * 10) / 10,
      print_time_seconds: printTimeSeconds,
      final_price: finalPrice,
    };

  } catch (error: any) {
    console.error('❌ Slicing failed:', error.message);
    
    return {
      accurate: false,
      filament_grams: 0,
      print_time_seconds: 0,
      final_price: 0,
      error: error.message,
    };

  } finally {
    // Cleanup temp G-code file
    if (tempGcodePath && fs.existsSync(tempGcodePath)) {
      try {
        fs.unlinkSync(tempGcodePath);
        console.log(`🗑️  Cleaned up: ${path.basename(tempGcodePath)}`);
      } catch (err) {
        console.warn(`⚠️  Failed to cleanup ${tempGcodePath}:`, err);
      }
    }

    // Decrement active jobs
    activeSlicingJobs--;
    console.log(`✓ Slicing job complete (${activeSlicingJobs}/${MAX_CONCURRENT_JOBS} active)`);
  }
}
