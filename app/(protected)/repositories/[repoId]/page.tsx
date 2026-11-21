import Link from "next/link";
import { notFound } from "next/navigation";
import { getRepository } from "@/app/module/repositories/actions";
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

export default async function RepositoryPage({
  params,
}: {
  params: Promise<{ repoId: string }>;
}) {
  const { repoId } = await params;
  const repo = await getRepository(repoId);

  if (!repo) {
    notFound();
  }

  return (
    <main className="flex flex-col gap-6 p-6">
      <PageHeader
        title={repo.fullName}
        description={repo.description || "Repository details"}
        action={
          <Button
            variant="outline"
            render={<Link href="/repositories" />}
            nativeButton={false}
          >
            Back
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>Branch and indexing status</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {repo.private && <Badge variant="secondary">Private</Badge>}
            <Badge variant="outline">Branch: {repo.defaultBranch}</Badge>
            <Badge variant="outline">Status: {repo.indexStatus}</Badge>
          </div>
          {repo.indexStatus === "indexed" ? (
            <div>
              <Button
                render={<Link href={`/chat/${repo.id}`} />}
                nativeButton={false}
              >
                Open chat
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Index this repository from the Repositories page to chat with it.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
