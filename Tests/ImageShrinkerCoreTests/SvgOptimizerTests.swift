import XCTest
@testable import ImageShrinkerCore

final class SvgOptimizerTests: XCTestCase {
    func test_stripsCommentAndShrinks() throws {
        let input = TestSupport.fixtureURL("sample.svg")
        let out = TestSupport.tempDir().appendingPathComponent("out.svg")
        try SvgOptimizer().optimize(input: input, output: out)

        let result = try String(contentsOf: out, encoding: .utf8)
        XCTAssertFalse(result.contains("<!--"))          // comment removed
        XCTAssertTrue(result.contains("<svg"))           // still valid svg
        XCTAssertLessThan(TestSupport.size(out), TestSupport.size(input))
    }
}
