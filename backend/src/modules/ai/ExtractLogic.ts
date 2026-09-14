import type { AiConfig } from '../../config/index.js';
import { MEAL_TYPES, MICRONUTRIENT_KEYS } from '../../common/nutrition.js';
import { parseJsonContent, type IChatProvider } from '../../providers/ai/index.js';
import { sanitiseExtraction } from './extraction.sanitiser.js';
import type { IExtractLogic } from './IExtractLogic.js';
import type { ExtractionResult, RawExtraction } from './models/extraction.models.js';

const responseSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'source',
    'suggestedMealType',
    'confidence',
    'notes',
    'foodName',
    'quantity',
    'unit',
    'calories',
    'proteinGrams',
    'carbGrams',
    'fatGrams',
    'micronutrients',
    'components',
  ],
  properties: {
    source: {
      type: 'string',
      enum: ['nutrition_label', 'meal_photo'],
      description: 'Whether the image shows a packaged nutrition label or a plate of food.',
    },
    suggestedMealType: {
      type: ['string', 'null'],
      enum: [...MEAL_TYPES, null],
      description: 'Best guess at the meal, or null if the image gives no clue.',
    },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    notes: {
      type: ['string', 'null'],
      description: 'One short sentence naming the main assumption, or null.',
    },
    foodName: { type: 'string', description: 'Name for the whole entry.' },
    quantity: { type: 'number', description: 'Portion amount, matching unit.' },
    unit: { type: 'string', description: 'For example g, ml, plate, bowl, piece.' },
    calories: { type: 'number', description: 'Total for the whole entry.' },
    proteinGrams: { type: 'number' },
    carbGrams: { type: 'number' },
    fatGrams: { type: 'number' },
    micronutrients: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['nutrient', 'amount'],
        properties: {
          nutrient: { type: 'string', enum: MICRONUTRIENT_KEYS },
          amount: { type: 'number', description: 'Amount in the canonical unit for this nutrient.' },
        },
      },
    },
    components: {
      type: 'array',
      description: 'The foods that add up to the totals above. Empty for a single product.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'quantity', 'unit', 'calories', 'proteinGrams', 'carbGrams', 'fatGrams'],
        properties: {
          name: { type: 'string', description: 'Food name only, e.g. "white bread".' },
          quantity: { type: 'number', description: 'Portion amount for this food.' },
          unit: { type: 'string', description: 'For example g, cup, slice, serving.' },
          calories: { type: 'number' },
          proteinGrams: { type: 'number' },
          carbGrams: { type: 'number' },
          fatGrams: { type: 'number' },
        },
      },
    },
  },
} as const;

const SYSTEM_PROMPT = `You read food images for a calorie tracker. Reply with one JSON object that fills a food diary.

TWO KINDS OF IMAGE

Nutrition label on packaging:
- Read the printed numbers. Never estimate them.
- Use the serving size printed on the label for quantity and unit, e.g. 40 with unit "g", or 1 with unit "bar".
- If both "per serving" and "per 100 g" are printed, use per serving.
- foodName is the product name. Leave components empty.

Plate, bowl or glass of food:
- foodName names the meal as a whole, e.g. "Fried egg on toast with ham and salad".
- Set the top-level quantity to 1 and unit to what holds it: "plate", "bowl", "glass".
- List every distinct food you can see in components. Each component needs its own name (food only, no portion in the name), quantity, unit, calories, proteinGrams, carbGrams and fatGrams. Judge portions against the plate, cutlery or hand for scale.
- Top-level calories, proteinGrams, carbGrams and fatGrams are the totals for the whole plate. They must equal the sums of the matching component fields.

ALWAYS
- Macros are in grams.
- Keep the numbers self-consistent: protein 4 kcal/g, carbohydrate 4 kcal/g, fat 9 kcal/g.
- micronutrients: only what a label prints or what is clearly present in a recognised food. At most 6. Never pad with zeros.
- confidence: "high" only for a legible label, "medium" for a clear plate of recognisable food, "low" when the image is blurred or cropped, the food is unidentifiable, or the portion is a guess.
- notes: at most one short sentence, naming the main assumption. Use null if there is nothing worth saying.
- If the image shows neither food nor a nutrition label, reply with an empty foodName and 0 calories.
- Output the JSON object only. No explanation, no markdown.`;


const MAX_RESPONSE_TOKENS = 1400;

export class ExtractLogic implements IExtractLogic {
  constructor(
    private readonly chatProvider: IChatProvider,
    private readonly config: AiConfig,
  ) {}

  isConfigured(): boolean {
    return this.chatProvider.isConfigured();
  }

  async extractNutritionFromImage(
    imageBuffer: Buffer,
    mimeType: string,
  ): Promise<ExtractionResult> {
    const dataUrl = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;

    const completion = await this.chatProvider.complete({
      temperature: 0,
      maxTokens: MAX_RESPONSE_TOKENS,
      reasoningEffort: this.config.reasoningEffort,
      rejectionMessage:
        'The AI service could not read this file. It may be corrupt, too small, or in a format the model does not support.',
      jsonSchema: { name: 'nutrition_extraction', schema: responseSchema },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract the nutrition information from this image.' },
            { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
          ],
        },
      ],
    });

    return sanitiseExtraction(parseJsonContent<RawExtraction>(completion.content));
  }
}
