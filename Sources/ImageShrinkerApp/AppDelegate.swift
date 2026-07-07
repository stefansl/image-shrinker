import AppKit
import ImageShrinkerCore

final class AppDelegate: NSObject, NSApplicationDelegate {
    static var model: AppModel?
    static var settingsProvider: (() -> OptimizerSettings)?
    static var pendingURLs: [URL] = []

    func application(_ application: NSApplication, open urls: [URL]) {
        guard let model = AppDelegate.model,
              let settings = AppDelegate.settingsProvider?() else {
            AppDelegate.pendingURLs.append(contentsOf: urls)
            return
        }
        model.shrink(urls, settings: settings)
    }

    @MainActor
    static func flushPending() {
        guard let model = AppDelegate.model,
              let settingsProvider = AppDelegate.settingsProvider,
              !pendingURLs.isEmpty else { return }
        let urls = pendingURLs
        pendingURLs = []
        model.shrink(urls, settings: settingsProvider())
    }
}
