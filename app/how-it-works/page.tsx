"use client";

import Link from "next/link";
import { ADDRESSES, CHAIN, IS_TESTNET, IS_LOCAL_FORK } from "@/lib/constants";

const BASESCAN_URL = IS_TESTNET
  ? "https://sepolia.basescan.org"
  : "https://basescan.org";

function contractUrl(address: string) {
  return `${BASESCAN_URL}/address/${address}`;
}

const STEPS = [
  {
    number: "1",
    title: "Deposit stables",
    description:
      "Deposit USDC or EURC into Yo Protocol vaults (yoUSD / yoEUR). Your funds start earning yield immediately — even before any DCA swap happens.",
    color: "var(--stable-color)",
  },
  {
    number: "2",
    title: "Configure your DCA",
    description:
      "Pick a target vault (yoETH or yoBTC), set how much to swap per execution, choose a frequency (daily to monthly), and optionally set min/max price bounds.",
    color: "var(--accent)",
  },
  {
    number: "3",
    title: "Approve the executor",
    description:
      "Grant a one-time ERC-20 approval so the YoCAExecutor contract can pull your vault tokens when a swap is due. You stay in control and can revoke anytime.",
    color: "var(--warning)",
  },
  {
    number: "4",
    title: "Automated execution",
    description:
      "A keeper checks eligible orders every hour. When your order is due (and price bounds are met), it swaps your vault tokens through a DEX aggregator and sends the output tokens directly to your wallet.",
    color: "var(--success)",
  },
];

const FAQS = [
  {
    q: "What is Yo Protocol?",
    a: "Yo Protocol provides yield-bearing vaults on Base. When you deposit USDC into yoUSD, your stablecoins earn yield through diversified DeFi strategies managed by Yo. YoCA builds on top of these vaults to add automated DCA.",
  },
  {
    q: "Why do I need to approve a smart contract?",
    a: "The YoCAExecutor contract needs permission to move your vault tokens when a DCA swap is due. This is a standard ERC-20 approval — the contract can only pull the token you approved, and only through whitelisted DEX routers. You can revoke the approval at any time.",
  },
  {
    q: "Who executes my DCA orders?",
    a: "A backend keeper wallet triggers executions automatically. The keeper can only call the executeDCA function on the YoCAExecutor contract — it cannot move your tokens arbitrarily. The swap itself happens through a whitelisted DEX aggregator (0x on mainnet).",
  },
  {
    q: "What happens if the price moves a lot?",
    a: "Each order has a configurable slippage tolerance (default 0.5%). If the swap would result in less than your minimum acceptable output, the transaction reverts and your tokens stay safe. You can also set price bounds so orders only execute within a target price range.",
  },
  {
    q: "Can I pause or cancel my DCA?",
    a: "Yes. You can pause, resume, or cancel any order at any time from the DCA Orders tab. Paused orders simply skip executions until you resume them. Cancelled orders stop permanently.",
  },
  {
    q: "Do I earn yield on both sides?",
    a: "Yes — that's what makes YoCA unique. Your source tokens (yoUSD/yoEUR) earn yield while waiting to be swapped, and your target tokens (yoETH/yoBTC) earn yield after the swap. You're never sitting in idle assets.",
  },
  {
    q: "What are the fees?",
    a: "YoCA itself charges no fees. You pay standard network gas fees (covered by the keeper) and the DEX aggregator's swap fee (typically < 0.1%). Yo Protocol vaults have their own fee structure — see the Yo Protocol docs for details.",
  },
  {
    q: "Is the contract upgradeable?",
    a: "Yes, the YoCAExecutor uses a UUPS proxy pattern (ERC-1967). This allows bug fixes and improvements while preserving your approvals and the contract address. Only the contract owner can authorize upgrades.",
  },
  {
    q: "What chains are supported?",
    a: "YoCA currently runs on Base (Coinbase's L2). The Yo Protocol vaults it integrates with are deployed on Base.",
  },
];

export default function HowItWorks() {
  const contractAddress = ADDRESSES.yocaDCA;
  const hasContract =
    contractAddress && contractAddress !== "0x" && contractAddress !== "0x0000000000000000000000000000000000000000";

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 48 }}>
      <header
        className="container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 16,
          paddingBottom: 16,
          borderBottom: "1px solid var(--border)",
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 15,
            fontWeight: 600,
            color: "var(--text-secondary)",
          }}
        >
          <span style={{ fontSize: 18 }}>&larr;</span>
          Back
        </Link>
        <div
          style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}
        >
          YoCA
        </div>
      </header>

      <div className="container" style={{ paddingTop: 32 }}>
        {/* Hero */}
        <div style={{ marginBottom: 40 }} className="fade-in">
          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              marginBottom: 12,
            }}
          >
            How it works
          </h1>
          <p
            style={{
              fontSize: 15,
              lineHeight: 1.7,
              color: "var(--text-secondary)",
              maxWidth: 420,
            }}
          >
            YoCA automates Dollar Cost Averaging into yield-bearing Yo Protocol
            vaults. Earn yield on both your source and target tokens — your
            money is never idle.
          </p>
        </div>

        {/* Steps */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            marginBottom: 48,
          }}
          className="fade-in"
        >
          {STEPS.map((step) => (
            <div
              key={step.number}
              className="card"
              style={{
                display: "flex",
                gap: 16,
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "var(--radius-sm)",
                  background: `color-mix(in srgb, ${step.color} 15%, transparent)`,
                  color: step.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 16,
                  flexShrink: 0,
                }}
              >
                {step.number}
              </div>
              <div>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 15,
                    marginBottom: 4,
                  }}
                >
                  {step.title}
                </div>
                <p
                  style={{
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: "var(--text-secondary)",
                    margin: 0,
                  }}
                >
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Contract Transparency */}
        <div style={{ marginBottom: 48 }} className="fade-in">
          <h2
            style={{
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              marginBottom: 8,
            }}
          >
            Contract &amp; Transparency
          </h2>
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.7,
              color: "var(--text-secondary)",
              marginBottom: 20,
            }}
          >
            YoCA uses a smart contract called <strong style={{ color: "var(--text-primary)" }}>YoCAExecutor</strong> to
            perform DCA swaps on your behalf. Here&apos;s what you should know:
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {/* Contract address card */}
            {hasContract && (
              <div className="card" style={{ padding: 16 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 8,
                  }}
                >
                  YoCAExecutor on {CHAIN.name}
                </div>
                <a
                  href={contractUrl(contractAddress)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontFamily: "monospace",
                    fontSize: 13,
                    wordBreak: "break-all",
                    color: "var(--accent)",
                    lineHeight: 1.5,
                  }}
                >
                  {contractAddress}
                  <span style={{ marginLeft: 6, fontSize: 11 }}>↗</span>
                </a>
              </div>
            )}

            {/* What it can / can't do */}
            <div className="card" style={{ padding: 16 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 12,
                }}
              >
                What the contract can do
              </div>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {[
                  "Pull approved vault tokens from your wallet when a DCA order is due",
                  "Swap them through a whitelisted DEX aggregator",
                  "Send the output tokens directly back to your wallet",
                ].map((item) => (
                  <li
                    key={item}
                    style={{
                      fontSize: 14,
                      lineHeight: 1.5,
                      color: "var(--text-secondary)",
                      paddingLeft: 20,
                      position: "relative",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        left: 0,
                        color: "var(--success)",
                        fontWeight: 700,
                      }}
                    >
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="card" style={{ padding: 16 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 12,
                }}
              >
                What the contract cannot do
              </div>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {[
                  "Move tokens you haven't explicitly approved",
                  "Swap through non-whitelisted routers",
                  "Keep any of your tokens — output goes to your wallet",
                  "Execute swaps below your minimum output (slippage protection)",
                ].map((item) => (
                  <li
                    key={item}
                    style={{
                      fontSize: 14,
                      lineHeight: 1.5,
                      color: "var(--text-secondary)",
                      paddingLeft: 20,
                      position: "relative",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        left: 0,
                        color: "var(--danger)",
                        fontWeight: 700,
                      }}
                    >
                      ✕
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="card" style={{ padding: 16 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 12,
                }}
              >
                Safety features
              </div>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {[
                  "UUPS upgradeable proxy — bug fixes without losing your approvals",
                  "Reentrancy guard — prevents reentrancy attacks during swaps",
                  "Router allowlist — only owner-approved DEX routers can be used",
                  "Minimum output check — every swap must meet your slippage tolerance",
                  "Open source — full contract code available on GitHub and verifiable on Basescan",
                ].map((item) => (
                  <li
                    key={item}
                    style={{
                      fontSize: 14,
                      lineHeight: 1.5,
                      color: "var(--text-secondary)",
                      paddingLeft: 20,
                      position: "relative",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        left: 0,
                        color: "var(--accent)",
                      }}
                    >
                      ◆
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Yo Protocol vaults */}
        <div style={{ marginBottom: 48 }} className="fade-in">
          <h2
            style={{
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              marginBottom: 8,
            }}
          >
            Yo Protocol Vaults
          </h2>
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.7,
              color: "var(--text-secondary)",
              marginBottom: 20,
            }}
          >
            YoCA integrates with four Yo Protocol vaults on Base. Each vault
            accepts a specific asset and earns yield through onchain strategies.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            {Object.values(ADDRESSES.vaults).map((vault) => (
              <div
                key={vault.id}
                className="card"
                style={{ padding: 14, textAlign: "center" }}
              >
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: vault.color,
                    marginBottom: 4,
                  }}
                >
                  {vault.name}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    marginBottom: 8,
                  }}
                >
                  {vault.type === "stable" ? "Stable" : "Volatile"} ·{" "}
                  {vault.underlyingSymbol}
                </div>
                {!IS_TESTNET && !IS_LOCAL_FORK && (
                  <a
                    href={contractUrl(vault.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 11,
                      fontFamily: "monospace",
                      color: "var(--text-muted)",
                    }}
                  >
                    {vault.address.slice(0, 6)}…{vault.address.slice(-4)} ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="fade-in">
          <h2
            style={{
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              marginBottom: 20,
            }}
          >
            FAQ
          </h2>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {FAQS.map((faq) => (
              <details
                key={faq.q}
                className="card"
                style={{ padding: 0, cursor: "pointer" }}
              >
                <summary
                  style={{
                    padding: "16px 20px",
                    fontSize: 15,
                    fontWeight: 600,
                    listStyle: "none",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  {faq.q}
                  <span
                    style={{
                      fontSize: 18,
                      color: "var(--text-muted)",
                      flexShrink: 0,
                      marginLeft: 12,
                      transition: "transform 0.2s ease",
                    }}
                    className="faq-chevron"
                  >
                    +
                  </span>
                </summary>
                <div
                  style={{
                    padding: "0 20px 16px",
                    fontSize: 14,
                    lineHeight: 1.7,
                    color: "var(--text-secondary)",
                  }}
                >
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>

        {/* Links */}
        <div
          style={{
            marginTop: 48,
            paddingTop: 24,
            borderTop: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            fontSize: 14,
          }}
          className="fade-in"
        >
          <a
            href="https://docs.yo.xyz"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--accent)" }}
          >
            Yo Protocol Docs ↗
          </a>
          <a
            href="https://github.com/murinxda/YoCA"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--accent)" }}
          >
            YoCA GitHub ↗
          </a>
          {hasContract && (
            <a
              href={contractUrl(contractAddress)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--accent)" }}
            >
              YoCAExecutor on Basescan ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
