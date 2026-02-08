import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function UserOrdersPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">My Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">
            This page is currently under development.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
