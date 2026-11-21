"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, MessageSquare, Settings } from "lucide-react"
import { GitHubIcon } from "@/app/module/auth/components/github-icon"
import { useSession } from "@/lib/auth-client"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarRail,
} from "@/components/ui/sidebar"

const navigationItems = [
  { href: "/overview", label: "Overview", icon: BookOpen },
  { href: "/repositories", label: "Repositories", icon: GitHubIcon },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/settings", label: "Settings", icon: Settings },
]

function isRouteActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { data: session, isPending } = useSession()
  const user = session?.user
  const userName = user?.name ?? "Guest";
  const userEmail = user?.email ?? "guest@example.com";


  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <Link href="/overview" className="px-2 py-1 text-lg font-semibold">
          Review
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    isActive={isRouteActive(pathname, href)}
                    tooltip={label}
                    render={<Link href={href} />}
                  >
                    <Icon />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            {isPending ? (
              <SidebarMenuSkeleton showIcon />
            ) : user ? (
              <SidebarMenuButton size="lg" tooltip={userName}>
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.image}
                    alt={user.name ?? "User avatar"}
                    className="size-8 rounded-lg"
                  />
                ) : (
                  <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-sm font-medium">
                    {(user.name ?? user.email).charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </div>
              </SidebarMenuButton>
            ) : null}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
