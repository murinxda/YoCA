import { ImageResponse } from "next/og";

export const alt = "YoCA – Automated DCA into yield-bearing vaults on Base";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0A0A0A",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Gradient accent glow */}
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -120,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -80,
            left: -80,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "72px 80px",
            height: "100%",
            position: "relative",
          }}
        >
          {/* Logo mark + title */}
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 16,
                background: "#6366F1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 44,
                fontWeight: 800,
                color: "white",
              }}
            >
              Y
            </div>
            <div
              style={{
                fontSize: 64,
                fontWeight: 800,
                color: "#FAFAFA",
                letterSpacing: -2,
              }}
            >
              YoCA
            </div>
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: 36,
              fontWeight: 600,
              color: "#818CF8",
              marginTop: 20,
            }}
          >
            Yo Cost Average
          </div>

          {/* Description */}
          <div
            style={{
              fontSize: 26,
              color: "#A0A0A0",
              marginTop: 24,
              lineHeight: 1.5,
              maxWidth: 800,
            }}
          >
            Automated DCA into yield-bearing Yo Protocol vaults on Base.
            Deposit stables, set your strategy, and earn yield while you
            accumulate.
          </div>

          {/* Feature pills */}
          <div style={{ display: "flex", gap: 16, marginTop: 40 }}>
            {["Auto-swap", "Earn yield", "Price limits"].map((label) => (
              <div
                key={label}
                style={{
                  padding: "10px 24px",
                  borderRadius: 100,
                  border: "1px solid #2A2A2A",
                  background: "#141414",
                  color: "#FAFAFA",
                  fontSize: 20,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
