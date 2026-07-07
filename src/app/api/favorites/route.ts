import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Repo } from "@/types";

function toRepo(f: {
  fullName: string; name: string; owner: string; htmlUrl: string;
  description: string | null; language: string | null; stars: number;
  forks: number; repoCreatedAt: Date | null; topics: string[];
}): Repo {
  return {
    full_name: f.fullName,
    name: f.name,
    html_url: f.htmlUrl,
    owner: { login: f.owner },
    description: f.description,
    language: f.language,
    stargazers_count: f.stars,
    forks_count: f.forks,
    created_at: f.repoCreatedAt ? f.repoCreatedAt.toISOString() : "",
    topics: f.topics,
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ items: [] });
  const favorites = await prisma.favorite.findMany({
    where: { userId: session.user.id },
    orderBy: { stars: "desc" },
  });
  return NextResponse.json({ items: favorites.map(toRepo) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const repo: Repo = await req.json();
  if (!repo?.full_name) return NextResponse.json({ error: "invalid" }, { status: 400 });

  await prisma.favorite.upsert({
    where: { userId_fullName: { userId: session.user.id, fullName: repo.full_name } },
    update: {
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      description: repo.description,
      language: repo.language,
    },
    create: {
      userId: session.user.id,
      fullName: repo.full_name,
      name: repo.name,
      owner: repo.owner?.login ?? "",
      htmlUrl: repo.html_url,
      description: repo.description,
      language: repo.language,
      stars: repo.stargazers_count ?? 0,
      forks: repo.forks_count ?? 0,
      repoCreatedAt: repo.created_at ? new Date(repo.created_at) : null,
      topics: repo.topics ?? [],
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { fullName } = await req.json();
  if (!fullName) return NextResponse.json({ error: "invalid" }, { status: 400 });
  await prisma.favorite.deleteMany({ where: { userId: session.user.id, fullName } });
  return NextResponse.json({ ok: true });
}
