"use client";

import { useAccount, useReadContract } from "wagmi";
import { useUserBalance } from "@yo-protocol/react";
import { erc20Abi, zeroAddress, type Address } from "viem";
import { ADDRESSES, STABLE_VAULTS, IS_TESTNET, IS_LOCAL_FORK } from "@/lib/constants";

const ZERO = BigInt(0);

const convertToAssetsAbi = [
  {
    name: "convertToAssets",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "shares", type: "uint256" }],
    outputs: [{ name: "assets", type: "uint256" }],
  },
] as const;

function isValidAddress(addr: string): boolean {
  return !!addr && addr !== "0x" && addr !== zeroAddress;
}

function useTestnetVaultBalance(
  vaultAddress: Address,
  userAddress: Address | undefined,
) {
  const valid = isValidAddress(vaultAddress) && !!userAddress;

  const { data: shares, isLoading: sharesLoading } = useReadContract({
    address: vaultAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: valid },
  });

  const sharesValue = shares ?? ZERO;

  const { data: assets, isLoading: assetsLoading } = useReadContract({
    address: vaultAddress,
    abi: convertToAssetsAbi,
    functionName: "convertToAssets",
    args: [sharesValue],
    query: { enabled: valid && sharesValue > ZERO },
  });

  if (!valid) {
    return { shares: ZERO, assets: ZERO, isLoading: false };
  }

  return {
    shares: sharesValue,
    assets: assets ?? sharesValue,
    isLoading: sharesLoading || (sharesValue > ZERO && assetsLoading),
  };
}

function useMainnetVaultBalance(
  vaultAddress: Address,
  userAddress: Address | undefined,
) {
  const { position, isLoading } = useUserBalance(vaultAddress, userAddress);

  return {
    shares: position?.shares ?? ZERO,
    assets: position?.assets ?? ZERO,
    isLoading,
  };
}

export function useVaultBalance(
  vaultAddress: Address,
  userAddress: Address | undefined,
) {
  const testnet = useTestnetVaultBalance(vaultAddress, userAddress);
  const mainnet = useMainnetVaultBalance(vaultAddress, userAddress);

  return (IS_TESTNET || IS_LOCAL_FORK) ? testnet : mainnet;
}

export function useStableVaultBalances() {
  const { address } = useAccount();

  const yoUSD = useVaultBalance(ADDRESSES.vaults.yoUSD.address, address);
  const yoEUR = useVaultBalance(ADDRESSES.vaults.yoEUR.address, address);

  return [
    { vault: STABLE_VAULTS[0]!, ...yoUSD },
    { vault: STABLE_VAULTS[1]!, ...yoEUR },
  ];
}
