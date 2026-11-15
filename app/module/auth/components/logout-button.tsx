import { logout } from "@/app/module/auth/utils/auth-utils";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return (
    <form action={logout}>
      <Button type="submit" variant="outline">
        Log out
      </Button>
    </form>
  );
}
