package tree_sitter_gero_lang_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_gero_lang "github.com/salty-max/tree-sitter-gero-lang/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_gero_lang.Language())
	if language == nil {
		t.Errorf("Error loading GeroLang grammar")
	}
}
