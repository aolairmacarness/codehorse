import { Button } from "@/components/ui/button";
import { GitHubIcon } from "@/app/module/auth/components/github-icon";

export function GitHubSignInButton({
  pending,
  onClick,
}: {
  pending: boolean;
  onClick: () => void;
}) {
  return (
    <Button className="w-full" size="lg" disabled={pending} onClick={onClick}>
      <GitHubIcon />
      {pending ? "Redirecting…" : "Continue with GitHub"}
    </Button>
  );
}
