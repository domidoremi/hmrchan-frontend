#!/bin/sh

resolve_node_bin() {
  if command -v node >/dev/null 2>&1 && node --version >/dev/null 2>&1; then
    NODE_BIN="$(command -v node 2>/dev/null || true)"
    if [ -z "$NODE_BIN" ]; then
      NODE_BIN="node"
    fi
    export NODE_BIN
    return 0
  fi

  for node_candidate in \
    "$HOME/.local/bin/node" \
    "$HOME/.nvm/current/bin/node" \
    "$HOME/.bun/bin/node" \
    /usr/local/bin/node \
    /opt/homebrew/bin/node \
    /mnt/*/dev/managers/mise/data/installs/node/*/node.exe \
    /mnt/*/dev/managers/mise/data/installs/node/*/bin/node
  do
    if [ ! -x "$node_candidate" ]; then
      continue
    fi

    if "$node_candidate" --version >/dev/null 2>&1; then
      NODE_BIN="$node_candidate"
      export NODE_BIN
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
