import Foundation

public enum OutputPathBuilder {
    public static func destination(
        for input: URL,
        savePath: URL?,
        folderSwitch: Bool,
        subfolder: Bool,
        suffix: Bool
    ) throws -> URL {
        var dir = input.deletingLastPathComponent()
        if folderSwitch == false, let savePath { dir = savePath }
        if subfolder { dir = dir.appendingPathComponent("minified") }
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)

        let name = input.deletingPathExtension().lastPathComponent
        let ext = input.pathExtension
        let suffixString = suffix ? ".min" : ""
        let filename = ext.isEmpty ? "\(name)\(suffixString)"
                                   : "\(name)\(suffixString).\(ext)"
        return dir.appendingPathComponent(filename)
    }
}
