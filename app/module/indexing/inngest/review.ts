import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import prisma from "@/lib/db";
import { embedText } from "@/lib/openai";
import { getIndex } from "@/lib/pinecone";
import {
  getPullRequest,
  postPullRequestComment,
} from "@/app/module/github/lib/github";
import { getGithubTokenForUser } from "@/app/module/repositories/lib/github";
import { inngest } from "./client";

// Keep the prompt bounded; very large diffs are truncated.
const MAX_DIFF_CHARS = 60_000;

export const review = inngest.createFunction(
  {
    id: "generate-review",
    concurrency: 5,
    triggers: { event: "pr.review.request" },
  },
  async ({ event, step }) => {
    const { pullRequestId, userId } = event.data as {
      pullRequestId: string;
      repositoryId: string;
      userId: string;
    };

    const pr = await step.run("load-pull-request", async () => {
      return prisma.pullRequest.findFirst({
        where: { id: pullRequestId, repository: { userId } },
        select: {
          number: true,
          repositoryId: true,
          repository: { select: { owner: true, name: true } },
        },
      });
    });

    if (!pr) {
      return { error: "Pull request not found" };
    }

    // The token is resolved inside the step and never returned, since Inngest
    // persists step output.
    const { diff, title, description } = await step.run(
      "fetch-pull-request",
      async () => {
        const token = await getGithubTokenForUser(userId);
        const { pr: data, diff, title } = await getPullRequest(
          token,
          pr.repository.owner,
          pr.repository.name,
          pr.number,
        );

        return { diff, title, description: data.body ?? "" };
      },
    );

    const context = await step.run("retrieve-context", async () => {
      const [embedding] = await embedText([
        `${title}\n${description}\n${diff.slice(0, 2000)}`,
      ]);

      const results = await getIndex().query({
        vector: embedding,
        topK: 8,
        includeMetadata: true,
        filter: { repositoryId: pr.repositoryId },
      });

      return results.matches
        .map(
          (match) =>
            `[${match.metadata?.path}]\n${match.metadata?.content ?? ""}`,
        )
        .join("\n\n");
    });

    const text = await step.run("generate-ai-review", async () => {
      const result = await generateText({
        model: google("gemini-2.5-flash"),
        prompt: `You are a senior engineer reviewing a pull request. Point out bugs, risky changes and missing edge cases, citing file paths. Be concise.

Title: ${title}

Description:
${description || "(none)"}

Relevant code from the repository:
${context || "(none indexed)"}

Diff:
${diff.slice(0, MAX_DIFF_CHARS)}`,
      });

      return result.text;
    });

    const body = `## AI Review\n\n${text}`;

    // Token stays inside the step; Inngest persists step output.
    const comment = await step.run("post-comment", async () => {
      const token = await getGithubTokenForUser(userId);
      return postPullRequestComment(
        token,
        pr.repository.owner,
        pr.repository.name,
        pr.number,
        body,
      );
    });

    await step.run("save-comment", async () => {
      const row = await prisma.comment.upsert({
        where: {
          pullRequestId_githubId: {
            pullRequestId,
            githubId: BigInt(comment.id),
          },
        },
        create: {
          pullRequestId,
          githubId: BigInt(comment.id),
          htmlUrl: comment.htmlUrl,
          body,
        },
        update: { htmlUrl: comment.htmlUrl, body },
        select: { id: true },
      });

      return row;
    });

    return { pullRequestId, review: text, commentUrl: comment.htmlUrl };
  },
);
