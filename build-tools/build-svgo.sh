#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
tmp=$(mktemp -d)
# svgo v3 is browser-compatible; bundle it as an IIFE exposing a global.
( cd "$tmp" && npm init -y >/dev/null && npm install svgo@^3 esbuild >/dev/null )
cat > "$tmp/entry.js" <<'JS'
// svgo's package "main" (./lib/svgo-node.js) requires Node builtins (fs, path,
// os, url) that don't exist under --platform=browser. svgo also ships a
// pre-built, browser-safe ESM bundle at dist/svgo.browser.js (built via
// rollup as part of svgo's own release process) with no Node dependencies -
// import that directly instead of the package root.
import { optimize } from 'svgo/dist/svgo.browser.js';
globalThis.svgoOptimize = (svg) => optimize(svg, { multipass: true }).data;
JS
"$tmp/node_modules/.bin/esbuild" "$tmp/entry.js" \
  --bundle --format=iife --platform=browser \
  --outfile=Sources/ImageShrinkerCore/Resources/svgo.bundle.js
echo "Wrote Sources/ImageShrinkerCore/Resources/svgo.bundle.js"
