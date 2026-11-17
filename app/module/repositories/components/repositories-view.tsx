"use client";

import Link from "next/link";
import { IndexRepoButton } from "@/app/module/repositories/components/index-repo-button";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { InfiniteData } from "@tanstack/react-query";
import {
  useGithubSync,
  useRepositories,
} from "@/app/module/repositories/hooks/use-repositories";
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
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Search } from "lucide-react";
import { GitHubIcon } from "@/app/module/auth/components/github-icon";
import { getRepositoriesPage } from "@/app/module/repositories/actions";

type ReposPage = Awaited<ReturnType<typeof getRepositoriesPage>>;
type RepoItem = ReposPage["repos"][number];

type IndexStatusFilter = "all" | "idle" | "indexing" | "indexed" | "failed";
type VisibilityFilter = "all" | "public" | "private";

const selectClassName =
  "h-8 rounded-lg border border-input bg-background px-2.5 text-sm";

function filterRepos(
  repos: RepoItem[],
  {
    query,
    indexStatus,
    visibility,
  }: {
    query: string;
    indexStatus: IndexStatusFilter;
    visibility: VisibilityFilter;
  },
) {
  const normalizedQuery = query.trim().toLowerCase();

  return repos.filter((repo) => {
    if (indexStatus !== "all" && repo.indexStatus !== indexStatus) {
      return false;
    }

    if (visibility === "public" && repo.private) {
      return false;
    }

    if (visibility === "private" && !repo.private) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return (
      repo.fullName.toLowerCase().includes(normalizedQuery) ||
      repo.description.toLowerCase().includes(normalizedQuery)
    );
  });
}

export function RepositoriesView({
  initialRepos,
  initialHasMore,
}: {
  initialRepos: ReposPage["repos"];
  initialHasMore: boolean;
}) {
  const initialData: InfiniteData<ReposPage, number> = {
    pages: [{ repos: initialRepos, hasMore: initialHasMore }],
    pageParams: [1],
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [indexStatusFilter, setIndexStatusFilter] =
    useState<IndexStatusFilter>("all");
  const [visibilityFilter, setVisibilityFilter] =
    useState<VisibilityFilter>("all");

  const reposQuery = useRepositories(initialData);
  const { syncing, githubSync, startSync } = useGithubSync();
  const sentinelRef = useRef<HTMLDivElement>(null);

  const repos = Array.from(
    new Map(
      (reposQuery.data?.pages.flatMap((page) => page.repos) ?? []).map(
        (repo) => [repo.githubId, repo],
      ),
    ).values(),
  );

  const filtersActive =
    searchQuery.trim().length > 0 ||
    indexStatusFilter !== "all" ||
    visibilityFilter !== "all";

  const filteredRepos = useMemo(
    () =>
      filterRepos(repos, {
        query: searchQuery,
        indexStatus: indexStatusFilter,
        visibility: visibilityFilter,
      }),
    [repos, searchQuery, indexStatusFilter, visibilityFilter],
  );

  const loading =
    reposQuery.isFetchingNextPage ||
    githubSync.isFetching ||
    githubSync.isFetchingNextPage;

  const loadMore = useCallback(() => {
    if (loading) return;

    if (syncing && githubSync.hasNextPage) {
      void githubSync.fetchNextPage();
      return;
    }

    if (!syncing && reposQuery.hasNextPage) {
      void reposQuery.fetchNextPage();
    }
  }, [loading, syncing, githubSync, reposQuery]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

  function clearFilters() {
    setSearchQuery("");
    setIndexStatusFilter("all");
    setVisibilityFilter("all");
  }

  return (
    <main className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Repositories"
        description="Sync from GitHub. Scroll down to fetch and save more repos."
        action={
          <Button onClick={startSync} disabled={loading || syncing}>
            {syncing ? "Syncing..." : "Sync from GitHub"}
          </Button>
        }
      />

      {repos.length > 0 && (
        <div className="flex flex-col gap-3">
          <InputGroup className="max-w-xl">
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by name or description..."
              aria-label="Search repositories"
            />
          </InputGroup>

          <div className="flex flex-wrap items-center gap-2">
            <select
              className={`${selectClassName} min-w-40`}
              value={indexStatusFilter}
              aria-label="Index status"
              onChange={(event) =>
                setIndexStatusFilter(event.target.value as IndexStatusFilter)
              }
            >
              <option value="all">All statuses</option>
              <option value="idle">Not indexed</option>
              <option value="indexing">Indexing</option>
              <option value="indexed">Indexed</option>
              <option value="failed">Failed</option>
            </select>

            <select
              className={`${selectClassName} min-w-36`}
              value={visibilityFilter}
              aria-label="Visibility"
              onChange={(event) =>
                setVisibilityFilter(event.target.value as VisibilityFilter)
              }
            >
              <option value="all">All repos</option>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>

            {filtersActive && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>

          {filtersActive && (
            <p className="text-sm text-muted-foreground">
              Showing {filteredRepos.length} of {repos.length} loaded
              {reposQuery.hasNextPage || (syncing && githubSync.hasNextPage)
                ? " (scroll to load more)"
                : ""}
            </p>
          )}
        </div>
      )}

      {repos.length === 0 && !loading ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <GitHubIcon />
            </EmptyMedia>
            <EmptyTitle>No repositories yet</EmptyTitle>
            <EmptyDescription>
              Click sync to fetch your first page from GitHub.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={startSync}>Sync from GitHub</Button>
          </EmptyContent>
        </Empty>
      ) : filteredRepos.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Search />
            </EmptyMedia>
            <EmptyTitle>No matching repositories</EmptyTitle>
            <EmptyDescription>
              Try a different search or filter. Scroll down to load more repos
              from GitHub.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" onClick={clearFilters}>
              Clear filters
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredRepos.map((repo) => (
            <Card key={repo.githubId} size="sm">
              <CardHeader>
                <CardTitle>{repo.fullName}</CardTitle>
                {repo.description && (
                  <CardDescription>{repo.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-4">
                <div className="flex flex-wrap gap-2">
                  {repo.private && <Badge variant="secondary">Private</Badge>}
                  <Badge variant="outline">{repo.indexStatus}</Badge>
                </div>
                <div className="flex gap-2">
                  <IndexRepoButton repoId={repo.id} status={repo.indexStatus} />
                  <Button
                    variant="outline"
                    size="sm"
                    render={<Link href={`/repositories/${repo.id}`} />}
                    nativeButton={false}
                  >
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div ref={sentinelRef} className="flex justify-center py-6">
        {loading && <Spinner />}
        {!loading && syncing && githubSync.hasNextPage && (
          <p className="text-sm text-muted-foreground">
            Scroll to fetch the next page from GitHub...
          </p>
        )}
        {!loading && !syncing && reposQuery.hasNextPage && repos.length > 0 && (
          <p className="text-sm text-muted-foreground">Scroll to load more...</p>
        )}
      </div>
    </main>
  );
}
