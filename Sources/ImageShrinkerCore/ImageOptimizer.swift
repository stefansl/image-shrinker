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
        let out = Pipe()
        proc.standardError = err
        proc.standardOutput = out

        // Drain both pipes concurrently on background queues, started before
        // launching the process, to avoid a classic Process/Pipe deadlock:
        // if the child writes more than the OS pipe buffer (~64KB) before
        // exiting, it blocks on the write until we read, but waitUntilExit()
        // would otherwise block until the child exits -- a cycle that never
        // resolves unless both pipes are drained concurrently with the wait.
        var errData = Data()
        var outData = Data()
        let group = DispatchGroup()

        group.enter()
        DispatchQueue.global(qos: .utility).async {
            errData = err.fileHandleForReading.readDataToEndOfFile()
            group.leave()
        }

        group.enter()
        DispatchQueue.global(qos: .utility).async {
            outData = out.fileHandleForReading.readDataToEndOfFile()
            group.leave()
        }

        try proc.run()
        proc.waitUntilExit()
        group.wait()

        guard proc.terminationStatus == 0 else {
            let msg = String(data: errData, encoding: .utf8) ?? ""
            throw OptimizerError.processFailed(code: proc.terminationStatus, message: msg)
        }
        _ = outData
    }
}
