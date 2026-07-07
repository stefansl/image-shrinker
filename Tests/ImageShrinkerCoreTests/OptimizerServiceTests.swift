import XCTest
@testable import ImageShrinkerCore

final class OptimizerServiceTests: XCTestCase {
    private func service() -> OptimizerService {
        OptimizerService(binaries: .init(
            cjpeg: TestSupport.binURL("cjpeg"),
            pngquant: TestSupport.binURL("pngquant"),
            gifsicle: TestSupport.binURL("gifsicle")))
    }
    private var noSuffixSameFolder: OptimizerSettings {
        var s = OptimizerSettings.defaults; s.suffix = true; return s
    }

    func test_shrinksPngAndReportsSizes() throws {
        // copy fixture into a temp dir so output lands next to it
        let dir = TestSupport.tempDir()
        let input = dir.appendingPathComponent("sample.png")
        try FileManager.default.copyItem(at: TestSupport.fixtureURL("sample.png"), to: input)

        let result = try service().shrink(input: input, settings: noSuffixSameFolder)
        XCTAssertEqual(result.output.lastPathComponent, "sample.min.png")
        XCTAssertGreaterThan(result.originalSize, 0)
        XCTAssertGreaterThan(result.optimizedSize, 0)
    }

    func test_unsupportedExtensionThrows() {
        let input = URL(fileURLWithPath: "/tmp/file.bmp")
        XCTAssertThrowsError(try service().shrink(input: input, settings: .defaults)) { err in
            XCTAssertEqual(err as? OptimizerError, .unsupportedExtension("bmp"))
        }
    }
}
