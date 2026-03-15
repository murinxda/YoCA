# YoCA - Yo Cost Average

Automated DCA (Dollar Cost Average) into yield-bearing [Yo Protocol](https://yo.xyz) vaults on Base. Built as a [Base Mini App](https://docs.base.org/mini-apps/overview) for the [Yo SDK Hackathon](https://dorahacks.io/hackathon/yo/detail).

## How it works

1. **Deposit stables** — Deposit USDC or EURC into yoUSD/yoEUR vaults to earn yield while waiting
2. **Configure DCA** — Choose a target vault (yoETH, yoBTC), amount per execution, period, and optional price bounds
3. **Approve** — Grant the YoCADCA contract permission to swap your vault tokens
4. **Automated execution** — A Vercel cron job checks eligible orders every 10 minutes and executes swaps via a DEX aggregator

## Architecture

```
Next.js Frontend (Yo SDK React) ──> Vercel API Routes ──> Neon PostgreSQL
                                          │
                                    Vercel Cron Job
                                          │
                              ┌───────────┴───────────┐
                              │   YoCADCA.sol (Base)   │
                              │  DEX Aggregator Swap   │
                              └────────────────────────┘
```

## Tech Stack

- **Frontend**: Next.js 15, `@yo-protocol/react`, wagmi, viem
- **Mini App**: `@farcaster/miniapp-sdk`
- **Database**: Neon PostgreSQL + Drizzle ORM
- **Smart Contract**: Solidity 0.8.24 (Foundry)
- **Execution**: Vercel Cron + DEX Aggregator (0x API)

## Getting Started

### Prerequisites

- Node.js 18+
- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- A Neon PostgreSQL database
- A Vercel account

### Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your values

# Push database schema
npm run db:push

# Run locally
npm run dev
```

### Smart Contracts

```bash
cd contracts

# Build
forge build

# Test
forge test -vvv

# Deploy to Base Sepolia (testnet with mocks)
PRIVATE_KEY=0x... forge script script/DeployTestnet.s.sol \
  --rpc-url https://sepolia.base.org --broadcast

# Deploy to Base mainnet
PRIVATE_KEY=0x... KEEPER_ADDRESS=0x... forge script script/DeployMainnet.s.sol \
  --rpc-url https://mainnet.base.org --broadcast
```

### Local Fork Testing (Recommended)

Test against real Yo Protocol contracts using a local Anvil fork of Base mainnet:

```bash
# Terminal 1: Start the fork
npm run fork
# Or with a custom RPC (faster): npm run fork -- https://base.your-rpc.com

# Terminal 2: Seed test wallet with USDC, EURC, and deploy YoCADCA
npm run seed-fork

# Copy the output env vars into .env (or use .env.fork as template):
#   NEXT_PUBLIC_CHAIN_ID=8453
#   NEXT_PUBLIC_BASE_RPC_URL=http://127.0.0.1:8545
#   BASE_RPC_URL=http://127.0.0.1:8545
#   NEXT_PUBLIC_YOCA_CONTRACT=<address from seed output>

# Start the app
npm run dev
```

**MetaMask setup**: Add a custom network with RPC `http://127.0.0.1:8545` and chain ID `8453`. This connects MetaMask to the fork where your wallet has 10,000 USDC, 10,000 EURC, and 10 ETH.

**Test DCA execution**:
```bash
# After creating a DCA order in the UI:
curl http://localhost:3000/api/cron/execute
```

### Deployment

1. Deploy to Vercel (connects to your GitHub repo)
2. Set all environment variables in Vercel dashboard
3. Deploy smart contracts to Base
4. Update `NEXT_PUBLIC_YOCA_CONTRACT` in Vercel
5. Sign your manifest at [base.dev/preview](https://base.dev/preview?tab=account)
6. Update `accountAssociation` in `farcaster.config.ts`

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_CHAIN_ID` | `84532` (Base Sepolia) or `8453` (Base mainnet) |
| `NEXT_PUBLIC_URL` | Production URL |
| `NEXT_PUBLIC_YOCA_CONTRACT` | Deployed YoCADCA contract address |
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `KEEPER_PRIVATE_KEY` | Backend wallet private key for cron execution |
| `CRON_SECRET` | Vercel cron auth secret |
| `DEX_AGGREGATOR_API_KEY` | 0x API key |
| `NEXT_PUBLIC_BASE_RPC_URL` | Base RPC for frontend (set to `http://127.0.0.1:8545` for fork) |
| `BASE_RPC_URL` | Base RPC for backend/keeper |

## Project Structure

```
├── app/
│   ├── api/              # API routes (auth, dca CRUD, cron)
│   ├── components/       # React components
│   ├── providers/        # Wagmi, Yo SDK, MiniApp providers
│   └── page.tsx          # Main dashboard
├── contracts/
│   ├── src/YoCADCA.sol   # DCA execution contract
│   ├── src/mocks/        # Test mock contracts
│   ├── test/             # Foundry tests
│   └── script/           # Deploy scripts
├── db/                   # Drizzle schema and config
├── lib/                  # Constants, auth, keeper logic
└── farcaster.config.ts   # Mini app manifest
```

## License

MIT
