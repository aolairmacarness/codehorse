import { Octokit } from "@octokit/rest";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function getGithubToken() {


    const accounts = await auth.api.listUserAccounts({
        headers: await headers(),
    });

    const githubAccount = accounts.find(
        (account) => account.providerId === "github"
    );

    const { accessToken } = await auth.api.getAccessToken({
        body: { accountId: githubAccount!.id },
        headers: await headers(),
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