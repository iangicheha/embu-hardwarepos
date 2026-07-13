import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
