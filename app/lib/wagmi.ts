import { http, createConfig, createStorage, cookieStorage } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { injected, coinbaseWallet, baseAccount, metaMask } from "wagmi/connectors";
import { Attribution } from "ox/erc8021";
import { CHAIN, IS_LOCAL_FORK } from "@/lib/constants";

const DATA_SUFFIX = Attribution.toDataSuffix({
  codes: [process.env.NEXT_PUBLIC_BUILDER_CODE!],
});

const chains = IS_LOCAL_FORK
  ? ([CHAIN, base, baseSepolia] as const)
  : ([base, baseSepolia] as const);

const transports: Record<number, ReturnType<typeof http>> = {
  [base.id]: http(
    IS_LOCAL_FORK
      ? undefined
      : process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org",
  ),
  [baseSepolia.id]: http("https://sepolia.base.org"),
};

if (IS_LOCAL_FORK) {
  transports[CHAIN.id] = http(
    process.env.NEXT_PUBLIC_BASE_RPC_URL || "http://127.0.0.1:8545",
  );
}

export const wagmiConfig = createConfig({
  chains,
  connectors: [
    injected(),
    metaMask(),
    coinbaseWallet({ appName: "YoCA" }),
    baseAccount({ appName: "YoCA" }),
  ],
  storage: createStorage({ storage: cookieStorage }),
  transports: transports as typeof transports & Record<(typeof chains)[number]["id"], ReturnType<typeof http>>,
  dataSuffix: DATA_SUFFIX,
  ssr: true,
});
