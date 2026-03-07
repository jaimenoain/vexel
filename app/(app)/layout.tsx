import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { getCurrentUser } from "@/lib/supabase/user";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await getCurrentUser();
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
