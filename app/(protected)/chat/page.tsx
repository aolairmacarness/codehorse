import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { getRepositories } from "@/app/module/repositories/actions";
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

export default async function ChatPage() {
  const repos = await getRepositories();
  const indexedRepos = repos.filter((repo) => repo.indexStatus === "indexed");

  return (
    <main className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Chat"
        description="Ask questions about your indexed repositories."
      />

      {indexedRepos.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessageSquare />
            </EmptyMedia>
            <EmptyTitle>No indexed repos yet</EmptyTitle>
            <EmptyDescription>
              Sync and index a repository first, then chat will show up here.
            </EmptyDescription>
          </EmptyHeader>
          <Button render={<Link href="/repositories" />} nativeButton={false}>
            Go to repositories
          </Button>
        </Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {indexedRepos.map((repo) => (
            <Card key={repo.id} size="sm">
              <CardHeader>
                <CardTitle>{repo.fullName}</CardTitle>
                <CardDescription>Ready to chat</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <Badge variant="outline">indexed</Badge>
                <Button
                  render={<Link href={`/chat/${repo.id}`} />}
                  nativeButton={false}
                >
                  Open chat
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
