# Changelog

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
- `queries/highlights.scm`, `queries/folds.scm`,
  `queries/indents.scm`.
