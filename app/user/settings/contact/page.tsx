import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCachedCustomerProfile } from "@/lib/data/user-customer";
import { ContactForm } from "@/features/user/settings/components/contact/ContactForm";

export default async function ContactSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getCachedCustomerProfile(user.id);

  return <ContactForm currentNumber={profile?.contact_number ?? null} />;
}
