/**
 * @file Parser for gero-lang
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

// Binding powers, loosest first — the inverse of the §4.2.1 table.
const PREC = {
  range: 1,
  or: 2,
  and: 3,
  type_test: 4,
  comparison: 5,
  bit_or: 6,
  bit_xor: 7,
  bit_and: 8,
  shift: 9,
  additive: 10,
  multiplicative: 11,
  cast: 12,
  unary: 13,
  call: 14,
  member: 15,
};

module.exports = grammar({
  name: 'gero_lang',

  // `\n` stays in `extras` so the scanner can decline it wherever a
  // statement cannot end — inside brackets, chiefly.
  extras: ($) => [/\s/, $.comment],

  word: ($) => $.identifier,

  externals: ($) => [$._newline],

  supertypes: ($) => [$._statement, $._expression, $._type, $._pattern],

  conflicts: ($) => [
    // A leading `@name` does not say which declaration follows, and a
    // `def` accepts a narrower annotation set than the rest (it alone
    // must see `@abstract`). Only one read survives the tokens ahead.
    [$._annotation, $.function_definition, $._def_head],
    [$._annotation, $.function_definition],
    // `a | b | c` versus the short lambda `|b| c`, now that a body may
    // follow a block head on the same line. `short_lambda` carries a
    // negative dynamic precedence, so bitwise-or wins the tie.
    [$.parameter, $._expression],
    // `f (x)` on a block head's line: a call, or the head followed by a
    // parenthesized statement. The parser reads it greedily as a call,
    // and `call_expression`'s dynamic precedence says the same here.
    [$.parenthesized_expression, $.argument_list],
    // Same shape one comma deeper: `(a, b` is a tuple mid-flight or an
    // argument list mid-flight until the head's body settles it.
    [$.tuple_expression],
  ],

  rules: {
    source_file: ($) => repeat($._terminated_statement),

    // §2.2 — `--` to end of line.
    comment: (_) => token(seq('--', /[^\n\r]*/)),

    // ---------- statements (§4) ----------

    // A statement ends at a newline, at end of input, or against the
    // keyword closing the block it sits in (§2.1) — the last of which
    // is what lets a whole block fit on one line. The scanner emits a
    // zero-width `_newline` for that case, leaving the keyword for the
    // enclosing rule.
    _terminated_statement: ($) => seq($._statement, $._newline),

    _statement: ($) =>
      choice(
        $.use_declaration,
        $.const_declaration,
        $.let_declaration,
        $.function_definition,
        $.class_definition,
        $.struct_definition,
        $.enum_definition,
        $.return_statement,
        $.if_statement,
        $.while_statement,
        $.for_statement,
        $.repeat_statement,
        $.match_statement,
        $.block,
        $.print_statement,
        $.defer_statement,
        $.asm_statement,
        $.break_statement,
        $.continue_statement,
        $.assignment,
        $.increment_statement,
        $.discard_statement,
        $.expression_statement,
      ),

    // §5.2 — four import shapes, all starting `use`.
    use_declaration: ($) =>
      seq(
        'use',
        choice(
          seq(
            field('symbol', $.identifier),
            optional(seq('as', field('alias', $.identifier))),
            'from',
            field('source', choice($.identifier, $.string)),
          ),
          seq(field('module', $.identifier), optional(seq('as', field('alias', $.identifier)))),
          field('source', $.string),
        ),
      ),

    // §4.1
    let_declaration: ($) =>
      seq(
        optional('local'),
        repeat($._annotation),
        'let',
        field('name', $._pattern),
        optional(seq(':', field('type', $._type))),
        optional(seq('=', field('value', $._expression))),
      ),

    const_declaration: ($) =>
      seq(
        optional('local'),
        repeat($._annotation),
        'const',
        field('name', $.identifier),
        optional(seq(':', field('type', $._type))),
        '=',
        field('value', $._expression),
      ),

    _annotation: ($) => choice($.annotation, $.abstract_annotation),

    // §2.7 / §3.7 — `@name` or `@name(args)`. The name is part of the
    // token so that `@abstractfoo` loses the longest-match race against
    // `abstract_annotation` below.
    annotation: ($) =>
      seq(
        field('name', $.annotation_name),
        // `@align(16)` takes an expression list; the bare form
        // (`@bank 3`, `@addr $FE40`) takes a single literal, which is
        // all the compiler accepts there.
        optional(
          choice(
            seq('(', optional(commaSep($._expression)), ')'),
            field('argument', $._literal),
          ),
        ),
        optional($._newline),
      ),

    annotation_name: (_) => token(/@[A-Za-z_][A-Za-z0-9_]*/),

    // §3.7.6 — its own token because it is the one annotation the
    // grammar must see: an `@abstract` def has no body. No explicit
    // precedence: that would outrank match length and steal the prefix
    // of `@abstractfoo`. The tie on `@abstract` itself goes to the
    // string literal over `annotation_name`'s pattern.
    abstract_annotation: ($) => seq('@abstract', optional($._newline)),

    // §4.6 — and §3.7.6 for the bodyless `@abstract` form, which is a
    // separate branch so the body is never optional at a given site.
    function_definition: ($) =>
      choice(
        seq($._def_head, optional($._newline), field('body', repeat($._terminated_statement)), 'end'),
        seq(
          optional('local'),
          repeat($.annotation),
          $.abstract_annotation,
          repeat($.annotation),
          $._def_signature,
        ),
      ),

    _def_head: ($) => seq(optional('local'), repeat($.annotation), $._def_signature),

    _def_signature: ($) =>
      seq(
        optional('bake'),
        'def',
        field('name', $.identifier),
        field('parameters', $.parameter_list),
        optional(seq('->', field('return_type', $._type))),
      ),

    parameter_list: ($) =>
      seq('(', optional(commaSep(choice($.self_parameter, $.parameter))), ')'),

    // §6.2 — the receiver, valid only in a method's parameter list.
    self_parameter: (_) => 'self',

    parameter: ($) =>
      seq(
        field('name', $.identifier),
        optional(seq(':', field('type', choice($._type, $.variadic_type)))),
      ),

    // §4.6.2 — `args: ...` collects the remaining arguments as a tuple.
    variadic_type: (_) => '...',

    // §6
    class_definition: ($) =>
      seq(
        optional('local'),
        repeat($._annotation),
        'class',
        field('name', $.identifier),
        optional(seq('extends', field('superclass', $.identifier))),
        optional($._newline),
        field('body', repeat($._terminated_statement)),
        'end',
      ),

    // §3.4 — POD, `end`-delimited.
    struct_definition: ($) =>
      seq(
        optional('local'),
        repeat($._annotation),
        'struct',
        field('name', $.identifier),
        optional($._newline),
        repeat(seq($.field_declaration, optional(','), $._newline)),
        'end',
      ),

    field_declaration: ($) => seq(field('name', $.identifier), ':', field('type', $._type)),

    // §3.6 — variants may carry a payload.
    enum_definition: ($) =>
      seq(
        optional('local'),
        repeat($._annotation),
        'enum',
        field('name', $.identifier),
        optional($._newline),
        repeat(seq($.enum_variant, $._newline)),
        'end',
      ),

    enum_variant: ($) =>
      seq(
        'case',
        field('name', $.identifier),
        optional(seq('(', optional(commaSep($.field_declaration)), ')')),
      ),

    return_statement: ($) => seq('return', optional($._expression)),

    // §4.4 — `if`, `elif`, `else`, plus the `if let` binding form.
    // The precedence picks `if_statement` over `if_expression` at
    // statement position, where both would otherwise match.
    if_statement: ($) =>
      prec(1, seq(
        'if',
        field('condition', $._condition),
        optional($._newline),
        field('consequence', repeat($._terminated_statement)),
        repeat($.elif_clause),
        optional($.else_clause),
        'end',
      )),

    // §4.4.2 — the same shape in value position, where the checker
    // additionally requires the `else`.
    if_expression: ($) =>
      seq(
        'if',
        field('condition', $._condition),
        optional($._newline),
        field('consequence', repeat($._terminated_statement)),
        repeat($.elif_clause),
        optional($.else_clause),
        'end',
      ),

    elif_clause: ($) =>
      seq(
        'elif',
        field('condition', $._condition),
        optional($._newline),
        field('consequence', repeat($._terminated_statement)),
      ),

    else_clause: ($) => seq('else', optional($._newline), field('consequence', repeat($._terminated_statement))),

    // §4.4.1 / §4.5.1 — a binding condition, with an optional guard.
    _condition: ($) => choice($.let_condition, $._expression),

    let_condition: ($) =>
      seq(
        'let',
        field('pattern', $._pattern),
        '=',
        field('value', $._expression),
        optional(seq('when', field('guard', $._expression))),
      ),

    while_statement: ($) =>
      seq(
        'while',
        field('condition', $._condition),
        optional(field('label', $.loop_label)),
        optional($._newline),
        field('body', repeat($._terminated_statement)),
        'end',
      ),

    // §4.5 — `for x in iterable [step n] [:label]`.
    for_statement: ($) =>
      seq(
        'for',
        field('binding', $.identifier),
        'in',
        field('iterable', $._expression),
        optional(seq('step', field('step', $._expression))),
        optional(field('label', $.loop_label)),
        optional($._newline),
        field('body', repeat($._terminated_statement)),
        'end',
      ),

    // §4.5.5 — `:rows`, trailing the loop head.
    loop_label: ($) => seq(':', $.identifier),

    // §4.5.4 — body runs at least once.
    repeat_statement: ($) =>
      seq(
        'repeat',
        optional($._newline),
        field('body', repeat($._terminated_statement)),
        'until',
        field('condition', $._expression),
      ),

    // §4.8 — arms are `case <pattern> [when guard] => ...`.
    match_statement: ($) =>
      seq('match', field('value', $._expression), optional($._newline), repeat($.match_arm), 'end'),

    // The body may share the arrow's line or start on the next.
    match_arm: ($) =>
      seq(
        'case',
        field('pattern', $._pattern),
        optional(seq('when', field('guard', $._expression))),
        '=>',
        optional($._newline),
        field('body', repeat($._terminated_statement)),
      ),

    // §4.3 — `do … end` as a statement; the expression form is below.
    // The precedence picks `block` over `do_expression` at statement
    // position, where both would otherwise match.
    block: ($) =>
      prec(1, seq(optional('bake'), 'do', optional($._newline), repeat($._terminated_statement), 'end')),

    // §4.9 — `print a, b, c`.
    print_statement: ($) => seq('print', commaSep1($._expression)),

    // §4.10 — runs when the enclosing block exits.
    defer_statement: ($) => seq('defer', $._statement),

    // §4.11
    asm_statement: ($) => seq('asm', $.string),

    break_statement: ($) => seq('break', optional(field('label', $.loop_label))),

    continue_statement: ($) => seq('continue', optional(field('label', $.loop_label))),

    // §4.2.2 — plain and compound assignment.
    assignment: ($) =>
      seq(
        field('target', $._expression),
        field(
          'operator',
          choice('=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>='),
        ),
        field('value', $._expression),
      ),

    increment_statement: ($) =>
      seq(field('target', $._expression), field('operator', choice('++', '--'))),

    // §4.2.2 — explicit discard of a value the caller doesn't want.
    discard_statement: ($) => seq('_', '=', field('value', $._expression)),

    expression_statement: ($) => $._expression,

    // ---------- patterns (§4.8) ----------

    _pattern: ($) =>
      choice(
        $.wildcard_pattern,
        $.tuple_pattern,
        $.variant_pattern,
        $.struct_pattern,
        $.or_pattern,
        $.range_pattern,
        $.dotted_name,
        $.number,
        $.fixed,
        $.string,
        $.char,
        $.boolean,
        $.nil,
        $.identifier,
      ),

    wildcard_pattern: (_) => '_',

    tuple_pattern: ($) => seq('(', commaSep1($._pattern), ')'),

    // `Enum.Variant(a, _)` — a path with a destructuring payload.
    variant_pattern: ($) =>
      seq(
        field('path', choice($.identifier, $.dotted_name)),
        '(',
        optional(commaSep($._pattern)),
        ')',
      ),

    // §4.8.1 — `Player { hp, mp }`, with `hp: 0` to match a field
    // against a nested pattern instead of binding it.
    struct_pattern: ($) =>
      seq(
        field('type', choice($.identifier, $.dotted_name)),
        '{',
        optional(seq(commaSep1($.field_pattern), optional(','))),
        '}',
      ),

    field_pattern: ($) =>
      seq(field('name', $.identifier), optional(seq(':', field('pattern', $._pattern)))),

    // §4.8.1 — `1 | 2 | 3`, left-nested.
    or_pattern: ($) => prec.left(seq($._pattern, '|', $._pattern)),

    // §4.8.1 — `0..=15`, and the half-open `0..15`.
    range_pattern: ($) =>
      prec.left(seq(field('start', $._pattern), choice('..', '..='), field('end', $._pattern))),

    // `Enum.Variant`, `module.symbol`. Confined to patterns and types,
    // neither of which admits general member access — in expression
    // position a dotted name is a `member_expression`.
    dotted_name: ($) => prec.left(1, seq($.identifier, repeat1(seq('.', $.identifier)))),

    // ---------- expressions (§4.2) ----------

    _expression: ($) =>
      choice(
        $.binary_expression,
        $.unary_expression,
        $.cast_expression,
        $.range_expression,
        $.call_expression,
        $.member_expression,
        $.index_expression,
        $.struct_literal,
        $.array_literal,
        $.tuple_expression,
        $.lambda,
        $.short_lambda,
        $.do_expression,
        $.if_expression,
        $.parenthesized_expression,
        $.identifier,
        $.self,
        $.super,
        $.number,
        $.fixed,
        $.string,
        $.char,
        $.boolean,
        $.nil,
      ),

    parenthesized_expression: ($) => seq('(', $._expression, ')'),

    tuple_expression: ($) =>
      seq('(', $._expression, ',', commaSep1($._expression), optional(','), ')'),

    binary_expression: ($) => {
      const table = [
        ['or', PREC.or],
        ['and', PREC.and],
        ['==', PREC.comparison],
        ['!=', PREC.comparison],
        ['<', PREC.comparison],
        ['<=', PREC.comparison],
        ['>', PREC.comparison],
        ['>=', PREC.comparison],
        ['is', PREC.type_test],
        ['|', PREC.bit_or],
        ['^', PREC.bit_xor],
        ['&', PREC.bit_and],
        ['<<', PREC.shift],
        ['>>', PREC.shift],
        ['+', PREC.additive],
        ['-', PREC.additive],
        ['*', PREC.multiplicative],
        ['/', PREC.multiplicative],
        ['%', PREC.multiplicative],
      ];
      return choice(
        ...table.map(([operator, precedence]) =>
          prec.left(
            Number(precedence),
            seq(
              field('left', $._expression),
              field('operator', operator),
              field('right', $._expression),
            ),
          ),
        ),
      );
    },

    // §3.4.4 — prefix `&` takes a typed reference; context separates it
    // from the binary bitwise `&`.
    unary_expression: ($) =>
      prec.right(PREC.unary, seq(field('operator', choice('-', 'not', '~', '&')), $._expression)),

    // §3.5 — `expr as Type`.
    cast_expression: ($) =>
      prec.left(PREC.cast, seq(field('value', $._expression), 'as', field('type', $._type))),

    // §4.5 — `0..4` (half-open) and `0..=3` (inclusive).
    range_expression: ($) =>
      prec.left(
        PREC.range,
        seq(field('start', $._expression), choice('..', '..='), field('end', $._expression)),
      ),

    call_expression: ($) =>
      prec.dynamic(
        1,
        prec(PREC.call, seq(field('function', $._expression), field('arguments', $.argument_list))),
      ),

    argument_list: ($) => seq('(', optional(commaSep($._expression)), ')'),

    // §3.4 — the property is an index on a tuple, a name elsewhere.
    member_expression: ($) =>
      prec(
        PREC.member,
        seq(field('object', $._expression), '.', field('property', choice($.identifier, $.number))),
      ),

    index_expression: ($) =>
      prec(
        PREC.member,
        seq(field('object', $._expression), '[', field('index', $._expression), ']'),
      ),

    // §3.4 — `Stats { hp: 1, mp: 0 }`.
    struct_literal: ($) =>
      prec(
        PREC.member,
        seq(
          field('type', $.identifier),
          '{',
          optional(seq(commaSep1($.field_initializer), optional(','))),
          '}',
        ),
      ),

    field_initializer: ($) => seq(field('name', $.identifier), ':', field('value', $._expression)),

    // `[1, 2, 3]` and the repeat form `[0; 4]`.
    array_literal: ($) =>
      seq(
        '[',
        optional(
          choice(
            seq(field('value', $._expression), ';', field('count', $._expression)),
            seq(commaSep1($._expression), optional(',')),
          ),
        ),
        ']',
      ),

    // §4.7 — the long form, an unnamed `def` with a block body.
    lambda: ($) =>
      seq(
        'lambda',
        field('parameters', $.parameter_list),
        optional(seq('->', field('return_type', $._type))),
        optional($._newline),
        field('body', repeat($._terminated_statement)),
        'end',
      ),

    // §4.7.1 — `|a, b| -> T expr` or `|| expr`. The body is a single
    // expression: no `return`, no `end`.
    short_lambda: ($) =>
      prec.right(
        seq(
          '|',
          optional(commaSep($.parameter)),
          '|',
          optional(seq('->', field('return_type', $._type))),
          field('body', $._expression),
        ),
      ),

    // §4.3 — `do … end` in expression position.
    do_expression: ($) =>
      seq(optional('bake'), 'do', optional($._newline), repeat($._terminated_statement), 'end'),

    self: (_) => 'self',
    super: (_) => 'super',

    // ---------- types (§3) ----------

    _type: ($) =>
      choice(
        $.primitive_type,
        $.array_type,
        $.tuple_type,
        $.function_type,
        $.nullable_type,
        $.reference_type,
        $.generic_type,
        $.type_identifier,
      ),

    // §3.1
    primitive_type: (_) =>
      choice('i8', 'u8', 'i16', 'u16', 'i32', 'u32', 'fx8', 'fx16', 'bool', 'str', 'nil'),

    // §3.3 — `[T; N]`.
    array_type: ($) =>
      seq('[', field('element', $._type), ';', field('length', $._expression), ']'),

    tuple_type: ($) => seq('(', commaSep1($._type), ')'),

    // §4.7 — `fn(i16) -> i16`.
    function_type: ($) =>
      seq(
        'fn',
        '(',
        optional(commaSep($._type)),
        ')',
        optional(seq('->', field('return_type', $._type))),
      ),

    // §3.9 — `T?`. Binds tighter than the enclosing type, so
    // `fn() -> str?` returns a nullable `str`.
    nullable_type: ($) => prec(1, seq(field('inner', $._type), '?')),

    // §3.4.3 — `Vec(T)`, the one parameterized type in the language.
    // Precedence reads the type greedily, as for `dotted_name`: the
    // `(` after `x as Vec` opens the parameter list, not a call.
    generic_type: ($) =>
      prec(1, seq(field('name', $.identifier), '(', commaSep1($._type), ')')),

    // §3.4.4 — `&T`, a typed reference to a value the callee mutates.
    reference_type: ($) => seq('&', field('inner', $._type)),

    type_identifier: ($) => choice($.identifier, $.dotted_name),

    // ---------- literals (§2) ----------

    _literal: ($) => choice($.number, $.fixed, $.string, $.char, $.boolean, $.nil),

    identifier: (_) => /[A-Za-z_][A-Za-z0-9_]*/,

    // §2.4 — decimal, `$FF` hex, `0b1010_0101` binary.
    number: (_) =>
      token(choice(/[0-9][0-9_]*/, /\$[0-9A-Fa-f][0-9A-Fa-f_]*/, /0[bB][01][01_]*/)),

    // §2.4 — fixed-point literals carry a fractional part.
    fixed: (_) => token(/[0-9][0-9_]*\.[0-9][0-9_]*/),

    // §2.5.1 — single-byte ASCII literals, typed `u8`.
    char: ($) => seq("'", choice($.escape_sequence_char, $._char_content), "'"),

    _char_content: (_) => token.immediate(/[^'\\]/),

    escape_sequence_char: (_) => token.immediate(/\\(x[0-9A-Fa-f]{2}|[nrt0\\'])/),

    boolean: (_) => choice('true', 'false'),

    nil: (_) => 'nil',

    // §2.5 — `$(expr)` interpolates, with an optional format spec.
    string: ($) =>
      seq('"', repeat(choice($.interpolation, $.escape_sequence, $._string_content)), '"'),

    // A lone `$` is ordinary text; the two-character `$(` wins the
    // longest-match race when an interpolation actually opens.
    _string_content: (_) => token.immediate(/[^"\\$]+|\$/),

    // §2.5 — `\n \t \r \0 \\ \" \xHH`, plus `\$` to write a literal
    // dollar next to an interpolation.
    escape_sequence: (_) => token.immediate(/\\(x[0-9A-Fa-f]{2}|[nrt0\\"$])/),

    interpolation: ($) =>
      seq(
        token.immediate('$('),
        $._expression,
        optional(seq(':', field('format', $.format_spec))),
        ')',
      ),

    // `3d`, `04x` — width / radix directives inside an interpolation.
    format_spec: (_) => /[0-9]*[a-zA-Z]/,
  },
});

/** Zero or more `rule`, comma-separated. */
function commaSep(rule) {
  return optional(commaSep1(rule));
}

/** One or more `rule`, comma-separated. */
function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)));
}
