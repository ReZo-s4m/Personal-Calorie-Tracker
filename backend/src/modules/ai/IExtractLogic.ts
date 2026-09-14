import type { ExtractionResult } from './models/extraction.models.js';

export interface IExtractLogic {
  isConfigured(): boolean;

  /** Reads a plate or a nutrition label into a draft entry. Writes nothing. */
  extractNutritionFromImage(imageBuffer: Buffer, mimeType: string): Promise<ExtractionResult>;
}
