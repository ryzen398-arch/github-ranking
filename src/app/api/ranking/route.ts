import { NextRequest, NextResponse } from "next/server";

const PERIOD_DAYS: Record<string, number> = { daily: 1, weekly: 7, monthly: 30 };

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "daily";
  const lang = searchParams.get("lang") || "";
  const days = PERIOD_DAYS[period] ?? 1;

  const since = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
  const q = [`created:>${since}`, lang ? `language:"${lang}"` : ""].filter(Boolean).join(" ");
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(
    q
  )}&sort=stars&order=desc&per_page=25`;

  const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  try {
    // 5分間はNext.jsのデータキャッシュに乗せて、GitHub側のレート制限の消費を抑える
    const res = await fetch(url, { headers, next: { revalidate: 300 } });
    if (res.status === 403 || res.status === 429) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
    if (!res.ok) {
      return NextResponse.json({ error: "github_error" }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json({ items: data.items ?? [] });
  } catch {
    return NextResponse.json({ error: "network_error" }, { status: 502 });
  }
}
