import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Lock } from "lucide-react";

export default function ResetPasswordLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md shadow-lg overflow-hidden">
        {/* Animated loading indicator at top */}
        <div className="relative h-1 w-full bg-muted overflow-hidden">
          <div className="absolute inset-0 bg-primary/20 rounded-full" />
          <div className="absolute inset-0 rounded-full bg-primary animate-pulse" />
        </div>

        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <div className="h-7 w-44 bg-muted-foreground/10 rounded-lg mx-auto animate-pulse" />
          <div className="h-4 w-60 bg-muted-foreground/10 rounded-md mx-auto animate-pulse" />
        </CardHeader>

        <CardContent className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 bg-muted-foreground/10 rounded animate-pulse" />
              <div className="h-10 w-full bg-muted/50 rounded-lg animate-pulse" />
            </div>
          ))}
          <div className="rounded-lg border bg-card p-4 space-y-2">
            <div className="h-4 w-44 bg-muted-foreground/10 rounded animate-pulse" />
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-3 w-3/4 bg-muted-foreground/5 rounded animate-pulse"
                style={{ animationDelay: `${i * 80}ms` }}
              />
            ))}
          </div>
          <div className="h-10 w-full bg-muted/50 rounded-lg animate-pulse" />
        </CardContent>
      </Card>
    </div>
  );
}
