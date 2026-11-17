"use client";

import { useQueryClient } from "@tanstack/react-query";
import { startIndexing } from "@/app/module/repositories/actions";
import { Button } from "@/components/ui/button";

export function IndexRepoButton({
  repoId,
  status,
}: {
  repoId: string;
  status: string;
}) {
  const queryClient = useQueryClient();

  async function handleIndex() {
    await startIndexing(repoId);
    queryClient.resetQueries({ queryKey: ["repositories"] });
  }

  const label =
    status === "indexing"
      ? "Indexing..."
      : status === "indexed"
        ? "Re-index"
        : "Index";

  return (
    <Button
      size="sm"
      variant={status === "indexed" ? "outline" : "default"}
      onClick={() => void handleIndex()}
      disabled={status === "indexing"}
    >
      {label}
    </Button>
  );
}
