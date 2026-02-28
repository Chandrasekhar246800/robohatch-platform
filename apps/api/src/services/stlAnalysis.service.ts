import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const execFileAsync = promisify(execFile);
const fsPromises = fs.promises;

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

  constructor() {
    // Use /tmp for temporary storage (Linux) or OS temp dir
    this.uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads', 'temp');
    this.prusaSlicerPath = process.env.PRUSA_SLICER_PATH || 'prusa-slicer';
    this.sliceTimeout = 60000; // 60 seconds timeout

    // Ensure upload directory exists
    this.ensureUploadDir();
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
  private async sliceSTL(stlPath: string): Promise<string> {
    const gcodeFilename = stlPath.replace('.stl', '.gcode');

    try {
      // Use execFile (NOT exec) to prevent command injection
      // Arguments passed as array, not concatenated string
      const { stdout, stderr } = await execFileAsync(
        this.prusaSlicerPath,
        [
          '--export-gcode',
          stlPath,
          '--output',
          gcodeFilename,
        ],
        {
          timeout: this.sliceTimeout,
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        }
      );

      if (stderr) {
        console.warn('PrusaSlicer stderr:', stderr);
      }

      if (stdout) {
        console.log('PrusaSlicer stdout:', stdout);
      }

      // Verify G-code file was created
      try {
        await fsPromises.access(gcodeFilename, fs.constants.R_OK);
      } catch {
        throw new Error('G-code file was not generated');
      }

      return gcodeFilename;
    } catch (error: any) {
      if (error.killed) {
        throw new Error('Slicing timeout - file too complex or PrusaSlicer hung');
      }
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
      // Extract filament usage: "; filament used [g] = 98.2"
      const filamentMatch = line.match(/;\s*filament used \[g\]\s*=\s*([\d.]+)/i);
      if (filamentMatch) {
        filamentGrams = parseFloat(filamentMatch[1]);
      }

      // Extract print time: "; estimated printing time (normal mode) = 3h 24m 12s"
      const timeMatch = line.match(/;\s*estimated printing time \(normal mode\)\s*=\s*(.+)/i);
      if (timeMatch) {
        printTimeSeconds = this.parseTimeString(timeMatch[1].trim());
      }

      // Stop searching if we found both values
      if (filamentGrams !== null && printTimeSeconds !== null) {
        break;
      }
    }

    if (filamentGrams === null || printTimeSeconds === null) {
      throw new Error('Failed to extract metadata from G-code - file may be corrupted or incompatible');
    }

    // Validate extracted values
    if (isNaN(filamentGrams) || filamentGrams < 0 || filamentGrams > 10000) {
      throw new Error('Invalid filament value extracted from G-code');
    }

    if (isNaN(printTimeSeconds) || printTimeSeconds < 0 || printTimeSeconds > 1000000) {
      throw new Error('Invalid print time extracted from G-code');
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
  private calculatePrice(
    filamentGrams: number,
    printTimeSeconds: number,
    customPricing?: Partial<PricingConfig>
  ): number {
    // Simplified pricing formula: weight * 4.5
    const finalPrice = filamentGrams * 4.5;

    // Round to nearest integer
    return Math.round(finalPrice);
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
    customPricing?: Partial<PricingConfig>
  ): Promise<STLAnalysisResult> {
    let tempPath: string | null = null;
    let gcodePath: string | null = null;

    try {
      // Validate file type
      if (!this.validate3DFile(originalFilename)) {
        return {
          success: false,
          error: 'Invalid file type. Only .stl, .3mf, .obj, .gcode files are allowed',
        };
      }

      // Check file size (max 50MB)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (fileBuffer.length > maxSize) {
        return {
          success: false,
          error: `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB`,
        };
      }

      // Save file temporarily
      tempPath = await this.saveTemporaryFile(fileBuffer, originalFilename);
      console.log(`✓ Saved 3D file: ${path.basename(tempPath)}`);

      const ext = path.extname(originalFilename).toLowerCase();
      if (['.stl', '.3mf', '.obj'].includes(ext)) {
        // Slice with PrusaSlicer
        console.log('⏳ Slicing with PrusaSlicer...');
        gcodePath = await this.sliceSTL(tempPath);
        console.log(`✓ Slicing complete: ${path.basename(gcodePath)}`);

        // Parse G-code
        console.log('⏳ Parsing G-code...');
        const { filamentGrams, printTimeSeconds } = await this.parseGCode(gcodePath);
        console.log(`✓ Extracted: ${filamentGrams}g filament, ${Math.round(printTimeSeconds / 60)} minutes`);

        // Calculate price
        const priceInr = this.calculatePrice(filamentGrams, printTimeSeconds, customPricing);
        console.log(`✓ Calculated price: ₹${priceInr}`);

        // Cleanup files
        await this.cleanup([tempPath, gcodePath]);

        return {
          success: true,
          filament_grams: filamentGrams,
          print_time_seconds: printTimeSeconds,
          price_inr: priceInr,
        };
      } else if (ext === '.gcode') {
        // Directly parse G-code
        console.log('⏳ Parsing uploaded G-code...');
        const { filamentGrams, printTimeSeconds } = await this.parseGCode(tempPath);
        const priceInr = this.calculatePrice(filamentGrams, printTimeSeconds, customPricing);
        await this.cleanup([tempPath]);
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
      // Cleanup on error
      const filesToClean = [tempPath, gcodePath].filter(Boolean) as string[];
      if (filesToClean.length > 0) {
        await this.cleanup(filesToClean);
      }
      return {
        success: false,
        error: error.message || 'Analysis failed',
      };
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
