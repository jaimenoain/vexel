"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  ArrowLeftRight,
  Building,
  FileText,
  Loader2,
  LogOut,
  PieChart,
  Settings,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { logOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/sidebar";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: PieChart },
  { label: "Assets", href: "/assets", icon: TrendingUp },
  { label: "Liabilities", href: "/liabilities", icon: TrendingDown },
  { label: "Transactions", href: "/transactions", icon: ArrowLeftRight },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Entities", href: "/entities", icon: Building },
  { label: "Settings", href: "/settings", icon: Settings },
] as const;

function LogOutButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      variant="ghost"
      className="w-full justify-start text-foreground"
      type="submit"
      disabled={pending}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <LogOut className="size-4" />
      )}
      <span>Log Out</span>
    </Button>
  );
}

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader>
        <span className="font-semibold text-foreground">Vexel</span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(({ label, href, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton asChild isActive={pathname === href}>
                    <Link href={href}>
                      <Icon className="size-4" />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <form action={async () => { await logOut(); }}>
          <LogOutButton />
        </form>
      </SidebarFooter>
    </Sidebar>
  );
}
