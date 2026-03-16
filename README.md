# YoCA - Yo Cost Average

Automated DCA (Dollar Cost Average) into yield-bearing [Yo Protocol](https://yo.xyz) vaults on Base. Built as a [Base Mini App](https://docs.base.org/mini-apps/overview) for the [Yo SDK Hackathon](https://dorahacks.io/hackathon/yo/detail).

Base Mini Apps are lightweight web apps that run inside the [Coinbase Wallet](https://www.coinbase.com/wallet) and other Base-compatible clients. Learn more in the [Base Mini Apps documentation](https://docs.base.org/mini-apps/overview).

## How it works

1. **Deposit stables** — Deposit USDC or EURC into yoUSD/yoEUR vaults to earn yield while your funds wait to be swapped
2. **Configure DCA** — Pick a target vault (yoETH or yoBTC), set an amount per execution, choose a period (daily to monthly), and optionally set min/max price bounds
3. **Approve** — Grant the YoCAExecutor contract a one-time approval to swap your vault tokens
4. **Automated execution** — A Vercel cron job runs every 10 minutes, checks eligible orders (timing, price bounds), and executes swaps on-chain via a DEX aggregator

## Features

- **Vault portfolio dashboard** — View your yoUSD, yoEUR, yoETH, and yoBTC positions (shares and underlying assets)
- **Deposit flow** — Deposit USDC/EURC into Yo vaults directly from the app (testnet uses mock ERC-4626 vaults, mainnet uses the Yo SDK `useDeposit` hook via YoGateway)
- **DCA order management** — Create, pause, resume, cancel, and manually trigger DCA orders
- **Execution history** — Browse past executions with amounts, effective price, status, and transaction links
- **Price bounds** — Optional min/max price filters so orders only execute within a target range
- **Configurable slippage** — Per-order slippage tolerance (default 1%)

## Architecture

```
Next.js Frontend (Yo SDK React) ──> Vercel API Routes ──> Neon PostgreSQL
                                          │
                                    Vercel Cron (*/10)
                                          │
                              ┌───────────┴───────────┐
                              │  YoCAExecutor Proxy (Base)  │
                              │  UUPS Upgradeable      │
                              │  DEX Aggregator Swap   │
                              └────────────────────────┘
```

## Tech Stack

- **Frontend**: Next.js 15, `@yo-protocol/react`, wagmi, viem
- **Wallet**: MetaMask, Coinbase Wallet, Base Account
- **Database**: Neon PostgreSQL + Drizzle ORM
- **Smart Contract**: Solidity 0.8.24, UUPS proxy (OpenZeppelin), Foundry
- **Execution**: Vercel Cron + 0x Swap API (mainnet) / MockSwapRouter (testnet)

## Getting Started

### Prerequisites

- Node.js 20+
- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- A Neon PostgreSQL database
- A Vercel account (for production)

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

## Smart Contracts

The `YoCAExecutor` contract is a thin execution layer deployed behind a UUPS upgradeable proxy (ERC-1967). A whitelisted keeper wallet pulls vault tokens from users, swaps them through an approved DEX router, and sends the output tokens back. The contract is ownable — only the owner can set the keeper, manage router allowlists, rescue stuck tokens, and authorize upgrades.

```bash
cd contracts

# Build
forge build

# Run tests
forge test -vvv
```

### Deploy

The testnet script deploys mock tokens (USDC, EURC, WETH, cbBTC), mock Yo vaults (yoUSD, yoEUR, yoETH, yoBTC), a mock swap router, and the YoCAExecutor proxy. The mainnet script deploys only the YoCAExecutor proxy and configures the keeper and routers from environment variables.

```bash
# Deploy to Base Sepolia (testnet with mocks)
PRIVATE_KEY=0x... forge script script/DeployTestnet.s.sol \
  --rpc-url https://sepolia.base.org --broadcast

# Deploy to Base mainnet
PRIVATE_KEY=0x... KEEPER_ADDRESS=0x... forge script script/DeployMainnet.s.sol:DeployMainnet \
  --rpc-url https://mainnet.base.org --broadcast
```

### Upgrade

The proxy address and all state (keeper, routers, user approvals) are preserved across upgrades. Modify `YoCAExecutor.sol`, then run the upgrade script with the existing proxy address:

```bash
# Upgrade on Base Sepolia
PRIVATE_KEY=0x... YOCA_PROXY=0x... forge script script/UpgradeTestnet.s.sol \
  --rpc-url https://sepolia.base.org --broadcast

# Upgrade on Base mainnet
PRIVATE_KEY=0x... YOCA_PROXY=0x... forge script script/UpgradeMainnet.s.sol \
  --rpc-url https://mainnet.base.org --broadcast
```

## Local Fork Testing

Test against real Yo Protocol contracts using a local Anvil fork of Base mainnet. This is the recommended way to develop and debug.

```bash
# Terminal 1 — Start an Anvil fork of Base mainnet
npm run fork
# Or with a custom RPC (faster):
npm run fork -- https://base.your-rpc.com

# Terminal 2 — Seed the test wallet and deploy contracts
npm run seed-fork
```

The seed script funds the Anvil default account with 10 ETH, 10,000 USDC, and 10,000 EURC, then deploys the YoCAExecutor contract with the 0x AllowanceHolder router whitelisted. Copy the output addresses into `.env` (or use `.env.fork` as a template):

```bash
NEXT_PUBLIC_CHAIN_ID=8453
NEXT_PUBLIC_BASE_RPC_URL=http://127.0.0.1:8545
BASE_RPC_URL=http://127.0.0.1:8545
NEXT_PUBLIC_YOCA_CONTRACT=<proxy address from seed output>
```

Then start the app:

```bash
npm run dev
```

**MetaMask setup**: Add a custom network with RPC `http://127.0.0.1:8545` and chain ID `8453`. This connects MetaMask to the fork where your wallet is pre-funded.

**Test DCA execution**: After creating a DCA order in the UI, trigger the cron manually:

```bash
curl http://localhost:3000/api/cron/execute
```

## Production Deployment

1. Deploy to Vercel (connect your GitHub repo)
2. Set all environment variables in the Vercel dashboard (see table below)
3. Deploy the smart contracts to Base mainnet (`DeployMainnet.s.sol`)
4. Set `NEXT_PUBLIC_YOCA_CONTRACT` to the proxy address in Vercel
5. The cron job (`/api/cron/execute`) runs automatically every 10 minutes via `vercel.json`
6. Register your app as a Base Mini App at [base.dev/preview](https://base.dev/preview?tab=account) — see the [Base Mini Apps deployment guide](https://docs.base.org/mini-apps/building-a-mini-app) for details

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_CHAIN_ID` | `84532` (Base Sepolia) or `8453` (Base mainnet / fork) |
| `NEXT_PUBLIC_URL` | Production URL of the app |
| `NEXT_PUBLIC_YOCA_CONTRACT` | Deployed YoCAExecutor proxy address |
| `NEXT_PUBLIC_BASE_RPC_URL` | Base RPC for the frontend (`http://127.0.0.1:8545` for fork) |
| `NEXT_PUBLIC_BUILDER_CODE` | Base Builder Code for attribution |
| `NEXT_PUBLIC_MOCK_YOUSD` | Mock yoUSD address (testnet only) |
| `NEXT_PUBLIC_MOCK_YOEUR` | Mock yoEUR address (testnet only) |
| `NEXT_PUBLIC_MOCK_YOETH` | Mock yoETH address (testnet only) |
| `NEXT_PUBLIC_MOCK_YOBTC` | Mock yoBTC address (testnet only) |
| `NEXT_PUBLIC_MOCK_SWAP_ROUTER` | Mock swap router address (testnet only) |
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `BASE_RPC_URL` | Base RPC for the backend / keeper |
| `KEEPER_PRIVATE_KEY` | Private key for the keeper wallet (cron execution) |
| `CRON_SECRET` | Secret to authenticate Vercel cron calls |
| `DEX_AGGREGATOR_API_KEY` | 0x API key (mainnet swaps) |

## NPM Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate` | Run Drizzle migrations |
| `npm run db:push` | Push schema to database (dev) |
| `npm run db:push:production` | Push schema using `.env.production` |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run fork` | Start an Anvil fork of Base mainnet |
| `npm run seed-fork` | Seed the fork with test assets and deploy contracts |

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── cron/execute/    # Cron endpoint — finds and runs eligible DCA orders
│   │   └── dca/             # CRUD + manual execute for DCA orders
│   ├── components/
│   │   ├── Header           # Wallet connect, chain indicator
│   │   ├── VaultBalances    # Portfolio cards (yoUSD, yoEUR, yoETH, yoBTC)
│   │   ├── DepositFlow      # Deposit modal (approve + deposit into vaults)
│   │   ├── DCASetup         # Order creation modal
│   │   ├── DCAList          # Active orders with pause/resume/cancel/execute
│   │   └── DCAHistory       # Past execution log with tx links
│   ├── providers/           # Wagmi, React Query, Yo SDK providers
│   └── page.tsx             # Main dashboard
├── contracts/
│   ├── src/
│   │   ├── YoCAExecutor.sol      # DCA contract (UUPS upgradeable)
│   │   └── mocks/           # MockERC20, MockYoVault, MockSwapRouter
│   ├── test/                # Foundry tests
│   └── script/              # Deploy + upgrade scripts (testnet & mainnet)
├── db/                      # Drizzle schema (users, dca_orders, dca_executions)
├── lib/                     # Constants, auth, keeper logic, swap executor
├── scripts/                 # fork.sh, seed-fork.sh
└── vercel.json              # Cron schedule
```

## License

MIT
