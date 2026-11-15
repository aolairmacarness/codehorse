import { LoginUI } from "@/app/module/auth/components/login-ui";
import { requireNoAuth } from "@/app/module/auth/utils/auth-utils";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  await requireNoAuth();
  return <LoginUI searchParams={searchParams} />;
}
