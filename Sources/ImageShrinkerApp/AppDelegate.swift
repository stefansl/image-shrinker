import AppKit
import ImageShrinkerCore

final class AppDelegate: NSObject, NSApplicationDelegate {
    static var model: AppModel?
    static var settingsProvider: (() -> OptimizerSettings)?

    func application(_ application: NSApplication, open urls: [URL]) {
        guard let model = AppDelegate.model,
              let settings = AppDelegate.settingsProvider?() else { return }
        model.shrink(urls, settings: settings)
    }
}
