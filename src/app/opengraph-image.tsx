import { ImageResponse } from "next/og";

export const alt = "GitHub Ranking — 日・週・月のトップリポジトリ";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Next.jsの規約ファイル: このファイルがあると /opengraph-image が生成され、
// layout.tsx の openGraph/twitter メタデータに自動で紐付けられる。
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "90px",
          background: "#f4f7f3",
          backgroundImage:
            "linear-gradient(rgba(33,110,57,0.10) 2px, transparent 2px), linear-gradient(90deg, rgba(33,110,57,0.10) 2px, transparent 2px)",
          backgroundSize: "36px 36px",
        }}
      >
        <div style={{ display: "flex", gap: 10, marginBottom: 36 }}>
          <div style={{ width: 32, height: 32, background: "#e6f4e6", borderRadius: 7, display: "flex" }} />
          <div style={{ width: 32, height: 32, background: "#9be9a8", borderRadius: 7, display: "flex" }} />
          <div style={{ width: 32, height: 32, background: "#40c463", borderRadius: 7, display: "flex" }} />
          <div style={{ width: 32, height: 32, background: "#216e39", borderRadius: 7, display: "flex" }} />
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 78,
            fontWeight: 700,
            color: "#23262e",
            letterSpacing: "-0.02em",
          }}
        >
          GitHub
          <span style={{ color: "#216e39", marginLeft: 22, display: "flex" }}>Ranking</span>
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#6b7080", marginTop: 22 }}>
          日・週・月のトップリポジトリをスター数でライブ集計
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 24,
            color: "#c99700",
            fontWeight: 700,
            marginTop: 44,
          }}
        >
          ★ daily / weekly / monthly &nbsp;·&nbsp; AIによる日本語解説
        </div>
      </div>
    ),
    { ...size }
  );
}
