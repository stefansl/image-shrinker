import SwiftUI
import ImageShrinkerCore

struct ContentView: View {
    @EnvironmentObject var settings: SettingsStore
    @EnvironmentObject var model: AppModel

    var body: some View {
        VStack(spacing: 12) {
            DropZone(isBusy: false)
                .dropDestination(for: URL.self) { urls, _ in
                    model.shrink(urls, settings: settings.current); return true
                }
            List(model.results.indices, id: \.self) { i in ResultRow(result: model.results[i]) }
        }
        .padding(16)
        .alert("Error", isPresented: .constant(model.errorMessage != nil)) {
            Button("OK") { model.errorMessage = nil }
        } message: { Text(model.errorMessage ?? "") }
    }
}

struct DropZone: View {
    let isBusy: Bool
    var body: some View {
        RoundedRectangle(cornerRadius: 12)
            .strokeBorder(style: StrokeStyle(lineWidth: 2, dash: [6]))
            .foregroundStyle(.secondary)
            .overlay(Text(isBusy ? "Shrinking…" : "Drop images here"))
            .frame(height: 140)
    }
}
