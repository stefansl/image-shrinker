import AppKit
import Foundation
import ImageShrinkerCore

@MainActor
final class AppModel: ObservableObject {
    @Published var results: [ShrinkResult] = []
    @Published var errorMessage: String?

    func shrink(_ urls: [URL], settings: OptimizerSettings) {
        if settings.clearList { results.removeAll() }
        let service = OptimizerService(binaries: AppBinaries.paths())
        Task.detached {
            for url in urls {
                do {
                    let r = try service.shrink(input: url, settings: settings)
                    await MainActor.run {
                        self.results.append(r)
                        NSDocumentController.shared.noteNewRecentDocumentURL(url)
                    }
                    await NotificationManager.shared.notifyIfEnabled(settings, result: r)
                } catch {
                    await MainActor.run { self.errorMessage = String(describing: error) }
                }
            }
        }
    }
}
