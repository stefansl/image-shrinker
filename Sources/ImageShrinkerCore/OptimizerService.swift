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
