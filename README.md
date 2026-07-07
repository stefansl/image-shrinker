# Image Shrinker

Image Shrinker is a tool to minify images and graphics using the best available libraries for image processing: [pngquant](https://pngquant.org/), [mozjpg](https://github.com/mozilla/mozjpeg), [SVGO](https://github.com/svg/svgo) and [Gifsicle](https://github.com/kohler/gifsicle). Originally built with web technologies in [Electron](https://electronjs.org); now a native SwiftUI app for macOS.

![Screenrecording Imageshrinker](https://user-images.githubusercontent.com/1564251/40296606-61863e56-5cdd-11e8-9f43-3a74c48d21a0.gif)

## How to use
Drag your image file onto the Image Shrinker window and it will saved in the same or in a predefined folder as reduced image.
The original graphic will be not replaced.

## Download and Installation on macOS
Signed, notarized releases with a DMG installer and auto-update are not yet wired up for the native build (planned, not part of Phase 1). Until then, build the app yourself using the instructions below.

## Build (native macOS)
Requirements:
* macOS 14+
* Xcode 26+
* [XcodeGen](https://github.com/yonaskolb/XcodeGen): `brew install xcodegen`
* The vendored CLI binaries in `bin/` (`cjpeg`, `pngquant`, `gifsicle`) — already committed to the repo; see `build-tools/fetch-binaries.md` if you need to rebuild them.

Get the repo:
```shell
git clone https://github.com/stefansl/image-shrinker.git
cd image-shrinker
git checkout native-macos-rebuild
```

Regenerate the SVGO JavaScript bundle (only needed if `Sources/ImageShrinkerCore/Resources/svgo.bundle.js` is missing or SVGO's version changed — the script installs its own temporary `svgo`/`esbuild` toolchain and does not touch the rest of the repo):
```shell
./build-tools/build-svgo.sh
```

Generate the Xcode project and build the app:
```shell
xcodegen generate
xcodebuild -project ImageShrinker.xcodeproj -scheme ImageShrinker -destination 'platform=macOS' build
```

Run the test suite for the core package:
```shell
swift test
```

Notice: Windows and Linux are no longer supported — the native rebuild targets macOS only.

## Credits
Thank you, guys!
* Electron: <https://electronjs.org> (used by the original release of this app)
* pngquant: <https://pngquant.org/>
* mozjpg: <https://github.com/mozilla/mozjpeg>
* SVGO: <https://github.com/svg/svgo>
* Poly background: <http://alssndro.github.io/trianglify-background-generator>
* CSS: [Spectre Css](https://picturepan2.github.io/spectre/)
* Font: [Mozillas Fira Sans](https://github.com/mozilla/Fira)
* gifsicle: <https://github.com/kohler/gifsicle>
