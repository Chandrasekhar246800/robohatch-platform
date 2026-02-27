/**
 * STL Analysis API Route - Next.js App Router
 * 
 * POST /api/analyze
 * 
 * Analyzes uploaded STL files for 3D printing price estimation
 * Uses PrusaSlicer CLI to extract filament usage and print time
 * 
 * @runtime nodejs (NOT edge - requires child_process and fs)
 * @security Command injection prevention via execFile
 * @security File validation and size limits
 * @security Automatic cleanup of temporary files
 */

import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Force Node.js runtime (required for child_process and fs)
export const runtime = 'nodejs';

const execFileAsync = promisify(execFile);
const fsPromises = fs.promises;

// Constants
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const SLICE_TIMEOUT = 60000; // 60 seconds
const PRUSA_SLICER_PATH = process.env.PRUSA_SLICER_PATH || 'prusa-slicer';
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/tmp/stl-uploads';

// Pricing configuration
const PRICING = {
  materialCostPerGram: 1.2,      // ₹1.2 per gram
  machineCostPerHour: 25,        // ₹25 per hour
  electricityCostPerHour: 5,     // ₹5 per hour
  profitMarginPercent: 40,       // 40% profit margin
};

/**
 * Validate STL file
 * @security Prevents path traversal attacks
 */
function validateSTLFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  if (ext !== '.stl') {
    return false;
  }

  // Prevent path traversal
  const basename = path.basename(filename);
  if (basename !== filename || filename.includes('..')) {
    return false;
  }

  return true;
}

/**
 * Ensure upload directory exists
 */
async function ensureUploadDir(): Promise<void> {
  try {
    await fsPromises.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
}

/**
 * Save uploaded file
 */
async function saveTemporaryFile(fileBuffer: Buffer): Promise<string> {
  await ensureUploadDir();
  
  const uniqueId = crypto.randomUUID();
  const filename = `${uniqueId}.stl`;
  const filePath = path.join(UPLOAD_DIR, filename);

  await fsPromises.writeFile(filePath, fileBuffer);
  return filePath;
}

/**
 * Run PrusaSlicer to slice the STL file
 * @security Uses execFile (NOT exec) to prevent command injection
 */
async function sliceSTL(stlPath: string): Promise<string> {
  const gcodeFilename = stlPath.replace('.stl', '.gcode');

  try {
    // Use execFile with argument array - prevents command injection
    await execFileAsync(
      PRUSA_SLICER_PATH,
      [
        '--export-gcode',
        stlPath,
        '--output',
        gcodeFilename,
      ],
      {
        timeout: SLICE_TIMEOUT,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      }
    );

    // Verify G-code file was created
    await fsPromises.access(gcodeFilename, fs.constants.R_OK);

    return gcodeFilename;
  } catch (error: any) {
    if (error.killed) {
      throw new Error('Slicing timeout - file too complex');
    }
    throw new Error(`PrusaSlicer failed: ${error.message}`);
  }
}

/**
 * Parse G-code file to extract metadata
 */
async function parseGCode(gcodePath: string): Promise<{ filamentGrams: number; printTimeSeconds: number }> {
  const content = await fsPromises.readFile(gcodePath, 'utf-8');
  const lines = content.split('\n');

  let filamentGrams: number | null = null;
  let printTimeSeconds: number | null = null;

  for (const line of lines) {
    // Extract filament: "; filament used [g] = 98.2"
    const filamentMatch = line.match(/;\s*filament used \[g\]\s*=\s*([\d.]+)/i);
    if (filamentMatch) {
      filamentGrams = parseFloat(filamentMatch[1]);
    }

    // Extract time: "; estimated printing time (normal mode) = 3h 24m 12s"
    const timeMatch = line.match(/;\s*estimated printing time \(normal mode\)\s*=\s*(.+)/i);
    if (timeMatch) {
      printTimeSeconds = parseTimeString(timeMatch[1].trim());
    }

    if (filamentGrams !== null && printTimeSeconds !== null) {
      break;
    }
  }

  if (filamentGrams === null || printTimeSeconds === null) {
    throw new Error('Failed to extract metadata from G-code');
  }

  // Validate extracted values
  if (isNaN(filamentGrams) || filamentGrams < 0 || filamentGrams > 10000) {
    throw new Error('Invalid filament value');
  }

  if (isNaN(printTimeSeconds) || printTimeSeconds < 0 || printTimeSeconds > 1000000) {
    throw new Error('Invalid print time value');
  }

  return { filamentGrams, printTimeSeconds };
}

/**
 * Parse time string like "3h 24m 12s" to total seconds
 */
function parseTimeString(timeStr: string): number {
  let totalSeconds = 0;

  const hoursMatch = timeStr.match(/(\d+)h/);
  if (hoursMatch) {
    totalSeconds += parseInt(hoursMatch[1]) * 3600;
  }

  const minutesMatch = timeStr.match(/(\d+)m/);
  if (minutesMatch) {
    totalSeconds += parseInt(minutesMatch[1]) * 60;
  }

  const secondsMatch = timeStr.match(/(\d+)s/);
  if (secondsMatch) {
    totalSeconds += parseInt(secondsMatch[1]);
  }

  return totalSeconds;
}

/**
 * Calculate final price
 */
function calculatePrice(filamentGrams: number, printTimeSeconds: number): number {
  const printTimeHours = printTimeSeconds / 3600;

  const materialCost = filamentGrams * PRICING.materialCostPerGram;
  const machineCost = printTimeHours * PRICING.machineCostPerHour;
  const electricityCost = printTimeHours * PRICING.electricityCostPerHour;

  const baseCost = materialCost + machineCost + electricityCost;
  const profitMultiplier = 1 + (PRICING.profitMarginPercent / 100);
  const finalPrice = baseCost * profitMultiplier;

  return Math.round(finalPrice);
}

/**
 * Cleanup temporary files
 * Ensures cleanup happens even if errors occur
 */
async function cleanup(filePaths: string[]): Promise<void> {
  for (const filePath of filePaths) {
    try {
      await fsPromises.unlink(filePath);
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

/**
 * POST /api/analyze
 * 
 * Accepts STL file upload and returns analysis results
 */
export async function POST(request: NextRequest) {
  let stlPath: string | null = null;
  let gcodePath: string | null = null;

  try {
    // Parse multipart/form-data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!validateSTLFile(file.name)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only .stl files are allowed' },
        { status: 400 }
      );
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save file temporarily
    stlPath = await saveTemporaryFile(buffer);
    console.log(`✓ Saved STL: ${path.basename(stlPath)}`);

    // Slice with PrusaSlicer
    console.log('⏳ Slicing...');
    gcodePath = await sliceSTL(stlPath);
    console.log(`✓ Sliced: ${path.basename(gcodePath)}`);

    // Parse G-code
    console.log('⏳ Parsing G-code...');
    const { filamentGrams, printTimeSeconds } = await parseGCode(gcodePath);
    console.log(`✓ Extracted: ${filamentGrams}g, ${Math.round(printTimeSeconds / 60)}min`);

    // Calculate price
    const priceInr = calculatePrice(filamentGrams, printTimeSeconds);
    console.log(`✓ Price: ₹${priceInr}`);

    // Cleanup files
    await cleanup([stlPath, gcodePath]);

    // Return success response
    return NextResponse.json({
      success: true,
      filament_grams: filamentGrams,
      print_time_seconds: printTimeSeconds,
      price_inr: priceInr,
    });

  } catch (error: any) {
    console.error('❌ Analysis failed:', error.message);

    // Cleanup on error
    const filesToClean = [stlPath, gcodePath].filter(Boolean) as string[];
    if (filesToClean.length > 0) {
      await cleanup(filesToClean);
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Analysis failed',
      },
      { status: 500 }
    );
  }
}

// Only allow POST requests
export async function GET() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed. Use POST with multipart/form-data' },
    { status: 405 }
  );
}
