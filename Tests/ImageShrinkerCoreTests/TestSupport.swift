import Foundation
import XCTest

enum TestSupport {
    /// Repo root, derived from this source file's location.
    static var repoRoot: URL {
        URL(fileURLWithPath: #filePath)          // .../Tests/ImageShrinkerCoreTests/TestSupport.swift
            .deletingLastPathComponent()          // ImageShrinkerCoreTests
            .deletingLastPathComponent()          // Tests
            .deletingLastPathComponent()          // repo root
    }
    static func binURL(_ name: String) -> URL {
        repoRoot.appendingPathComponent("bin/\(name)")
    }
    static func fixtureURL(_ name: String) -> URL {
        Bundle.module.url(forResource: "Fixtures/\(name)", withExtension: nil)!
    }
    static func tempDir(_ f: StaticString = #function) -> URL {
        let dir = FileManager.default.temporaryDirectory
            .appendingPathComponent("ist-\(UUID().uuidString)")
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }
    static func size(_ url: URL) -> Int {
        let attrs = try? FileManager.default.attributesOfItem(atPath: url.path)
        return (attrs?[.size] as? Int) ?? 0
    }
}
