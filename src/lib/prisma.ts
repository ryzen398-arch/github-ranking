import { PrismaClient } from "@prisma/client";

// Next.jsの開発モードでのホットリロード時にPrismaClientが
// 何個も生成されるのを防ぐためのシングルトンパターン
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
