import { SettingsNav } from "@/features/user/settings/components/shared/SettingsNav";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full px-4 py-6">
      <div className="flex flex-col gap-6 md:flex-row md:gap-8">
        <SettingsNav />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
