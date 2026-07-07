import Foundation

public struct PngOptimizer: ImageOptimizer {
    private let binary: URL
    public init(binary: URL) { self.binary = binary }

    public func optimize(input: URL, output: URL) throws {
        try ProcessRunner.run(binary, ["-fo", output.path, input.path])
        guard TestableFileSize.nonEmpty(output) else { throw OptimizerError.invalidOutput }
    }
}
