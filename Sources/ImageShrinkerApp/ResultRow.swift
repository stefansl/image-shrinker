import SwiftUI
import ImageShrinkerCore

struct ResultRow: View {
    let result: ShrinkResult

    private var savedPercent: Int {
        guard result.originalSize > 0 else { return 0 }
        return Int((1 - Double(result.optimizedSize) / Double(result.originalSize)) * 100)
    }
    var body: some View {
        HStack {
            VStack(alignment: .leading) {
                Text(result.output.lastPathComponent).lineLimit(1)
                Text("\(result.originalSize / 1024) KB → \(result.optimizedSize / 1024) KB")
                    .font(.caption).foregroundStyle(.secondary)
            }
            Spacer()
            Text("−\(savedPercent)%").foregroundStyle(.green).bold()
        }
        .padding(.vertical, 4)
    }
}
