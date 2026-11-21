import { Octokit } from "octokit";

/** One pull request plus its raw diff. */
export async function getPullRequest(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
) {
  const octokit = new Octokit({ auth: token });

  const { data: pr } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
  });

  // mediaType diff makes this the same pulls.get route, but the body is the
  // unified diff string rather than the pull request JSON.
  const { data: diff } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
    mediaType: { format: "diff" },
  });

  return {
    pr,
    diff: diff as unknown as string,
    title: pr.title,
  };
}

/** Posts a comment on a pull request (issues API — PRs are issues). */
export async function postPullRequestComment(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
  body: string,
) {
  const octokit = new Octokit({ auth: token });

  const { data } = await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: prNumber,
    // GitHub caps issue comment bodies at 65536 chars.
    body: body.slice(0, 65_536),
  });

  return { id: data.id, htmlUrl: data.html_url };
}
