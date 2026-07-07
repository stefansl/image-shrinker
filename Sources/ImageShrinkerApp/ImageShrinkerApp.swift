import SwiftUI

@main
struct ImageShrinkerApp: App {
    @StateObject private var settings = SettingsStore()

    init() { NotificationManager.shared.requestAuthorization() }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(settings)
                .frame(minWidth: 340, minHeight: 550)
        }
        .windowResizability(.contentSize)

        Settings {
            SettingsView().environmentObject(settings)
        }
    }
}
