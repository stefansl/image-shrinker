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
