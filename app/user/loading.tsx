import { Loader2 } from "lucide-react";

export default function UserLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen w-full bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-center text-muted-foreground">
          Loading user page...
        </p>
      </div>
    </div>
  );
}
