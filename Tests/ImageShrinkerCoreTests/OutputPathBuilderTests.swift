import XCTest
@testable import ImageShrinkerCore

final class OutputPathBuilderTests: XCTestCase {
    func test_defaultSameFolderWithSuffix() throws {
        let input = URL(fileURLWithPath: "/tmp/pics/logo.png")
        let out = try OutputPathBuilder.destination(
            for: input, savePath: nil, folderSwitch: true, subfolder: false, suffix: true)
        XCTAssertEqual(out.path, "/tmp/pics/logo.min.png")
    }
    func test_noSuffix() throws {
        let out = try OutputPathBuilder.destination(
            for: URL(fileURLWithPath: "/tmp/pics/logo.png"),
            savePath: nil, folderSwitch: true, subfolder: false, suffix: false)
        XCTAssertEqual(out.lastPathComponent, "logo.png")
    }
    func test_savePathUsedWhenFolderSwitchOff() throws {
        let dest = TestSupport.tempDir()
        let out = try OutputPathBuilder.destination(
            for: URL(fileURLWithPath: "/tmp/pics/logo.png"),
            savePath: dest, folderSwitch: false, subfolder: false, suffix: true)
        XCTAssertEqual(out.deletingLastPathComponent().path, dest.path)
        XCTAssertEqual(out.lastPathComponent, "logo.min.png")
    }
    func test_subfolderCreatesMinifiedDir() throws {
        let base = TestSupport.tempDir()
        let input = base.appendingPathComponent("logo.png")
        let out = try OutputPathBuilder.destination(
            for: input, savePath: nil, folderSwitch: true, subfolder: true, suffix: true)
        XCTAssertEqual(out.deletingLastPathComponent().lastPathComponent, "minified")
        var isDir: ObjCBool = false
        XCTAssertTrue(FileManager.default.fileExists(
            atPath: out.deletingLastPathComponent().path, isDirectory: &isDir))
        XCTAssertTrue(isDir.boolValue)
    }
}
