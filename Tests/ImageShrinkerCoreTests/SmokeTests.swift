import XCTest
@testable import ImageShrinkerCore

final class SmokeTests: XCTestCase {
    func test_packageLoads() {
        XCTAssertEqual(ImageShrinkerCore.name, "ImageShrinkerCore")
    }
}
