#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 claude-config-*.tgz"
  exit 1
fi

ARCHIVE="$1"
TMP="$(mktemp -d)"
STAMP="$(date +%Y%m%d-%H%M%S)"

echo "[1/3] Unpacking $ARCHIVE"
tar -xzf "$ARCHIVE" -C "$TMP"
ROOT="$(find "$TMP" -maxdepth 2 -type d -name '.claude-export-*' | head -n1)"

echo "[2/3] Restoring Claude configs"
# Copy back Claude dirs
for d in "$ROOT/.config/claude" "$ROOT/.claude"; do
  if [ -d "$d" ]; then
    tgt="${HOME}/$(echo "$d" | sed "s|$ROOT/||")"
    if [ -d "$tgt" ]; then
      mv "$tgt" "${tgt}.bak-${STAMP}"
    fi
    mkdir -p "$(dirname "$tgt")"
    rsync -a "$d" "$tgt"
  fi
done

# Restore VS Code settings (optional merge!)
if [ -f "$ROOT/vscode/settings.json" ]; then
  tgt="$HOME/.config/Code/User/settings.json"
  [ -d "$(dirname "$tgt")" ] || tgt="$HOME/Library/Application Support/Code/User/settings.json"
  if [ -f "$tgt" ]; then
    cp "$tgt" "${tgt}.bak-${STAMP}"
  fi
  cp "$ROOT/vscode/settings.json" "$tgt"
fi

echo "[3/3] Done"
echo "✅ Claude configs restored. Backups have suffix .bak-${STAMP}"