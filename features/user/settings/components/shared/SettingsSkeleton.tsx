import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

type SkeletonVariant =
  | "profile"
  | "contact"
  | "addresses"
  | "student-id"
  | "memberships"
  | "security";

interface SettingsSkeletonProps {
  variant: SkeletonVariant;
}

function SkeletonHeader() {
  return (
    <div className="space-y-1.5">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-72" />
      <Separator className="!mt-4" />
    </div>
  );
}

function SkeletonInput() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <Skeleton className="h-5 w-20" />
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-4 w-64" />
    </div>
  );
}

function SkeletonMembershipCard() {
  return (
    <div className="rounded-lg border p-4 flex items-start gap-4">
      <Skeleton className="h-10 w-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6 max-w-lg">
      <SkeletonHeader />
      <div className="flex items-center gap-4">
        <Skeleton className="h-24 w-24 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <SkeletonInput />
      <SkeletonInput />
      <SkeletonInput />
      <SkeletonInput />
    </div>
  );
}

function ContactSkeleton() {
  return (
    <div className="space-y-6 max-w-lg">
      <SkeletonHeader />
      <SkeletonInput />
    </div>
  );
}

function AddressesSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}

function StudentIdSkeleton() {
  return (
    <div className="space-y-6 max-w-lg">
      <SkeletonHeader />
      <Skeleton className="h-6 w-28" />
      <SkeletonInput />
      <SkeletonInput />
      <SkeletonInput />
      <SkeletonInput />
      <SkeletonInput />
    </div>
  );
}

function MembershipsSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      <SkeletonMembershipCard />
      <SkeletonMembershipCard />
    </div>
  );
}

function SecuritySkeleton() {
  return (
    <div className="space-y-6 max-w-lg">
      <SkeletonHeader />
      <SkeletonInput />
      <SkeletonInput />
    </div>
  );
}

const skeletonMap: Record<SkeletonVariant, React.FC> = {
  profile: ProfileSkeleton,
  contact: ContactSkeleton,
  addresses: AddressesSkeleton,
  "student-id": StudentIdSkeleton,
  memberships: MembershipsSkeleton,
  security: SecuritySkeleton,
};

export default function SettingsSkeleton({ variant }: SettingsSkeletonProps) {
  const Component = skeletonMap[variant];
  return <Component />;
}
