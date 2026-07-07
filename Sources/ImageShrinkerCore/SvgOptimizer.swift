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
