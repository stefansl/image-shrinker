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
