import { AppSidebar } from "@/components/app-sidebar"
import { LogoutButton } from "@/app/module/auth/components/logout-button"
import { requireAuth } from "@/app/module/auth/utils/auth-utils"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export default async function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  const session = await requireAuth()

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <p className="flex-1 truncate text-sm text-muted-foreground">
            Signed in as {session.user.email}
          </p>
          <LogoutButton />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
