import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";

type Props = {
  productId: string;
};

// ─── Static dummy data ────────────────────────────────────────────────────────

const AVERAGE_RATING = 4.5;
const TOTAL_REVIEWS = 24;

const starBreakdown = [
  { stars: 5, count: 14 },
  { stars: 4, count: 6 },
  { stars: 3, count: 2 },
  { stars: 2, count: 1 },
  { stars: 1, count: 1 },
];

const dummyReviews = [
  {
    id: "1",
    author: "Juan dela Cruz",
    avatar: null,
    rating: 5,
    date: "2025-12-01",
    title: "Great quality!",
    body: "The shirt fits perfectly and the print quality is excellent. Will definitely order again.",
    verified: true,
  },
  {
    id: "2",
    author: "Maria Santos",
    avatar: null,
    rating: 4,
    date: "2025-11-20",
    title: "Good but sizing runs small",
    body: "Overall happy with the product. Just note that the sizing runs a bit small, I suggest ordering one size up.",
    verified: true,
  },
  {
    id: "3",
    author: "Carlo Reyes",
    avatar: null,
    rating: 5,
    date: "2025-11-10",
    title: "Perfect for our org event",
    body: "Ordered for our whole department. Everyone loved it. Fast delivery too!",
    verified: false,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatReviewDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div
      className="flex items-center gap-0.5"
      aria-label={`${rating} out of ${max} stars`}
    >
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={
            i < rating
              ? "h-4 w-4 fill-amber-400 text-amber-400"
              : "h-4 w-4 fill-muted text-muted-foreground/30"
          }
        />
      ))}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProductReviews({ productId }: Props) {
  void productId; // reserved for future real implementation
  return (
    <section className="bg-card p-6 sm:p-8 rounded-xl shadow-md">
      <h2 className="mb-6 text-lg font-semibold tracking-tight">
        Ratings &amp; Reviews
      </h2>

      {/* Summary block */}
      <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-10">
        {/* Average */}
        <div className="flex flex-col items-center gap-1 sm:min-w-[120px]">
          <span className="text-5xl font-bold tracking-tight">
            {AVERAGE_RATING}
          </span>
          <StarRating rating={Math.round(AVERAGE_RATING)} />
          <span className="mt-1 text-sm text-muted-foreground">
            {TOTAL_REVIEWS} reviews
          </span>
        </div>

        {/* Star breakdown bars */}
        <div className="flex flex-1 flex-col gap-2">
          {starBreakdown.map(({ stars, count }) => (
            <div key={stars} className="flex items-center gap-3">
              <span className="w-4 text-right text-sm text-muted-foreground">
                {stars}
              </span>
              <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
              <Progress
                value={(count / TOTAL_REVIEWS) * 100}
                className="h-2 flex-1"
              />
              <span className="w-5 text-right text-sm tabular-nums text-muted-foreground">
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Review cards */}
      <div className="flex flex-col divide-y">
        {dummyReviews.map((review) => (
          <div key={review.id} className="py-5">
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback className="text-xs font-medium">
                  {getInitials(review.author)}
                </AvatarFallback>
              </Avatar>

              <div className="flex flex-1 flex-col gap-1.5">
                {/* Author + badge */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{review.author}</span>
                  {review.verified && (
                    <Badge variant="secondary" className="px-1.5 py-0 text-xs">
                      Verified Purchase
                    </Badge>
                  )}
                </div>

                {/* Stars + date */}
                <div className="flex flex-wrap items-center gap-3">
                  <StarRating rating={review.rating} />
                  <span className="text-xs text-muted-foreground">
                    {formatReviewDate(review.date)}
                  </span>
                </div>

                {/* Title */}
                <p className="text-sm font-semibold">{review.title}</p>

                {/* Body */}
                <p className="text-sm text-muted-foreground">{review.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Write a Review CTA */}
      <div className="mt-6 flex justify-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button variant="outline" disabled>
                Write a Review
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>Reviews coming soon</TooltipContent>
        </Tooltip>
      </div>
    </section>
  );
}
