#!/usr/bin/env bash
set -euo pipefail

RPC_URL="${1:-https://mainnet.base.org}"
PORT="${2:-8545}"
CHAIN_ID="${3:-31337}"

echo "Starting Anvil fork of Base mainnet..."
echo "  RPC:      $RPC_URL"
echo "  Port:     $PORT"
echo "  Chain ID: $CHAIN_ID"
echo ""

anvil \
  --fork-url "$RPC_URL" \
  --port "$PORT" \
  --chain-id "$CHAIN_ID" \
  --block-time 2
