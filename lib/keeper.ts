import {
  createWalletClient,
  createPublicClient,
  http,
  type Address,
  encodeFunctionData,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { CHAIN, ADDRESSES, IS_TESTNET } from "./constants";

const YOCA_DCA_ABI = [
  {
    name: "executeDCA",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "user", type: "address" },
      { name: "tokenIn", type: "address" },
      { name: "tokenOut", type: "address" },
      { name: "amountIn", type: "uint256" },
      { name: "minAmountOut", type: "uint256" },
      { name: "router", type: "address" },
      { name: "swapData", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

function getRpcUrl() {
  if (IS_TESTNET) return "https://sepolia.base.org";
  return process.env.BASE_RPC_URL || process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org";
}

export function getKeeperWalletClient() {
  const privateKey = process.env.KEEPER_PRIVATE_KEY;
  if (!privateKey) throw new Error("KEEPER_PRIVATE_KEY not set");

  const account = privateKeyToAccount(privateKey as `0x${string}`);

  return createWalletClient({
    account,
    chain: CHAIN,
    transport: http(getRpcUrl()),
  });
}

export function getPublicClient() {
  return createPublicClient({
    chain: CHAIN,
    transport: http(getRpcUrl()),
  });
}

export interface SwapQuote {
  router: Address;
  swapData: `0x${string}`;
  expectedAmountOut: bigint;
  price: number;
}

const MOCK_SWAP_ROUTER_ABI = [
  {
    name: "swap",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenIn", type: "address" },
      { name: "tokenOut", type: "address" },
      { name: "amountIn", type: "uint256" },
      { name: "minAmountOut", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "rateNum",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "", type: "address" },
      { name: "", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "rateDen",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "", type: "address" },
      { name: "", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

async function getTestnetSwapQuote(
  tokenIn: Address,
  tokenOut: Address,
  amountIn: bigint
): Promise<SwapQuote | null> {
  try {
    const publicClient = getPublicClient();
    const router = ADDRESSES.yoGateway;

    const [num, den] = await Promise.all([
      publicClient.readContract({
        address: router,
        abi: MOCK_SWAP_ROUTER_ABI,
        functionName: "rateNum",
        args: [tokenIn, tokenOut],
      }),
      publicClient.readContract({
        address: router,
        abi: MOCK_SWAP_ROUTER_ABI,
        functionName: "rateDen",
        args: [tokenIn, tokenOut],
      }),
    ]);

    if (den === BigInt(0)) {
      console.error("MockSwapRouter: rate not set for pair", tokenIn, tokenOut);
      return null;
    }

    const expectedAmountOut = (amountIn * num) / den;
    const price = Number(num) / Number(den);

    const swapData = encodeFunctionData({
      abi: MOCK_SWAP_ROUTER_ABI,
      functionName: "swap",
      args: [tokenIn, tokenOut, amountIn, BigInt(0)],
    });

    return {
      router,
      swapData,
      expectedAmountOut,
      price,
    };
  } catch (error) {
    console.error("Failed to get testnet swap quote:", error);
    console.error("Params: tokenIn=%s tokenOut=%s amountIn=%s router=%s", tokenIn, tokenOut, amountIn.toString(), ADDRESSES.yoGateway);
    return null;
  }
}

async function getMainnetSwapQuote(
  tokenIn: Address,
  tokenOut: Address,
  amountIn: bigint,
  sellDecimals: number,
  buyDecimals: number,
): Promise<SwapQuote | null> {
  const apiKey = process.env.DEX_AGGREGATOR_API_KEY;
  if (!apiKey) {
    console.error("DEX_AGGREGATOR_API_KEY not set");
    return null;
  }

  try {
    const params = new URLSearchParams({
      chainId: String(base.id),
      sellToken: tokenIn,
      buyToken: tokenOut,
      sellAmount: amountIn.toString(),
      taker: ADDRESSES.yocaDCA,
    });

    const response = await fetch(
      `https://api.0x.org/swap/allowance-holder/quote?${params}`,
      {
        headers: {
          "0x-api-key": apiKey,
          "0x-version": "v2",
        },
      }
    );

    if (!response.ok) {
      console.error("0x API error:", response.status, await response.text());
      return null;
    }

    const data = await response.json();

    if (!data.liquidityAvailable) {
      console.error("0x API: no liquidity available");
      return null;
    }

    const buyAmountRaw = BigInt(data.buyAmount);
    const sellAmountRaw = BigInt(data.sellAmount);

    const sellHuman = Number(sellAmountRaw) / 10 ** sellDecimals;
    const buyHuman = Number(buyAmountRaw) / 10 ** buyDecimals;
    const price = buyHuman > 0 ? sellHuman / buyHuman : 0;

    return {
      router: data.transaction.to as Address,
      swapData: data.transaction.data as `0x${string}`,
      expectedAmountOut: buyAmountRaw,
      price,
    };
  } catch (error) {
    console.error("Failed to get swap quote:", error);
    return null;
  }
}

export async function getSwapQuote(
  tokenIn: Address,
  tokenOut: Address,
  amountIn: bigint,
  sellDecimals: number = 6,
  buyDecimals: number = 18,
): Promise<SwapQuote | null> {
  if (IS_TESTNET) {
    return getTestnetSwapQuote(tokenIn, tokenOut, amountIn);
  }
  return getMainnetSwapQuote(tokenIn, tokenOut, amountIn, sellDecimals, buyDecimals);
}

export async function executeOnChainDCA(params: {
  user: Address;
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  minAmountOut: bigint;
  router: Address;
  swapData: `0x${string}`;
}): Promise<`0x${string}` | null> {
  try {
    const walletClient = getKeeperWalletClient();
    const publicClient = getPublicClient();

    const hash = await walletClient.writeContract({
      address: ADDRESSES.yocaDCA,
      abi: YOCA_DCA_ABI,
      chain: CHAIN,
      account: walletClient.account,
      functionName: "executeDCA",
      args: [
        params.user,
        params.tokenIn,
        params.tokenOut,
        params.amountIn,
        params.minAmountOut,
        params.router,
        params.swapData,
      ],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === "reverted") {
      console.error("DCA transaction reverted:", hash);
      return null;
    }

    return hash;
  } catch (error) {
    console.error("Failed to execute DCA on-chain:", error);
    return null;
  }
}
