import fs from 'fs';
import path from 'path';

export interface STLAnalysisResult {
  accurate: boolean;
  filament_grams: number;
  print_time_seconds: number;
  final_price: number;
  volume_mm3?: number;
  error?: string;
  debug?: boolean;
}

const MATERIAL_DENSITIES: Record<string, number> = {
  pla: 1.24,    // g/cm³
  abs: 1.04,
  petg: 1.27,
  tpu: 1.21,
};

/**
 * Parse binary STL file and calculate volume
 * Binary STL format:
 * - 80 byte header
 * - 4 bytes: number of triangles (uint32)
 * - For each triangle (50 bytes):
 *   - 12 bytes: normal vector (3x float32)
 *   - 36 bytes: 3 vertices (3x 3x float32)
 *   - 2 bytes: attribute byte count
 */
function parseSTLVolume(filePath: string): number {
  const buffer = fs.readFileSync(filePath);
  
  // Check if ASCII STL (starts with "solid")
  const header = buffer.toString('ascii', 0, 5);
  if (header === 'solid') {
    // ASCII STL - not supported for accurate volume
    console.log('⚠️  ASCII STL detected - using rough estimate');
    // Use file size as rough estimate (1MB ≈ 10cm³)
    const fileSizeMB = buffer.length / (1024 * 1024);
    return fileSizeMB * 10000; // mm³
  }
  
  // Binary STL
  const triangleCount = buffer.readUInt32LE(80);
  console.log(`📊 STL has ${triangleCount} triangles`);
  
  let volume = 0;
  let offset = 84; // Start of first triangle
  
  // Calculate signed volume using divergence theorem
  for (let i = 0; i < triangleCount; i++) {
    // Skip normal (12 bytes)
    offset += 12;
    
    // Read 3 vertices
    const v1 = {
      x: buffer.readFloatLE(offset),
      y: buffer.readFloatLE(offset + 4),
      z: buffer.readFloatLE(offset + 8),
    };
    offset += 12;
    
    const v2 = {
      x: buffer.readFloatLE(offset),
      y: buffer.readFloatLE(offset + 4),
      z: buffer.readFloatLE(offset + 8),
    };
    offset += 12;
    
    const v3 = {
      x: buffer.readFloatLE(offset),
      y: buffer.readFloatLE(offset + 4),
      z: buffer.readFloatLE(offset + 8),
    };
    offset += 12;
    
    // Signed volume of tetrahedron formed by triangle and origin
    // V = (1/6) * dot(v1, cross(v2, v3))
    const cross = {
      x: v2.y * v3.z - v2.z * v3.y,
      y: v2.z * v3.x - v2.x * v3.z,
      z: v2.x * v3.y - v2.y * v3.x,
    };
    
    const signedVolume = (v1.x * cross.x + v1.y * cross.y + v1.z * cross.z) / 6.0;
    volume += signedVolume;
    
    // Skip attribute bytes (2 bytes)
    offset += 2;
  }
  
  return Math.abs(volume); // mm³
}

/**
 * Estimate print time based on volume
 * Assumptions:
 * - Average print speed: 50mm/s for perimeters
 * - 20% infill
 * - Layer height: 0.2mm
 * - Rough estimate: 1cm³ ≈ 15-20 minutes
 */
function estimatePrintTime(volumeMm3: number, infillPercentage: number = 20): number {
  const volumeCm3 = volumeMm3 / 1000;
  
  // Base time: ~18 minutes per cm³ for 20% infill
  const baseTimePerCm3 = 18 * 60; // seconds
  
  // Adjust for infill (more infill = more time)
  const infillFactor = 0.7 + (infillPercentage / 100) * 0.6;
  
  // Add setup/overhead time (homing, heating, etc.) - ~3 minutes
  const setupTime = 180;
  
  const printTime = (volumeCm3 * baseTimePerCm3 * infillFactor) + setupTime;
  
  return Math.round(printTime);
}

/**
 * Analyze STL file without external slicers
 */
export async function analyzeSTLFile({
  inputPath,
  material,
  quantity = 1,
  infillPercentage = 20,
}: {
  inputPath: string;
  material: string;
  quantity?: number;
  infillPercentage?: number;
}): Promise<STLAnalysisResult> {
  console.log('🔬 Analyzing STL with JavaScript parser...');
  console.log(`   File: ${path.basename(inputPath)}`);
  console.log(`   Material: ${material}, Quantity: ${quantity}, Infill: ${infillPercentage}%`);
  
  try {
    // Parse STL and calculate volume
    const volumeMm3 = parseSTLVolume(inputPath);
    const volumeCm3 = volumeMm3 / 1000;
    
    console.log(`📐 Volume: ${volumeCm3.toFixed(2)} cm³ (${volumeMm3.toFixed(0)} mm³)`);
    
    // Calculate filament weight
    const materialDensity = MATERIAL_DENSITIES[material.toLowerCase()] || 1.24;
    const totalVolumeCm3 = volumeCm3 * (infillPercentage / 100); // Account for infill
    const filamentGrams = totalVolumeCm3 * materialDensity;
    
    console.log(`⚖️  Filament: ${filamentGrams.toFixed(1)}g (density: ${materialDensity}g/cm³)`);
    
    // Estimate print time
    const printTimeSeconds = estimatePrintTime(volumeMm3, infillPercentage);
    const printTimeHours = printTimeSeconds / 3600;
    
    console.log(`⏱️  Print time: ${printTimeHours.toFixed(2)} hours (${printTimeSeconds}s)`);
    
    // Return data for frontend (debug mode - no pricing)
    return {
      accurate: true,
      filament_grams: Math.round(filamentGrams * 10) / 10, // Round to 1 decimal
      print_time_seconds: printTimeSeconds,
      final_price: 0,
      volume_mm3: volumeMm3,
      debug: true,
    };
  } catch (error: any) {
    console.error('❌ STL analysis failed:', error.message);
    return {
      accurate: false,
      filament_grams: 0,
      print_time_seconds: 0,
      final_price: 0,
      error: error.message,
    };
  }
}
