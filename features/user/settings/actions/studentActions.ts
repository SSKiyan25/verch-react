"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  invalidateStudentInfoCache,
  invalidateMembershipsCache,
} from "@/lib/data/cache-helpers";

const studentInfoSchema = z.object({
  id_number: z.string().min(1).max(50),
  first_name: z.string().min(1).max(255),
  last_name: z.string().min(1).max(255),
  college: z.string().optional(),
  department: z.string().optional(),
  course: z.string().optional(),
  year_level: z.number().int().min(1).max(10).optional(),
  school_email: z.string().email().optional(),
  id_photo_url: z.string().optional(),
  id_photo_path: z.string().optional(),
});

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export async function upsertStudentInfo(
  input: z.infer<typeof studentInfoSchema>,
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Unauthorized" };

    const validated = studentInfoSchema.parse(input);

    const { error } = await supabase.rpc("upsert_student_info", {
      p_user_id: user.id,
      p_id_number: validated.id_number,
      p_first_name: validated.first_name,
      p_last_name: validated.last_name,
      p_college: validated.college ?? null,
      p_department: validated.department ?? null,
      p_course: validated.course ?? null,
      p_year_level: validated.year_level ?? null,
      p_school_email: validated.school_email ?? null,
      p_id_photo_url: validated.id_photo_url ?? null,
      p_id_photo_path: validated.id_photo_path ?? null,
    });

    if (error) return { success: false, error: error.message };

    invalidateStudentInfoCache(user.id);
    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.issues[0].message };
    }
    console.error("[upsertStudentInfo]", err);
    return { success: false, error: "Failed to submit student info" };
  }
}

export async function applyToOrganization(input: {
  organization_id: string;
  proof_url?: string;
  proof_path?: string;
  academic_year?: string;
}): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Unauthorized" };

    if (!input.organization_id) {
      return { success: false, error: "Organization is required" };
    }

    const { error } = await supabase.rpc("apply_to_organization", {
      p_user_id: user.id,
      p_organization_id: input.organization_id,
      p_proof_url: input.proof_url ?? null,
      p_proof_path: input.proof_path ?? null,
      p_academic_year: input.academic_year ?? null,
    });

    if (error) return { success: false, error: error.message };

    invalidateMembershipsCache(user.id);
    return { success: true };
  } catch (err) {
    console.error("[applyToOrganization]", err);
    return { success: false, error: "Failed to submit membership application" };
  }
}

export async function withdrawMembershipApplication(
  membershipId: string,
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Unauthorized" };

    // RLS policy only allows delete if status = 'pending'
    const { error } = await supabase
      .from("student_organization_memberships")
      .delete()
      .eq("id", membershipId)
      .eq("user_id", user.id);

    if (error) return { success: false, error: error.message };

    invalidateMembershipsCache(user.id);
    return { success: true };
  } catch (err) {
    console.error("[withdrawMembershipApplication]", err);
    return { success: false, error: "Failed to withdraw application" };
  }
}
