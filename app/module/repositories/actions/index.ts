"use server";

import prisma from "@/lib/db";
import type { Repository } from "@/app/generated/prisma/client";
import { requireAuth } from "@/app/module/auth/action";
import { fetchUserRepos, getGithubToken } from "@/app/module/repositories/lib/github";
import { inngest } from "@/app/module/indexing/inngest/client";

const PAGE_SIZE = 20;

export type IndexStatus = "idle" | "indexing" | "indexed" | "failed";

function toRepoItem(repo: Repository) {
    return {
        id: repo.id,
        githubId: Number(repo.githubId),
        fullName: repo.fullName,
        description: repo.description,
        private: repo.private,
        indexStatus: repo.indexStatus as IndexStatus,
    };
}

// BigInt isn't JSON-serializable, so expose githubId as a number.
function toRepoDetail(repo: Repository) {
    return {
        ...repo,
        githubId: Number(repo.githubId),
        indexStatus: repo.indexStatus as IndexStatus,
    };
}

export async function syncGithubPage(page: number) {
    const user = await requireAuth();

    const token = await getGithubToken();
    const githubRepos = await fetchUserRepos(token, page);

    const uniqueGithubRepos = [
        ...new Map(githubRepos.map((repo) => [repo.id, repo])).values(),
    ];

    await prisma.$transaction(
        uniqueGithubRepos.map((repo) => {
            const data = {
                fullName: repo.full_name,
                name: repo.name,
                owner: repo.owner.login,
                description: repo.description ?? "",
                defaultBranch: repo.default_branch,
                private: repo.private,
                pineconeNamespace: `repo_${repo.id}`,
            };

            return prisma.repository.upsert({
                where: {
                    userId_githubId: { userId: user.id, githubId: BigInt(repo.id) },
                },
                create: { userId: user.id, githubId: BigInt(repo.id), ...data },
                update: data,
            });
        })
    );

    const savedRepos = await prisma.repository.findMany({
        where: {
            userId: user.id,
            githubId: { in: uniqueGithubRepos.map((repo) => BigInt(repo.id)) },
        },
        orderBy: { fullName: "asc" },
    });

    return {
        repos: savedRepos.map(toRepoItem),
        hasMore: githubRepos.length === 100,
    };
}

export async function getRepositoriesPage(page: number) {
    const user = await requireAuth();

    const [repos, total] = await Promise.all([
        prisma.repository.findMany({
            where: { userId: user.id },
            orderBy: { fullName: "asc" },
            skip: (page - 1) * PAGE_SIZE,
            take: PAGE_SIZE,
        }),
        prisma.repository.count({ where: { userId: user.id } }),
    ]);

    return {
        repos: repos.map(toRepoItem),
        hasMore: page * PAGE_SIZE < total,
    };
}

export async function getRepositories() {
    const user = await requireAuth();

    const repos = await prisma.repository.findMany({
        where: { userId: user.id },
        orderBy: { fullName: "asc" },
    });

    return repos.map(toRepoDetail);
}

export async function getRepository(repoId: string) {
    const user = await requireAuth();

    const repo = await prisma.repository.findFirst({
        where: { id: repoId, userId: user.id },
    });

    return repo ? toRepoDetail(repo) : null;
}

export async function startIndexing(repoId: string) {
    const user = await requireAuth();

    const repo = await prisma.repository.findFirst({
        where: { id: repoId, userId: user.id },
        select: { id: true },
    });
    if (!repo) {
        throw new Error("Repository not found");
    }

    // The GitHub token is resolved inside the job from userId, so it never
    // ends up in Inngest's stored event payloads.
    await inngest.send({
        name: "repo/index",
        data: {
            repoId: repo.id,
            userId: user.id,
        },
    });
}
