import { Octokit } from "octokit";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { headers } from "next/headers";

/** GitHub token for the signed-in user (request context only). */
export async function getGithubToken() {
    const accounts = await auth.api.listUserAccounts({
        headers: await headers(),
    });

    const githubAccount = accounts.find(
        (account) => account.providerId === "github"
    );

    if (!githubAccount) {
        throw new Error("No GitHub account linked");
    }

    const { accessToken } = await auth.api.getAccessToken({
        body: { accountId: githubAccount.id },
        headers: await headers(),
    });

    return accessToken;
}

/**
 * GitHub token for a user outside a request (e.g. in an Inngest job), so the
 * token never has to travel in event payloads.
 */
export async function getGithubTokenForUser(userId: string) {
    const githubAccount = await prisma.account.findFirst({
        where: { userId, providerId: "github" },
        select: { id: true },
    });

    if (!githubAccount) {
        throw new Error("No GitHub account linked");
    }

    const { accessToken } = await auth.api.getAccessToken({
        body: { accountId: githubAccount.id, userId },
    });

    return accessToken;
}

export async function fetchUserRepos(token: string , page:number) {
    const octokit = new Octokit({ auth: token });

    const { data } = await octokit.rest.repos.listForAuthenticatedUser({
        per_page: 100,
        page,
        sort:"updated"
    });

    return data;
}
