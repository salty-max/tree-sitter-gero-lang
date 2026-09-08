; -------- Comments --------
(comment) @comment

; -------- Declaration keywords --------
[
  "let"
  "const"
  "def"
  "lambda"
  "class"
  "struct"
  "enum"
  "use"
  "from"
  "local"
  "bake"
  "extends"
] @keyword

; -------- Control flow --------
[
  "if"
  "elif"
  "else"
  "match"
  "case"
  "when"
  "end"
] @keyword.conditional

[
  "while"
  "for"
  "in"
  "step"
  "repeat"
  "until"
  "do"
  "break"
  "continue"
] @keyword.repeat

[
  "return"
  "defer"
] @keyword.return

[
  "print"
  "asm"
  "sizeof"
] @keyword.builtin

; -------- Annotations (§2.7) --------
(annotation_name) @attribute
(abstract_annotation) @attribute

; -------- Types (§3) --------
(primitive_type) @type.builtin
(generic_type name: (identifier) @type)
(variadic_type) @punctuation.special
(reference_type "&" @operator)
(type_identifier (identifier) @type)
(type_identifier (dotted_name (identifier) @type))
"fn" @keyword.function
(nullable_type "?" @punctuation.special)

; -------- Definitions --------
(function_definition name: (identifier) @function)
(class_definition name: (identifier) @type)
(class_definition superclass: (identifier) @type)
(struct_definition name: (identifier) @type)
(enum_definition name: (identifier) @type)
(enum_variant name: (identifier) @constructor)
(field_declaration name: (identifier) @property)
(field_initializer name: (identifier) @property)
(struct_literal type: (identifier) @type)

(parameter name: (identifier) @variable.parameter)
(self_parameter) @variable.builtin

(const_declaration name: (identifier) @constant)

; -------- Calls and members --------
(call_expression
  function: (identifier) @function.call)
(call_expression
  function: (member_expression property: (identifier) @function.method.call))
(member_expression property: (identifier) @property)
(member_expression property: (number) @property)

; -------- Patterns --------
(variant_pattern path: (identifier) @constructor)
(variant_pattern path: (dotted_name (identifier) @constructor))
(struct_pattern type: (identifier) @type)
(struct_pattern type: (dotted_name (identifier) @type))
(field_pattern name: (identifier) @property)
(or_pattern "|" @operator)
(wildcard_pattern) @variable.builtin
(dotted_name (identifier) @constructor)

; -------- Loop labels (§4.5.5) --------
(loop_label ":" @punctuation.special)
(loop_label (identifier) @label)

; -------- Built-in values --------
[
  (self)
  (super)
] @variable.builtin

(boolean) @boolean
(nil) @constant.builtin

; -------- Literals (§2.4 / §2.5) --------
(number) @number
(fixed) @number.float
(string) @string
(char) @character
[
  (escape_sequence)
  (escape_sequence_char)
] @string.escape

; The interpolation braces read as punctuation so the expression
; inside keeps its own highlighting.
(interpolation "$(" @punctuation.special)
(interpolation ")" @punctuation.special)
(interpolation ":" @punctuation.delimiter)
(format_spec) @string.special

; -------- Operators --------
[
  "+"
  "-"
  "*"
  "/"
  "%"
  "=="
  "!="
  "<"
  "<="
  ">"
  ">="
  "&"
  "|"
  "^"
  "~"
  "<<"
  ">>"
  ".."
  "..="
  "="
  "+="
  "-="
  "*="
  "/="
  "%="
  "&="
  "|="
  "^="
  "<<="
  ">>="
  "++"
  "--"
  "->"
  "=>"
] @operator

[
  "and"
  "or"
  "not"
  "is"
  "as"
] @keyword.operator

; -------- Punctuation --------
[
  "("
  ")"
  "["
  "]"
  "{"
  "}"
] @punctuation.bracket

[
  ","
  "."
  ":"
  ";"
] @punctuation.delimiter

; -------- Identifiers (lowest priority) --------
(identifier) @variable
