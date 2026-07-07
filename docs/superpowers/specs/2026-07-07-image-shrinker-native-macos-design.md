# Image Shrinker – nativer macOS-Umbau (Design)

**Datum:** 2026-07-07
**Status:** Entwurf zur Freigabe
**Betrifft:** Vollständiger Umbau der Electron-App auf eine native macOS-App (Swift/SwiftUI)

---

## 1. Motivation & Ziele

Die aktuelle App ist eine Electron-App (Electron 11) mit HTML/CSS/JS-Frontend, die
Bilder per Drag & Drop komprimiert. Der Umbau verfolgt drei vom Nutzer priorisierte Ziele:

1. **Größe & Ressourcen** – weg von ~150 MB Electron hin zu einem schlanken, schnell
   startenden nativen App-Binary (einstellige MB).
2. **Echtes natives Look & Feel** – SwiftUI-UI, echte Systemintegration, native Optik
   statt HTML/CSS.
3. **Wartung & Zukunft** – Wegfall veralteter Electron-/Node-Abhängigkeiten,
   geringerer Update-/Notarization-Aufwand, langfristige Pflegbarkeit.

### Kern-Reframe (leitend für den ganzen Plan)

**Phase 1 (native SwiftUI-Shell + gebündelte Binaries) erreicht bereits ~90 % aller
drei Ziele.** Das native Look & Feel kommt vollständig aus der SwiftUI-Shell; der große
Größengewinn kommt aus dem Wegfall von Electron – **nicht** aus dem Einbinden von
Libraries (die CLI-Binaries sind winzig: pngquant ~100 KB, mozjpeg ~1 MB,
gifsicle ~500 KB). Das Einbinden von C-/Rust-Libraries (Phase 2) ist damit
**optionaler Feinschliff pro Engine** und dient eher der „Reinheit" als messbarem
Zielfortschritt. Bei der Wartung kann Lib-Linking teils sogar *gegen* das Ziel wirken.

## 2. Rahmenbedingungen (getroffene Entscheidungen)

| Thema | Entscheidung |
|-------|--------------|
| Plattform | **Nur macOS** (kein Windows/Linux – waren ohnehin nie getestet) |
| Sprache/UI | **Swift / SwiftUI** |
| Minimale macOS-Version | **macOS 14 (Sonoma)** |
| Kompressions-Strategie | Phasiert: erst gebündelte Binaries, dann pro Engine ggf. native Libs |
| Phase-2-Ambition | **Zielorientiert** – Lib-Umbau nur wo sauber; „Binary behalten" ist akzeptables Endergebnis |
| SVG-Engine | **svgo via JavaScriptCore** (identische Qualität, kein Node) |
| Auto-Update | **Sparkle** (nativer Standard) |
| Einstellungen | **Reset** – native App startet mit Defaults in UserDefaults, keine Migration alter JSON-Settings |
| TouchBar | **Entfällt** (von Apple eingestellt) |

### Non-Goals

- Kein Windows-/Linux-Support.
- Keine Migration bestehender electron-settings-JSON-Dateien.
- Keine App-Store-Distribution (weiterhin DMG/Notarization außerhalb des Stores).
- Kein neues Feature-Set – Funktionsumfang bleibt im Kern gleich.

## 3. Zu erhaltender Funktionsumfang

- **Drag & Drop** eines oder mehrerer Bilder auf das Fenster.
- **Ergebnis-Liste** mit Dateiname und Größenersparnis (orig → komprimiert).
- **Einstellungen:** Zielordner (`savepath`/`folderswitch`), Suffix `.min` (`suffix`),
  Unterordner `minified` (`subfolder`), Benachrichtigungen (`notification`),
  Liste-leeren-Verhalten (`clearlist`), Update-Check (`updatecheck`).
- **Datei-Verknüpfungen** (Doppelklick auf PNG/JPG/GIF/SVG öffnet App) + **Recent Documents**.
- **System-Benachrichtigung** nach der Komprimierung.
- **Auto-Update** (nativ via Sparkle).
- Rahmenloses, kompaktes Fenster im Stil der jetzigen App (~340×550).

**Entfällt:** TouchBar-Unterstützung.

## 4. Architektur

### 4.1 Überblick

```
┌────────────────────────────────────────────┐
│              SwiftUI App (macOS 14+)         │
│                                              │
│  ┌────────────┐   ┌──────────────────────┐  │
│  │  Drop-Zone │   │  Ergebnis-Liste       │  │
│  │  (Fenster) │   │  (Name + Ersparnis)   │  │
│  └─────┬──────┘   └──────────────────────┘  │
│        │                                     │
│        ▼                                     │
│  ┌──────────────────────────────────────┐   │
│  │  OptimizerService                     │   │
│  │  wählt ImageOptimizer nach Dateityp   │   │
│  └───┬───────┬────────┬───────────┬──────┘   │
│      ▼       ▼        ▼           ▼          │
│   JPEG     PNG      GIF         SVG          │
│  Optimizer Optimizer Optimizer  Optimizer    │
│  (mozjpeg)(pngquant)(gifsicle) (svgo/JSC)    │
└────────────────────────────────────────────┘
        │  Settings (UserDefaults)  │  Sparkle Updater
        │  Notifications            │  Recent Documents
```

### 4.2 Zentrale Abstraktion: `ImageOptimizer`

Ein Protokoll entkoppelt UI/Service von der konkreten Engine und macht den phasierten
Austausch (Binary → Lib) transparent:

```swift
protocol ImageOptimizer {
    /// Optimiert die Eingabedatei und schreibt das Ergebnis an den Zielpfad.
    func optimize(input: URL, output: URL) async throws
}
```

- Je Format eine Implementierung (`JpegOptimizer`, `PngOptimizer`, `GifOptimizer`, `SvgOptimizer`).
- **In Phase 1** kapselt jede Implementierung einen `Process`-Aufruf des gebündelten
  Binaries. **In Phase 2** wird die Implementierung intern gegen einen Lib-Aufruf
  getauscht – die Schnittstelle bleibt identisch, UI/Service ändern sich nicht.
- Ein `OptimizerService` wählt anhand der Dateiendung den passenden Optimizer und
  liefert `originalSize`/`optimizedSize` für die UI.

### 4.3 UI (SwiftUI)

- **Hauptfenster:** Drop-Zone + Ergebnis-Liste. Rahmenloser/kompakter Stil analog zur
  jetzigen App.
- **Einstellungen:** SwiftUI `Settings`-Scene (⌘,), Werte in `@AppStorage`/UserDefaults.
- **App-Menü:** Standard-macOS-Menü inkl. „Nach Updates suchen" (Sparkle).

### 4.4 Datei- & Systemintegration

- Drag & Drop über SwiftUI `.dropDestination`.
- `open-file`-Äquivalent über `NSApplicationDelegate.application(_:open:)` +
  `CFBundleDocumentTypes` (Datei-Verknüpfungen für png/jpg/jpeg/gif/svg).
- Recent Documents über `NSDocumentController.noteNewRecentDocumentURL`.
- Benachrichtigungen über das `UserNotifications`-Framework.

### 4.5 Zielpfad-Logik (Portierung bestehender Regeln)

Die bestehende `generateNewPath`-Logik wird 1:1 nach Swift portiert:
- Standard: gleicher Ordner wie Original.
- `folderswitch == false` + gesetzter `savepath` → dorthin schreiben.
- `subfolder == true` → Unterordner `minified` anlegen.
- `suffix == true` → Dateiname erhält `.min` vor der Endung.

## 5. Kompressions-Engines – phasierte Strategie

Die vier Engines sind **nicht** gleichwertig „als Lib einbindbar". Realistische Bewertung:

| Format | Phase 1 (Binary) | Phase 2 (nativ) | Bewertung |
|--------|------------------|-----------------|-----------|
| **JPEG** | mozjpeg-Binary via `Process` | **libmozjpeg** (echte C-Lib) | ✅ Sauberer Lib-Fall – Hauptkandidat für Phase 2 |
| **PNG** | pngquant-Binary via `Process` | libimagequant | ⚠️ **Offen:** modernes libimagequant = **Rust**; reines C nur über verwaiste 2.x (Konflikt mit „zukunftssicher"). „Binary behalten" ist akzeptabel |
| **GIF** | gifsicle-Binary via `Process` | – | ⚠️ gifsicle ist ein **CLI-Programm, keine Library** → **bleibt dauerhaft Binary** |
| **SVG** | svgo in **JavaScriptCore** | (identisch) | ⚠️ Kein Node, aber **JS-Bundle-Schritt** nötig (siehe 5.1) |

### 5.1 SVG via JavaScriptCore – Detail

- svgo (aktuell v1.3 in der App; Ziel: aktuelle svgo v3) ist ein Node-Paket und läuft
  nicht unverändert in JavaScriptCore.
- Es wird ein **Build-Schritt** benötigt (esbuild/rollup), der svgo zu einem
  eigenständigen Bundle ohne Node-Built-ins zusammenfasst; dieses Bundle wird als
  Ressource mitgeliefert und in einem `JSContext` ausgeführt.
- **Ehrlicher Hinweis:** Damit kehrt ein (kleiner) JS-Build-Schritt zurück – die App
  ist *nicht* vollständig JS-frei. Alternative für später: Rust-`oxvg` als Lib
  (svgo-kompatibel), falls konsequente Toolchain-Vereinheitlichung gewünscht ist.

### 5.2 Interne Inkonsistenz PNG (bewusst offen gehalten)

PNG-nativ zwingt zu einer Entscheidung, die im Design offenbleibt und im Prototyp
geklärt wird:
- **Rust-libimagequant** akzeptieren → aktuell/gepflegt, aber führt genau die
  Rust-Toolchain ein, die als Grund gegen oxvg-für-SVG genannt wurde.
- **C-libimagequant 2.x** → reines C, aber verwaist (Konflikt mit „zukunftssicher").
- **Binary behalten** → pragmatisch, akzeptables Endergebnis (Ziele bereits erreicht).

## 6. Migrationsaufgaben (kein Drop-in)

- **Auto-Update:** electron-updater → **Sparkle**. Erfordert `appcast.xml`-Feed,
  **EdDSA-Update-Signierung** und Schlüsselverwaltung. Der Release-Prozess muss den
  Appcast beim Publish aktualisieren (bisher GitHub-Releases über electron-builder).
- **Einstellungen:** **Reset** – Defaults werden beim ersten Start in UserDefaults
  gesetzt; alte electron-settings-JSON wird ignoriert.
- **Build/Distribution:** Xcode-Build statt electron-builder. Notarization + DMG
  bleiben, aber neu aufgesetzt (Hardened Runtime, Entitlements, `notarytool`).
- **Universal Binary:** arm64 + x86_64; bei Phase-2-Libs entsprechend beide Architekturen.

## 7. Phasenplan

### Phase 1 – Der eigentliche Liefergegenstand
Native SwiftUI-App, die **die bestehenden CLI-Binaries bündelt** und via `Process`
aufruft. Ergebnis: schlanke, native, testbare App mit **identischer Kompressionsqualität**,
die alle drei Ziele zu ~90 % erfüllt.
- SwiftUI-Shell (Fenster, Drop-Zone, Ergebnis-Liste).
- `ImageOptimizer`-Protokoll + vier Binary-basierte Implementierungen.
- Einstellungen (UserDefaults), Zielpfad-Logik, Benachrichtigungen, Recent Documents,
  Datei-Verknüpfungen.
- Sparkle-Integration + Appcast/Signierung.
- Xcode-Build, Notarization, DMG.

### Phase 2 – Optionaler Feinschliff pro Engine
Engine für Engine (hinter unverändertem Protokoll) auf native Libs umstellen –
**nur wo es sich lohnt**:
- **JPEG → libmozjpeg** (sauberer Fall, Hauptnutzen).
- **PNG →** Entscheidung Rust vs. verwaistes C vs. Binary (offen, siehe 5.2).
- **GIF →** bleibt Binary.
- **SVG →** bleibt svgo/JavaScriptCore (ggf. später oxvg).

Jeder Phase-2-Schritt ist optional und darf mit „Binary/Status quo behalten" enden,
ohne als Fehlschlag zu gelten.

## 8. Teststrategie

- **Optimizer-Tests:** Pro Format eine Referenz-Eingabedatei; Test prüft, dass die
  Ausgabe existiert, kleiner ist und ein gültiges Bild bleibt (Format-Header/Dekodierbarkeit).
- **Golden-Files (Regression):** Beim Engine-Tausch (Phase 2) sicherstellen, dass die
  neue Lib-Ausgabe qualitativ vergleichbar mit der Binary-Ausgabe ist (Größe im
  erwarteten Rahmen, Bild dekodierbar).
- **Pfad-Logik:** Unit-Tests für `generateNewPath`-Äquivalent (Suffix, Unterordner,
  savepath, folderswitch-Kombinationen).
- **UI-Smoke:** Drop → Ergebnis erscheint in Liste mit korrekter Ersparnis.

## 9. Risiken

| Risiko | Gegenmaßnahme |
|--------|---------------|
| C-/Rust-Lib-Build (Universal Binary, Bridging) unterschätzt | Phasiert – Phase 1 braucht das nicht; Phase 2 pro Engine isoliert |
| svgo/JavaScriptCore-Bundling aufwendiger als gedacht | Früh in Phase 1 als Spike verifizieren; Fallback oxvg dokumentiert |
| Sparkle-Migration (Appcast/Signierung) | Als eigene Phase-1-Aufgabe eingeplant, nicht als Drop-in behandelt |
| PNG-Engine-Entscheidung (Rust vs. C vs. Binary) | Bewusst offen; im Prototyp entscheiden; Binary als sichere Rückfallebene |

## 10. Offene Punkte (im Prototyp/Plan zu klären)

- PNG-Phase-2-Weg (Rust-libimagequant / C 2.x / Binary behalten).
- Genaues Fenster-Styling in SwiftUI (rahmenlos vs. `hiddenInset`-Titlebar).
- Appcast-Hosting (GitHub Releases + statisches appcast.xml).
