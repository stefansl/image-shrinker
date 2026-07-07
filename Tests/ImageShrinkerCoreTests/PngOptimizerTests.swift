import XCTest
@testable import ImageShrinkerCore

final class PngOptimizerTests: XCTestCase {
    func test_producesValidPng() throws {
        let input = TestSupport.fixtureURL("sample.png")
        let out = TestSupport.tempDir().appendingPathComponent("out.png")
        try PngOptimizer(binary: TestSupport.binURL("pngquant")).optimize(input: input, output: out)

        XCTAssertGreaterThan(TestSupport.size(out), 0)
        let head = try FileHandle(forReadingFrom: out).readData(ofLength: 8)
        XCTAssertEqual([UInt8](head), [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
    }
}
