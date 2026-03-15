import { createYoClient } from "@yo-protocol/core";
import { SUPPORTED_CHAIN_ID } from "./constants";

export function getYoClient() {
  return createYoClient({
    chainId: SUPPORTED_CHAIN_ID as 1 | 8453,
  });
}
