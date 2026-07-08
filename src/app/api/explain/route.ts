import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripeEnabled } from "@/lib/stripe";
import { isAdminUser } from "@/lib/admin";
import type { Repo } from "@/types";

// 解説生成ロジックの世代。プロンプトを大きく変えたらここを上げると、
// 旧世代のキャッシュは次回アクセス時に自動で作り直される。
// v2: READMEの内容をプロンプトに含めるようになった
const EXPLAIN_VERSION = 2;

// READMEをプロンプトに含める際の最大文字数。
// 長大なREADMEを丸ごと送るとトークン費用と応答時間が跳ね上がるため、
// 冒頭部分(概要・特徴・使い方が書かれていることが多い)だけを使う。
const README_MAX_CHARS = 8000;

// GitHubからREADMEの生テキストを取得する。
// 見つからない・失敗した場合はnullを返し、従来どおりメタデータのみで解説する。
async function fetchReadme(fullName: string): Promise<string | null> {
  if (!/^[\w.-]+\/[\w.-]+$/.test(fullName)) return null;
  const headers: Record<string, string> = {
    // rawメディアタイプを指定すると、base64ではなくMarkdown本文がそのまま返る
    Accept: "application/vnd.github.raw+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  try {
    const res = await fetch(`https://api.github.com/repos/${fullName}/readme`, {
      headers,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (!text.trim()) return null;
    return text.length > README_MAX_CHARS
      ? text.slice(0, README_MAX_CHARS) + "\n\n...(以下省略)"
      : text;
  } catch {
    return null;
  }
}

function buildPrompt(repo: Repo, readme: string | null) {
  const base = `以下のGitHubリポジトリについて、日本語で4〜5文の解説を書いてください。「何をするツール/ライブラリか」「主な特徴や仕組み」「どんな人・用途に向くか」を含めてください。READMEが提供されている場合はその内容を最優先の根拠とし、READMEに書かれていないことを推測で断定しないでください。前置きや見出しは不要で、本文のみを返してください。

リポジトリ名: ${repo.full_name}
説明: ${repo.description || "(説明なし)"}
主要言語: ${repo.language || "不明"}
トピック: ${(repo.topics || []).join(", ") || "なし"}
スター数: ${repo.stargazers_count} / フォーク数: ${repo.forks_count}
作成日: ${(repo.created_at || "").slice(0, 10)}`;

  if (!readme) return base + "\n\nREADME: (取得できませんでした。上記のメタデータのみから、推測であることが分かる書き方で解説してください)";
  return base + `\n\nREADME(冒頭抜粋):\n"""\n${readme}\n"""`;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (stripeEnabled) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    const active =
      isAdminUser(user?.username) ||
      user?.subscriptionStatus === "active" ||
      user?.subscriptionStatus === "trialing";
    if (!active) return NextResponse.json({ error: "subscription_required" }, { status: 402 });
  }

  const { repo }: { repo: Repo } = await req.json();
  if (!repo?.full_name) return NextResponse.json({ error: "invalid" }, { status: 400 });

  // リポジトリ単位でキャッシュ (全ユーザー共有)。同じリポジトリへの再課金は発生しない。
  // 旧世代(README非対応時代)のキャッシュはヒットさせず、作り直す。
  const cached = await prisma.explanation.findUnique({ where: { fullName: repo.full_name } });
  if (cached && cached.version >= EXPLAIN_VERSION) {
    return NextResponse.json({ text: cached.text });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ai_not_configured" }, { status: 500 });
  }

  const readme = await fetchReadme(repo.full_name);

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
        messages: [{ role: "user", content: buildPrompt(repo, readme) }],
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
      update: { text, version: EXPLAIN_VERSION },
      create: { fullName: repo.full_name, text, version: EXPLAIN_VERSION },
    });
    return NextResponse.json({ text });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
