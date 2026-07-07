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
