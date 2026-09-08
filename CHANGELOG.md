# Changelog

## 0.1.1

Ships the prebuilt grammar browser consumers need.

- `.github/workflows/release.yml` builds `tree-sitter-gero_lang.wasm`
  on tag, smoke-tests that it loads and parses, and attaches it to the
  release. `web-tree-sitter` cannot compile a grammar itself, so
  without the asset no browser consumer could use this one.
- README names the artifact and its URL shape.

`v0.1.0` shipped without it — the grammar was correct but unusable
from a browser.

## 0.1.0

Initial grammar for gero-lang (`.gr`), tracking `docs/gero-lang.md`.

- Declarations: `use`, `let`, `const`, `def`, `class`, `struct`,
  `enum`, with `local` visibility and `bake` compile-time markers.
- Annotations in both forms, with `@abstract` recognized as its own
  token so a bodyless method parses without lookahead.
- Statements: `if` / `if let`, `while` / `while let`, `for … in …
  step`, `repeat … until`, labeled loops, `match`, `do … end`,
  `print`, `defer`, `asm`, assignment and compound assignment,
  `++` / `--`, and `_ =` discard.
- The §4.8.1 pattern set, including or-patterns and range patterns.
- Both lambda forms and `do … end` in expression position.
- Types: primitives, `[T; N]`, tuples, `fn(…) -> T`, `T?`, `&T`,
  `Vec(T)`, and variadic `...`.
- Operator precedence per the §4.2.1 table.
- One-line blocks and the leading-`.` chain continuation, the two
  §2.1 carve-outs in the newline-terminated grammar.
- `if` and `match` in value position (§4.4.2, §4.8.4), alongside
  their statement forms.
- Postfix `(` and `[` are `token.immediate`, matching §4.6.1 — which
  also removed two declared conflicts the ambiguity had required.
- `queries/highlights.scm`, `queries/folds.scm`,
  `queries/indents.scm`.
