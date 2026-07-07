import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var settings: SettingsStore

    var body: some View {
        Form {
            Toggle("Add \".min\" suffix", isOn: $settings.suffix)
            Toggle("Save into \"minified\" subfolder", isOn: $settings.subfolder)
            Toggle("Save next to original", isOn: $settings.folderSwitch)
            Toggle("Show notification when done", isOn: $settings.notification)
            Toggle("Clear list after each drop", isOn: $settings.clearList)
            Toggle("Check for updates", isOn: $settings.updateCheck)
            HStack {
                Text("Save folder:")
                Text(settings.savePath?.path ?? "—").foregroundStyle(.secondary)
                Button("Choose…") { chooseFolder() }
            }.disabled(settings.folderSwitch)
        }
        .padding(20)
        .frame(width: 420)
    }

    private func chooseFolder() {
        let panel = NSOpenPanel()
        panel.canChooseDirectories = true
        panel.canChooseFiles = false
        if panel.runModal() == .OK { settings.savePath = panel.url }
    }
}
