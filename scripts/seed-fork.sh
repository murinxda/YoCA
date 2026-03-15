#!/usr/bin/env bash
set -euo pipefail

RPC="http://127.0.0.1:8545"

# Target wallet address (from PRIVATE_KEY in .env)
RECIPIENT="${RECIPIENT:-$(cast wallet address --private-key "$(grep '^PRIVATE_KEY=' .env | cut -d= -f2)")}"

# Base mainnet token addresses
USDC="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
EURC="0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42"

# Large holders on Base (verified on fork)
USDC_WHALE="0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB"   # Aave USDC pool
EURC_WHALE="0x50c749ae210d3977adc824ae11f3c7fd10c871e9"   # YoEUR vault (holds EURC)

echo "============================================"
echo "  Seeding Base fork for wallet: $RECIPIENT"
echo "============================================"
echo ""

# Fund recipient with ETH for gas
echo "[1/5] Funding wallet with 10 ETH..."
cast rpc anvil_setBalance "$RECIPIENT" "0x8AC7230489E80000" --rpc-url "$RPC" > /dev/null
echo "  Done."

# Impersonate USDC whale and transfer
echo "[2/5] Transferring 10,000 USDC..."
cast rpc anvil_setBalance "$USDC_WHALE" "0x8AC7230489E80000" --rpc-url "$RPC" > /dev/null
cast rpc anvil_impersonateAccount "$USDC_WHALE" --rpc-url "$RPC" > /dev/null
cast send "$USDC" "transfer(address,uint256)(bool)" "$RECIPIENT" 10000000000 \
  --from "$USDC_WHALE" --rpc-url "$RPC" --unlocked > /dev/null
cast rpc anvil_stopImpersonatingAccount "$USDC_WHALE" --rpc-url "$RPC" > /dev/null
echo "  Done."

# Impersonate EURC whale and transfer
echo "[3/5] Transferring 10,000 EURC..."
cast rpc anvil_setBalance "$EURC_WHALE" "0x8AC7230489E80000" --rpc-url "$RPC" > /dev/null
cast rpc anvil_impersonateAccount "$EURC_WHALE" --rpc-url "$RPC" > /dev/null
cast send "$EURC" "transfer(address,uint256)(bool)" "$RECIPIENT" 10000000000 \
  --from "$EURC_WHALE" --rpc-url "$RPC" --unlocked > /dev/null
cast rpc anvil_stopImpersonatingAccount "$EURC_WHALE" --rpc-url "$RPC" > /dev/null
echo "  Done."

# Deploy YoCAExecutor on the fork
echo "[4/5] Deploying YoCAExecutor contract..."
PRIVATE_KEY="$(grep '^PRIVATE_KEY=' .env | cut -d= -f2)"

DEPLOY_OUTPUT=$(cd contracts && KEEPER_ADDRESS="$RECIPIENT" forge script script/DeployMainnet.s.sol \
  --rpc-url "$RPC" \
  --broadcast \
  --private-key "$PRIVATE_KEY" \
  --sender "$RECIPIENT" \
  2>&1) || {
  echo "  ERROR: forge script failed:"
  echo "$DEPLOY_OUTPUT"
  exit 1
}

YOCA_ADDR=$(echo "$DEPLOY_OUTPUT" | grep "YoCAExecutor" | grep -oE '0x[0-9a-fA-F]{40}' | tail -1) || true

if [ -z "$YOCA_ADDR" ]; then
  echo "  WARNING: Could not parse YoCAExecutor address from deploy output."
  echo "  Deploy output:"
  echo "$DEPLOY_OUTPUT"
else
  echo "  YoCAExecutor deployed at: $YOCA_ADDR"
fi

# Whitelist 0x AllowanceHolder router on YoCAExecutor
ALLOWANCE_HOLDER="0x0000000000001fF3684f28c67538d4D072C22734"
echo "[5/6] Whitelisting 0x AllowanceHolder router ($ALLOWANCE_HOLDER)..."
cast send "$YOCA_ADDR" "setRouterAllowed(address,bool)" "$ALLOWANCE_HOLDER" true \
  --private-key "$PRIVATE_KEY" --rpc-url "$RPC" > /dev/null
echo "  Done."

# Verify balances
echo ""
echo "[6/6] Verifying balances..."
USDC_BAL=$(cast call "$USDC" "balanceOf(address)(uint256)" "$RECIPIENT" --rpc-url "$RPC")
EURC_BAL=$(cast call "$EURC" "balanceOf(address)(uint256)" "$RECIPIENT" --rpc-url "$RPC")
ETH_BAL=$(cast balance "$RECIPIENT" --rpc-url "$RPC" --ether)

echo "  ETH:  $ETH_BAL"
echo "  USDC: $USDC_BAL (raw)"
echo "  EURC: $EURC_BAL (raw)"

echo ""
echo "============================================"
echo "  Fork seeded successfully!"
echo "============================================"
echo ""
echo "Add to your .env:"
echo "  NEXT_PUBLIC_CHAIN_ID=8453"
echo "  NEXT_PUBLIC_BASE_RPC_URL=http://127.0.0.1:8545"
echo "  BASE_RPC_URL=http://127.0.0.1:8545"
if [ -n "$YOCA_ADDR" ]; then
  echo "  NEXT_PUBLIC_YOCA_CONTRACT=$YOCA_ADDR"
fi
echo ""
echo "Then restart 'npm run dev' and connect MetaMask to localhost:8545 (chain 8453)."
