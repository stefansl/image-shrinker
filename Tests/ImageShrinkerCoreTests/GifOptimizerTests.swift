import XCTest
@testable import ImageShrinkerCore

final class GifOptimizerTests: XCTestCase {
    func test_producesValidGif() throws {
        let input = TestSupport.fixtureURL("sample.gif")
        let out = TestSupport.tempDir().appendingPathComponent("out.gif")
        try GifOptimizer(binary: TestSupport.binURL("gifsicle")).optimize(input: input, output: out)

        XCTAssertGreaterThan(TestSupport.size(out), 0)
        let head = try FileHandle(forReadingFrom: out).readData(ofLength: 3)
        XCTAssertEqual(String(data: head, encoding: .ascii), "GIF")
    }
}
