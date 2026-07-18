import { CurrentUserProvider } from "@/hooks/use-current-user";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { RoleGuard } from "@/components/layout/role-guard";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <CurrentUserProvider>
      <RoleGuard>
        <DashboardLayout>{children}</DashboardLayout>
      </RoleGuard>
    </CurrentUserProvider>
  );
}
