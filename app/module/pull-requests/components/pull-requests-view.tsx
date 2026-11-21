"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GitPullRequest } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  getOpenPullRequests,
  requestPullRequestReview,
  syncPullRequests,
} from "@/app/module/pull-requests/actions";

type PullRequestItem = Awaited<ReturnType<typeof getOpenPullRequests>>[number];

export function PullRequestsView({
  pullRequests,
}: {
  pullRequests: PullRequestItem[];
}) {
  const router = useRouter();
  const [syncing, startSync] = useTransition();
  const [reviewing, startReview] = useTransition();
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function sync() {
    startSync(async () => {
      try {
        const result = await syncPullRequests();
        const parts = [`${result.synced} open PRs synced`];
        if (result.hooksRegistered > 0) {
          parts.push(`live updates enabled on ${result.hooksRegistered} repos`);
        }
        if (!result.canRegisterHooks) {
          parts.push(
            "live updates skipped (set GITHUB_WEBHOOK_SECRET and a public BETTER_AUTH_URL)",
          );
        }
        if (result.failed.length > 0) {
          parts.push(`${result.failed.length} repos failed`);
        }
        setMessage(parts.join(" · "));
        router.refresh();
      } catch {
        setMessage("Sync failed. Try again.");
      }
    });
  }

  function review(pullRequestId: string) {
    setReviewingId(pullRequestId);
    startReview(async () => {
      try {
        await requestPullRequestReview(pullRequestId);
        setMessage("Review requested");
      } catch {
        setMessage("Could not request a review.");
      } finally {
        setReviewingId(null);
      }
    });
  }

  return (
    <main className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Pull requests"
        description="Open pull requests across your repositories, kept live by GitHub webhooks."
        action={
          <Button onClick={sync} disabled={syncing}>
            {syncing ? "Syncing..." : "Sync pull requests"}
          </Button>
        }
      />

      {message && <p className="text-sm text-muted-foreground">{message}</p>}

      {pullRequests.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <GitPullRequest />
            </EmptyMedia>
            <EmptyTitle>No open pull requests</EmptyTitle>
            <EmptyDescription>
              Sync your repositories first, then click sync to fetch PRs.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {pullRequests.map((pr) => (
            <Card key={pr.id} size="sm">
              <CardHeader>
                <CardTitle>
                  <a
                    href={pr.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline"
                  >
                    {pr.title}
                  </a>
                </CardTitle>
                <CardDescription>
                  {pr.repoFullName} #{pr.number} · by {pr.authorLogin}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                <Badge variant="outline">open</Badge>
                {pr.draft && <Badge variant="secondary">Draft</Badge>}
                <Button
                  size="sm"
                  className="ml-auto"
                  disabled={reviewing}
                  onClick={() => review(pr.id)}
                >
                  {reviewingId === pr.id ? "Requesting..." : "Review"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
