import { createHmac, timingSafeEqual } from "node:crypto";

/** The subset of GitHub's PR object (REST and webhook payloads share it). */
export type GithubPullRequest = {
  id: number;
  number: number;
  title: string;
  html_url: string;
  state: string;
  draft?: boolean;
  merged?: boolean;
  merged_at?: string | null;
  created_at: string;
  updated_at: string;
  user: { login: string; avatar_url?: string } | null;
};

export function toPullRequestData(pr: GithubPullRequest) {
  return {
    githubId: BigInt(pr.id),
    title: pr.title,
    htmlUrl: pr.html_url,
    authorLogin: pr.user?.login ?? "ghost",
    authorAvatar: pr.user?.avatar_url ?? null,
    state: pr.state === "open" ? "open" : "closed",
    draft: pr.draft ?? false,
    merged: pr.merged ?? Boolean(pr.merged_at),
    openedAt: new Date(pr.created_at),
    updatedAtGh: new Date(pr.updated_at),
  };
}

/** Verifies GitHub's `X-Hub-Signature-256` header against the raw body. */
export function verifyGithubSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
) {
  if (!signatureHeader?.startsWith("sha256=")) return false;

  const expected = Buffer.from(
    createHmac("sha256", secret).update(rawBody).digest("hex"),
  );
  const received = Buffer.from(signatureHeader.slice("sha256=".length));

  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}
