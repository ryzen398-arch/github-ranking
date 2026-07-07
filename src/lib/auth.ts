import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    // カスタムのログインモーダルを使うため専用ページは持たない
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "ユーザー名", type: "text" },
        password: { label: "パスワード", type: "password" },
      },
      // 未登録のユーザー名なら新規登録、登録済みならパスワード照合という
      // ログイン/新規登録を1つのフォームに統合したUXをここで実装している。
      // 失敗理由(ユーザー名不正/パスワード不一致/新規登録時の短すぎるパスワード)は
      // セキュリティ上まとめて null を返し、クライアント側では汎用エラーのみ表示する。
      async authorize(credentials) {
        const username = credentials?.username?.trim() ?? "";
        const password = credentials?.password ?? "";
        if (!username || !password) return null;
        if (!/^[\w.-]{1,24}$/.test(username)) return null;

        const existing = await prisma.user.findUnique({ where: { username } });

        if (!existing) {
          if (password.length < 4) return null;
          const passwordHash = await bcrypt.hash(password, 10);
          const created = await prisma.user.create({ data: { username, passwordHash } });
          return { id: created.id, name: created.username };
        }

        const valid = await bcrypt.compare(password, existing.passwordHash);
        if (!valid) return null;
        return { id: existing.id, name: existing.username };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
};
