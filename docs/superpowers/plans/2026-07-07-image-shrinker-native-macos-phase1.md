# Image Shrinker – Native macOS App (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Electron app with a native SwiftUI macOS app that shrinks PNG/JPEG/GIF/SVG via bundled CLI binaries and svgo-in-JavaScriptCore, reaching feature parity with the current app.

**Architecture:** A pure-logic Swift Package `ImageShrinkerCore` (fully unit-testable with `swift test`) holds the `ImageOptimizer` protocol, the four format optimizers, path logic, and settings model. A thin SwiftUI app target — generated from a text-based `project.yml` via XcodeGen — depends on the core package and owns the UI, file associations, notifications, and Sparkle auto-update. Compression engines are injected as binary/bundle URLs, so the core is testable without the app bundle. This is Phase 1: engines run as bundled binaries (and svgo in JavaScriptCore); the optional per-engine native-lib swap is Phase 2 and out of scope here.

**Tech Stack:** Swift 6 / SwiftUI, Swift Package Manager, XcodeGen, JavaScriptCore (system framework), Sparkle (SPM), esbuild (build-time only, to bundle svgo v3), `xcodebuild`/`swift test`, `notarytool`.

## Global Constraints

- Platform: **macOS only**. Deployment target: **macOS 14 (Sonoma)** — set `.macOS(.v14)` in Package.swift and `deploymentTarget: "14.0"` in project.yml.
- Language/UI: **Swift / SwiftUI**. No Node/Electron in the shipped app.
- Compression quality must match the current app: replicate the exact CLI arguments used today — JPEG `["-outfile", output, input]` (cjpeg), PNG `["-fo", output, input]` (pngquant), GIF `["-o", output, input, "-O=2", "-i"]` (gifsicle).
- Bundled binaries must be **universal (arm64 + x86_64)** and self-contained (no external dylib dependencies). Verify every binary with `lipo -archs` → must print `x86_64 arm64`.
- Settings storage: **UserDefaults**. No migration of the old electron-settings JSON — start from defaults.
- Bundle identifier stays **`de.clickpress.image-shrinker`**. Product name **`Image Shrinker`**.
- Supported file extensions (case-insensitive): `png`, `jpg`, `jpeg`, `gif`, `svg`.
- Default settings: `notification=true`, `folderswitch=true`, `clearlist=false`, `suffix=true`, `updatecheck=true`, `subfolder=false`, `savepath=nil`.
- TouchBar is intentionally **not** ported.
- The `ImageOptimizer.optimize` method is **synchronous `throws`**; the app runs it off the main actor. Do not make it `async` — it keeps tests simple and matches the CLI/JSC execution model.

---

## File Structure

```
image-shrinker/
├── Package.swift                                  # SwiftPM: ImageShrinkerCore library + tests
├── project.yml                                    # XcodeGen spec for the app target
├── bin/                                           # vendored universal CLI binaries (Task 3)
│   ├── cjpeg  ├── pngquant  └── gifsicle
├── build-tools/
│   └── build-svgo.sh                              # esbuild step producing svgo.bundle.js
├── Sources/
│   ├── ImageShrinkerCore/
│   │   ├── ImageOptimizer.swift                   # protocol + OptimizerError
│   │   ├── JpegOptimizer.swift
│   │   ├── PngOptimizer.swift
│   │   ├── GifOptimizer.swift
│   │   ├── SvgOptimizer.swift                     # JavaScriptCore + svgo bundle
│   │   ├── OutputPathBuilder.swift               # path/suffix/subfolder logic
│   │   ├── OptimizerSettings.swift               # settings value type
│   │   ├── OptimizerService.swift                # dispatch-by-extension + sizes
│   │   └── Resources/
│   │       └── svgo.bundle.js                     # generated (Task 9)
│   └── ImageShrinkerApp/                          # SwiftUI app target (built by Xcode)
│       ├── ImageShrinkerApp.swift                 # @main App + Settings scene
│       ├── AppDelegate.swift                      # open-file, recent docs
│       ├── ContentView.swift                      # drop zone + results list
│       ├── ResultRow.swift
│       ├── SettingsStore.swift                    # ObservableObject over UserDefaults
│       ├── SettingsView.swift
│       ├── NotificationManager.swift
│       ├── UpdaterViewModel.swift                 # Sparkle wrapper
│       ├── Info.plist                             # doc types, LSMinimumSystemVersion
│       └── ImageShrinker.entitlements
└── Tests/
    └── ImageShrinkerCoreTests/
        ├── OutputPathBuilderTests.swift
        ├── OptimizerSettingsTests.swift
        ├── JpegOptimizerTests.swift
        ├── PngOptimizerTests.swift
        ├── GifOptimizerTests.swift
        ├── SvgOptimizerTests.swift
        ├── OptimizerServiceTests.swift
        ├── TestSupport.swift                      # locates bin/ and fixtures
        └── Fixtures/  (sample.jpg, sample.png, sample.gif, sample.svg)
```

---

### Task 1: Core package skeleton + green test loop

**Files:**
- Create: `Package.swift`
- Create: `Sources/ImageShrinkerCore/ImageShrinkerCore.swift`
- Test: `Tests/ImageShrinkerCoreTests/SmokeTests.swift`

**Interfaces:**
- Consumes: nothing.
- Produces: a buildable SwiftPM library `ImageShrinkerCore` targeting macOS 14 with a working `swift test` loop that later tasks extend.

- [ ] **Step 1: Write the failing test**

`Tests/ImageShrinkerCoreTests/SmokeTests.swift`:
```swift
import XCTest
@testable import ImageShrinkerCore

final class SmokeTests: XCTestCase {
    func test_packageLoads() {
        XCTAssertEqual(ImageShrinkerCore.name, "ImageShrinkerCore")
    }
}
```

- [ ] **Step 2: Create Package.swift**

`Package.swift`:
```swift
// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "ImageShrinkerCore",
    platforms: [.macOS(.v14)],
    products: [
        .library(name: "ImageShrinkerCore", targets: ["ImageShrinkerCore"])
    ],
    targets: [
        .target(
            name: "ImageShrinkerCore",
            resources: [.process("Resources")]
        ),
        .testTarget(
            name: "ImageShrinkerCoreTests",
            dependencies: ["ImageShrinkerCore"],
            resources: [.copy("Fixtures")]
        )
    ]
)
```

- [ ] **Step 3: Create the minimal source + resource dir**

`Sources/ImageShrinkerCore/ImageShrinkerCore.swift`:
```swift
import Foundation

public enum ImageShrinkerCore {
    public static let name = "ImageShrinkerCore"
}
```
Also create an empty placeholder so the resource dir exists: create `Sources/ImageShrinkerCore/Resources/.gitkeep` and `Tests/ImageShrinkerCoreTests/Fixtures/.gitkeep`.

- [ ] **Step 4: Run tests**

Run: `swift test`
Expected: builds and `test_packageLoads` PASSES.

- [ ] **Step 5: Commit**

```bash
git add Package.swift Sources/ImageShrinkerCore Tests/ImageShrinkerCoreTests
git commit -m "feat(core): scaffold ImageShrinkerCore swift package"
```

---

### Task 2: Vendor universal, self-contained CLI binaries

**Files:**
- Create: `bin/cjpeg`, `bin/pngquant`, `bin/gifsicle`
- Create: `build-tools/fetch-binaries.md` (documents provenance)

**Interfaces:**
- Consumes: nothing.
- Produces: three executables under `bin/`, each universal (`x86_64 arm64`) and self-contained. Later optimizer tasks and the app bundle reference these.

> **Why:** The npm-vendored `cjpeg` and `pngquant` are x86_64-only and would require Rosetta on Apple Silicon. gifsicle from npm is already universal and self-contained and may be copied as-is.

- [ ] **Step 1: Copy the already-universal gifsicle**

```bash
mkdir -p bin
cp node_modules/gifsicle/vendor/gifsicle bin/gifsicle
chmod +x bin/gifsicle
lipo -archs bin/gifsicle    # expect: x86_64 arm64
```

- [ ] **Step 2: Build universal, statically-linked mozjpeg (cjpeg)**

mozjpeg has no runtime deps when built static. Build both arches and lipo them:
```bash
brew install cmake nasm
work=$(mktemp -d)
git clone --depth 1 https://github.com/mozilla/mozjpeg "$work/mozjpeg"
for arch in x86_64 arm64; do
  cmake -S "$work/mozjpeg" -B "$work/build-$arch" \
    -DCMAKE_OSX_ARCHITECTURES=$arch -DENABLE_SHARED=OFF -DPNG_SUPPORTED=OFF \
    -DCMAKE_BUILD_TYPE=Release >/dev/null
  cmake --build "$work/build-$arch" --target cjpeg >/dev/null
done
lipo -create "$work/build-x86_64/cjpeg" "$work/build-arm64/cjpeg" -output bin/cjpeg
chmod +x bin/cjpeg
otool -L bin/cjpeg    # expect: only /usr/lib/libSystem — no Homebrew/libjpeg dylibs
lipo -archs bin/cjpeg # expect: x86_64 arm64
```

- [ ] **Step 3: Build universal pngquant**

pngquant's modern release is Rust (universal via `cargo build --target`), but Phase 1 only needs a universal, self-contained binary — the older C 2.x release links only libpng/zlib statically. Prefer the official static universal build; if building from source:
```bash
# Rust path (pngquant 3.x): produces self-contained binaries
rustup target add x86_64-apple-darwin aarch64-apple-darwin
work=$(mktemp -d); git clone --depth 1 https://github.com/kornelski/pngquant "$work/pq"
( cd "$work/pq"
  cargo build --release --target x86_64-apple-darwin
  cargo build --release --target aarch64-apple-darwin )
lipo -create "$work/pq/target/x86_64-apple-darwin/release/pngquant" \
             "$work/pq/target/aarch64-apple-darwin/release/pngquant" -output bin/pngquant
chmod +x bin/pngquant
otool -L bin/pngquant   # expect: only system dylibs
lipo -archs bin/pngquant  # expect: x86_64 arm64
```
Record the exact source (repo + commit) in `build-tools/fetch-binaries.md`.

- [ ] **Step 4: Verify all three run**

```bash
bin/cjpeg -version 2>&1 | head -1
bin/pngquant --version
bin/gifsicle --version | head -1
```
Expected: each prints a version without a "bad CPU type"/dyld error.

- [ ] **Step 5: Commit**

```bash
git add bin build-tools/fetch-binaries.md
git commit -m "chore: vendor universal self-contained cjpeg/pngquant/gifsicle"
```

---

### Task 3: Test support helpers + fixtures

**Files:**
- Create: `Tests/ImageShrinkerCoreTests/TestSupport.swift`
- Create: `Tests/ImageShrinkerCoreTests/Fixtures/sample.jpg|png|gif|svg`

**Interfaces:**
- Consumes: `bin/` from Task 2.
- Produces: `TestSupport.binURL(_ name:) -> URL`, `TestSupport.fixtureURL(_ name:) -> URL`, `TestSupport.tempDir() -> URL`. Every optimizer test uses these.

- [ ] **Step 1: Add fixtures**

Generate small real images (any tiny valid files work). Example:
```bash
cd Tests/ImageShrinkerCoreTests/Fixtures
sips -s format jpeg /System/Library/CoreServices/DefaultDesktop.heic --out sample.jpg >/dev/null 2>&1 || \
  printf '' # if sips path unavailable, copy any small .jpg here
# Provide sample.png and sample.gif similarly (any small valid files).
cat > sample.svg <<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">
  <!-- a comment svgo will strip --><rect x="0" y="0" width="10" height="10" fill="#ff0000"/>
</svg>
SVG
```
Ensure all four fixture files exist and are non-empty.

- [ ] **Step 2: Write TestSupport**

`Tests/ImageShrinkerCoreTests/TestSupport.swift`:
```swift
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
```

- [ ] **Step 3: Run tests to confirm helpers compile**

Run: `swift test --filter SmokeTests`
Expected: PASS (helpers compile; no new failures).

- [ ] **Step 4: Commit**

```bash
git add Tests/ImageShrinkerCoreTests
git commit -m "test(core): add fixtures and test support helpers"
```

---

### Task 4: OutputPathBuilder (path/suffix/subfolder logic)

**Files:**
- Create: `Sources/ImageShrinkerCore/OutputPathBuilder.swift`
- Test: `Tests/ImageShrinkerCoreTests/OutputPathBuilderTests.swift`

**Interfaces:**
- Consumes: `OptimizerSettings` fields (defined here as needed; the full type lands in Task 5 — this task uses only `savePath`, `folderSwitch`, `subfolder`, `suffix`). To avoid a forward dependency, `OutputPathBuilder` takes primitives, not the settings struct.
- Produces:
  `OutputPathBuilder.destination(for input: URL, savePath: URL?, folderSwitch: Bool, subfolder: Bool, suffix: Bool) throws -> URL`
  Behavior mirrors the current `generateNewPath`: base dir = input's dir, unless `folderSwitch == false && savePath != nil` → `savePath`; if `subfolder` → append `minified`; create the dir; filename = `name` + (`.min` if suffix) + original extension.

- [ ] **Step 1: Write failing tests**

`Tests/ImageShrinkerCoreTests/OutputPathBuilderTests.swift`:
```swift
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
```

- [ ] **Step 2: Run to verify failure**

Run: `swift test --filter OutputPathBuilderTests`
Expected: FAIL — `OutputPathBuilder` undefined.

- [ ] **Step 3: Implement**

`Sources/ImageShrinkerCore/OutputPathBuilder.swift`:
```swift
import Foundation

public enum OutputPathBuilder {
    public static func destination(
        for input: URL,
        savePath: URL?,
        folderSwitch: Bool,
        subfolder: Bool,
        suffix: Bool
    ) throws -> URL {
        var dir = input.deletingLastPathComponent()
        if folderSwitch == false, let savePath { dir = savePath }
        if subfolder { dir = dir.appendingPathComponent("minified") }
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)

        let name = input.deletingPathExtension().lastPathComponent
        let ext = input.pathExtension
        let suffixString = suffix ? ".min" : ""
        let filename = ext.isEmpty ? "\(name)\(suffixString)"
                                   : "\(name)\(suffixString).\(ext)"
        return dir.appendingPathComponent(filename)
    }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `swift test --filter OutputPathBuilderTests`
Expected: PASS (all 4).

- [ ] **Step 5: Commit**

```bash
git add Sources/ImageShrinkerCore/OutputPathBuilder.swift Tests/ImageShrinkerCoreTests/OutputPathBuilderTests.swift
git commit -m "feat(core): add OutputPathBuilder with suffix/subfolder/savepath logic"
```

---

### Task 5: OptimizerSettings value type

**Files:**
- Create: `Sources/ImageShrinkerCore/OptimizerSettings.swift`
- Test: `Tests/ImageShrinkerCoreTests/OptimizerSettingsTests.swift`

**Interfaces:**
- Consumes: nothing.
- Produces: `struct OptimizerSettings` with fields `notification, folderSwitch, clearList, suffix, updateCheck, subfolder: Bool` and `savePath: URL?`, plus `static let defaults`. Used by `OptimizerService` (Task 10) and the app's `SettingsStore` (Task 11).

- [ ] **Step 1: Write failing test**

`Tests/ImageShrinkerCoreTests/OptimizerSettingsTests.swift`:
```swift
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
```

- [ ] **Step 2: Run to verify failure**

Run: `swift test --filter OptimizerSettingsTests`
Expected: FAIL — type undefined.

- [ ] **Step 3: Implement**

`Sources/ImageShrinkerCore/OptimizerSettings.swift`:
```swift
import Foundation

public struct OptimizerSettings: Equatable {
    public var notification: Bool
    public var folderSwitch: Bool
    public var clearList: Bool
    public var suffix: Bool
    public var updateCheck: Bool
    public var subfolder: Bool
    public var savePath: URL?

    public init(notification: Bool, folderSwitch: Bool, clearList: Bool,
                suffix: Bool, updateCheck: Bool, subfolder: Bool, savePath: URL?) {
        self.notification = notification; self.folderSwitch = folderSwitch
        self.clearList = clearList; self.suffix = suffix
        self.updateCheck = updateCheck; self.subfolder = subfolder
        self.savePath = savePath
    }

    public static let defaults = OptimizerSettings(
        notification: true, folderSwitch: true, clearList: false,
        suffix: true, updateCheck: true, subfolder: false, savePath: nil)
}
```

- [ ] **Step 4: Run to verify pass**

Run: `swift test --filter OptimizerSettingsTests`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add Sources/ImageShrinkerCore/OptimizerSettings.swift Tests/ImageShrinkerCoreTests/OptimizerSettingsTests.swift
git commit -m "feat(core): add OptimizerSettings value type with legacy defaults"
```

---

### Task 6: ImageOptimizer protocol + JpegOptimizer

**Files:**
- Create: `Sources/ImageShrinkerCore/ImageOptimizer.swift`
- Create: `Sources/ImageShrinkerCore/JpegOptimizer.swift`
- Test: `Tests/ImageShrinkerCoreTests/JpegOptimizerTests.swift`

**Interfaces:**
- Consumes: a binary URL (Task 2), `TestSupport` (Task 3).
- Produces:
  - `protocol ImageOptimizer { func optimize(input: URL, output: URL) throws }`
  - `enum OptimizerError: Error { case processFailed(code: Int32, message: String); case invalidOutput }`
  - `struct ProcessRunner { static func run(_ exe: URL, _ args: [String]) throws }` (shared helper used by JPEG/PNG/GIF optimizers)
  - `struct JpegOptimizer: ImageOptimizer` with `init(binary: URL)`.

- [ ] **Step 1: Write failing test**

`Tests/ImageShrinkerCoreTests/JpegOptimizerTests.swift`:
```swift
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
}
```

- [ ] **Step 2: Run to verify failure**

Run: `swift test --filter JpegOptimizerTests`
Expected: FAIL — types undefined.

- [ ] **Step 3: Implement protocol + runner + optimizer**

`Sources/ImageShrinkerCore/ImageOptimizer.swift`:
```swift
import Foundation

public protocol ImageOptimizer {
    /// Reads `input`, writes an optimized image to `output`. Synchronous; run off the main actor.
    func optimize(input: URL, output: URL) throws
}

public enum OptimizerError: Error, Equatable {
    case processFailed(code: Int32, message: String)
    case invalidOutput
    case unsupportedExtension(String)
}

enum ProcessRunner {
    static func run(_ exe: URL, _ args: [String]) throws {
        let proc = Process()
        proc.executableURL = exe
        proc.arguments = args
        let err = Pipe()
        proc.standardError = err
        proc.standardOutput = Pipe()
        try proc.run()
        proc.waitUntilExit()
        guard proc.terminationStatus == 0 else {
            let msg = String(data: err.fileHandleForReading.readDataToEndOfFile(),
                             encoding: .utf8) ?? ""
            throw OptimizerError.processFailed(code: proc.terminationStatus, message: msg)
        }
    }
}
```

`Sources/ImageShrinkerCore/JpegOptimizer.swift`:
```swift
import Foundation

public struct JpegOptimizer: ImageOptimizer {
    private let binary: URL
    public init(binary: URL) { self.binary = binary }

    public func optimize(input: URL, output: URL) throws {
        try ProcessRunner.run(binary, ["-outfile", output.path, input.path])
        guard TestableFileSize.nonEmpty(output) else { throw OptimizerError.invalidOutput }
    }
}

enum TestableFileSize {
    static func nonEmpty(_ url: URL) -> Bool {
        let attrs = try? FileManager.default.attributesOfItem(atPath: url.path)
        let size = (attrs?[.size] as? Int) ?? 0
        return size > 0
    }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `swift test --filter JpegOptimizerTests`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add Sources/ImageShrinkerCore/ImageOptimizer.swift Sources/ImageShrinkerCore/JpegOptimizer.swift Tests/ImageShrinkerCoreTests/JpegOptimizerTests.swift
git commit -m "feat(core): add ImageOptimizer protocol and JpegOptimizer (cjpeg)"
```

---

### Task 7: PngOptimizer

**Files:**
- Create: `Sources/ImageShrinkerCore/PngOptimizer.swift`
- Test: `Tests/ImageShrinkerCoreTests/PngOptimizerTests.swift`

**Interfaces:**
- Consumes: `ProcessRunner`, `OptimizerError` (Task 6), `bin/pngquant` (Task 2).
- Produces: `struct PngOptimizer: ImageOptimizer` with `init(binary: URL)`. Uses args `["-fo", output, input]` (force overwrite, output file) matching the legacy app.

- [ ] **Step 1: Write failing test**

`Tests/ImageShrinkerCoreTests/PngOptimizerTests.swift`:
```swift
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
```

- [ ] **Step 2: Run to verify failure**

Run: `swift test --filter PngOptimizerTests`
Expected: FAIL — `PngOptimizer` undefined.

- [ ] **Step 3: Implement**

`Sources/ImageShrinkerCore/PngOptimizer.swift`:
```swift
import Foundation

public struct PngOptimizer: ImageOptimizer {
    private let binary: URL
    public init(binary: URL) { self.binary = binary }

    public func optimize(input: URL, output: URL) throws {
        try ProcessRunner.run(binary, ["-fo", output.path, input.path])
        guard TestableFileSize.nonEmpty(output) else { throw OptimizerError.invalidOutput }
    }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `swift test --filter PngOptimizerTests`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add Sources/ImageShrinkerCore/PngOptimizer.swift Tests/ImageShrinkerCoreTests/PngOptimizerTests.swift
git commit -m "feat(core): add PngOptimizer (pngquant)"
```

---

### Task 8: GifOptimizer

**Files:**
- Create: `Sources/ImageShrinkerCore/GifOptimizer.swift`
- Test: `Tests/ImageShrinkerCoreTests/GifOptimizerTests.swift`

**Interfaces:**
- Consumes: `ProcessRunner`, `OptimizerError` (Task 6), `bin/gifsicle` (Task 2).
- Produces: `struct GifOptimizer: ImageOptimizer` with `init(binary: URL)`. Uses args `["-o", output, input, "-O=2", "-i"]` matching the legacy app.

- [ ] **Step 1: Write failing test**

`Tests/ImageShrinkerCoreTests/GifOptimizerTests.swift`:
```swift
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
```

- [ ] **Step 2: Run to verify failure**

Run: `swift test --filter GifOptimizerTests`
Expected: FAIL — `GifOptimizer` undefined.

- [ ] **Step 3: Implement**

`Sources/ImageShrinkerCore/GifOptimizer.swift`:
```swift
import Foundation

public struct GifOptimizer: ImageOptimizer {
    private let binary: URL
    public init(binary: URL) { self.binary = binary }

    public func optimize(input: URL, output: URL) throws {
        try ProcessRunner.run(binary, ["-o", output.path, input.path, "-O=2", "-i"])
        guard TestableFileSize.nonEmpty(output) else { throw OptimizerError.invalidOutput }
    }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `swift test --filter GifOptimizerTests`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add Sources/ImageShrinkerCore/GifOptimizer.swift Tests/ImageShrinkerCoreTests/GifOptimizerTests.swift
git commit -m "feat(core): add GifOptimizer (gifsicle)"
```

---

### Task 9: svgo bundle build + SvgOptimizer (JavaScriptCore)

**Files:**
- Create: `build-tools/build-svgo.sh`
- Create: `Sources/ImageShrinkerCore/Resources/svgo.bundle.js` (generated output, committed)
- Create: `Sources/ImageShrinkerCore/SvgOptimizer.swift`
- Test: `Tests/ImageShrinkerCoreTests/SvgOptimizerTests.swift`

**Interfaces:**
- Consumes: `OptimizerError` (Task 6). The bundle is loaded from `Bundle.module`.
- Produces: `struct SvgOptimizer: ImageOptimizer` with `init(bundleJS: String)` **and** a convenience `init() throws` that loads `svgo.bundle.js` from `Bundle.module`. The optimizer exposes SVG-only behavior: read input text, run svgo, write output.

- [ ] **Step 1: Create the esbuild build script**

`build-tools/build-svgo.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
tmp=$(mktemp -d)
# svgo v3 is browser-compatible; bundle it as an IIFE exposing a global.
( cd "$tmp" && npm init -y >/dev/null && npm install svgo@^3 esbuild >/dev/null )
cat > "$tmp/entry.js" <<'JS'
import { optimize } from 'svgo';
globalThis.svgoOptimize = (svg) => optimize(svg, { multipass: true }).data;
JS
"$tmp/node_modules/.bin/esbuild" "$tmp/entry.js" \
  --bundle --format=iife --platform=browser \
  --outfile=Sources/ImageShrinkerCore/Resources/svgo.bundle.js
echo "Wrote Sources/ImageShrinkerCore/Resources/svgo.bundle.js"
```
Run it:
```bash
chmod +x build-tools/build-svgo.sh
./build-tools/build-svgo.sh
test -s Sources/ImageShrinkerCore/Resources/svgo.bundle.js   # non-empty
```

- [ ] **Step 2: Write failing test**

`Tests/ImageShrinkerCoreTests/SvgOptimizerTests.swift`:
```swift
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
```

- [ ] **Step 3: Run to verify failure**

Run: `swift test --filter SvgOptimizerTests`
Expected: FAIL — `SvgOptimizer` undefined.

- [ ] **Step 4: Implement**

`Sources/ImageShrinkerCore/SvgOptimizer.swift`:
```swift
import Foundation
import JavaScriptCore

public struct SvgOptimizer: ImageOptimizer {
    private let bundleJS: String

    public init(bundleJS: String) { self.bundleJS = bundleJS }

    public init() throws {
        guard let url = Bundle.module.url(forResource: "svgo.bundle", withExtension: "js"),
              let js = try? String(contentsOf: url, encoding: .utf8) else {
            throw OptimizerError.invalidOutput
        }
        self.bundleJS = js
    }

    public func optimize(input: URL, output: URL) throws {
        let svg = try String(contentsOf: input, encoding: .utf8)
        guard let context = JSContext() else { throw OptimizerError.invalidOutput }
        var jsError: String?
        context.exceptionHandler = { _, exception in jsError = exception?.toString() }
        context.evaluateScript(bundleJS)
        if let jsError { throw OptimizerError.processFailed(code: -1, message: jsError) }

        let fn = context.objectForKeyedSubscript("svgoOptimize")
        guard let result = fn?.call(withArguments: [svg]), !result.isUndefined,
              let optimized = result.toString(), jsError == nil else {
            throw OptimizerError.processFailed(code: -1, message: jsError ?? "svgo returned no data")
        }
        try optimized.data(using: .utf8)?.write(to: output)
        guard TestableFileSize.nonEmpty(output) else { throw OptimizerError.invalidOutput }
    }
}
```

- [ ] **Step 5: Run to verify pass**

Run: `swift test --filter SvgOptimizerTests`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add build-tools/build-svgo.sh Sources/ImageShrinkerCore/Resources/svgo.bundle.js Sources/ImageShrinkerCore/SvgOptimizer.swift Tests/ImageShrinkerCoreTests/SvgOptimizerTests.swift
git commit -m "feat(core): add SvgOptimizer via svgo bundle in JavaScriptCore"
```

---

### Task 10: OptimizerService (dispatch + sizes)

**Files:**
- Create: `Sources/ImageShrinkerCore/OptimizerService.swift`
- Test: `Tests/ImageShrinkerCoreTests/OptimizerServiceTests.swift`

**Interfaces:**
- Consumes: all four optimizers, `OutputPathBuilder`, `OptimizerSettings`, `OptimizerError`.
- Produces:
  - `struct BinaryPaths { let cjpeg, pngquant, gifsicle: URL }`
  - `struct ShrinkResult { let output: URL; let originalSize: Int; let optimizedSize: Int }`
  - `struct OptimizerService { init(binaries: BinaryPaths); func shrink(input: URL, settings: OptimizerSettings) throws -> ShrinkResult }`
  - Dispatch by lowercased extension: jpg/jpeg→JPEG, png→PNG, gif→GIF, svg→SVG; else throw `.unsupportedExtension`.

- [ ] **Step 1: Write failing tests**

`Tests/ImageShrinkerCoreTests/OptimizerServiceTests.swift`:
```swift
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
```

- [ ] **Step 2: Run to verify failure**

Run: `swift test --filter OptimizerServiceTests`
Expected: FAIL — `OptimizerService` undefined.

- [ ] **Step 3: Implement**

`Sources/ImageShrinkerCore/OptimizerService.swift`:
```swift
import Foundation

public struct BinaryPaths {
    public let cjpeg: URL, pngquant: URL, gifsicle: URL
    public init(cjpeg: URL, pngquant: URL, gifsicle: URL) {
        self.cjpeg = cjpeg; self.pngquant = pngquant; self.gifsicle = gifsicle
    }
}

public struct ShrinkResult {
    public let output: URL
    public let originalSize: Int
    public let optimizedSize: Int
}

public struct OptimizerService {
    private let binaries: BinaryPaths
    public init(binaries: BinaryPaths) { self.binaries = binaries }

    public func shrink(input: URL, settings: OptimizerSettings) throws -> ShrinkResult {
        let ext = input.pathExtension.lowercased()
        let optimizer: ImageOptimizer
        switch ext {
        case "jpg", "jpeg": optimizer = JpegOptimizer(binary: binaries.cjpeg)
        case "png":         optimizer = PngOptimizer(binary: binaries.pngquant)
        case "gif":         optimizer = GifOptimizer(binary: binaries.gifsicle)
        case "svg":         optimizer = try SvgOptimizer()
        default:            throw OptimizerError.unsupportedExtension(ext)
        }

        let originalSize = fileSize(input)
        let output = try OutputPathBuilder.destination(
            for: input, savePath: settings.savePath,
            folderSwitch: settings.folderSwitch, subfolder: settings.subfolder,
            suffix: settings.suffix)
        try optimizer.optimize(input: input, output: output)
        return ShrinkResult(output: output,
                            originalSize: originalSize,
                            optimizedSize: fileSize(output))
    }

    private func fileSize(_ url: URL) -> Int {
        let attrs = try? FileManager.default.attributesOfItem(atPath: url.path)
        return (attrs?[.size] as? Int) ?? 0
    }
}
```

- [ ] **Step 4: Run full core suite**

Run: `swift test`
Expected: ALL tests PASS (path, settings, four optimizers, service).

- [ ] **Step 5: Commit**

```bash
git add Sources/ImageShrinkerCore/OptimizerService.swift Tests/ImageShrinkerCoreTests/OptimizerServiceTests.swift
git commit -m "feat(core): add OptimizerService dispatching by extension with size reporting"
```

---

### Task 11: App target scaffold via XcodeGen (empty window)

**Files:**
- Create: `project.yml`
- Create: `Sources/ImageShrinkerApp/ImageShrinkerApp.swift`
- Create: `Sources/ImageShrinkerApp/ContentView.swift`
- Create: `Sources/ImageShrinkerApp/Info.plist`
- Create: `Sources/ImageShrinkerApp/ImageShrinker.entitlements`

**Interfaces:**
- Consumes: `ImageShrinkerCore` as a local SPM package.
- Produces: an Xcode project `ImageShrinker.xcodeproj` (generated, git-ignored) building app `Image Shrinker` that launches and shows the placeholder `ContentView`.

- [ ] **Step 1: Write project.yml**

`project.yml`:
```yaml
name: ImageShrinker
options:
  bundleIdPrefix: de.clickpress
  deploymentTarget:
    macOS: "14.0"
packages:
  ImageShrinkerCore:
    path: .
targets:
  ImageShrinker:
    type: application
    platform: macOS
    sources: [Sources/ImageShrinkerApp]
    settings:
      base:
        PRODUCT_NAME: "Image Shrinker"
        PRODUCT_BUNDLE_IDENTIFIER: de.clickpress.image-shrinker
        INFOPLIST_FILE: Sources/ImageShrinkerApp/Info.plist
        CODE_SIGN_ENTITLEMENTS: Sources/ImageShrinkerApp/ImageShrinker.entitlements
        MARKETING_VERSION: "2.0.0"
        CURRENT_PROJECT_VERSION: "1"
        ENABLE_HARDENED_RUNTIME: YES
    dependencies:
      - package: ImageShrinkerCore
        product: ImageShrinkerCore
```

- [ ] **Step 2: Add minimal Info.plist and entitlements**

`Sources/ImageShrinkerApp/Info.plist`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>Image Shrinker</string>
  <key>CFBundleShortVersionString</key><string>$(MARKETING_VERSION)</string>
  <key>CFBundleVersion</key><string>$(CURRENT_PROJECT_VERSION)</string>
  <key>LSMinimumSystemVersion</key><string>14.0</string>
  <key>NSHumanReadableCopyright</key><string>CC0-1.0</string>
</dict></plist>
```
`Sources/ImageShrinkerApp/ImageShrinker.entitlements`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>com.apple.security.app-sandbox</key><false/>
</dict></plist>
```
> Sandbox is off in Phase 1 (matches the current unsandboxed app and avoids blocking spawned binaries / arbitrary save paths). Revisit only if App Store distribution is ever pursued.

- [ ] **Step 3: Add the SwiftUI entry + placeholder view**

`Sources/ImageShrinkerApp/ImageShrinkerApp.swift`:
```swift
import SwiftUI

@main
struct ImageShrinkerApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
                .frame(minWidth: 340, minHeight: 550)
        }
        .windowResizability(.contentSize)
    }
}
```
`Sources/ImageShrinkerApp/ContentView.swift`:
```swift
import SwiftUI

struct ContentView: View {
    var body: some View {
        Text("Image Shrinker")
            .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
```

- [ ] **Step 4: Generate and build**

```bash
echo "ImageShrinker.xcodeproj/" >> .gitignore
xcodegen generate
xcodebuild -project ImageShrinker.xcodeproj -scheme ImageShrinker -destination 'platform=macOS' build
```
Expected: `** BUILD SUCCEEDED **`. Launch the built app once and confirm an empty window titled "Image Shrinker" appears.

- [ ] **Step 5: Commit**

```bash
git add project.yml Sources/ImageShrinkerApp .gitignore
git commit -m "feat(app): scaffold SwiftUI app target via XcodeGen"
```

---

### Task 12: SettingsStore (UserDefaults) + Settings UI

**Files:**
- Create: `Sources/ImageShrinkerApp/SettingsStore.swift`
- Create: `Sources/ImageShrinkerApp/SettingsView.swift`
- Modify: `Sources/ImageShrinkerApp/ImageShrinkerApp.swift` (add `Settings` scene)

**Interfaces:**
- Consumes: `OptimizerSettings` (core).
- Produces: `final class SettingsStore: ObservableObject` exposing `@Published` mirrors of every setting, `var current: OptimizerSettings` (built from the published values), persisted via `UserDefaults.standard`. Used by `ContentView` (Task 13) and `SettingsView`.

- [ ] **Step 1: Implement SettingsStore**

`Sources/ImageShrinkerApp/SettingsStore.swift`:
```swift
import Foundation
import Combine
import ImageShrinkerCore

final class SettingsStore: ObservableObject {
    @Published var notification: Bool { didSet { d.set(notification, forKey: "notification") } }
    @Published var folderSwitch: Bool { didSet { d.set(folderSwitch, forKey: "folderswitch") } }
    @Published var clearList: Bool    { didSet { d.set(clearList, forKey: "clearlist") } }
    @Published var suffix: Bool       { didSet { d.set(suffix, forKey: "suffix") } }
    @Published var updateCheck: Bool  { didSet { d.set(updateCheck, forKey: "updatecheck") } }
    @Published var subfolder: Bool    { didSet { d.set(subfolder, forKey: "subfolder") } }
    @Published var savePath: URL?     { didSet { d.set(savePath?.path, forKey: "savepath") } }

    private let d = UserDefaults.standard

    init() {
        let def = OptimizerSettings.defaults
        d.register(defaults: [
            "notification": def.notification, "folderswitch": def.folderSwitch,
            "clearlist": def.clearList, "suffix": def.suffix,
            "updatecheck": def.updateCheck, "subfolder": def.subfolder])
        notification = d.bool(forKey: "notification")
        folderSwitch = d.bool(forKey: "folderswitch")
        clearList = d.bool(forKey: "clearlist")
        suffix = d.bool(forKey: "suffix")
        updateCheck = d.bool(forKey: "updatecheck")
        subfolder = d.bool(forKey: "subfolder")
        savePath = d.string(forKey: "savepath").map { URL(fileURLWithPath: $0) }
    }

    var current: OptimizerSettings {
        OptimizerSettings(notification: notification, folderSwitch: folderSwitch,
                          clearList: clearList, suffix: suffix, updateCheck: updateCheck,
                          subfolder: subfolder, savePath: savePath)
    }
}
```

- [ ] **Step 2: Implement SettingsView**

`Sources/ImageShrinkerApp/SettingsView.swift`:
```swift
import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var settings: SettingsStore

    var body: some View {
        Form {
            Toggle("Add \".min\" suffix", isOn: $settings.suffix)
            Toggle("Save into \"minified\" subfolder", isOn: $settings.subfolder)
            Toggle("Save next to original", isOn: $settings.folderSwitch)
            Toggle("Show notification when done", isOn: $settings.notification)
            Toggle("Clear list after each drop", isOn: $settings.clearList)
            Toggle("Check for updates", isOn: $settings.updateCheck)
            HStack {
                Text("Save folder:")
                Text(settings.savePath?.path ?? "—").foregroundStyle(.secondary)
                Button("Choose…") { chooseFolder() }
            }.disabled(settings.folderSwitch)
        }
        .padding(20)
        .frame(width: 420)
    }

    private func chooseFolder() {
        let panel = NSOpenPanel()
        panel.canChooseDirectories = true
        panel.canChooseFiles = false
        if panel.runModal() == .OK { settings.savePath = panel.url }
    }
}
```

- [ ] **Step 3: Wire the Settings scene + inject the store**

Edit `Sources/ImageShrinkerApp/ImageShrinkerApp.swift`:
```swift
import SwiftUI

@main
struct ImageShrinkerApp: App {
    @StateObject private var settings = SettingsStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(settings)
                .frame(minWidth: 340, minHeight: 550)
        }
        .windowResizability(.contentSize)

        Settings {
            SettingsView().environmentObject(settings)
        }
    }
}
```

- [ ] **Step 4: Regenerate, build, smoke-test**

```bash
xcodegen generate
xcodebuild -project ImageShrinker.xcodeproj -scheme ImageShrinker -destination 'platform=macOS' build
```
Expected: BUILD SUCCEEDED. Launch, open Settings (⌘,), toggle a switch, reopen — value persists.

- [ ] **Step 5: Commit**

```bash
git add Sources/ImageShrinkerApp
git commit -m "feat(app): add UserDefaults-backed SettingsStore and Settings UI"
```

---

### Task 13: ContentView — drop zone, results list, wired to OptimizerService

**Files:**
- Create: `Sources/ImageShrinkerApp/ResultRow.swift`
- Create: `Sources/ImageShrinkerApp/AppBinaries.swift`
- Modify: `Sources/ImageShrinkerApp/ContentView.swift`

**Interfaces:**
- Consumes: `OptimizerService`, `BinaryPaths`, `ShrinkResult`, `SettingsStore`.
- Produces:
  - `enum AppBinaries { static func paths() -> BinaryPaths }` resolving `cjpeg`/`pngquant`/`gifsicle` from the app bundle's `Contents/Resources/bin` (see Task 16 for where they land; for dev builds they are copied there by the run-script phase).
  - `ContentView` with a `.dropDestination` accepting file URLs, running `OptimizerService.shrink` off the main actor, appending `ShrinkResult`s to a list rendered by `ResultRow`. Honors `settings.clearList`.

- [ ] **Step 1: Implement AppBinaries resolver**

`Sources/ImageShrinkerApp/AppBinaries.swift`:
```swift
import Foundation
import ImageShrinkerCore

enum AppBinaries {
    static func paths() -> BinaryPaths {
        let base = Bundle.main.resourceURL!.appendingPathComponent("bin")
        return BinaryPaths(
            cjpeg: base.appendingPathComponent("cjpeg"),
            pngquant: base.appendingPathComponent("pngquant"),
            gifsicle: base.appendingPathComponent("gifsicle"))
    }
}
```

- [ ] **Step 2: Implement ResultRow**

`Sources/ImageShrinkerApp/ResultRow.swift`:
```swift
import SwiftUI
import ImageShrinkerCore

struct ResultRow: View {
    let result: ShrinkResult

    private var savedPercent: Int {
        guard result.originalSize > 0 else { return 0 }
        return Int((1 - Double(result.optimizedSize) / Double(result.originalSize)) * 100)
    }
    var body: some View {
        HStack {
            VStack(alignment: .leading) {
                Text(result.output.lastPathComponent).lineLimit(1)
                Text("\(result.originalSize / 1024) KB → \(result.optimizedSize / 1024) KB")
                    .font(.caption).foregroundStyle(.secondary)
            }
            Spacer()
            Text("−\(savedPercent)%").foregroundStyle(.green).bold()
        }
        .padding(.vertical, 4)
    }
}
```

- [ ] **Step 3: Implement ContentView with drop handling**

`Sources/ImageShrinkerApp/ContentView.swift`:
```swift
import SwiftUI
import ImageShrinkerCore

struct ContentView: View {
    @EnvironmentObject var settings: SettingsStore
    @State private var results: [ShrinkResult] = []
    @State private var errorMessage: String?

    var body: some View {
        VStack(spacing: 12) {
            DropZone(isBusy: false)
                .dropDestination(for: URL.self) { urls, _ in
                    handleDrop(urls); return true
                }
            List(results.indices, id: \.self) { i in ResultRow(result: results[i]) }
        }
        .padding(16)
        .alert("Error", isPresented: .constant(errorMessage != nil)) {
            Button("OK") { errorMessage = nil }
        } message: { Text(errorMessage ?? "") }
    }

    private func handleDrop(_ urls: [URL]) {
        if settings.clearList { results.removeAll() }
        let service = OptimizerService(binaries: AppBinaries.paths())
        let snapshot = settings.current
        Task.detached {
            for url in urls {
                do {
                    let r = try service.shrink(input: url, settings: snapshot)
                    await MainActor.run { results.append(r) }
                    await NotificationManager.shared.notifyIfEnabled(snapshot, result: r)
                } catch {
                    await MainActor.run { errorMessage = String(describing: error) }
                }
            }
        }
    }
}

struct DropZone: View {
    let isBusy: Bool
    var body: some View {
        RoundedRectangle(cornerRadius: 12)
            .strokeBorder(style: StrokeStyle(lineWidth: 2, dash: [6]))
            .foregroundStyle(.secondary)
            .overlay(Text(isBusy ? "Shrinking…" : "Drop images here"))
            .frame(height: 140)
    }
}
```
> `NotificationManager` is introduced in Task 14; add a temporary no-op stub if implementing strictly task-by-task, or reorder Task 14 before this step. Recommended: implement Task 14 first, then this step compiles directly.

- [ ] **Step 4: Regenerate, build, smoke-test**

```bash
xcodegen generate
xcodebuild -project ImageShrinker.xcodeproj -scheme ImageShrinker -destination 'platform=macOS' build
```
Expected: BUILD SUCCEEDED. (End-to-end drop test requires binaries in the bundle — verified in Task 16.)

- [ ] **Step 5: Commit**

```bash
git add Sources/ImageShrinkerApp
git commit -m "feat(app): add drop zone + results list wired to OptimizerService"
```

---

### Task 14: NotificationManager (UserNotifications)

**Files:**
- Create: `Sources/ImageShrinkerApp/NotificationManager.swift`

**Interfaces:**
- Consumes: `OptimizerSettings`, `ShrinkResult`.
- Produces: `final class NotificationManager` (singleton `shared`) with `func requestAuthorization()` and `func notifyIfEnabled(_ settings: OptimizerSettings, result: ShrinkResult) async`. Called from `ContentView.handleDrop`.

- [ ] **Step 1: Implement**

`Sources/ImageShrinkerApp/NotificationManager.swift`:
```swift
import Foundation
import UserNotifications
import ImageShrinkerCore

final class NotificationManager {
    static let shared = NotificationManager()
    private init() {}

    func requestAuthorization() {
        UNUserNotificationCenter.current()
            .requestAuthorization(options: [.alert, .sound]) { _, _ in }
    }

    func notifyIfEnabled(_ settings: OptimizerSettings, result: ShrinkResult) async {
        guard settings.notification else { return }
        let content = UNMutableNotificationContent()
        content.title = "Image shrunk"
        content.body = result.output.lastPathComponent
        let req = UNNotificationRequest(identifier: UUID().uuidString,
                                        content: content, trigger: nil)
        try? await UNUserNotificationCenter.current().add(req)
    }
}
```

- [ ] **Step 2: Request authorization at launch**

Add to `ImageShrinkerApp.init()` (or `.onAppear` of ContentView):
```swift
init() { NotificationManager.shared.requestAuthorization() }
```

- [ ] **Step 3: Build**

```bash
xcodegen generate
xcodebuild -project ImageShrinker.xcodeproj -scheme ImageShrinker -destination 'platform=macOS' build
```
Expected: BUILD SUCCEEDED.

- [ ] **Step 4: Commit**

```bash
git add Sources/ImageShrinkerApp
git commit -m "feat(app): add UserNotifications-based completion notifications"
```

---

### Task 15: File associations, open-file, recent documents

**Files:**
- Create: `Sources/ImageShrinkerApp/AppDelegate.swift`
- Modify: `Sources/ImageShrinkerApp/Info.plist` (CFBundleDocumentTypes)
- Modify: `Sources/ImageShrinkerApp/ImageShrinkerApp.swift` (`@NSApplicationDelegateAdaptor`)

**Interfaces:**
- Consumes: `OptimizerService`, `SettingsStore`, `NotificationManager`.
- Produces: `final class AppDelegate: NSObject, NSApplicationDelegate` handling `application(_:open:)` to shrink files opened via Finder/double-click, noting them as recent documents. Shared results flow: the delegate posts a `Notification.Name.didShrink` that `ContentView` observes, OR (simpler) exposes a shared `AppModel`. Use a shared `AppModel: ObservableObject` holding `results` so both drop and open-file append to the same list.

- [ ] **Step 1: Extract a shared AppModel**

Create `Sources/ImageShrinkerApp/AppModel.swift`:
```swift
import Foundation
import ImageShrinkerCore

@MainActor
final class AppModel: ObservableObject {
    @Published var results: [ShrinkResult] = []
    @Published var errorMessage: String?

    func shrink(_ urls: [URL], settings: OptimizerSettings) {
        if settings.clearList { results.removeAll() }
        let service = OptimizerService(binaries: AppBinaries.paths())
        Task.detached {
            for url in urls {
                do {
                    let r = try service.shrink(input: url, settings: settings)
                    await MainActor.run {
                        self.results.append(r)
                        NSDocumentController.shared.noteNewRecentDocumentURL(url)
                    }
                    await NotificationManager.shared.notifyIfEnabled(settings, result: r)
                } catch {
                    await MainActor.run { self.errorMessage = String(describing: error) }
                }
            }
        }
    }
}
```
Then refactor `ContentView` to use `@EnvironmentObject var model: AppModel` and call `model.shrink(urls, settings: settings.current)` instead of its own local logic; inject `AppModel` in `ImageShrinkerApp` via `@StateObject` + `.environmentObject`.

- [ ] **Step 2: Add document types to Info.plist**

Insert into `Info.plist` `<dict>`:
```xml
<key>CFBundleDocumentTypes</key>
<array>
  <dict>
    <key>CFBundleTypeName</key><string>Image</string>
    <key>CFBundleTypeRole</key><string>Editor</string>
    <key>LSItemContentTypes</key>
    <array>
      <string>public.png</string><string>public.jpeg</string>
      <string>com.compuserve.gif</string><string>public.svg-image</string>
    </array>
  </dict>
</array>
```

- [ ] **Step 3: Implement AppDelegate + adaptor**

`Sources/ImageShrinkerApp/AppDelegate.swift`:
```swift
import AppKit
import ImageShrinkerCore

final class AppDelegate: NSObject, NSApplicationDelegate {
    static var model: AppModel?
    static var settingsProvider: (() -> OptimizerSettings)?

    func application(_ application: NSApplication, open urls: [URL]) {
        guard let model = AppDelegate.model,
              let settings = AppDelegate.settingsProvider?() else { return }
        model.shrink(urls, settings: settings)
    }
}
```
In `ImageShrinkerApp`:
```swift
@NSApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
// in body/onAppear after creating model & settings:
//   AppDelegate.model = model
//   AppDelegate.settingsProvider = { settings.current }
```

- [ ] **Step 4: Build + smoke-test**

```bash
xcodegen generate
xcodebuild -project ImageShrinker.xcodeproj -scheme ImageShrinker -destination 'platform=macOS' build
```
Expected: BUILD SUCCEEDED. Full open-file test happens after binaries are bundled (Task 16).

- [ ] **Step 5: Commit**

```bash
git add Sources/ImageShrinkerApp
git commit -m "feat(app): handle Finder open-file + recent documents via shared AppModel"
```

---

### Task 16: Bundle binaries + svgo, sign, notarize, DMG

**Files:**
- Modify: `project.yml` (copy-files build phase + run script)
- Create: `build-tools/package.sh`

**Interfaces:**
- Consumes: `bin/` (Task 2), the built app.
- Produces: a signed, notarized `Image Shrinker.app` with `cjpeg`/`pngquant`/`gifsicle` in `Contents/Resources/bin`, and a distributable DMG. This makes the end-to-end drop/open flows actually run.

- [ ] **Step 1: Copy binaries into the bundle**

Add to the `ImageShrinker` target in `project.yml`:
```yaml
    postCompileScripts:
      - script: |
          mkdir -p "$CODESIGNING_FOLDER_PATH/Contents/Resources/bin"
          cp "$SRCROOT/bin/cjpeg" "$SRCROOT/bin/pngquant" "$SRCROOT/bin/gifsicle" \
             "$CODESIGNING_FOLDER_PATH/Contents/Resources/bin/"
          chmod +x "$CODESIGNING_FOLDER_PATH/Contents/Resources/bin/"*
        name: Copy CLI binaries
```
Regenerate + build, then verify:
```bash
xcodegen generate
xcodebuild -project ImageShrinker.xcodeproj -scheme ImageShrinker -destination 'platform=macOS' -derivedDataPath build/dd build
APP="build/dd/Build/Products/Debug/Image Shrinker.app"
ls "$APP/Contents/Resources/bin"     # cjpeg pngquant gifsicle
```

- [ ] **Step 2: Manual end-to-end smoke test**

Launch `"$APP"`, drag `Tests/ImageShrinkerCoreTests/Fixtures/sample.png` onto the window.
Expected: a result row appears with a size reduction, and `sample.min.png` exists next to the original. Repeat for jpg/gif/svg fixtures.

- [ ] **Step 3: Sign nested binaries + app (hardened runtime)**

`build-tools/package.sh` (release signing — requires a Developer ID cert):
```bash
#!/usr/bin/env bash
set -euo pipefail
APP="$1"                        # path to Image Shrinker.app
ID="Developer ID Application: <YOUR NAME> (<TEAMID>)"
for b in cjpeg pngquant gifsicle; do
  codesign --force --options runtime --timestamp --sign "$ID" \
    "$APP/Contents/Resources/bin/$b"
done
codesign --force --options runtime --timestamp \
  --entitlements Sources/ImageShrinkerApp/ImageShrinker.entitlements \
  --sign "$ID" "$APP"
codesign --verify --deep --strict --verbose=2 "$APP"
```
> Nested executables MUST be signed before the app, or notarization fails. Hardened runtime is required for notarization.

- [ ] **Step 4: Notarize + staple + DMG**

```bash
# Zip and submit
ditto -c -k --keepParent "$APP" ImageShrinker.zip
xcrun notarytool submit ImageShrinker.zip \
  --apple-id "$APPLE_ID" --team-id "$TEAM_ID" --password "$APP_PW" --wait
xcrun stapler staple "$APP"
# Build DMG (hdiutil or create-dmg)
hdiutil create -volname "Image Shrinker" -srcfolder "$APP" -ov -format UDZO ImageShrinker.dmg
```
Expected: notarytool status `Accepted`; `stapler validate "$APP"` succeeds; DMG mounts and the app launches without Gatekeeper warnings on a clean machine.

- [ ] **Step 5: Commit**

```bash
git add project.yml build-tools/package.sh
git commit -m "build: bundle+sign CLI binaries, notarize, produce DMG"
```

---

### Task 17: Sparkle auto-update

**Files:**
- Modify: `project.yml` (add Sparkle SPM package)
- Create: `Sources/ImageShrinkerApp/UpdaterViewModel.swift`
- Modify: `Sources/ImageShrinkerApp/ImageShrinkerApp.swift` (menu command "Check for Updates…")
- Modify: `Sources/ImageShrinkerApp/Info.plist` (`SUFeedURL`, `SUPublicEDKey`)

**Interfaces:**
- Consumes: `SettingsStore.updateCheck`.
- Produces: a "Check for Updates…" menu item that drives Sparkle's `SPUStandardUpdaterController`; automatic checks gated on `updateCheck`.

- [ ] **Step 1: Add Sparkle dependency**

In `project.yml`:
```yaml
packages:
  ImageShrinkerCore:
    path: .
  Sparkle:
    url: https://github.com/sparkle-project/Sparkle
    from: "2.6.0"
```
Add to target `dependencies`:
```yaml
      - package: Sparkle
        product: Sparkle
```

- [ ] **Step 2: Generate the EdDSA signing keys**

```bash
# Sparkle ships generate_keys in its artifacts; via SwiftPM checkout:
./build/dd/SourcePackages/artifacts/sparkle/Sparkle/bin/generate_keys
```
Store the private key in the login keychain (the tool does this); copy the printed **public** key into Info.plist `SUPublicEDKey`. Document the appcast URL (e.g. GitHub Pages / releases) in `SUFeedURL`.

- [ ] **Step 3: Add Info.plist keys**

```xml
<key>SUFeedURL</key><string>https://stefansl.github.io/image-shrinker/appcast.xml</string>
<key>SUPublicEDKey</key><string><PUBLIC_KEY_FROM_STEP_2></string>
<key>SUEnableAutomaticChecks</key><true/>
```

- [ ] **Step 4: Implement the updater wrapper + menu**

`Sources/ImageShrinkerApp/UpdaterViewModel.swift`:
```swift
import SwiftUI
import Sparkle

final class UpdaterViewModel: ObservableObject {
    let controller: SPUStandardUpdaterController
    init(autoCheck: Bool) {
        controller = SPUStandardUpdaterController(
            startingUpdater: true, updaterDelegate: nil, userDriverDelegate: nil)
        controller.updater.automaticallyChecksForUpdates = autoCheck
    }
    func checkForUpdates() { controller.updater.checkForUpdates() }
}
```
In `ImageShrinkerApp`:
```swift
@StateObject private var updater = UpdaterViewModel(
    autoCheck: UserDefaults.standard.bool(forKey: "updatecheck"))
// inside body:
.commands {
    CommandGroup(after: .appInfo) {
        Button("Check for Updates…") { updater.checkForUpdates() }
    }
}
```

- [ ] **Step 5: Build + verify menu**

```bash
xcodegen generate
xcodebuild -project ImageShrinker.xcodeproj -scheme ImageShrinker -destination 'platform=macOS' build
```
Expected: BUILD SUCCEEDED; app menu shows "Check for Updates…". (A live update requires a published appcast; generating/hosting `appcast.xml` with Sparkle's `generate_appcast` is part of the release process, documented in `build-tools/package.sh`.)

- [ ] **Step 6: Commit**

```bash
git add project.yml Sources/ImageShrinkerApp
git commit -m "feat(app): integrate Sparkle auto-update with EdDSA-signed appcast"
```

---

### Task 18: Docs + retire Electron sources

**Files:**
- Modify: `README.md`
- Delete: Electron sources (`main.js`, `renderer.js`, `index.html`, `menu/`, `lib/notarize.js`, Electron entries in `package.json`)

**Interfaces:**
- Consumes: nothing.
- Produces: a README describing the native build; the repo no longer ships the Electron app.

- [ ] **Step 1: Rewrite README build section**

Replace the Electron build/install instructions with:
```markdown
## Build (native macOS)
Requirements: Xcode 26+, `brew install xcodegen`, and the vendored binaries in `bin/`.
```bash
./build-tools/build-svgo.sh          # regenerate svgo bundle (only if svgo changed)
xcodegen generate
xcodebuild -project ImageShrinker.xcodeproj -scheme ImageShrinker build
```
Run tests: `swift test`.
```

- [ ] **Step 2: Remove Electron files**

```bash
git rm main.js renderer.js index.html lib/notarize.js
git rm -r menu
```
Trim `package.json` to only the build-time svgo/esbuild devDependencies (or delete it if the svgo build installs its own temp deps, as Task 9 does). Keep `extend.plist`/`assets` only if still used by the icon pipeline; otherwise remove.

- [ ] **Step 3: Verify nothing references removed files**

```bash
grep -rn "renderer.js\|electron" Sources README.md project.yml || echo "clean"
swift test
```
Expected: `clean` (no stray references) and all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs+chore: document native build and remove Electron sources"
```

---

## Self-Review

**Spec coverage**

| Spec requirement | Task |
|---|---|
| macOS-only, macOS 14, SwiftUI | 1, 11 |
| `ImageOptimizer` protocol abstraction | 6 |
| JPEG via mozjpeg/cjpeg | 2, 6 |
| PNG via pngquant | 2, 7 |
| GIF via gifsicle (stays binary) | 2, 8 |
| SVG via svgo in JavaScriptCore + JS build step | 9 |
| Universal, self-contained binaries | 2 |
| Output path logic (suffix/subfolder/savepath/folderswitch) | 4 |
| Settings in UserDefaults, reset (no migration), legacy defaults | 5, 12 |
| Drop zone + results list with savings | 13 |
| Notifications | 14 |
| File associations + open-file + recent documents | 15 |
| Sparkle auto-update (appcast + EdDSA) | 17 |
| Notarization + DMG, nested-binary signing, hardened runtime | 16 |
| TouchBar not ported | (intentionally absent) |
| Retire Electron | 18 |

No spec requirement is left without a task.

**Placeholder scan:** No "TBD/TODO/handle edge cases" steps; every code step includes full code. Release-only values that cannot be known in advance (Developer ID identity, Apple ID/team/app-password, Sparkle public key, appcast URL) are explicitly marked as substitution points in Tasks 16–17, not code placeholders.

**Type consistency:** `ImageOptimizer.optimize(input:output:)`, `OptimizerService.shrink(input:settings:)->ShrinkResult`, `BinaryPaths(cjpeg:pngquant:gifsicle:)`, `OptimizerSettings(...)` field names (`folderSwitch`, `clearList`, `savePath`) are used identically across Tasks 4–17. `AppBinaries.paths()` (Task 13) and the bundle layout `Contents/Resources/bin` (Task 16) agree.

**Ordering note:** `NotificationManager` (Task 14) is referenced by `ContentView`/`AppModel` (Tasks 13/15). Implement Task 14 before wiring those calls, or stub it — flagged inline in Task 13.
