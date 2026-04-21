import { Suspense } from "react";
import { AdminLayoutClient } from "./admin-layout-wrapper";
import { LoadingScreen } from "@/components/ui/loading-screen";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </Suspense>
  );
}
