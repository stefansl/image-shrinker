import SwiftUI

@main
struct ImageShrinkerApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @StateObject private var settings = SettingsStore()
    @StateObject private var model = AppModel()

    init() { NotificationManager.shared.requestAuthorization() }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(settings)
                .environmentObject(model)
                .frame(minWidth: 340, minHeight: 550)
                .onAppear {
                    AppDelegate.model = model
                    AppDelegate.settingsProvider = { settings.current }
                    AppDelegate.flushPending()
                }
        }
        .windowResizability(.contentSize)

        Settings {
            SettingsView().environmentObject(settings)
        }
    }
}
