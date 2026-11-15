"use client";

import { use, useState } from "react";
import { signIn } from "@/lib/auth-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GitHubSignInButton } from "@/app/module/auth/components/github-sign-in-button";
import { SignInError } from "@/app/module/auth/components/sign-in-error";

export function LoginUI({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const { error } = use(searchParams);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(Boolean(error));

  async function signInWithGitHub() {
    setPending(true);
    setFailed(false);
    const { error: signInError } = await signIn.social({
      provider: "github",
      callbackURL: "/dashboard",
      errorCallbackURL: "/login",
    });
    if (signInError) {
      setFailed(true);
      setPending(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Use your GitHub account to continue.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {failed ? <SignInError /> : null}
          <GitHubSignInButton
            pending={pending}
            onClick={() => void signInWithGitHub()}
          />
        </CardContent>
      </Card>
    </main>
  );
}
