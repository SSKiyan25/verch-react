import { MessageSquare } from "lucide-react";

type Props = {
  productId: string;
};

export function ProductReviews({ productId }: Props) {
  void productId; // reserved for future implementation

  return (
    <section className="bg-card p-6 sm:p-8 rounded-xl shadow-md">
      <h2 className="mb-6 text-lg font-semibold tracking-tight">
        Ratings &amp; Reviews
      </h2>

      {/* Coming Soon Empty State */}
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="relative mb-6">
          <div className="rounded-full bg-muted p-6">
            <MessageSquare className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>
        <h3 className="text-xl font-semibold mb-2">Reviews Coming Soon</h3>
        <p className="text-muted-foreground max-w-sm">
          We&apos;re building a comprehensive review system to help you make
          informed decisions. Check back soon to see what others are saying!
        </p>
      </div>
    </section>
  );
}
