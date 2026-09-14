import { MEAL_TYPES, type MealType } from '../../../common/nutrition.js';
import type { ImportDraftRow } from '../../../providers/diary/diary-text.parser.js';
import type { ExtractionResult } from '../../ai/models/extraction.models.js';

const COLUMNS: Record<string, keyof ImportDraftRow> = {
  food: 'foodName',
  name: 'foodName',
  meal: 'mealType',
  type: 'mealType',
  calories: 'calories',
  calorie: 'calories',
  kcal: 'calories',
  protein: 'proteinGrams',
  carbs: 'carbGrams',
  carb: 'carbGrams',
  carbohydrate: 'carbGrams',
  fat: 'fatGrams',
  quantity: 'quantity',
  qty: 'quantity',
  amount: 'quantity',
  unit: 'unit',
  date: 'consumedOn',
};

export { COLUMNS };

export function formatImportTable(rows: ImportDraftRow[]): string {
  const header = ['#', 'Meal', 'Food', 'Qty', 'Unit', 'kcal', 'P', 'C', 'F', 'Date'];
  const body = rows.map((row, index) => [
    String(index + 1),
    row.mealType,
    row.foodName,
    String(row.quantity),
    row.unit,
    String(Math.round(row.calories)),
    String(Math.round(row.proteinGrams)),
    String(Math.round(row.carbGrams)),
    String(Math.round(row.fatGrams)),
    row.consumedOn,
  ]);

  return formatTextTable([header, ...body]);
}

export function formatExtraction(result: ExtractionResult): string {
  const meal = result.suggestedMealType ?? 'unspecified meal';
  const { entry } = result;
  const lines = [
    `I read this as a ${result.source === 'nutrition_label' ? 'nutrition label' : 'meal photo'} (${result.confidence} confidence).`,
    '',
    `Food: ${entry.foodName}`,
    `Meal: ${meal}`,
    `Portion: ${entry.quantity} ${entry.unit}`,
    `Calories: ${Math.round(entry.calories)}   Protein: ${Math.round(entry.proteinGrams)}g   Carbs: ${Math.round(entry.carbGrams)}g   Fat: ${Math.round(entry.fatGrams)}g`,
  ];

  if (result.components.length > 0) {
    lines.push('', 'On the plate (not saved as separate rows unless you ask):');
    for (const item of result.components) {
      lines.push(`- ${item.name} — ${item.quantity} ${item.unit} — ${Math.round(item.calories)} kcal`);
    }
  }

  if (result.warnings[0]) {
    lines.push('', result.warnings[0]);
  }

  return lines.join('\n');
}

export function formatTextTable(rows: string[][]): string {
  if (rows.length === 0) {
    return '';
  }

  const header = rows[0] ?? [];
  const widths = header.map((_, column) => Math.max(...rows.map((row) => (row[column] ?? '').length)));

  return rows
    .map((row) => row.map((cell, column) => (cell ?? '').padEnd(widths[column] ?? 0)).join('  '))
    .join('\n');
}

export function editImportRows(
  rows: ImportDraftRow[],
  text: string,
):
  | { status: 'ok'; rows: ImportDraftRow[] }
  | { status: 'none' }
  | { status: 'ambiguous'; message: string } {
  const parsed = parseEdit(text);

  if (!parsed) {
    return { status: 'none' };
  }

  let matches = rows.map((row, index) => ({ row, index }));

  if (parsed.rowIndex !== undefined) {
    const found = matches.find((item) => item.index === parsed.rowIndex! - 1);
    matches = found ? [found] : [];
  } else if (parsed.food) {
    const needle = parsed.food.toLowerCase();
    matches = matches.filter((item) => item.row.foodName.toLowerCase().includes(needle));
  }

  if (matches.length === 0) {
    return { status: 'ambiguous', message: 'I could not find that row. Use the row number or the food name.' };
  }

  const first = matches[0];
  if (!first) {
    return { status: 'ambiguous', message: 'I could not find that row. Use the row number or the food name.' };
  }

  if (matches.length > 1 && parsed.rowIndex === undefined) {
    return {
      status: 'ambiguous',
      message: `Several rows match. Say the row number, for example "row ${first.index + 1} ${parsed.field} ${String(parsed.value)}".`,
    };
  }

  const next = rows.map((row) => ({ ...row }));
  const target = next[first.index];
  if (!target) {
    return { status: 'ambiguous', message: 'I could not find that row. Use the row number or the food name.' };
  }
  applyField(target, parsed.field, parsed.value);

  return { status: 'ok', rows: next };
}

export function editExtraction(result: ExtractionResult, text: string): ExtractionResult | null {
  const parsed = parseEdit(text);

  if (!parsed) {
    const meal = MEAL_TYPES.find((type) => new RegExp(`\\b${type}\\b`, 'i').test(text));
    if (meal) {
      return { ...result, suggestedMealType: meal };
    }
    return null;
  }

  const entry = { ...result.entry };
  if (parsed.field === 'foodName' && typeof parsed.value === 'string') {
    entry.foodName = parsed.value;
  } else if (parsed.field === 'mealType' && typeof parsed.value === 'string') {
    return { ...result, suggestedMealType: parsed.value as MealType, entry };
  } else if (parsed.field !== 'consumedOn' && parsed.field !== 'consumedAt' && typeof parsed.value === 'number') {
    (entry as unknown as Record<string, number>)[parsed.field] = parsed.value;
  } else if (parsed.field === 'unit' && typeof parsed.value === 'string') {
    entry.unit = parsed.value;
  } else {
    return null;
  }

  return { ...result, entry };
}

function parseEdit(text: string): { rowIndex?: number; food?: string; field: keyof ImportDraftRow; value: string | number } | null {
  const normalised = text.trim();
  const rowMatch = normalised.match(/\brow\s*(\d+)\b/i);
  const rowIndex = rowMatch ? Number(rowMatch[1]) : undefined;

  const columnMatch = normalised.match(
    /\b(food|name|meal|type|calories|calorie|kcal|protein|carbs?|carbohydrate|fat|quantity|qty|amount|unit|date)\b/i,
  );

  if (!columnMatch) {
    return null;
  }

  const columnName = columnMatch[1]?.toLowerCase();
  if (!columnName) {
    return null;
  }

  const field = COLUMNS[columnName];
  if (!field) {
    return null;
  }

  const after = normalised.slice(normalised.toLowerCase().indexOf(columnName) + columnName.length);
  const number = after.match(/(-?\d+(?:\.\d+)?)/);
  const word = after.match(/\bto\s+([a-z][a-z0-9 \-]{0,40})/i);

  let value: string | number | undefined;
  if (field === 'foodName' || field === 'unit' || field === 'mealType' || field === 'consumedOn') {
    value = word?.[1]?.trim() ?? after.replace(/^[=\s:to-]+/i, '').trim();
    if (field === 'mealType') {
      const meal = MEAL_TYPES.find((type) => value && String(value).toLowerCase().includes(type));
      if (!meal) {
        return null;
      }
      value = meal;
    }
  } else if (number?.[1]) {
    value = Number(number[1]);
  }

  if (value === undefined || value === '') {
    return null;
  }

  const foodMatch = normalised.match(
    /\b(?:change|set|make|update|edit)?\s*(?:the|for|on|in)?\s*([a-z][a-z0-9 ]{1,40}?)\s+(?:calories|kcal|protein|carbs?|fat|quantity|qty|unit|meal)\b/i,
  );
  const food = !rowIndex && foodMatch?.[1] ? foodMatch[1].replace(/\b(the|a|an|row)\b/gi, '').trim() : undefined;

  return { rowIndex, food: food || undefined, field, value };
}

export function applyField(row: ImportDraftRow, field: keyof ImportDraftRow, value: string | number) {
  if (field === 'foodName' || field === 'unit' || field === 'consumedOn') {
    row[field] = String(value);
    return;
  }

  if (field === 'mealType') {
    const meal = MEAL_TYPES.find((type) => String(value).toLowerCase() === type);
    if (meal) {
      row.mealType = meal;
    }
    return;
  }

  if (typeof value === 'number') {
    (row[field] as number) = value;
  }
}

