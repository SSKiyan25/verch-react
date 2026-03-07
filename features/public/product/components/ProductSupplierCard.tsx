import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Mail,
  Globe,
  Facebook,
  Instagram,
  Twitter,
  Link as LinkIcon,
} from "lucide-react";
import type { SupplierLink } from "@/lib/supabase/queries/products";

type Props = {
  supplierName: string;
  supplierEmail: string | null;
  supplierLinks: SupplierLink[] | null;
};

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  facebook: <Facebook className="h-4 w-4" />,
  instagram: <Instagram className="h-4 w-4" />,
  twitter: <Twitter className="h-4 w-4" />,
  x: <Twitter className="h-4 w-4" />,
  website: <Globe className="h-4 w-4" />,
};

function platformIcon(type: string) {
  return PLATFORM_ICONS[type.toLowerCase()] ?? <LinkIcon className="h-4 w-4" />;
}

function platformLabel(type: string) {
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
}

export function ProductSupplierCard({
  supplierName,
  supplierEmail,
  supplierLinks,
}: Props) {
  const hasContact =
    supplierEmail || (supplierLinks && supplierLinks.length > 0);

  return (
    <Card className="bg-muted/40">
      <CardContent className="flex flex-col gap-3 py-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-normal">
            Supplier
          </Badge>
          <span className="text-sm font-medium">{supplierName}</span>
        </div>

        {hasContact && <Separator />}

        {/* Email */}
        {supplierEmail && (
          <a
            href={`mailto:${supplierEmail}`}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Mail className="h-4 w-4 shrink-0" />
            <span className="truncate">{supplierEmail}</span>
          </a>
        )}

        {/* Links */}
        {supplierLinks && supplierLinks.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {supplierLinks.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
              >
                {platformIcon(link.type)}
                {platformLabel(link.type)}
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
