"use server";

import { Octokit } from "octokit";
import prisma from "@/lib/db";
import { requireAuth } from "@/app/module/auth/action";
import { inngest } from "@/app/module/indexing/inngest/client";
import { getGithubToken } from "@/app/module/repositories/lib/github";
import { toPullRequestData } from "@/app/module/pull-requests/lib/pull-request";

export async function getOpenPullRequests() {
  const user = await requireAuth();

  const prs = await prisma.pullRequest.findMany({
    where: { state: "open", repository: { userId: user.id } },
    include: { repository: { select: { fullName: true } } },
    orderBy: { updatedAtGh: "desc" },
  });

  return prs.map((pr) => ({
    id: pr.id,
    number: pr.number,
    title: pr.title,
    htmlUrl: pr.htmlUrl,
    authorLogin: pr.authorLogin,
    draft: pr.draft,
    repoFullName: pr.repository.fullName,
    updatedAt: pr.updatedAtGh.toISOString(),
  }));
}

export async function requestPullRequestReview(pullRequestId: string) {
  const user = await requireAuth();

  const pr = await prisma.pullRequest.findFirst({
    where: { id: pullRequestId, repository: { userId: user.id } },
    select: { id: true, repositoryId: true },
  });
  if (!pr) {
    throw new Error("Pull request not found");
  }

  // Token stays out of the event. The job loads it from userId.
  await inngest.send({
    name: "pr.review.request",
    data: {
      pullRequestId: pr.id,
      repositoryId: pr.repositoryId,
      userId: user.id,
    },
  });
}

function webhookUrl() {
  return `${process.env.BETTER_AUTH_URL}/api/webhooks/github`;
}

function isPublicUrl(url: string) {
  const { hostname } = new URL(url);
  return hostname !== "localhost" && hostname !== "127.0.0.1";
}

async function ensureWebhook(
  octokit: Octokit,
  repo: { owner: string; name: string },
  secret: string,
) {
  const url = webhookUrl();
  const { data: hooks } = await octokit.rest.repos.listWebhooks({
    owner: repo.owner,
    repo: repo.name,
    per_page: 100,
  });

  const existing = hooks.find((hook) => hook.config.url === url);
  if (existing) return existing.id;

  const { data } = await octokit.rest.repos.createWebhook({
    owner: repo.owner,
    repo: repo.name,
    events: ["pull_request"],
    config: { url, content_type: "json", secret },
  });
  return data.id;
}

/**
 * Pulls the current open PRs for the user's repos and registers the
 * `pull_request` webhook on each so later changes arrive live.
 */
export async function syncPullRequests() {
  const user = await requireAuth();
  const token = await getGithubToken();
  const octokit = new Octokit({ auth: token });

  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  const canRegisterHooks =
    Boolean(secret) && isPublicUrl(webhookUrl());

  const repos = await prisma.repository.findMany({
    where: { userId: user.id },
    select: { id: true, owner: true, name: true, webhookId: true },
  });

  let synced = 0;
  let hooksRegistered = 0;
  const failed: string[] = [];

  // Small batches keep us well inside GitHub's secondary rate limits.
  for (let i = 0; i < repos.length; i += 5) {
    await Promise.all(
      repos.slice(i, i + 5).map(async (repo) => {
        try {
          const prs = await octokit.paginate(octokit.rest.pulls.list, {
            owner: repo.owner,
            repo: repo.name,
            state: "open",
            per_page: 100,
          });

          const openNumbers = prs.map((pr) => pr.number);

          await prisma.$transaction([
            // Anything we still have as open but GitHub no longer lists is stale.
            prisma.pullRequest.updateMany({
              where: {
                repositoryId: repo.id,
                state: "open",
                number: { notIn: openNumbers },
              },
              data: { state: "closed" },
            }),
            ...prs.map((pr) => {
              const data = toPullRequestData(pr);
              return prisma.pullRequest.upsert({
                where: {
                  repositoryId_number: {
                    repositoryId: repo.id,
                    number: pr.number,
                  },
                },
                create: { repositoryId: repo.id, number: pr.number, ...data },
                update: data,
              });
            }),
          ]);
          synced += prs.length;
        } catch {
          failed.push(`${repo.owner}/${repo.name}`);
          return;
        }

        if (canRegisterHooks && !repo.webhookId) {
          try {
            const hookId = await ensureWebhook(octokit, repo, secret!);
            await prisma.repository.update({
              where: { id: repo.id },
              data: { webhookId: BigInt(hookId) },
            });
            hooksRegistered++;
          } catch {
            // Needs admin rights on the repo; PR listing still works without it.
          }
        }
      }),
    );
  }

  return { synced, hooksRegistered, failed, canRegisterHooks };
}
