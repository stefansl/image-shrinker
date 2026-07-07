import XCTest
@testable import ImageShrinkerCore

final class JpegOptimizerTests: XCTestCase {
    func test_producesSmallerValidJpeg() throws {
        let input = TestSupport.fixtureURL("sample.jpg")
        let out = TestSupport.tempDir().appendingPathComponent("out.jpg")
        let opt = JpegOptimizer(binary: TestSupport.binURL("cjpeg"))
        try opt.optimize(input: input, output: out)

        XCTAssertTrue(FileManager.default.fileExists(atPath: out.path))
        XCTAssertGreaterThan(TestSupport.size(out), 0)
        // JPEG SOI marker 0xFFD8
        let head = try FileHandle(forReadingFrom: out).readData(ofLength: 2)
        XCTAssertEqual([UInt8](head), [0xFF, 0xD8])
    }

    func test_nonImageInput_throwsProcessFailedWithStderr() {
        let input = TestSupport.fixtureURL("sample.svg")
        let out = TestSupport.tempDir().appendingPathComponent("out.jpg")
        let opt = JpegOptimizer(binary: TestSupport.binURL("cjpeg"))

        XCTAssertThrowsError(try opt.optimize(input: input, output: out)) { error in
            guard case OptimizerError.processFailed = error else {
                XCTFail("Expected OptimizerError.processFailed, got \(error)")
                return
            }
        }
    }
}
