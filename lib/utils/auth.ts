import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export async function logout() {
  const supabase = createClient();

  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Error logging out:", error);
      throw error;
    }

    // Clear any local storage or cookies if needed
    localStorage.removeItem("user");

    // Redirect to login page
    window.location.href = "/login";

    return { success: true };
  } catch (error) {
    console.error("Logout failed:", error);
    return { success: false, error };
  }
}

// Hook version for components that need router
export function useLogout() {
  const router = useRouter();

  return async () => {
    const result = await logout();
    if (result.success) {
      router.push("/login");
      router.refresh();
    }
    return result;
  };
}
