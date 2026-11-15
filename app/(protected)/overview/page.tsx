import Link from "next/link";
import { requireAuth } from "@/app/module/auth/action";
import { getRepositories } from "@/app/module/repositories/actions";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function OverviewPage() {
  const user = await requireAuth();
  const repos = await getRepositories();
  const indexedRepos = repos.filter((repo) => repo.indexStatus === "indexed");

  return (
    <main className="flex flex-col gap-6 p-6">
      <PageHeader
        title={`Welcome, ${user.name}`}
        description="Sync GitHub repos, index them, then chat with your code."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Repositories</CardTitle>
            <CardDescription>Saved from GitHub</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{repos.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Indexed</CardTitle>
            <CardDescription>Ready for chat</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{indexedRepos.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dev mode</CardTitle>
            <CardDescription>Local only</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">pnpm dev + inngest dev</Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick links</CardTitle>
          <CardDescription>Three steps to chat with a repo</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Sync repos from GitHub</li>
            <li>Index a repo (embeddings → Pinecone)</li>
            <li>Open Chat and ask questions with source citations</li>
          </ol>
          <div className="flex flex-wrap gap-2">
            <Button render={<Link href="/repositories" />} nativeButton={false}>
              Repositories
            </Button>
            {indexedRepos.length > 0 ? (
              <Button
                variant="outline"
                render={<Link href="/chat" />}
                nativeButton={false}
              >
                Chat
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}