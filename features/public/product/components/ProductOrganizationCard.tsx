import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Store } from "lucide-react";

type ProductOrganizationCardProps = {
  organizationId: string;
  organizationName: string;
  organizationLogoUrl: string | null;
};

export function ProductOrganizationCard({
  organizationId,
  organizationName,
  organizationLogoUrl,
}: ProductOrganizationCardProps) {
  return (
    <Card className="bg-muted/40">
      <CardContent className="flex items-center gap-3 py-4">
        {/* Logo */}
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-background border">
          {organizationLogoUrl ? (
            <Image
              src={organizationLogoUrl}
              alt={organizationName}
              fill
              sizes="40px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Store className="h-5 w-5" />
            </div>
          )}
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">Sold by</p>
          <p className="text-sm font-medium truncate">{organizationName}</p>
        </div>

        {/* View Store link */}
        <Button variant="outline" size="sm" asChild>
          <Link href={`/store/${organizationId}`}>View Store</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
