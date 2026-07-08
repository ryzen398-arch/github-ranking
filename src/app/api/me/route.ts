import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripeEnabled } from "@/lib/stripe";

// 現在のログイン状態・Pro購読状態をまとめて返す。
// フロントはログイン直後と決済完了後にこれを叩いて表示を更新する。
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ authenticated: false, stripeEnabled });
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  const pro =
    !stripeEnabled ||
    user?.subscriptionStatus === "active" ||
    user?.subscriptionStatus === "trialing";
  return NextResponse.json({
    authenticated: true,
    username: user?.username,
    pro,
    stripeEnabled,
  });
}
