import prisma from "@/lib/db";
import {
  toPullRequestData,
  verifyGithubSignature,
  type GithubPullRequest,
} from "@/app/module/pull-requests/lib/pull-request";

type PullRequestEvent = {
  action: string;
  number: number;
  pull_request: GithubPullRequest;
  repository: { id: number };
};

export async function POST(req: Request) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    return new Response("Webhook secret not configured", { status: 500 });
  }

  // The signature covers the exact bytes GitHub sent, so read the raw text.
  const rawBody = await req.text();
  if (
    !verifyGithubSignature(
      rawBody,
      req.headers.get("x-hub-signature-256"),
      secret,
    )
  ) {
    return new Response("Invalid signature", { status: 401 });
  }

  const event = req.headers.get("x-github-event");
  if (event === "ping") {
    return Response.json({ ok: true });
  }
  if (event !== "pull_request") {
    return Response.json({ ignored: event });
  }

  let payload: PullRequestEvent;
  try {
    payload = JSON.parse(rawBody) as PullRequestEvent;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // The same GitHub repo can be synced by several users; update each copy.
  const repos = await prisma.repository.findMany({
    where: { githubId: BigInt(payload.repository.id) },
    select: { id: true },
  });

  const data = toPullRequestData(payload.pull_request);

  await prisma.$transaction(
    repos.map((repo) =>
      prisma.pullRequest.upsert({
        where: {
          repositoryId_number: {
            repositoryId: repo.id,
            number: payload.pull_request.number,
          },
        },
        create: {
          repositoryId: repo.id,
          number: payload.pull_request.number,
          ...data,
        },
        update: data,
      }),
    ),
  );

  return Response.json({ ok: true, updated: repos.length });
}
