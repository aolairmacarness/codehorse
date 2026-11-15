"use server";

import { revalidatePath } from "next/cache";
import connectDB, { isValidObjectId } from "@/lib/db";
import Repository from "@/schemas/Repository";
import { requireAuth } from "@/modules/auth/actions";
import { fetchUserRepos, getGithubToken } from "@/modules/repositories/lib/github";
import { inngest } from "@/modules/indexing/inngest/client";

const PAGE_SIZE = 20;


function toRepoItem(repo: {
    _id: unknown;
    githubId: number;
    fullName: string;
    description?: string;
    private?: boolean;
    indexStatus?: string;
}) {
    return {
        id: String(repo._id),
        githubId: repo.githubId,
        fullName: repo.fullName,
        description: repo.description ?? "",
        private: repo.private ?? false,
        indexStatus: repo.indexStatus ?? "idle",
    };
}

export async function syncGithubPage(page: number) {
    const user = await requireAuth();
    await connectDB();

    const token = await getGithubToken();
    const githubRepos = await fetchUserRepos(token, page);

    const uniqueGithubRepos = [
        ...new Map(githubRepos.map((repo) => [repo.id, repo])).values(),
    ];

    for (const repo of uniqueGithubRepos) {
        await Repository.findOneAndUpdate(
            { userId: user.id, githubId: repo.id },
            {
                userId: user.id,
                githubId: repo.id,
                fullName: repo.full_name,
                name: repo.name,
                owner: repo.owner.login,
                description: repo.description ?? "",
                defaultBranch: repo.default_branch,
                private: repo.private,
                pineconeNamespace: `repo_${repo.id}`,
            },
            { upsert: true, new: true }
        );
    }

    const savedRepos = await Repository.find({
        userId: user.id,
        githubId: { $in: uniqueGithubRepos.map((repo) => repo.id) },
    })
        .sort({ fullName: 1 })
        .lean();

    return {
        repos: savedRepos.map(toRepoItem),
        hasMore: githubRepos.length === 100,
    };
}

export async function getRepositoriesPage(page: number) {
    const user = await requireAuth();
    await connectDB();

    const repos = await Repository.find({ userId: user.id })
        .sort({ fullName: 1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .lean();

    const total = await Repository.countDocuments({ userId: user.id });

    return {
        repos: repos.map(toRepoItem),
        hasMore: page * PAGE_SIZE < total,
    };
}

export async function getRepositories() {
    const user = await requireAuth();
    await connectDB();

    return Repository.find({ userId: user.id })
        .sort({ fullName: 1 })
        .lean();
}

export async function getRepository(repoId: string) {
    if (!isValidObjectId(repoId)) {
        return null;
    }

    const user = await requireAuth();
    await connectDB();

    return Repository.findOne({ _id: repoId, userId: user.id }).lean();
}


export async function startIndexing(repoId:string){
    if (!isValidObjectId(repoId)) {
        throw new Error("Repository not found");
    }

    const user = await requireAuth();
    await connectDB();

    const repo = await Repository.findOne({ _id: repoId, userId: user.id }).lean();
    if(!repo){
        throw new Error("Repository not found");
    }

    const githubToken = await getGithubToken();

    await inngest.send({
        name: "repo/index",
        data: {
            repoId:String(repo._id),
            userId: user.id,
            githubToken,
        },
    });
}