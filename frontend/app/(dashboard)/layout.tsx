import { CurrentUserProvider } from "@/hooks/use-current-user";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <CurrentUserProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </CurrentUserProvider>
  );
}
