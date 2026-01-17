import { Layers, Construction } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OrganizationBundles() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <Layers className="w-6 h-6 md:w-8 md:h-8 text-primary" />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Bundles
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your product bundles
          </p>
        </div>
      </div>

      <Card className="border-dashed border-2">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Construction className="w-6 h-6" />
            Under Development
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground">
            The bundles feature is currently under development and will be
            available soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
