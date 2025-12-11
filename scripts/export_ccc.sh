#!/usr/bin/env bash
set -euo pipefail

STAMP="$(date +%Y%m%d-%H%M%S)"
HOST="$(hostname)"
OUT="claude-config-${HOST}-${STAMP}.tgz"
WORK="${HOME}/.claude-export-${STAMP}"
mkdir -p "$WORK"

echo "[1/3] Collecting Claude configs"

# Common Claude dirs
for f in "$HOME/.config/claude" "$HOME/.claude"; do
  if [ -d "$f" ]; then
    rsync -a "$f" "$WORK/"
  fi
done

# VS Code Claude settings
for f in \
  "$HOME/Library/Application Support/Code/User/settings.json" \
  "$HOME/.config/Code/User/settings.json"; do
  if [ -f "$f" ]; then
    mkdir -p "$WORK/vscode"
    cp "$f" "$WORK/vscode/settings.json"
  fi
done

echo "[2/3] Pack"
tar -czf "$OUT" -C "$(dirname "$WORK")" "$(basename "$WORK")"

echo "[3/3] Done"
echo "➡ Archive created: $OUT"