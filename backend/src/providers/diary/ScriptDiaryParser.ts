import { parseDiaryText } from './diary-text.parser.js';
import type {
  DiaryParseInput,
  DiaryParseResult,
  IDiaryParser,
  ImportMethod,
} from './IDiaryParser.js';

/** The local table parser. No network, no key, always available. */
export class ScriptDiaryParser implements IDiaryParser {
  readonly method: ImportMethod = 'script';

  isAvailable(): boolean {
    return true;
  }

  async parse(input: DiaryParseInput): Promise<DiaryParseResult> {
    const parsed = parseDiaryText(input.text, input.today);

    return {
      rows: parsed.rows,
      warnings: parsed.warnings,
      notes: parsed.notes,
      headerGuess: parsed.headerGuess,
      schema: parsed.schema,
    };
  }
}
