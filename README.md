# tree-sitter-gero-lang

Tree-sitter grammar for the [Gero VM](https://github.com/salty-max/gero)
high-level language (`.gr`).

## Spec tracking

This grammar tracks
[`docs/gero-lang.md`](https://github.com/salty-max/gero/blob/main/docs/gero-lang.md)
in the gero repo. Every syntactic feature accepted by gero's
`src/lang/parser.zig` is recognized here: declarations (`let`,
`const`, `def`, `class`, `struct`, `enum`, `use`), annotations in
both the bare (`@bank 3`) and parenthesized (`@align(16)`) forms,
the full statement set (`if` / `if let`, `while` / `while let`,
`for … in … step`, `repeat … until`, labeled loops, `match`,
`defer`, `print`, `asm`), the §4.8.1 pattern set (literal,
wildcard, binding, or, range, variant, tuple, struct), both lambda
forms, `do … end` as statement and expression, and the type
grammar (primitives, `[T; N]`, tuples, `fn(…) -> T`, `T?`, `&T`,
`Vec(T)`, variadic `...`).

Operator precedence follows the §4.2.1 table exactly, including
the two places it differs from the C family: ranges bind looser
than `or`, and `is` sits between `and` and the comparisons.

When the gero-lang spec bumps, this grammar bumps in lockstep —
the grammar version mirrors the lowest gero-lang spec it parses
cleanly.

## Newlines are significant

gero-lang terminates statements at a newline and has no
line-continuation operator, so `src/scanner.c` emits a `_newline`
token wherever the grammar allows a statement to end. Inside
brackets — argument lists, array and struct literals — the grammar
does not allow one, the scanner declines, and the newline is
consumed as ordinary whitespace. That is the whole of the external
scanner; there is no bracket-depth or indentation state.

## Use

### Tree-sitter consumers (Neovim, Helix, Zed, …)

```lua
-- Neovim: register the parser + queries
require'nvim-treesitter.parsers'.get_parser_configs().gero_lang = {
  install_info = {
    url = "https://github.com/salty-max/tree-sitter-gero-lang",
    files = { "src/parser.c", "src/scanner.c" },
    branch = "main",
  },
  filetype = "gr",
}
```

`queries/highlights.scm`, `queries/folds.scm`, `queries/indents.scm`
ship with the parser — point your editor's runtime path at them.

### VS Code

Use the [`vscode-gero`](https://github.com/salty-max/vscode-gero)
extension; it bundles this grammar plus a TextMate fallback.

## Develop

```bash
npm install               # installs tree-sitter-cli
npx tree-sitter generate  # regen parser.c after grammar.js edits
npx tree-sitter test      # run the corpus tests under test/corpus/
npx tree-sitter parse <file.gr>  # one-shot parse for ad-hoc debugging
```

The corpus tests under `test/corpus/` are the canonical acceptance
for grammar changes. CI additionally parses every
`examples/lang/*.gr` and `docs/examples/syntax_overview.gr` from
the gero repo and fails on any `ERROR` or `MISSING` node.

## License

MIT.
