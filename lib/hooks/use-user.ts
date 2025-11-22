"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  role: "customer" | "organization" | "admin";
  contact_number?: string;
  is_verified: boolean;
  has_agreed_to_terms: boolean;
  created_at: string;
  updated_at: string;
}

export function useUser() {
  const [user, setUser] = useState<UserProfile | null>(null);
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
              created_at,
              updated_at
            `
            )
            .eq("id", authUser.id);

          //   console.log("Profile fetch result (array):", {
          //     userProfiles,
          //     profileError,
          //     queryUserId: authUser.id,
          //     resultCount: userProfiles?.length || 0,
          //   });

          if (profileError) {
            console.error(" Error fetching user profile:", profileError);
            setUser(null);
            setLoading(false);
            return;
          }

          const userProfile = userProfiles?.[0];
          if (!userProfile) {
            console.log(" No user profile found in results");
            setUser(null);
            setLoading(false);
            return;
          }

          console.log("User profile loaded:");

          const completeUser: UserProfile = {
            ...userProfile,
            email: authUser.email || "",
          };

          //   console.log("Setting complete user:", completeUser);
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
        // console.log("User signed in, fetching profile for:", session.user.id);

        // Small delay to ensure session is ready
        setTimeout(async () => {
          if (!isMounted) return;

          try {
            console.log("Auth change: Starting profile fetch...");

            const { data: userProfiles, error } = await supabase
              .from("users")
              .select(`*`)
              .eq("id", session.user.id);

            // console.log("Auth change profile fetch:", {
            //   userProfiles,
            //   error,
            //   resultCount: userProfiles?.length || 0,
            // });

            if (!error && userProfiles?.[0]) {
              const completeUser: UserProfile = {
                ...userProfiles[0],
                email: session.user.email || "",
              };
              //   console.log("Setting user from auth change:", completeUser);
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
