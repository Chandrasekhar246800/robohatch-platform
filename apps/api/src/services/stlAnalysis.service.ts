
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
const execFileAsync = promisify(execFile);
const fsPromises = fs.promises;

// PART 1: Startup check for PrusaSlicer
const PRUSA_SLICER_PATH = process.env.PRUSA_SLICER_PATH || 'prusa-slicer';
let prusaSlicerAvailable = false;
execFile(PRUSA_SLICER_PATH, ['--version'], (err, stdout, stderr) => {
  if (err) {
    console.error('[Startup] PrusaSlicer not installed or not in PATH');
    prusaSlicerAvailable = false;
  } else {
    prusaSlicerAvailable = true;
    console.log(`[Startup] PrusaSlicer found: ${stdout.trim()}`);
  }
});

/**
 * STL Analysis Service - Production-ready 3D print price analysis
 * 
 * Uses PrusaSlicer CLI to slice STL files and extract:
 * - Filament usage (grams)
 * - Print time (seconds)
 * - Accurate price calculation using simplified formula: weight (grams) × ₹4.5
 * 
 * @security Prevents command injection via execFile with argument array
 * @security Validates file extensions and sanitizes paths
 * @security Implements timeouts to prevent hanging processes
 */


interface STLAnalysisResult {
  success: boolean;
  filament_grams?: number;
  print_time_seconds?: number;
  price_inr?: number;
  volume_cm3?: number;
  resin_price_inr?: number;
  accurate?: boolean;
  error?: string;
}

interface PricingConfig {
  materialCostPerGram: number;  // INR per gram
  machineCostPerHour: number;   // INR per hour
  electricityCostPerHour: number; // INR per hour
  profitMarginPercent: number;  // Percentage
}

// Default pricing configuration (kept for interface compatibility)
// Actual pricing now uses simplified formula: weight × ₹4.5
const DEFAULT_PRICING: PricingConfig = {
  materialCostPerGram: 4.5,      // ₹4.5 per gram (simplified pricing)
  machineCostPerHour: 0,         // Not used in simplified formula
  electricityCostPerHour: 0,     // Not used in simplified formula
  profitMarginPercent: 0,        // Not used in simplified formula
};

export class STLAnalysisService {

  private uploadDir: string;
  private prusaSlicerPath: string;
  private sliceTimeout: number;
  private printerProfilePath: string;

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads', 'temp');
    this.prusaSlicerPath = PRUSA_SLICER_PATH;
    this.sliceTimeout = 60000;
    this.printerProfilePath = path.resolve(process.cwd(), 'printer-profile.ini');
    this.ensureUploadDir();
    // PART 2: Check printer profile exists
    if (!fs.existsSync(this.printerProfilePath)) {
      console.error('[Startup] printer-profile.ini missing at', this.printerProfilePath);
    }
  }

  /**
   * Ensure upload directory exists
   */
  private async ensureUploadDir(): Promise<void> {
    try {
      await fsPromises.mkdir(this.uploadDir, { recursive: true });
    } catch (error: any) {
      console.error('Failed to create upload directory:', error.message);
    }
  }

  /**
   * Validate STL file
   * @security Prevents path traversal and validates file type
   */
  private validate3DFile(filename: string): boolean {
    // Allow .stl, .3mf, .obj, .gcode
    const ext = path.extname(filename).toLowerCase();
    if (!['.stl', '.3mf', '.obj', '.gcode'].includes(ext)) {
      return false;
    }

    // Prevent path traversal
    const basename = path.basename(filename);
    if (basename !== filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return false;
    }

    return true;
  }

  /**
   * Save uploaded file buffer to temporary location
   * @returns Path to saved file
   */
  private async saveTemporaryFile(fileBuffer: Buffer, originalFilename: string): Promise<string> {
    // Generate unique filename to prevent collisions
    const uniqueId = crypto.randomUUID();
    const ext = path.extname(originalFilename);
    const filename = `${uniqueId}${ext}`;
    const filePath = path.join(this.uploadDir, filename);

    await fsPromises.writeFile(filePath, fileBuffer);
    return filePath;
  }

  /**
   * Run PrusaSlicer to slice the STL file
   * @security Uses execFile with argument array to prevent command injection
   */
  private async sliceSTL(stlPath: string): Promise<{ gcodePath: string; stdout: string; stderr: string }> {
    // PART 2: Use real printer profile
    if (!fs.existsSync(this.printerProfilePath)) {
      throw new Error(`printer-profile.ini missing at ${this.printerProfilePath}`);
    }
    const gcodeFilename = stlPath.replace(/\.(stl|3mf|obj)$/i, '.gcode');
    try {
      const { stdout, stderr } = await execFileAsync(
        this.prusaSlicerPath,
        [
          '--load', this.printerProfilePath,
          '--export-gcode',
          stlPath,
          '--output',
          gcodeFilename,
        ],
        {
          timeout: this.sliceTimeout,
          maxBuffer: 10 * 1024 * 1024,
        }
      );
      // PART 3: Log raw slicer output
      console.log('[SLICER STDOUT]', stdout);
      if (stderr) console.warn('[SLICER STDERR]', stderr);
      // Verify G-code file was created
      await fsPromises.access(gcodeFilename, fs.constants.R_OK);
      return { gcodePath: gcodeFilename, stdout, stderr };
    } catch (error: any) {
      if (error.killed) throw new Error('Slicing timeout - file too complex or PrusaSlicer hung');
      throw new Error(`PrusaSlicer failed: ${error.message}`);
    }
  }

  /**
   * Parse G-code file to extract metadata
   * Extracts:
   * - filament used [g] = 98.2
   * - estimated printing time (normal mode) = 3h 24m 12s
   */
  private async parseGCode(gcodePath: string): Promise<{ filamentGrams: number; printTimeSeconds: number }> {
    const content = await fsPromises.readFile(gcodePath, 'utf-8');
    const lines = content.split('\n');
    let filamentGrams: number | null = null;
    let printTimeSeconds: number | null = null;
    for (const line of lines) {
      const filamentMatch = line.match(/;\s*filament used \[g\]\s*=\s*([\d.]+)/i);
      if (filamentMatch) filamentGrams = parseFloat(filamentMatch[1]);
      const timeMatch = line.match(/;\s*estimated printing time \(normal mode\)\s*=\s*(.+)/i);
      if (timeMatch) printTimeSeconds = this.parseTimeString(timeMatch[1].trim());
      if (filamentGrams !== null && printTimeSeconds !== null) break;
    }
    if (filamentGrams === null || printTimeSeconds === null) {
      console.error('[GCODE PARSE] Failed to parse G-code metadata');
      throw new Error('Failed to parse G-code metadata');
    }
    return { filamentGrams, printTimeSeconds };
  }

  /**
   * Parse time string like "3h 24m 12s" to total seconds
   */
  private parseTimeString(timeStr: string): number {
    let totalSeconds = 0;

    // Match hours: "3h"
    const hoursMatch = timeStr.match(/(\d+)h/);
    if (hoursMatch) {
      totalSeconds += parseInt(hoursMatch[1]) * 3600;
    }

    // Match minutes: "24m"
    const minutesMatch = timeStr.match(/(\d+)m/);
    if (minutesMatch) {
      totalSeconds += parseInt(minutesMatch[1]) * 60;
    }

    // Match seconds: "12s"
    const secondsMatch = timeStr.match(/(\d+)s/);
    if (secondsMatch) {
      totalSeconds += parseInt(secondsMatch[1]);
    }

    return totalSeconds;
  }

  /**
   * Calculate final price based on weight
   * Simplified formula: weight (grams) × ₹4.5
   */
  // PART 5: Resin logic and improved pricing
  private calculatePrice(
    filamentGrams: number,
    printTimeSeconds: number,
    material: string
  ): { price: number; accurate: boolean } {
    // For FDM: price = grams * 4.5
    if (material !== 'resin') {
      const price = Math.round(filamentGrams * 4.5);
      return { price, accurate: true };
    }
    // For resin: estimate volume and price
    const resinDensity = 1.1; // g/cm3 (configurable)
    const resinCostPerCm3 = 3.5; // INR/cm3 (configurable)
    const volumeCm3 = filamentGrams / resinDensity;
    const resinPrice = Math.round(volumeCm3 * resinCostPerCm3);
    return { price: resinPrice, accurate: true };
  }

  /**
   * Cleanup temporary files
   * Ensures cleanup happens even if errors occur
   */
  private async cleanup(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        await fsPromises.unlink(filePath);
        console.log(`✓ Cleaned up: ${path.basename(filePath)}`);
      } catch (error: any) {
        console.error(`Failed to delete ${filePath}:`, error.message);
      }
    }
  }

  /**
   * Main analysis function - Analyze STL file and calculate price
   * 
   * @param fileBuffer - STL file buffer
   * @param originalFilename - Original filename for validation
   * @param customPricing - Optional custom pricing configuration
   * @returns Analysis result with filament, time, and price
   */
  async analyze3DFile(
    fileBuffer: Buffer,
    originalFilename: string,
    material: string = 'pla',
    // infill, layerHeight, support, nozzle, filamentDiameter can be added as needed
  ): Promise<STLAnalysisResult> {
    let tempPath: string | null = null;
    let gcodePath: string | null = null;
    try {
      if (!prusaSlicerAvailable) {
        console.warn('[ANALYSIS] PrusaSlicer not available. Results may be inaccurate.');
      }
      if (!this.validate3DFile(originalFilename)) {
        return { success: false, error: 'Invalid file type. Only .stl, .3mf, .obj, .gcode files are allowed' };
      }
      const maxSize = 50 * 1024 * 1024;
      if (fileBuffer.length > maxSize) {
        return { success: false, error: `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB` };
      }
      tempPath = await this.saveTemporaryFile(fileBuffer, originalFilename);
      console.log(`[ANALYSIS] Saved 3D file: ${path.basename(tempPath)}`);
      const ext = path.extname(originalFilename).toLowerCase();
      if (['.stl', '.3mf', '.obj'].includes(ext)) {
        // PART 2: Use real printer profile
        let slicerResult;
        try {
          console.log('[ANALYSIS] Slicing with PrusaSlicer...');
          slicerResult = await this.sliceSTL(tempPath);
          gcodePath = slicerResult.gcodePath;
          console.log(`[ANALYSIS] Slicing complete: ${path.basename(gcodePath)}`);
        } catch (err: any) {
          console.error('[SLICER ERROR]', err.message);
          return { success: false, error: err.message, accurate: false };
        }
        // PART 3: Log raw slicer output (already done in sliceSTL)
        // PART 4: Print settings (see printer-profile.ini for infill, layer height, etc)
        // To adjust infill dynamically, inject --infill-percentage 20 (for example) into the args array above.
        // PART 7: Fail safe
        let filamentGrams, printTimeSeconds;
        try {
          ({ filamentGrams, printTimeSeconds } = await this.parseGCode(gcodePath));
        } catch (err: any) {
          console.error('[GCODE PARSE ERROR]', err.message);
          await this.cleanup([tempPath, gcodePath]);
          return { success: false, error: err.message, accurate: false };
        }
        // PART 5: Resin logic
        let price, volumeCm3, resinPrice;
        if (material === 'resin') {
          const resinDensity = 1.1;
          const resinCostPerCm3 = 3.5;
          volumeCm3 = filamentGrams / resinDensity;
          resinPrice = Math.round(volumeCm3 * resinCostPerCm3);
          price = resinPrice;
        } else {
          price = Math.round(filamentGrams * 4.5);
        }
        // PART 6: Log accuracy
        console.log(`[RESULT] Filament used: ${filamentGrams.toFixed(1)} grams`);
        console.log(`[RESULT] Print time: ${printTimeSeconds} seconds`);
        console.log(`[RESULT] Final calculated price: ₹${price}`);
        await this.cleanup([tempPath, gcodePath]);
        return {
          success: true,
          filament_grams: filamentGrams,
          print_time_seconds: printTimeSeconds,
          price_inr: price,
          ...(material === 'resin' ? { volume_cm3: volumeCm3, resin_price_inr: resinPrice } : {}),
          accurate: true,
        };
      } else if (ext === '.gcode') {
        // Directly parse G-code
        let filamentGrams, printTimeSeconds;
        try {
          ({ filamentGrams, printTimeSeconds } = await this.parseGCode(tempPath));
        } catch (err: any) {
          console.error('[GCODE PARSE ERROR]', err.message);
          await this.cleanup([tempPath]);
          return { success: false, error: err.message, accurate: false };
        }
        let price, volumeCm3, resinPrice;
        if (material === 'resin') {
          const resinDensity = 1.1;
          const resinCostPerCm3 = 3.5;
          volumeCm3 = filamentGrams / resinDensity;
          resinPrice = Math.round(volumeCm3 * resinCostPerCm3);
          price = resinPrice;
        } else {
          price = Math.round(filamentGrams * 4.5);
        }
        console.log(`[RESULT] Filament used: ${filamentGrams.toFixed(1)} grams`);
        console.log(`[RESULT] Print time: ${printTimeSeconds} seconds`);
        console.log(`[RESULT] Final calculated price: ₹${price}`);
        await this.cleanup([tempPath]);
        return {
          success: true,
          filament_grams: filamentGrams,
          print_time_seconds: printTimeSeconds,
          price_inr: price,
          ...(material === 'resin' ? { volume_cm3: volumeCm3, resin_price_inr: resinPrice } : {}),
          accurate: true,
        };
      } else {
        throw new Error('Unsupported file extension');
      }
    } catch (error: any) {
      console.error('[ANALYSIS ERROR]', error.message);
      const filesToClean = [tempPath, gcodePath].filter(Boolean) as string[];
      if (filesToClean.length > 0) await this.cleanup(filesToClean);
      return { success: false, error: error.message || 'Analysis failed', accurate: false };
    }
  }

  /**
   * Analyze STL from file path (for use with already uploaded files)
   */
  async analyze3DFileFromPath(
    filePath: string,
    customPricing?: Partial<PricingConfig>
  ): Promise<STLAnalysisResult> {
    let gcodePath: string | null = null;
    try {
      // Verify file exists and is readable
      await fsPromises.access(filePath, fs.constants.R_OK);
      const ext = path.extname(filePath).toLowerCase();
      if (!['.stl', '.3mf', '.obj', '.gcode'].includes(ext)) {
        return {
          success: false,
          error: 'File must have .stl, .3mf, .obj, or .gcode extension',
        };
      }
      if (['.stl', '.3mf', '.obj'].includes(ext)) {
        // Slice with PrusaSlicer
        console.log('⏳ Slicing with PrusaSlicer...');
        gcodePath = await this.sliceSTL(filePath);
        console.log(`✓ Slicing complete: ${path.basename(gcodePath)}`);
        // Parse G-code
        console.log('⏳ Parsing G-code...');
        const { filamentGrams, printTimeSeconds } = await this.parseGCode(gcodePath);
        console.log(`✓ Extracted: ${filamentGrams}g filament, ${Math.round(printTimeSeconds / 60)} minutes`);
        // Calculate price
        const priceInr = this.calculatePrice(filamentGrams, printTimeSeconds, customPricing);
        console.log(`✓ Calculated price: ₹${priceInr}`);
        // Cleanup only G-code (keep original file)
        await this.cleanup([gcodePath]);
        return {
          success: true,
          filament_grams: filamentGrams,
          print_time_seconds: printTimeSeconds,
          price_inr: priceInr,
        };
      } else if (ext === '.gcode') {
        // Directly parse G-code
        console.log('⏳ Parsing uploaded G-code...');
        const { filamentGrams, printTimeSeconds } = await this.parseGCode(filePath);
        const priceInr = this.calculatePrice(filamentGrams, printTimeSeconds, customPricing);
        return {
          success: true,
          filament_grams: filamentGrams,
          print_time_seconds: printTimeSeconds,
          price_inr: priceInr,
        };
      } else {
        throw new Error('Unsupported file extension');
      }
    } catch (error: any) {
      console.error('❌ 3D file analysis failed:', error.message);
      // Cleanup G-code on error
      if (gcodePath) {
        await this.cleanup([gcodePath]);
      }
      return {
        success: false,
        error: error.message || 'Analysis failed',
      };
    }
  }
}

export const stlAnalysisService = new STLAnalysisService();
