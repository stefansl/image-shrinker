import Foundation

public struct GifOptimizer: ImageOptimizer {
    private let binary: URL
    public init(binary: URL) { self.binary = binary }

    public func optimize(input: URL, output: URL) throws {
        try ProcessRunner.run(binary, ["-o", output.path, input.path, "-O=2", "-i"])
        guard TestableFileSize.nonEmpty(output) else { throw OptimizerError.invalidOutput }
    }
}
