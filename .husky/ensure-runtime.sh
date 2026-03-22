#!/bin/sh

prepend_to_path() {
  runtime_dir="$1"
  case ":$PATH:" in
    *":$runtime_dir:"*) ;;
    *)
      PATH="$runtime_dir:$PATH"
      export PATH
      ;;
  esac
}

resolve_node_bin() {
  if command -v node >/dev/null 2>&1 && node --version >/dev/null 2>&1; then
    NODE_BIN="$(command -v node 2>/dev/null || true)"
    if [ -z "$NODE_BIN" ]; then
      NODE_BIN="node"
    fi
    export NODE_BIN
    prepend_to_path "$(dirname "$NODE_BIN")"
    return 0
  fi

  for node_candidate in \
    "$HOME/.local/bin/node" \
    "$HOME/.nvm/current/bin/node" \
    "$HOME/.bun/bin/node" \
    /usr/local/bin/node \
    /opt/homebrew/bin/node \
    /c/Users/*/AppData/Local/mise/installs/node/*/node.exe \
    /c/Users/*/AppData/Local/mise/installs/node/*/bin/node \
    /mnt/*/dev/managers/mise/data/installs/node/*/node.exe \
    /mnt/*/Users/*/AppData/Local/mise/installs/node/*/node.exe \
    /mnt/*/dev/managers/mise/data/installs/node/*/bin/node
  do
    if [ ! -x "$node_candidate" ]; then
      continue
    fi

    if "$node_candidate" --version >/dev/null 2>&1; then
      NODE_BIN="$node_candidate"
      export NODE_BIN
      prepend_to_path "$(dirname "$NODE_BIN")"
      return 0
    fi
  done

  return 1
}

resolve_bun_bin() {
  if command -v bun >/dev/null 2>&1 && bun --version >/dev/null 2>&1; then
    BUN_BIN="$(command -v bun 2>/dev/null || true)"
    if [ -z "$BUN_BIN" ]; then
      BUN_BIN="bun"
    fi
    export BUN_BIN
    prepend_to_path "$(dirname "$BUN_BIN")"
    return 0
  fi

  for bun_candidate in \
    "$HOME/.local/bin/bun" \
    "$HOME/.bun/bin/bun" \
    /usr/local/bin/bun \
    /opt/homebrew/bin/bun \
    /c/Users/*/AppData/Local/mise/installs/bun/*/bin/bun.exe \
    /c/Users/*/AppData/Local/mise/installs/bun/*/bin/bun \
    /mnt/*/Users/*/AppData/Local/mise/installs/bun/*/bin/bun.exe \
    /mnt/*/dev/managers/mise/data/installs/bun/*/bin/bun.exe \
    /mnt/*/dev/managers/mise/data/installs/bun/*/bin/bun
  do
    if [ ! -x "$bun_candidate" ]; then
      continue
    fi

    if "$bun_candidate" --version >/dev/null 2>&1; then
      BUN_BIN="$bun_candidate"
      export BUN_BIN
      prepend_to_path "$(dirname "$BUN_BIN")"
      return 0
    fi
  done

  return 1
}

if ! resolve_node_bin; then
  echo "❌ 未找到可用的 node，请先安装或修复 Node 运行时" >&2
  exit 127
fi

run_node_tool() {
  "$NODE_BIN" "$@"
}

run_bun() {
  "$BUN_BIN" "$@"
}
