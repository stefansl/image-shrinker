import Foundation

public struct JpegOptimizer: ImageOptimizer {
    private let binary: URL
    public init(binary: URL) { self.binary = binary }

    public func optimize(input: URL, output: URL) throws {
        // cjpeg writes its output by truncating the target file up front, so
        // when `output` resolves to the same file as `input` (e.g. suffix=false,
        // subfolder=false, folderSwitch=true in OutputPathBuilder), running
        // cjpeg directly on it destroys the original before cjpeg can read it,
        // leaving a 0-byte file even though cjpeg then exits with an error.
        // Guard by running against a temp copy in that case (legacy #54).
        let sameFile = input.standardizedFileURL.path == output.standardizedFileURL.path
        let source: URL
        if sameFile {
            let tempCopy = FileManager.default.temporaryDirectory
                .appendingPathComponent(UUID().uuidString)
                .appendingPathExtension(input.pathExtension)
            try FileManager.default.copyItem(at: input, to: tempCopy)
            source = tempCopy
        } else {
            source = input
        }
        defer {
            if sameFile {
                try? FileManager.default.removeItem(at: source)
            }
        }

        try ProcessRunner.run(binary, ["-outfile", output.path, source.path])
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
