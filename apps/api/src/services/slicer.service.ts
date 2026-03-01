import fs from 'fs';
import path from 'path';
import { analyzeSTLFile, STLAnalysisResult } from './stl-analyzer.service';

export interface SlicerResult {
  accurate: boolean;
  filament_grams: number;
  print_time_seconds: number;
  final_price: number;
  error?: string;
  logs?: string;
  debug?: boolean;
}

export async function slice3DFile({
  inputPath,
  material,
  quantity = 1,
  printerType,
  infillPercentage = 20,
}: {
  inputPath: string;
  material: string;
  quantity?: number;
  printerType: string;
  infillPercentage?: number;
}): Promise<SlicerResult> {
  console.log('🔬 Starting JavaScript-based STL analysis...');
  console.log(`   Input: ${path.basename(inputPath)}`);
  console.log(`   Material: ${material}, Printer: ${printerType}`);
  
  try {
    // Use pure JavaScript STL analyzer (no external dependencies)
    const result = await analyzeSTLFile({
      inputPath,
      material,
      quantity,
      infillPercentage,
    });
    
    if (result.accurate) {
      console.log('✅ STL analysis complete!');
      console.log(`   Weight: ${result.filament_grams}g`);
      console.log(`   Time: ${(result.print_time_seconds / 3600).toFixed(2)}h`);
    }
    
    return result;
  } catch (error: any) {
    console.error('❌ STL analysis error:', error.message);
    return {
      accurate: false,
      filament_grams: 0,
      print_time_seconds: 0,
      final_price: 0,
      error: error.message,
    };
  }
}
