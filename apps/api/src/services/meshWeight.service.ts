import fs from 'fs';
import path from 'path';
import * as THREE from 'three';
// @ts-ignore - no types available for adm-zip
import AdmZip from 'adm-zip';

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
  volume_cm3?: number;
  debug?: {
    volume_mm3: number;
    volume_cm3: number;
    scaled_volume_cm3: number;
    effective_volume_cm3: number;
    density: number;
    infill_factor: number;
  };
}

/**
 * Load and parse STL file using THREE.js
 */
function loadSTL(filePath: string): THREE.BufferGeometry {
  const fileBuffer = fs.readFileSync(filePath);
  
  // Check if binary or ASCII STL
  const header = fileBuffer.toString('utf8', 0, 5);
  if (header === 'solid') {
    return parseASCIISTL(fileBuffer.toString('utf8'));
  } else {
    return parseBinarySTL(fileBuffer);
  }
}

/**
 * Parse binary STL format
 */
function parseBinarySTL(buffer: Buffer): THREE.BufferGeometry {
  const triangleCount = buffer.readUInt32LE(80);
  const positions: number[] = [];
  
  let offset = 84; // Skip 80-byte header + 4-byte triangle count
  
  for (let i = 0; i < triangleCount; i++) {
    // Skip normal vector (12 bytes)
    offset += 12;
    
    // Read 3 vertices (9 floats)
    for (let j = 0; j < 9; j++) {
      positions.push(buffer.readFloatLE(offset));
      offset += 4;
    }
    
    // Skip attribute byte count (2 bytes)
    offset += 2;
  }
  
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  
  return geometry;
}

/**
 * Parse ASCII STL format
 */
function parseASCIISTL(text: string): THREE.BufferGeometry {
  const positions: number[] = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('vertex')) {
      const parts = trimmed.split(/\s+/);
      positions.push(
        parseFloat(parts[1]),
        parseFloat(parts[2]),
        parseFloat(parts[3])
      );
    }
  }
  
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  
  return geometry;
}

/**
 * Load and parse 3MF file (ZIP archive with XML)
 */
function load3MF(filePath: string): THREE.BufferGeometry {
  const zip = new AdmZip(filePath);
  const zipEntries = zip.getEntries();
  
  // Find 3D model file (usually in 3D/3dmodel.model)
  let modelEntry = zipEntries.find((entry: any) => 
    entry.entryName.endsWith('.model') || entry.entryName.endsWith('3dmodel.model')
  );
  
  if (!modelEntry) {
    throw new Error('No 3D model found in 3MF file');
  }
  
  const modelXML = modelEntry.getData().toString('utf8');
  return parse3MFModel(modelXML);
}

/**
 * Parse 3MF XML model data
 */
function parse3MFModel(xml: string): THREE.BufferGeometry {
  const positions: number[] = [];
  
  // Extract vertices
  const vertexRegex = /<vertex\s+x="([^"]+)"\s+y="([^"]+)"\s+z="([^"]+)"/g;
  const vertices: THREE.Vector3[] = [];
  let match;
  
  while ((match = vertexRegex.exec(xml)) !== null) {
    vertices.push(new THREE.Vector3(
      parseFloat(match[1]),
      parseFloat(match[2]),
      parseFloat(match[3])
    ));
  }
  
  // Extract triangles
  const triangleRegex = /<triangle\s+v1="(\d+)"\s+v2="(\d+)"\s+v3="(\d+)"/g;
  
  while ((match = triangleRegex.exec(xml)) !== null) {
    const v1 = vertices[parseInt(match[1])];
    const v2 = vertices[parseInt(match[2])];
    const v3 = vertices[parseInt(match[3])];
    
    if (v1 && v2 && v3) {
      positions.push(v1.x, v1.y, v1.z);
      positions.push(v2.x, v2.y, v2.z);
      positions.push(v3.x, v3.y, v3.z);
    }
  }
  
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  
  return geometry;
}

/**
 * Compute mesh volume using signed tetrahedron formula
 */
function computeVolume(geometry: THREE.BufferGeometry): number {
  const positions = geometry.attributes.position.array;
  let volume = 0;
  
  // Process triangles in groups of 9 values (3 vertices × 3 coordinates)
  for (let i = 0; i < positions.length; i += 9) {
    const p1 = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]);
    const p2 = new THREE.Vector3(positions[i + 3], positions[i + 4], positions[i + 5]);
    const p3 = new THREE.Vector3(positions[i + 6], positions[i + 7], positions[i + 8]);
    
    // Signed volume of tetrahedron: V = (1/6) * p1 · (p2 × p3)
    const cross = new THREE.Vector3().crossVectors(p2, p3);
    volume += p1.dot(cross) / 6.0;
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
    let geometry: THREE.BufferGeometry;
    
    if (ext === '.stl') {
      console.log('📦 Loading STL file...');
      geometry = loadSTL(filePath);
    } else if (ext === '.3mf') {
      console.log('📦 Loading 3MF file...');
      geometry = load3MF(filePath);
    } else {
      throw new Error(`Unsupported file type: ${ext}. Only .stl and .3mf are supported.`);
    }
    
    // Calculate volume in mm³
    const volumeMm3 = computeVolume(geometry);
    console.log(`📐 Mesh volume: ${volumeMm3.toFixed(2)} mm³`);
    
    // Convert to cm³
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
    
    // Cleanup
    geometry.dispose();
    
    return {
      weight_grams: weightGrams,
      raw_material_cost: rawCost,
      volume_cm3: parseFloat(volumeCm3.toFixed(2)),
      debug: {
        volume_mm3: volumeMm3,
        volume_cm3: volumeCm3,
        scaled_volume_cm3: scaledVolumeCm3,
        effective_volume_cm3: effectiveVolumeCm3,
        density,
        infill_factor: infillFactor,
      },
    };
    
  } catch (error: any) {
    console.error('❌ Mesh weight calculation failed:', error.message);
    throw error;
  }
}
