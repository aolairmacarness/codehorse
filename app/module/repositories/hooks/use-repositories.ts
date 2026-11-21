"use client";

import {
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  getRepositoriesPage,
  syncGithubPage,
} from "@/app/module/repositories/actions";

type ReposPage = Awaited<ReturnType<typeof getRepositoriesPage>>;

export function useRepositories(
    initialData?: InfiniteData<ReposPage, number>
  ) {
    return useInfiniteQuery({
      queryKey: ["repositories"],
      queryFn: ({ pageParam }) => getRepositoriesPage(pageParam),
      initialPageParam: 1,
      getNextPageParam: (lastPage, _, page) =>
        lastPage.hasMore ? page + 1 : undefined,
      initialData,
    });
  }

  export function useGithubSync() {
    const queryClient = useQueryClient();
    const [syncing, setSyncing] = useState(false);
  
    const githubSync = useInfiniteQuery({
      queryKey: ["github-sync"],
      queryFn: ({ pageParam }) => syncGithubPage(pageParam),
      initialPageParam: 1,
      getNextPageParam: (lastPage, _, page) =>
        lastPage.hasMore ? page + 1 : undefined,
      enabled: syncing,
    });
  
    const startSync = () => {
      queryClient.removeQueries({ queryKey: ["github-sync"] });
      setSyncing(true);
    };
  
    useEffect(() => {
      if (
        syncing &&
        githubSync.isFetched &&
        !githubSync.hasNextPage &&
        !githubSync.isFetching
      ) {
        setSyncing(false);
        queryClient.resetQueries({ queryKey: ["repositories"] });
      }
    }, [
      syncing,
      githubSync.isFetched,
      githubSync.hasNextPage,
      githubSync.isFetching,
      queryClient,
    ]);
  
    return {
      syncing,
      githubSync,
      startSync,
    };
  }
  