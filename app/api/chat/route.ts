import { ChatOpenAI } from "@langchain/openai";
import { headers } from "next/headers";
import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import { embedText } from "@/lib/openai";
import { getIndex } from "@/lib/pinecone";
import { buildChatMessages } from "@/app/module/chat/lib/prompt";
import type { Citation } from "@/app/module/chat/actions";

function getCitations(matches: { metadata?: Record<string, unknown> }[]) {
  const citations: Citation[] = [];
  const seen = new Set<string>();

  for (const match of matches) {
    const path = match.metadata?.path as string | undefined;
    if (!path || seen.has(path)) continue;

    seen.add(path);
    citations.push({
      path,
      chunk: Number(match.metadata?.chunk ?? 0),
    });
  }

  return citations;
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    repoId?: unknown;
    message?: unknown;
  } | null;
  const repoId = typeof body?.repoId === "string" ? body.repoId : "";
  const message =
    typeof body?.message === "string" ? body.message.trim() : "";

  if (!repoId || !message) {
    return new Response("repoId and message are required", { status: 400 });
  }

  const userId = session.user.id;

  const repo = await prisma.repository.findFirst({
    where: { id: repoId, userId },
    select: { fullName: true, indexStatus: true },
  });

  if (!repo || repo.indexStatus !== "indexed") {
    return new Response("Repo not indexed", { status: 400 });
  }

  await prisma.chatMessage.create({
    data: { userId, repositoryId: repoId, role: "user", content: message },
  });

  const [queryEmbedding] = await embedText([message]);

  const results = await getIndex().query({
    vector: queryEmbedding,
    topK: 8,
    includeMetadata: true,
    filter: { repositoryId: repoId },
  });

  const citations = getCitations(results.matches);

  const context = results.matches
    .map(
      (match) => `[${match.metadata?.path}]\n${match.metadata?.content ?? ""}`
    )
    .join("\n\n");

  const model = new ChatOpenAI({
    model: "gpt-4o-mini",
    streaming: true,
    temperature: 0.2,
  });

  const llmMessages = buildChatMessages({
    repoName: repo.fullName,
    context,
    question: message,
  });

  const stream = await model.stream(llmMessages);
  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream({
      async start(controller) {
        let reply = "";

        try {
          for await (const chunk of stream) {
            if (typeof chunk.content === "string" && chunk.content) {
              reply += chunk.content;
              controller.enqueue(encoder.encode(chunk.content));
            }
          }

          await prisma.chatMessage.create({
            data: {
              userId,
              repositoryId: repoId,
              role: "assistant",
              content: reply,
              citations,
            },
          });

          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    }),
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Citations": JSON.stringify(citations),
      },
    }
  );
}
