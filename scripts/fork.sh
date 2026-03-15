#!/usr/bin/env bash
set -euo pipefail

RPC_URL="${1:-https://mainnet.base.org}"
PORT="${2:-8545}"

echo "Starting Anvil fork of Base mainnet..."
echo "  RPC:  $RPC_URL"
echo "  Port: $PORT"
echo ""

anvil \
  --fork-url "$RPC_URL" \
  --chain-id 8453 \
  --port "$PORT" \
  --block-time 2
