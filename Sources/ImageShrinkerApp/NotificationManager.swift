import Foundation
import UserNotifications
import ImageShrinkerCore

final class NotificationManager {
    static let shared = NotificationManager()
    private init() {}

    func requestAuthorization() {
        UNUserNotificationCenter.current()
            .requestAuthorization(options: [.alert, .sound]) { _, _ in }
    }

    func notifyIfEnabled(_ settings: OptimizerSettings, result: ShrinkResult) async {
        guard settings.notification else { return }
        let content = UNMutableNotificationContent()
        content.title = "Image shrunk"
        content.body = result.output.lastPathComponent
        let req = UNNotificationRequest(identifier: UUID().uuidString,
                                        content: content, trigger: nil)
        try? await UNUserNotificationCenter.current().add(req)
    }
}
