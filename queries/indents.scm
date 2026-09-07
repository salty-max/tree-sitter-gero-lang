; gero indents the body of every `end`-delimited construct by two
; spaces; the `end` itself returns to the header's column.
[
  (function_definition)
  (class_definition)
  (struct_definition)
  (enum_definition)
  (if_statement)
  (while_statement)
  (for_statement)
  (repeat_statement)
  (match_statement)
  (block)
  (do_expression)
] @indent.begin

[
  "end"
  "until"
] @indent.end

; `elif` / `else` dedent to the `if`, then re-indent their own body.
[
  "elif"
  "else"
] @indent.branch

; A match arm indents its body, and the next `case` closes it.
(match_arm) @indent.begin
"case" @indent.branch

; Bracketed constructs get a hanging indent when split across lines.
[
  (argument_list)
  (parameter_list)
  (array_literal)
  (struct_literal)
  (tuple_expression)
  (parenthesized_expression)
] @indent.begin

[
  ")"
  "]"
  "}"
] @indent.end
