#include "tree_sitter/parser.h"

#include <string.h>

// gero-lang terminates statements at a newline, but ignores newlines
// inside brackets. The grammar encodes where a statement may end, so
// bracket depth needs no tracking here: when `_newline` is not a valid
// symbol the scanner declines, and the newline is consumed as an extra.
//
// A statement also ends against the keyword that closes its block
// (§2.1), which is what lets a whole block sit on one line. That case
// yields a zero-width token so the keyword itself stays for the parser.

enum TokenType { NEWLINE };

// §2.1 — the keywords a statement may end against.
static const char *const block_close[] = {"end", "else", "elif", "until", "case"};

void *tree_sitter_gero_lang_external_scanner_create(void) { return NULL; }
void tree_sitter_gero_lang_external_scanner_destroy(void *payload) {}
unsigned tree_sitter_gero_lang_external_scanner_serialize(void *payload, char *buffer) { return 0; }
void tree_sitter_gero_lang_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {}

static bool is_inline_space(int32_t c) { return c == ' ' || c == '\t' || c == '\r'; }

static bool is_word_char(int32_t c) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '_';
}

// Reads the identifier at the cursor into `buf`. Advancing here is safe
// only because the caller has already called `mark_end`, which pins the
// token's end behind the cursor.
static void peek_word(TSLexer *lexer, char *buf, size_t cap) {
  size_t len = 0;
  while (is_word_char(lexer->lookahead)) {
    if (len + 1 < cap) buf[len++] = (char)lexer->lookahead;
    lexer->advance(lexer, false);
  }
  buf[len] = '\0';
}

bool tree_sitter_gero_lang_external_scanner_scan(void *payload, TSLexer *lexer,
                                                 const bool *valid_symbols) {
  if (!valid_symbols[NEWLINE]) return false;

  while (is_inline_space(lexer->lookahead)) lexer->advance(lexer, true);

  // End of input terminates the final statement just as a newline would.
  if (lexer->eof(lexer)) {
    lexer->result_symbol = NEWLINE;
    return true;
  }

  if (lexer->lookahead == '\n') {
    // Collapse a run of blank lines into one terminator so the grammar
    // never has to spell out `repeat($._newline)`.
    while (lexer->lookahead == '\n' || is_inline_space(lexer->lookahead)) {
      lexer->advance(lexer, false);
    }
    lexer->mark_end(lexer);

    // §4.6.3 — a `.` opening the next line continues the postfix chain
    // on the previous expression, so the newline is not a terminator.
    // Nothing else in the language starts a line with `.`.
    if (lexer->lookahead == '.') return false;

    lexer->result_symbol = NEWLINE;
    return true;
  }

  if (!is_word_char(lexer->lookahead)) return false;

  lexer->mark_end(lexer);

  char word[8];
  peek_word(lexer, word, sizeof word);

  for (size_t i = 0; i < sizeof block_close / sizeof block_close[0]; i++) {
    if (strcmp(word, block_close[i]) == 0) {
      lexer->result_symbol = NEWLINE;
      return true;
    }
  }
  return false;
}
