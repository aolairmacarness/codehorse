import { Octokit } from "octokit";
import prisma from "@/lib/db";
import { embedText } from "@/lib/openai";
import { getIndex } from "@/lib/pinecone";
import { getGithubTokenForUser } from "@/app/module/repositories/lib/github";
import { inngest } from "./client";

const CODE_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".py",
  ".md",
  ".json",
  ".css",
  ".html",
  ".java",
  ".cpp",
  ".c",
  ".h",
  ".hpp",
  ".cs",
  ".php",
  ".rb",
  ".go",
  ".rs",
  ".scala",
  ".kt",
  ".swift",
  ".dart",
  ".ex",
  ".exs",
  ".erl",
];

const SKIP_DIRS = ["node_modules", ".next", "dist", "build", ".git"];

function chunkText(text: string) {
  const chunkSize = 2000;
  const chunks = [];

  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }

  return chunks;
}

function shouldSkipPath(path: string) {
  return SKIP_DIRS.some(
    (dir) => path.startsWith(`${dir}/`) || path.includes(`/${dir}/`)
  );
}

export const indexRepository = inngest.createFunction(
  {
    id: "index-repository",
    triggers: { event: "repo/index" },
    onFailure: async ({ event }) => {
      const repoId = event.data.event.data.repoId as string;

      await prisma.repository.updateMany({
        where: { id: repoId },
        data: { indexStatus: "failed" },
      });
    },
  },
  async ({ event, step }) => {
    const { repoId, userId } = event.data as { repoId: string; userId: string };

    await step.run("mark-indexing", async () => {
      await prisma.repository.updateMany({
        where: { id: repoId, userId },
        data: { indexStatus: "indexing", indexedAt: null },
      });
    });

    const repo = await step.run("load-repository", async () => {
      return prisma.repository.findFirst({
        where: { id: repoId, userId },
        select: { fullName: true, name: true, owner: true, defaultBranch: true },
      });
    });

    if (!repo) {
      return { error: "Repository not found" };
    }

    const files = await step.run("fetch-files", async () => {
      const octokit = new Octokit({ auth: await getGithubTokenForUser(userId) });

      const { data: ref } = await octokit.rest.git.getRef({
        owner: repo.owner,
        repo: repo.name,
        ref: `heads/${repo.defaultBranch || "main"}`,
      });

      const { data: tree } = await octokit.rest.git.getTree({
        owner: repo.owner,
        repo: repo.name,
        tree_sha: ref.object.sha,
        recursive: "true",
      });

      return tree.tree
        .filter(
          (item) =>
            item.type === "blob" &&
            item.path &&
            !shouldSkipPath(item.path) &&
            CODE_EXTENSIONS.some((ext) => item.path!.endsWith(ext)) &&
            (item.size ?? 0) < 100_000
        )
        .map((item) => ({ path: item.path! }));
    });

    let indexedChunks = 0;
    const batchSize = 20;

    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);

      const chunksIndexed = await step.run(`index-batch-${i}`, async () => {
        const octokit = new Octokit({
          auth: await getGithubTokenForUser(userId),
        });

        const fileContents = await Promise.all(
          batch.map(async (file) => {
            const { data } = await octokit.rest.repos.getContent({
              owner: repo.owner,
              repo: repo.name,
              path: file.path,
            });

            if (Array.isArray(data) || data.type !== "file") {
              return null;
            }

            return {
              path: file.path,
              content: Buffer.from(data.content, "base64").toString("utf8"),
            };
          })
        );

        const allChunks: { path: string; chunk: string; chunkIndex: number }[] =
          [];

        for (const file of fileContents) {
          if (!file) continue;

          chunkText(file.content).forEach((chunk, chunkIndex) => {
            allChunks.push({ path: file.path, chunk, chunkIndex });
          });
        }

        if (allChunks.length === 0) {
          return 0;
        }

        const embeddings = await embedText(allChunks.map((item) => item.chunk));

        const records = allChunks.map((item, j) => ({
          id: `${repoId}-${item.path}-${item.chunkIndex}`,
          values: embeddings[j],
          metadata: {
            repositoryId: repoId,
            fullName: repo.fullName,
            path: item.path,
            chunk: item.chunkIndex,
            content: item.chunk.slice(0, 1000),
          },
        }));

        await getIndex().upsert({ records });

        return allChunks.length;
      });

      indexedChunks += chunksIndexed;
    }

    await step.run("mark-indexed", async () => {
      await prisma.repository.updateMany({
        where: { id: repoId, userId },
        data: {
          indexStatus: "indexed",
          indexedAt: new Date(),
          fileCount: files.length,
        },
      });
    });

    return {
      repoId,
      fullName: repo.fullName,
      files: files.length,
      chunks: indexedChunks,
    };
  }
);
