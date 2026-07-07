import SwiftUI

@main
struct ImageShrinkerApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
                .frame(minWidth: 340, minHeight: 550)
        }
        .windowResizability(.contentSize)
    }
}
