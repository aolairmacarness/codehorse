import Link from "next/link";
import { notFound } from "next/navigation";
import { getRepository } from "@/app/module/repositories/actions";
import { getChatMessages } from "@/app/module/chat/actions";
import { ChatView } from "@/app/module/chat/components/chat-view";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ChatRepoPage({
  params,
}: {
  params: Promise<{ repoId: string }>;
}) {
  const { repoId } = await params;

  const repo = await getRepository(repoId);

  if (!repo) {
    notFound();
  }

  const initialMessages = await getChatMessages(repoId);

  return (
    <main className="flex flex-col gap-4 p-6">
      <PageHeader
        title={repo.fullName}
        description="Chat with this repository"
        action={
          <Button
            variant="outline"
            render={<Link href="/chat" />}
            nativeButton={false}
          >
            Back
          </Button>
        }
      />

      {repo.indexStatus === "indexed" ? (
        <ChatView
          repoId={repoId}
          repoName={repo.fullName}
          initialMessages={initialMessages}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Index this repo first</CardTitle>
            <CardDescription>
              Status: {repo.indexStatus}. Index it from the Repositories page,
              then come back to chat.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              render={<Link href={`/repositories/${repoId}`} />}
              nativeButton={false}
            >
              Go to repository
            </Button>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
