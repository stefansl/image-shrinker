import Foundation

public struct OptimizerSettings: Equatable {
    public var notification: Bool
    public var folderSwitch: Bool
    public var clearList: Bool
    public var suffix: Bool
    public var updateCheck: Bool
    public var subfolder: Bool
    public var savePath: URL?

    public init(notification: Bool, folderSwitch: Bool, clearList: Bool,
                suffix: Bool, updateCheck: Bool, subfolder: Bool, savePath: URL?) {
        self.notification = notification; self.folderSwitch = folderSwitch
        self.clearList = clearList; self.suffix = suffix
        self.updateCheck = updateCheck; self.subfolder = subfolder
        self.savePath = savePath
    }

    public static let defaults = OptimizerSettings(
        notification: true, folderSwitch: true, clearList: false,
        suffix: true, updateCheck: true, subfolder: false, savePath: nil)
}
