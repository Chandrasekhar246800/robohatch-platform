import fs from 'fs';
import path from 'path';
// @ts-ignore - no types available for adm-zip
import AdmZip from 'adm-zip';
import * as stlParser from 'stl-parser';

// Material densities in g/cm³
const MATERIAL_DENSITIES: Record<string, number> = {
  pla: 1.24,
  abs: 1.04,
  petg: 1.27,
  tpu: 1.21,
};

export interface MeshWeightResult {
  weight_grams: number;
  raw_material_cost: number;
  volume_cm3: number;
  debug: {
    volume_mm3: number;
    scaled_volume_cm3: number;
    effective_volume_cm3: number;
    material_density: number;
    infill_factor: number;
  };
}

/**
 * Parse 3MF XML model data
 */
function parse3MFModel(xml: string): { positions: number[] } {
  const positions: number[] = [];
  
  // Extract vertices
  const vertexRegex = /<vertex\s+x="([^"]+)"\s+y="([^"]+)"\s+z="([^"]+)"/g;
  const vertices: { x: number; y: number; z: number }[] = [];
  let match;
  
  while ((match = vertexRegex.exec(xml)) !== null) {
    vertices.push({
      x: parseFloat(match[1]),
      y: parseFloat(match[2]),
      z: parseFloat(match[3])
    });
  }
  
  console.log(`   Found ${vertices.length} vertices`);
  
  // Extract triangles
  const triangleRegex = /<triangle\s+v1="(\d+)"\s+v2="(\d+)"\s+v3="(\d+)"/g;
  let triangleCount = 0;
  
  while ((match = triangleRegex.exec(xml)) !== null) {
    const v1 = vertices[parseInt(match[1])];
    const v2 = vertices[parseInt(match[2])];
    const v3 = vertices[parseInt(match[3])];
    
    if (v1 && v2 && v3) {
      positions.push(v1.x, v1.y, v1.z);
      positions.push(v2.x, v2.y, v2.z);
      positions.push(v3.x, v3.y, v3.z);
      triangleCount++;
    }
  }
  
  console.log(`   Found ${triangleCount} triangles`);
  
  return { positions };
}

/**
 * Load and parse 3MF file (ZIP archive with XML)
 */
function load3MF(filePath: string): { positions: number[] } {
  const zip = new AdmZip(filePath);
  const zipEntries = zip.getEntries();
  
  // Find 3D model file (usually in 3D/3dmodel.model)
  let modelEntry = zipEntries.find((entry: any) => 
    entry.entryName.endsWith('.model') || entry.entryName.includes('3dmodel')
  );
  
  if (!modelEntry) {
    console.log('   Available entries:', zipEntries.map((e: any) => e.entryName).join(', '));
    throw new Error('No 3D model found in 3MF file');
  }
  
  console.log(`   Found model: ${modelEntry.entryName}`);
  const modelXML = modelEntry.getData().toString('utf8');
  return parse3MFModel(modelXML);
}

/**
 * Load and parse STL file using stl-parser
 */
async function loadSTL(filePath: string): Promise<{ positions: number[] }> {
  const fileBuffer = fs.readFileSync(filePath);
  
  // Parse STL using stl-parser library
  const result = await stlParser.toObject(fileBuffer);
  
  if (!result || !result.facets || result.facets.length === 0) {
    throw new Error('No facets found in STL file');
  }
  
  const positions: number[] = [];
  
  // Extract vertex positions from facets
  for (const facet of result.facets) {
    // Each facet has 3 vertices with x, y, z coordinates
    for (const vertex of facet.vertices) {
      positions.push(vertex[0], vertex[1], vertex[2]);
    }
  }
  
  console.log(`   Found ${result.facets.length} triangles`);
  
  return { positions };
}

/**
 * Compute mesh volume using signed tetrahedron formula
 * Volume = (1/6) * |p1 · (p2 × p3)|
 */
function computeVolume(positions: number[]): number {
  let volume = 0;
  
  // Process triangles in groups of 9 values (3 vertices × 3 coordinates)
  for (let i = 0; i < positions.length; i += 9) {
    const p1x = positions[i];
    const p1y = positions[i + 1];
    const p1z = positions[i + 2];
    
    const p2x = positions[i + 3];
    const p2y = positions[i + 4];
    const p2z = positions[i + 5];
    
    const p3x = positions[i + 6];
    const p3y = positions[i + 7];
    const p3z = positions[i + 8];
    
    // Calculate cross product: p2 × p3
    const crossX = p2y * p3z - p2z * p3y;
    const crossY = p2z * p3x - p2x * p3z;
    const crossZ = p2x * p3y - p2y * p3x;
    
    // Calculate dot product: p1 · (p2 × p3)
    const dot = p1x * crossX + p1y * crossY + p1z * crossZ;
    
    // Signed volume of tetrahedron
    volume += dot / 6.0;
  }
  
  return Math.abs(volume); // Return absolute volume in mm³
}

/**
 * Calculate weight and raw material cost for uploaded 3D file
 */
export async function calculateWeight({
  filePath,
  material,
  scalePercent = 100,
  infillPercent = 20,
  pricePerGram = 4,
}: {
  filePath: string;
  material: string;
  scalePercent?: number;
  infillPercent?: number;
  pricePerGram?: number;
}): Promise<MeshWeightResult> {
  try {
    console.log('🔬 Calculating mesh weight...');
    console.log(`   File: ${path.basename(filePath)}`);
    console.log(`   Material: ${material}`);
    console.log(`   Scale: ${scalePercent}%`);
    console.log(`   Infill: ${infillPercent}%`);
    
    // Validate file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    // Validate file size
    const stats = fs.statSync(filePath);
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (stats.size > MAX_FILE_SIZE) {
      throw new Error(`File too large: ${(stats.size / 1024 / 1024).toFixed(2)}MB (max 50MB)`);
    }
    
    // Load geometry based on file extension
    const ext = path.extname(filePath).toLowerCase();
    let geometryData: { positions: number[] };
    
    if (ext === '.stl') {
      console.log('📦 Loading STL file...');
      geometryData = await loadSTL(filePath);
    } else if (ext === '.3mf') {
      console.log('📦 Loading 3MF file...');
      geometryData = load3MF(filePath);
    } else {
      throw new Error(`Unsupported file type: ${ext}. Only .stl and .3mf are supported.`);
    }
    
    if (!geometryData.positions || geometryData.positions.length === 0) {
      throw new Error('No geometry data found in file');
    }
    
    // Calculate volume in mm³
    const volumeMm3 = computeVolume(geometryData.positions);
    console.log(`📐 Mesh volume: ${volumeMm3.toFixed(2)} mm³`);
    
    // Convert to cm³ (1 cm³ = 1000 mm³)
    const volumeCm3 = volumeMm3 / 1000;
    console.log(`   Volume: ${volumeCm3.toFixed(2)} cm³`);
    
    // Apply scale factor (cube of scale percentage)
    const scaleFactor = scalePercent / 100;
    const scaledVolumeCm3 = volumeCm3 * Math.pow(scaleFactor, 3);
    console.log(`   Scaled volume (${scalePercent}%): ${scaledVolumeCm3.toFixed(2)} cm³`);
    
    // Apply infill + shell factor
    // Formula: 0.15 (shell/walls) + (infill/100)
    const infillFactor = 0.15 + (infillPercent / 100);
    const effectiveVolumeCm3 = scaledVolumeCm3 * infillFactor;
    console.log(`   Effective volume (${infillPercent}% infill): ${effectiveVolumeCm3.toFixed(2)} cm³`);
    
    // Get material density
    const density = MATERIAL_DENSITIES[material.toLowerCase()] || MATERIAL_DENSITIES.pla;
    console.log(`   Material density: ${density} g/cm³`);
    
    // Calculate weight in grams
    const weightGrams = Math.round(effectiveVolumeCm3 * density);
    console.log(`⚖️  Weight: ${weightGrams}g`);
    
    // Calculate raw material cost
    const rawCost = Math.round(weightGrams * pricePerGram);
    console.log(`💰 Raw material cost: ₹${rawCost} (${pricePerGram}₹/g)`);
    
    return {
      weight_grams: weightGrams,
      raw_material_cost: rawCost,
      volume_cm3: parseFloat(volumeCm3.toFixed(2)),
      debug: {
        volume_mm3: volumeMm3,
        scaled_volume_cm3: scaledVolumeCm3,
        effective_volume_cm3: effectiveVolumeCm3,
        material_density: density,
        infill_factor: infillFactor,
      },
    };
  } catch (error: any) {
    console.error('❌ Error calculating mesh weight:', error.message);
    throw error;
  }
}
