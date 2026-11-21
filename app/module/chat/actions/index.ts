"use server";

import prisma from "@/lib/db";
import { requireAuth } from "@/app/module/auth/action";

export type Citation = { path: string; chunk: number };

export type ChatMessageItem = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
};

export async function getChatMessages(repoId: string): Promise<ChatMessageItem[]> {
  const user = await requireAuth();

  const messages = await prisma.chatMessage.findMany({
    where: { userId: user.id, repositoryId: repoId },
    orderBy: { createdAt: "asc" },
  });

  return messages.map((msg) => ({
    id: msg.id,
    role: msg.role as ChatMessageItem["role"],
    content: msg.content,
    citations: Array.isArray(msg.citations)
      ? (msg.citations as Citation[])
      : undefined,
  }));
}
