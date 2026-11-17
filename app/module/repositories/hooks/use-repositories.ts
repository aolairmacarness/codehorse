"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { InfiniteData } from "@tanstack/react-query";
import {
  getRepositoriesPage,
  syncGithubPage,
} from "@/app/module/repositories/actions";

type ReposPage = Awaited<ReturnType<typeof getRepositoriesPage>>;

export function useRepositories(initialData: InfiniteData<ReposPage, number>) {
  return useInfiniteQuery({
    queryKey: ["repositories"],
    queryFn: ({ pageParam }) => getRepositoriesPage(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _pages, lastPageParam) =>
      lastPage.hasMore ? lastPageParam + 1 : undefined,
    initialData,
  });
}

export function useGithubSync() {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);

  const githubSync = useInfiniteQuery({
    queryKey: ["github-sync"],
    queryFn: async ({ pageParam }) => {
      const page = await syncGithubPage(pageParam);
      await queryClient.invalidateQueries({ queryKey: ["repositories"] });
      return page;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, _pages, lastPageParam) =>
      lastPage.hasMore ? lastPageParam + 1 : undefined,
    enabled: syncing,
  });

  function startSync() {
    setSyncing(true);
  }

  return { syncing, githubSync, startSync };
}
