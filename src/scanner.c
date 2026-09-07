#include "tree_sitter/parser.h"

// gero-lang terminates statements at a newline, but ignores newlines
// inside brackets. The grammar encodes where a statement may end, so
// bracket depth needs no tracking here: when `_newline` is not a valid
// symbol the scanner declines, and the newline is consumed as an extra.

enum TokenType { NEWLINE };

void *tree_sitter_gero_lang_external_scanner_create(void) { return NULL; }
void tree_sitter_gero_lang_external_scanner_destroy(void *payload) {}
unsigned tree_sitter_gero_lang_external_scanner_serialize(void *payload, char *buffer) { return 0; }
void tree_sitter_gero_lang_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {}

static bool is_inline_space(int32_t c) { return c == ' ' || c == '\t' || c == '\r'; }

bool tree_sitter_gero_lang_external_scanner_scan(void *payload, TSLexer *lexer,
                                                 const bool *valid_symbols) {
  if (!valid_symbols[NEWLINE]) return false;

  while (is_inline_space(lexer->lookahead)) lexer->advance(lexer, true);

  // End of input terminates the final statement just as a newline would.
  if (lexer->eof(lexer)) {
    lexer->result_symbol = NEWLINE;
    return true;
  }

  if (lexer->lookahead != '\n') return false;

  // Collapse a run of blank lines into one terminator so the grammar
  // never has to spell out `repeat($._newline)`.
  while (lexer->lookahead == '\n' || is_inline_space(lexer->lookahead)) {
    lexer->advance(lexer, false);
  }
  lexer->result_symbol = NEWLINE;
  return true;
}
