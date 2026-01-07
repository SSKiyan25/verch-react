import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package } from "lucide-react";

export default function OrganizationProducts() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Package className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Products</h1>
          <p className="text-muted-foreground">
            Manage your organization products
          </p>
        </div>
      </div>

      <Card className="border-dashed border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-muted-foreground" />
            Coming Soon
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg text-muted-foreground">
            This is products, not yet implemented.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            The organization products management features are currently under
            development. Check back soon for product catalog, inventory
            management, and more!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
