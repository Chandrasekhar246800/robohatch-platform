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
  
  console.log(`   📝 XML length: ${xml.length} characters`);
  console.log(`   📝 XML preview: ${xml.substring(0, 500)}...`);
  
  // Extract vertices - flexible regex for any attribute order
  const vertexRegex = /<vertex[^>]*\bx="([^"]+)"[^>]*\by="([^"]+)"[^>]*\bz="([^"]+)"[^>]*\/?>/gi;
  const vertices: { x: number; y: number; z: number }[] = [];
  let match;
  
  while ((match = vertexRegex.exec(xml)) !== null) {
    vertices.push({
      x: parseFloat(match[1]),
      y: parseFloat(match[2]),
      z: parseFloat(match[3])
    });
  }
  
  console.log(`   ✅ Found ${vertices.length} vertices`);
  
  if (vertices.length > 0) {
    console.log(`   📊 First vertex: x=${vertices[0].x}, y=${vertices[0].y}, z=${vertices[0].z}`);
  }
  
  // Extract triangles - flexible regex for any attribute order
  const triangleRegex = /<triangle[^>]*\bv1="(\d+)"[^>]*\bv2="(\d+)"[^>]*\bv3="(\d+)"[^>]*\/?>/gi;
  let triangleCount = 0;
  
  while ((match = triangleRegex.exec(xml)) !== null) {
    const idx1 = parseInt(match[1]);
    const idx2 = parseInt(match[2]);
    const idx3 = parseInt(match[3]);
    
    const v1 = vertices[idx1];
    const v2 = vertices[idx2];
    const v3 = vertices[idx3];
    
    if (v1 && v2 && v3) {
      positions.push(v1.x, v1.y, v1.z);
      positions.push(v2.x, v2.y, v2.z);
      positions.push(v3.x, v3.y, v3.z);
      triangleCount++;
    } else {
      console.log(`   ⚠️ Invalid vertex indices: v1=${idx1}, v2=${idx2}, v3=${idx3}`);
    }
  }
  
  console.log(`   ✅ Found ${triangleCount} triangles`);
  
  if (triangleCount === 0 && vertices.length > 0) {
    console.log(`   ⚠️ Warning: Found vertices but no triangles!`);
    console.log(`   📝 Searching for triangle patterns in XML...`);
    // Log sample of XML around <mesh> tags
    const meshMatch = xml.match(/<mesh[\s\S]{0,1000}/i);
    if (meshMatch) {
      console.log(`   📝 Mesh section: ${meshMatch[0].substring(0, 500)}...`);
    }
  }
  
  return { positions };
}

/**
 * Load and parse 3MF file (ZIP archive with XML)
 */
function load3MF(filePath: string): { positions: number[] } {
  console.log('   📦 Opening 3MF ZIP archive...');
  const zip = new AdmZip(filePath);
  const zipEntries = zip.getEntries();
  
  console.log(`   📦 ZIP contains ${zipEntries.length} files`);
  console.log(`   📦 Available entries: ${zipEntries.map((e: any) => e.entryName).join(', ')}`);
  
  // Find 3D model file (usually in 3D/3dmodel.model)
  let modelEntry = zipEntries.find((entry: any) => 
    entry.entryName.endsWith('.model') || entry.entryName.includes('3dmodel')
  );
  
  if (!modelEntry) {
    throw new Error('No 3D model found in 3MF file');
  }
  
  console.log(`   ✅ Found model: ${modelEntry.entryName}`);
  const modelXML = modelEntry.getData().toString('utf8');
  console.log(`   📄 Model XML size: ${modelXML.length} bytes`);
  
  return parse3MFModel(modelXML);
}

/**
 * Manual binary STL parser (fallback strategy)
 */
function parseBinarySTL(buffer: Buffer): { positions: number[] } {
  console.log('   📝 Trying binary STL parser...');
  
  // Binary STL: 80 byte header + 4 byte triangle count + triangle data
  if (buffer.length < 84) {
    throw new Error('File too small to be binary STL');
  }
  
  // Read triangle count (uint32 at byte 80)
  const triangleCount = buffer.readUInt32LE(80);
  console.log(`   Triangle count from header: ${triangleCount}`);
  
  // Each triangle: 50 bytes (12 normal + 36 vertices + 2 attribute)
  const expectedSize = 84 + (triangleCount * 50);
  if (buffer.length < expectedSize) {
    throw new Error(`File size mismatch: expected ${expectedSize}, got ${buffer.length}`);
  }
  
  const positions: number[] = [];
  let offset = 84; // Skip header + count
  
  for (let i = 0; i < triangleCount; i++) {
    // Skip normal vector (12 bytes)
    offset += 12;
    
    // Read 3 vertices (each 12 bytes = 3 floats)
    for (let v = 0; v < 3; v++) {
      const x = buffer.readFloatLE(offset);
      const y = buffer.readFloatLE(offset + 4);
      const z = buffer.readFloatLE(offset + 8);
      positions.push(x, y, z);
      offset += 12;
    }
    
    // Skip attribute bytes (2 bytes)
    offset += 2;
  }
  
  console.log(`   ✅ Binary parser found ${triangleCount} triangles`);
  return { positions };
}

/**
 * Manual ASCII STL parser (fallback strategy)
 */
function parseAsciiSTL(buffer: Buffer): { positions: number[] } {
  console.log('   📝 Trying ASCII STL parser...');
  
  const content = buffer.toString('utf8');
  const positions: number[] = [];
  
  // Match vertex lines: "vertex x y z"
  const vertexRegex = /vertex\s+([-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?)\s+([-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?)\s+([-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?)/g;
  let match;
  let vertexCount = 0;
  
  while ((match = vertexRegex.exec(content)) !== null) {
    positions.push(
      parseFloat(match[1]),
      parseFloat(match[2]),
      parseFloat(match[3])
    );
    vertexCount++;
  }
  
  if (vertexCount === 0) {
    throw new Error('No vertices found in ASCII STL');
  }
  
  console.log(`   ✅ ASCII parser found ${vertexCount} vertices (${vertexCount / 3} triangles)`);
  return { positions };
}

/**
 * Load and parse STL file with multiple fallback strategies
 */
function loadSTL(filePath: string): { positions: number[] } {
  const fileBuffer = fs.readFileSync(filePath);
  
  console.log(`   File size: ${fileBuffer.length} bytes`);
  
  // Strategy 1: Try stl-parser library first
  try {
    console.log('   📦 Strategy 1: Using stl-parser library...');
    const result = stlParser.toObject(fileBuffer);
    
    if (result && result.facets && result.facets.length > 0) {
      const positions: number[] = [];
      
      // Extract vertex positions from facets
      for (const facet of result.facets) {
        for (const vertex of facet.verts) {
          positions.push(vertex[0], vertex[1], vertex[2]);
        }
      }
      
      console.log(`   ✅ stl-parser found ${result.facets.length} triangles`);
      return { positions };
    }
    
    console.log('   ⚠️ stl-parser returned empty data, trying fallback...');
  } catch (error: any) {
    console.log(`   ⚠️ stl-parser failed: ${error.message}`);
  }
  
  // Strategy 2: Try binary STL parser
  try {
    return parseBinarySTL(fileBuffer);
  } catch (error: any) {
    console.log(`   ⚠️ Binary parser failed: ${error.message}`);
  }
  
  // Strategy 3: Try ASCII STL parser
  try {
    return parseAsciiSTL(fileBuffer);
  } catch (error: any) {
    console.log(`   ⚠️ ASCII parser failed: ${error.message}`);
  }
  
  // All strategies failed
  throw new Error('Could not parse STL file with any available method');
}

/**
 * Compute mesh volume using signed tetrahedron formula
 * Volume = (1/6) * |p1 · (p2 × p3)|
 */
function computeVolume(positions: number[]): number {
  console.log(`   🔢 Computing volume from ${positions.length} position values...`);
  
  if (positions.length === 0) {
    throw new Error('No positions data for volume calculation');
  }
  
  if (positions.length % 9 !== 0) {
    console.log(`   ⚠️ Warning: positions.length (${positions.length}) is not divisible by 9`);
  }
  
  const triangleCount = Math.floor(positions.length / 9);
  console.log(`   📐 Processing ${triangleCount} triangles...`);
  
  let volume = 0;
  let minCoord = Infinity;
  let maxCoord = -Infinity;
  
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
    
    // Track bounding box
    [p1x, p1y, p1z, p2x, p2y, p2z, p3x, p3y, p3z].forEach(coord => {
      minCoord = Math.min(minCoord, coord);
      maxCoord = Math.max(maxCoord, coord);
    });
    
    // Calculate cross product: p2 × p3
    const crossX = p2y * p3z - p2z * p3y;
    const crossY = p2z * p3x - p2x * p3z;
    const crossZ = p2x * p3y - p2y * p3x;
    
    // Calculate dot product: p1 · (p2 × p3)
    const dot = p1x * crossX + p1y * crossY + p1z * crossZ;
    
    // Signed volume of tetrahedron
    volume += dot / 6.0;
  }
  
  const absVolume = Math.abs(volume);
  console.log(`   📊 Bounding box: ${minCoord.toFixed(2)} to ${maxCoord.toFixed(2)} mm`);
  console.log(`   📊 Raw volume: ${volume.toFixed(2)} mm³ (signed)`);
  console.log(`   📊 Absolute volume: ${absVolume.toFixed(2)} mm³`);
  
  return absVolume; // Return absolute volume in mm³
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
      geometryData = loadSTL(filePath);
    } else if (ext === '.3mf') {
      console.log('📦 Loading 3MF file...');
      geometryData = load3MF(filePath);
    } else {
      throw new Error(`Unsupported file type: ${ext}. Only .stl and .3mf are supported.`);
    }
    
    console.log(`   ✅ Geometry loaded successfully`);
    console.log(`   📊 Positions array length: ${geometryData.positions.length}`);
    console.log(`   📊 Triangle count: ${geometryData.positions.length / 9}`);
    
    if (!geometryData.positions || geometryData.positions.length === 0) {
      throw new Error('No geometry data found in file');
    }
    
    if (geometryData.positions.length < 9) {
      throw new Error(`Insufficient geometry data: only ${geometryData.positions.length} values (need at least 9 for one triangle)`);
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
