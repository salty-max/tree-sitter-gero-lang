import XCTest
import SwiftTreeSitter
import TreeSitterGeroLang

final class TreeSitterGeroLangTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_gero_lang())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading GeroLang grammar")
    }
}
