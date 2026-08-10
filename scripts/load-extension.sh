#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"
BROWSER="${1:-chrome}"

if [[ ! -d "$DIST" ]] || [[ ! -f "$DIST/manifest.json" ]]; then
  echo "Building extension..."
  npm run build --prefix "$ROOT"
fi

case "$BROWSER" in
  chrome)
    APP="Google Chrome"
    ;;
  brave)
    APP="Brave Browser"
    ;;
  chromium)
    APP="Chromium"
    ;;
  *)
    echo "Usage: $0 [chrome|brave|chromium]"
    exit 1
    ;;
esac

if [[ "$OSTYPE" == "darwin"* ]]; then
  if ! open -Ra "$APP" 2>/dev/null; then
    echo "Error: $APP not found."
    exit 1
  fi
  echo "Loading FINDIT from $DIST into $APP..."
  open -na "$APP" --args --load-extension="$DIST"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  case "$BROWSER" in
    chrome) BIN="${CHROME_BIN:-google-chrome}" ;;
    brave)  BIN="${BRAVE_BIN:-brave-browser}" ;;
    chromium) BIN="${CHROMIUM_BIN:-chromium-browser}" ;;
  esac
  if ! command -v "$BIN" &>/dev/null; then
    echo "Error: $BIN not found. Set CHROME_BIN / BRAVE_BIN / CHROMIUM_BIN."
    exit 1
  fi
  echo "Loading FINDIT from $DIST..."
  "$BIN" --load-extension="$DIST" &
else
  echo "Unsupported OS: $OSTYPE"
  exit 1
fi

echo ""
echo "FINDIT loaded. Press ⌘⇧F (Mac) or Ctrl+Shift+F to open search."
echo ""
echo "Note: --load-extension is session-based. For a permanent install,"
echo "use chrome://extensions → Developer mode → Load unpacked → dist/"
