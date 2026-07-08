import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripeEnabled } from "@/lib/stripe";
import type { Repo } from "@/types";

function buildPrompt(repo: Repo) {
  return `以下のGitHubリポジトリについて、日本語で3〜4文の解説を書いてください。「何をするツール/ライブラリか」「どんな人・用途に向くか」「注目されている理由の推測」を含めてください。前置きや見出しは不要で、本文のみを返してください。

リポジトリ名: ${repo.full_name}
説明: ${repo.description || "(説明なし)"}
主要言語: ${repo.language || "不明"}
トピック: ${(repo.topics || []).join(", ") || "なし"}
スター数: ${repo.stargazers_count} / フォーク数: ${repo.forks_count}
作成日: ${(repo.created_at || "").slice(0, 10)}`;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (stripeEnabled) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    const active = user?.subscriptionStatus === "active" || user?.subscriptionStatus === "trialing";
    if (!active) return NextResponse.json({ error: "subscription_required" }, { status: 402 });
  }

  const { repo }: { repo: Repo } = await req.json();
  if (!repo?.full_name) return NextResponse.json({ error: "invalid" }, { status: 400 });

  // リポジトリ単位でキャッシュ (全ユーザー共有)。同じリポジトリへの再課金は発生しない
  const cached = await prisma.explanation.findUnique({ where: { fullName: repo.full_name } });
  if (cached) return NextResponse.json({ text: cached.text });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ai_not_configured" }, { status: 500 });
  }

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{ role: "user", content: buildPrompt(repo) }],
      }),
    });
    const data = await r.json();
    const text = (data.content ?? [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("\n")
      .trim();
    if (!r.ok || !text) {
      return NextResponse.json({ error: data?.error?.message || "upstream_error" }, { status: 502 });
    }
    await prisma.explanation.upsert({
      where: { fullName: repo.full_name },
      update: { text },
      create: { fullName: repo.full_name, text },
    });
    return NextResponse.json({ text });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
