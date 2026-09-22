#!/usr/bin/env bash
# Builds the sound crate to WebAssembly and stages it where the host loads it.
#
#   ./scripts/build-sound.sh
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

if ! command -v cargo >/dev/null 2>&1 || ! rustup target list --installed | grep -q wasm32-unknown-unknown; then
  echo "install rustup and run: rustup target add wasm32-unknown-unknown" >&2
  exit 2
fi

cargo build --release --target wasm32-unknown-unknown -p sound

mkdir -p src/sound/pkg
cp target/wasm32-unknown-unknown/release/sound.wasm src/sound/pkg/sound.wasm
