import Foundation
import Combine
import ImageShrinkerCore

final class SettingsStore: ObservableObject {
    @Published var notification: Bool { didSet { d.set(notification, forKey: "notification") } }
    @Published var folderSwitch: Bool { didSet { d.set(folderSwitch, forKey: "folderswitch") } }
    @Published var clearList: Bool    { didSet { d.set(clearList, forKey: "clearlist") } }
    @Published var suffix: Bool       { didSet { d.set(suffix, forKey: "suffix") } }
    @Published var updateCheck: Bool  { didSet { d.set(updateCheck, forKey: "updatecheck") } }
    @Published var subfolder: Bool    { didSet { d.set(subfolder, forKey: "subfolder") } }
    @Published var savePath: URL?     { didSet { d.set(savePath?.path, forKey: "savepath") } }

    private let d = UserDefaults.standard

    init() {
        let def = OptimizerSettings.defaults
        d.register(defaults: [
            "notification": def.notification, "folderswitch": def.folderSwitch,
            "clearlist": def.clearList, "suffix": def.suffix,
            "updatecheck": def.updateCheck, "subfolder": def.subfolder])
        notification = d.bool(forKey: "notification")
        folderSwitch = d.bool(forKey: "folderswitch")
        clearList = d.bool(forKey: "clearlist")
        suffix = d.bool(forKey: "suffix")
        updateCheck = d.bool(forKey: "updatecheck")
        subfolder = d.bool(forKey: "subfolder")
        savePath = d.string(forKey: "savepath").map { URL(fileURLWithPath: $0) }
    }

    var current: OptimizerSettings {
        OptimizerSettings(notification: notification, folderSwitch: folderSwitch,
                          clearList: clearList, suffix: suffix, updateCheck: updateCheck,
                          subfolder: subfolder, savePath: savePath)
    }
}
