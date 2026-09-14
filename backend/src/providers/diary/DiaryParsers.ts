import type { IDiaryParser, ImportMethod } from './IDiaryParser.js';

/**
 * Picks the parser for a request. The equivalent of EntityProviders in
 * profile_service: implementations register themselves by the key they
 * handle, and callers ask for a key rather than newing anything up.
 */
export class DiaryParsers {
  private readonly byMethod: Map<ImportMethod, IDiaryParser>;

  constructor(parsers: IDiaryParser[]) {
    this.byMethod = new Map(parsers.map((parser) => [parser.method, parser]));
  }

  /** Falls back to the script parser, which is always available. */
  forMethod(method: ImportMethod): IDiaryParser {
    const parser = this.byMethod.get(method) ?? this.byMethod.get('script');

    if (!parser) {
      throw new Error('No diary parser is registered.');
    }

    return parser;
  }

  isAvailable(method: ImportMethod): boolean {
    return this.byMethod.get(method)?.isAvailable() ?? false;
  }
}
