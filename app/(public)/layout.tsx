import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PublicShell } from "@/components/layouts/public-shell";
import { getCachedUserProfile } from "@/lib/data/user";
import { getCachedCartCount } from "@/lib/data/cart";
import { Skeleton } from "@/components/ui/skeleton";

async function PublicLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Get authenticated user (if any)
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  let currentUser = null;

  // If user is authenticated, fetch their profile
  if (authUser) {
    const userProfile = await getCachedUserProfile(authUser.id);

    if (userProfile) {
      currentUser = {
        name: userProfile.full_name || authUser.email || "User",
        email: authUser.email || "",
        avatar: userProfile.avatar_url || "",
        role: userProfile.role,
      };

      // Redirect authenticated users based on their role
      if (userProfile.role === "admin") {
        redirect("/admin/dashboard");
      } else if (
        userProfile.role === "organization_admin" ||
        userProfile.role === "organization_manager" ||
        userProfile.role === "organization_staff"
      ) {
        redirect("/org/dashboard");
      }
      // Customers can stay on public pages
    }
  }

  const cartCount = authUser ? await getCachedCartCount(authUser.id) : 0;

  return (
    <PublicShell user={currentUser} cartCount={cartCount}>
      {children}
    </PublicShell>
  );
}

function PublicLayoutFallback({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <div className="h-16 border-b flex items-center px-4">
        <Skeleton className="h-8 w-32" />
      </div>
      <main>{children}</main>
    </div>
  );
}

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Suspense
      fallback={<PublicLayoutFallback>{children}</PublicLayoutFallback>}
    >
      <PublicLayoutContent>{children}</PublicLayoutContent>
    </Suspense>
  );
}
