; Every `end`-delimited construct folds to its header line.
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
] @fold

; A match arm with a multi-line body folds independently of the
; `match` around it.
(match_arm) @fold

; Multi-line literals — argument lists, arrays, struct literals —
; are the other place gero code gets tall.
[
  (argument_list)
  (array_literal)
  (struct_literal)
  (parameter_list)
] @fold
