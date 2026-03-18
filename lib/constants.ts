import { type Address, type Chain, defineChain } from "viem";
import { base, baseSepolia } from "viem/chains";

export const SUPPORTED_CHAIN_ID = Number(
  process.env.NEXT_PUBLIC_CHAIN_ID || "84532"
);

export const IS_TESTNET = SUPPORTED_CHAIN_ID === baseSepolia.id;

const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL ?? "";
export const IS_LOCAL_FORK =
  SUPPORTED_CHAIN_ID !== base.id &&
  SUPPORTED_CHAIN_ID !== baseSepolia.id &&
  rpcUrl !== "";

const anvilBase: Chain = defineChain({
  ...base,
  id: SUPPORTED_CHAIN_ID,
  name: "Base (Anvil Fork)",
  rpcUrls: {
    default: { http: [rpcUrl || "http://127.0.0.1:8545"] },
  },
  testnet: true,
});

export const CHAIN: Chain = IS_TESTNET
  ? baseSepolia
  : IS_LOCAL_FORK
    ? anvilBase
    : base;

export type VaultId = "yoUSD" | "yoEUR" | "yoETH" | "yoBTC";

export interface VaultConfig {
  id: VaultId;
  name: string;
  address: Address;
  underlying: string;
  underlyingSymbol: string;
  decimals: number;
  type: "stable" | "volatile";
  color: string;
}

interface ChainAddresses {
  vaults: Record<VaultId, VaultConfig>;
  yocaDCA: Address;
  yoGateway: Address;
}

const BASE_MAINNET_ADDRESSES: ChainAddresses = {
  vaults: {
    yoUSD: {
      id: "yoUSD",
      name: "YoUSD",
      address: "0x0000000f2eb9f69274678c76222b35eec7588a65",
      underlying: "USDC",
      underlyingSymbol: "USDC",
      decimals: 6,
      type: "stable",
      color: "#2775CA",
    },
    yoEUR: {
      id: "yoEUR",
      name: "YoEUR",
      address: "0x50c749ae210d3977adc824ae11f3c7fd10c871e9",
      underlying: "EURC",
      underlyingSymbol: "EURC",
      decimals: 6,
      type: "stable",
      color: "#003399",
    },
    yoETH: {
      id: "yoETH",
      name: "YoETH",
      address: "0x3a43aec53490cb9fa922847385d82fe25d0e9de7",
      underlying: "WETH",
      underlyingSymbol: "ETH",
      decimals: 18,
      type: "volatile",
      color: "#627EEA",
    },
    yoBTC: {
      id: "yoBTC",
      name: "YoBTC",
      address: "0xbcbc8cb4d1e8ed048a6276a5e94a3e952660bcbc",
      underlying: "cbBTC",
      underlyingSymbol: "BTC",
      decimals: 8,
      type: "volatile",
      color: "#F7931A",
    },
  },
  yocaDCA: (process.env.NEXT_PUBLIC_YOCA_CONTRACT || "0x") as Address,
  yoGateway: "0xF1EeE0957267b1A474323Ff9CfF7719E964969FA",
};

const ZERO_ADDR = "0x0000000000000000000000000000000000000000" as Address;

const BASE_SEPOLIA_ADDRESSES: ChainAddresses = {
  vaults: {
    yoUSD: {
      id: "yoUSD",
      name: "YoUSD (Test)",
      address: (process.env.NEXT_PUBLIC_MOCK_YOUSD || ZERO_ADDR) as Address,
      underlying: "mockUSDC",
      underlyingSymbol: "USDC",
      decimals: 6,
      type: "stable",
      color: "#2775CA",
    },
    yoEUR: {
      id: "yoEUR",
      name: "YoEUR (Test)",
      address: (process.env.NEXT_PUBLIC_MOCK_YOEUR || ZERO_ADDR) as Address,
      underlying: "mockEURC",
      underlyingSymbol: "EURC",
      decimals: 6,
      type: "stable",
      color: "#003399",
    },
    yoETH: {
      id: "yoETH",
      name: "YoETH (Test)",
      address: (process.env.NEXT_PUBLIC_MOCK_YOETH || ZERO_ADDR) as Address,
      underlying: "mockWETH",
      underlyingSymbol: "ETH",
      decimals: 18,
      type: "volatile",
      color: "#627EEA",
    },
    yoBTC: {
      id: "yoBTC",
      name: "YoBTC (Test)",
      address: (process.env.NEXT_PUBLIC_MOCK_YOBTC || ZERO_ADDR) as Address,
      underlying: "mockCbBTC",
      underlyingSymbol: "BTC",
      decimals: 8,
      type: "volatile",
      color: "#F7931A",
    },
  },
  yocaDCA: (process.env.NEXT_PUBLIC_YOCA_CONTRACT || ZERO_ADDR) as Address,
  yoGateway: (process.env.NEXT_PUBLIC_MOCK_SWAP_ROUTER || ZERO_ADDR) as Address,
};

export const ADDRESSES: ChainAddresses =
  IS_TESTNET ? BASE_SEPOLIA_ADDRESSES : BASE_MAINNET_ADDRESSES;

export const STABLE_VAULTS = Object.values(ADDRESSES.vaults).filter(
  (v) => v.type === "stable"
);
export const VOLATILE_VAULTS = Object.values(ADDRESSES.vaults).filter(
  (v) => v.type === "volatile"
);

export const PERIOD_OPTIONS = [
  { label: "Daily", days: 1 },
  { label: "Every 3 days", days: 3 },
  { label: "Weekly", days: 7 },
  { label: "Bi-weekly", days: 14 },
  { label: "Monthly", days: 30 },
];

export const DEFAULT_SLIPPAGE_BPS = 50; // 0.5%
