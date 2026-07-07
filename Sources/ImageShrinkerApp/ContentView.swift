import SwiftUI
import ImageShrinkerCore

struct ContentView: View {
    @EnvironmentObject var settings: SettingsStore
    @State private var results: [ShrinkResult] = []
    @State private var errorMessage: String?

    var body: some View {
        VStack(spacing: 12) {
            DropZone(isBusy: false)
                .dropDestination(for: URL.self) { urls, _ in
                    handleDrop(urls); return true
                }
            List(results.indices, id: \.self) { i in ResultRow(result: results[i]) }
        }
        .padding(16)
        .alert("Error", isPresented: .constant(errorMessage != nil)) {
            Button("OK") { errorMessage = nil }
        } message: { Text(errorMessage ?? "") }
    }

    private func handleDrop(_ urls: [URL]) {
        if settings.clearList { results.removeAll() }
        let service = OptimizerService(binaries: AppBinaries.paths())
        let snapshot = settings.current
        Task.detached {
            for url in urls {
                do {
                    let r = try service.shrink(input: url, settings: snapshot)
                    await MainActor.run { results.append(r) }
                    await NotificationManager.shared.notifyIfEnabled(snapshot, result: r)
                } catch {
                    await MainActor.run { errorMessage = String(describing: error) }
                }
            }
        }
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
