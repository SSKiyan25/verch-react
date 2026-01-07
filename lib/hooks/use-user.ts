"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@/lib/types/user";

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    let isMounted = true;

    // Get initial user
    const getUser = async () => {
      try {
        console.log("Fetching auth user...");
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser();

        if (!isMounted) return;

        if (authError || !authUser) {
          console.log("No auth user found:", authError?.message || "No user");
          setUser(null);
          setLoading(false);
          return;
        }

        console.log("Auth user found, fetching profile...");

        try {
          const { data: userProfiles, error: profileError } = await supabase
            .from("users")
            .select(
              `
              id,
              full_name,
              avatar_url,
              role,
              contact_number,
              is_verified,
              has_agreed_to_terms,
              has_changed_default_password,
              created_at,
              updated_at,
              organization_id
            `
            )
            .eq("id", authUser.id);

          if (profileError) {
            console.error("Error fetching user profile:", profileError);
            setUser(null);
            setLoading(false);
            return;
          }

          const userProfile = userProfiles?.[0];
          if (!userProfile) {
            console.log("No user profile found in results");
            setUser(null);
            setLoading(false);
            return;
          }

          console.log("User profile loaded:");

          const completeUser: User = {
            ...userProfile,
            email: authUser.email || "",
          };

          setUser(completeUser);
          setLoading(false);
        } catch (queryError) {
          console.error("Query exception:", queryError);
          setUser(null);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        if (isMounted) {
          setUser(null);
          setLoading(false);
        }
      }
    };

    getUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === "SIGNED_OUT" || !session) {
        console.log("User signed out");
        setUser(null);
        setLoading(false);
      } else if (event === "SIGNED_IN" && session) {
        // Small delay to ensure session is ready
        setTimeout(async () => {
          if (!isMounted) return;

          try {
            console.log("Auth change: Starting profile fetch...");

            const { data: userProfiles, error } = await supabase
              .from("users")
              .select(`*`)
              .eq("id", session.user.id);

            if (!error && userProfiles?.[0]) {
              const completeUser: User = {
                ...userProfiles[0],
                email: session.user.email || "",
              };
              setUser(completeUser);
            } else if (error) {
              console.error("Auth change profile fetch error:", error);
            }
          } catch (err) {
            console.error("Exception during auth change profile fetch:", err);
          }

          if (isMounted) {
            setLoading(false);
          }
        }, 500);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  return { user, loading };
}
