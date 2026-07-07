# Vendored CLI binaries: provenance & rebuild instructions

`bin/cjpeg`, `bin/pngquant`, `bin/gifsicle` are universal (`x86_64 arm64`),
statically-linked, self-contained executables vendored directly into the
repo. This documents exactly what was built, from which source, so the
binaries can be reproduced or updated.

## gifsicle — copied as-is (already universal + self-contained)

Source: `node_modules/gifsicle/vendor/gifsicle` (npm package `gifsicle`).
Already built universal (`lipo -archs` → `x86_64 arm64`) and links only
`/usr/lib/libSystem.B.dylib`. No rebuild needed.

```bash
cp node_modules/gifsicle/vendor/gifsicle bin/gifsicle
chmod +x bin/gifsicle
```

## cjpeg — built from mozjpeg source

- Repo: https://github.com/mozilla/mozjpeg
- Commit: `08265790774cd0714832c9e675522acbe5581437` (`main`, cloned 2026-07-07)
- Toolchain: cmake 4.3.4, nasm 3.02 (both via `brew install cmake nasm`)

Build (both architectures, static, no PNG input support needed since this
project always feeds cjpeg PPM/BMP/GIF/Targa/JPEG input — JPEG-input
transcoding via `jinit_read_jpeg` is unconditional in `cjpeg.c` and is not
gated behind `PNG_SUPPORTED`):

```bash
work=$(mktemp -d)
git clone --depth 1 https://github.com/mozilla/mozjpeg "$work/mozjpeg"
for arch in x86_64 arm64; do
  cmake -S "$work/mozjpeg" -B "$work/build-$arch" \
    -DCMAKE_OSX_ARCHITECTURES=$arch -DBUILD_SHARED_LIBS=OFF -DPNG_SUPPORTED=OFF \
    -DCMAKE_BUILD_TYPE=Release
  # NOTE: the task brief's `-DENABLE_SHARED=OFF` is not a real mozjpeg CMake
  # option (silently ignored by CMake) — the real option is BUILD_SHARED_LIBS.
  # With BUILD_SHARED_LIBS=OFF the CLI target is named `cjpeg-static`, not
  # `cjpeg` (that name only exists in the shared-lib build and links against
  # @rpath/libjpeg.62.dylib, which is NOT self-contained).
  cmake --build "$work/build-$arch" --target cjpeg-static
done
lipo -create "$work/build-x86_64/cjpeg-static" "$work/build-arm64/cjpeg-static" -output bin/cjpeg
chmod +x bin/cjpeg
```

Verified: `otool -L bin/cjpeg` for both slices shows only
`/usr/lib/libSystem.B.dylib`.

## pngquant — built from source (Rust)

- Repo: https://github.com/kornelski/pngquant
- Tag: `3.0.3` (commit `53a332a58f44357b6b41842a54d74aa1e245913d`)
  - NOTE: the default branch HEAD at clone time
    (`913a90de9671a6511d634519b1f8a5f329aebbcb`, "Pass through the threads
    feature") does **not** build — its `rust/bin.rs` calls
    `liq_set_log_callback(liq, log_callback, ...)` but the pinned
    `lib` submodule (`imagequant-sys` 4.5.0) requires
    `Option<liq_log_callback_function>`, a source-incompatible mismatch
    (`error[E0308]`). The last tagged release, `3.0.3`, builds cleanly with
    its own matching submodule pin and is what's vendored here.
  - submodule `lib` (libimagequant) pinned at
    `6e9805761851f1a8320380b9f563961f892ec6ba`
- Toolchain: rustc/cargo 1.96.1 (via `rustup`), targets
  `x86_64-apple-darwin` + `aarch64-apple-darwin`

```bash
rustup target add x86_64-apple-darwin aarch64-apple-darwin
work=$(mktemp -d)
git clone --depth 1 https://github.com/kornelski/pngquant "$work/pq"
( cd "$work/pq"
  git fetch --depth 1 origin tag 3.0.3
  git checkout 3.0.3
  git submodule update --init --recursive --depth 1
  # Force static linking of libpng/lcms2. Without this, on the *native*
  # target (aarch64, since this is built on Apple Silicon) libpng-sys and
  # lcms2-sys find Homebrew's libpng/lcms2 via pkg-config and link
  # dynamically against /opt/homebrew/opt/*/lib/*.dylib — not
  # self-contained. (The cross target, x86_64, already builds static
  # automatically because pkg-config refuses cross-arch probing by
  # default.) PNG_STATIC / LCMS2_STATIC are build-script env vars each
  # crate explicitly supports for this purpose.
  PNG_STATIC=1 LCMS2_STATIC=1 cargo build --release --target x86_64-apple-darwin
  PNG_STATIC=1 LCMS2_STATIC=1 cargo build --release --target aarch64-apple-darwin )
lipo -create "$work/pq/target/x86_64-apple-darwin/release/pngquant" \
             "$work/pq/target/aarch64-apple-darwin/release/pngquant" -output bin/pngquant
chmod +x bin/pngquant
```

Verified: `otool -L bin/pngquant` for both slices shows only
`/usr/lib/libz.1.dylib`, `/usr/lib/libiconv.2.dylib`, and
`/usr/lib/libSystem.B.dylib` — all system dylibs shipped with macOS, not
Homebrew.

## Verification performed

```bash
lipo -archs bin/cjpeg bin/pngquant bin/gifsicle   # each: x86_64 arm64
otool -L bin/cjpeg bin/pngquant                   # only /usr/lib/* deps
bin/cjpeg -version; bin/pngquant --version; bin/gifsicle --version
swift test                                        # full suite, incl. optimizer tests against these binaries
```
