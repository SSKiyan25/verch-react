import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UserShell } from "@/components/layouts/user-shell";
import { getCachedCustomerProfile } from "@/lib/data/user-customer";
import { getCachedCartCount } from "@/lib/data/cart";
import { Skeleton } from "@/components/ui/skeleton";

async function UserLayoutContent({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  // 1. Auth check
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  // console.log(
  //   "[UserLayout] Auth check complete. User:",
  //   authUser,
  //   "Error:",
  //   authError,
  // );
  if (authError || !authUser) {
    redirect("/login");
  }

  // 2. Fetch profile
  const profile = await getCachedCustomerProfile(authUser.id);

  if (!profile) {
    redirect("/login");
  }

  // 3. Only customers belong in /user — org/admin users have their own layouts
  if (profile.role !== "customer") {
    redirect("/login");
  }

  // 4. Terms gate — must have agreed before accessing /user at all
  if (!profile.has_agreed_to_terms) {
    redirect("/login");
  }

  // 5. Onboarding completeness — contact number is the only hard requirement
  const hasCompletedOnboarding = !!profile.contact_number;

  // 6. Prepare shell user object
  const currentUser = {
    name: profile.full_name || authUser.email || "User",
    email: authUser.email || "",
    avatar: profile.avatar_url || "",
    role: profile.role,
  };

  const cartCount = await getCachedCartCount(authUser.id);

  return (
    <UserShell
      user={currentUser}
      hasCompletedOnboarding={hasCompletedOnboarding}
      cartCount={cartCount}
    >
      {children}
    </UserShell>
  );
}

function UserLayoutFallback() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-48" />
      </div>
    </div>
  );
}

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<UserLayoutFallback />}>
      <UserLayoutContent>{children}</UserLayoutContent>
    </Suspense>
  );
}
