import XCTest
@testable import ImageShrinkerCore

final class OptimizerSettingsTests: XCTestCase {
    func test_defaultsMatchLegacyApp() {
        let d = OptimizerSettings.defaults
        XCTAssertTrue(d.notification)
        XCTAssertTrue(d.folderSwitch)
        XCTAssertFalse(d.clearList)
        XCTAssertTrue(d.suffix)
        XCTAssertTrue(d.updateCheck)
        XCTAssertFalse(d.subfolder)
        XCTAssertNil(d.savePath)
    }
}
