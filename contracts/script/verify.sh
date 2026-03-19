#!/usr/bin/env bash
set -euo pipefail

# Verify YoCAExecutor contracts on BaseScan.
#
# Usage:
#   ./contracts/script/verify.sh <implementation_address> <proxy_address> <initial_owner> [--testnet]
#
# Requires BASESCAN_API_KEY in environment (or .env file).
#
# Examples:
#   # Base mainnet
#   ./contracts/script/verify.sh 0xImpl... 0xProxy... 0xOwner...
#
#   # Base Sepolia testnet
#   ./contracts/script/verify.sh 0xImpl... 0xProxy... 0xOwner... --testnet

if [ "$#" -lt 3 ]; then
  echo "Usage: $0 <implementation_address> <proxy_address> <initial_owner> [--testnet]"
  exit 1
fi

IMPL_ADDRESS="$1"
PROXY_ADDRESS="$2"
INITIAL_OWNER="$3"
NETWORK="${4:-mainnet}"

if [ "$NETWORK" = "--testnet" ]; then
  CHAIN_ID=84532
  NETWORK_LABEL="Base Sepolia"
else
  CHAIN_ID=8453
  NETWORK_LABEL="Base Mainnet"
fi

VERIFIER_URL="https://api.etherscan.io/v2/api?chainid=$CHAIN_ID"

if [ -z "${BASESCAN_API_KEY:-}" ]; then
  if [ -f .env ]; then
    BASESCAN_API_KEY=$(grep -E '^BASESCAN_API_KEY=' .env | cut -d '=' -f2-)
  fi
  if [ -z "${BASESCAN_API_KEY:-}" ]; then
    echo "Error: BASESCAN_API_KEY not set. Add it to your .env or export it."
    exit 1
  fi
fi

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo ""
echo "=== Verifying on $NETWORK_LABEL (chain $CHAIN_ID) ==="
echo ""

echo "1/2  Verifying implementation (YoCAExecutor) at $IMPL_ADDRESS ..."
forge verify-contract \
  "$IMPL_ADDRESS" \
  src/YoCAExecutor.sol:YoCAExecutor \
  --chain-id "$CHAIN_ID" \
  --verifier-url "$VERIFIER_URL" \
  --etherscan-api-key "$BASESCAN_API_KEY" \
  --root "$SCRIPT_DIR" \
  --watch

echo ""
echo "2/2  Verifying proxy (ERC1967Proxy) at $PROXY_ADDRESS ..."

CONSTRUCTOR_ARGS=$(cast abi-encode "constructor(address,bytes)" \
  "$IMPL_ADDRESS" \
  "$(cast calldata 'initialize(address)' "$INITIAL_OWNER")")

forge verify-contract \
  "$PROXY_ADDRESS" \
  lib/openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol:ERC1967Proxy \
  --chain-id "$CHAIN_ID" \
  --verifier-url "$VERIFIER_URL" \
  --etherscan-api-key "$BASESCAN_API_KEY" \
  --constructor-args "$CONSTRUCTOR_ARGS" \
  --root "$SCRIPT_DIR" \
  --watch

if [ "$CHAIN_ID" = "84532" ]; then
  EXPLORER="https://sepolia.basescan.org"
else
  EXPLORER="https://basescan.org"
fi

echo ""
echo "=== Verification complete ==="
echo "  Implementation: $EXPLORER/address/$IMPL_ADDRESS"
echo "  Proxy:          $EXPLORER/address/$PROXY_ADDRESS"
echo ""
