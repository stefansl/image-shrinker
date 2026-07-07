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
