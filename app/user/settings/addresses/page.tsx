import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCachedUserAddresses } from "@/lib/data/user-customer";
import { AddressList } from "@/features/user/settings/components/addresses/AddressList";

export default async function AddressesSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const addresses = await getCachedUserAddresses(user.id);

  return <AddressList addresses={addresses} />;
}
