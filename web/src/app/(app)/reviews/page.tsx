"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, MessageSquare, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchAPI } from "@/lib/api";

interface Review {
  id: string;
  author_name: string;
  rating: number;
  text: string;
  review_time: string;
  sentiment_label?: string;
}

interface Business {
  id: string;
}

interface Location {
  id: string;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`size-4 ${i <= rating ? "text-amber-400" : "text-muted-foreground/30"}`}
          fill={i <= rating ? "currentColor" : "none"}
        />
      ))}
    </div>
  );
}

function sentimentColor(label: string) {
  switch (label) {
    case "positive":
      return "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300";
    case "negative":
      return "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300";
    default:
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300";
  }
}

function ratingBorderColor(rating: number) {
  if (rating >= 4) return "border-l-2 border-l-green-500";
  if (rating === 3) return "border-l-2 border-l-amber-500";
  return "border-l-2 border-l-red-500";
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);

  useEffect(() => {
    loadReviews();
  }, []);

  async function loadReviews() {
    try {
      setLoading(true);
      setError("");
      const businesses: Business[] = await fetchAPI("/api/businesses");
      if (businesses.length === 0) {
        setReviews([]);
        return;
      }
      const locations: Location[] = await fetchAPI(
        `/api/businesses/${businesses[0].id}/locations`
      );
      const allReviews: Review[] = [];
      for (const loc of locations) {
        try {
          const locReviews = await fetchAPI(`/api/locations/${loc.id}/reviews`);
          allReviews.push(...locReviews);
        } catch {
          // Skip locations that fail to load reviews
        }
      }
      allReviews.sort(
        (a, b) =>
          new Date(b.review_time).getTime() - new Date(a.review_time).getTime()
      );
      setReviews(allReviews);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }

  const filtered =
    ratingFilter === null
      ? reviews
      : reviews.filter((r) => r.rating === ratingFilter);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reviews</h1>
        {!loading && reviews.length > 0 && (
          <p className="mt-1 text-sm text-muted-foreground">
            {reviews.length} review{reviews.length !== 1 ? "s" : ""} across all
            locations
          </p>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton-shimmer h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-2xl bg-muted/30 border border-dashed border-border/50">
          <div className="size-16 rounded-2xl bg-brand/10 flex items-center justify-center mb-4">
            <MessageSquare className="size-8 text-brand" />
          </div>
          <div className="text-center">
            <h3 className="font-medium">No reviews yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Reviews will appear here once your locations start receiving them
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-xl bg-muted/30 p-1.5 inline-flex flex-wrap items-center gap-1">
            <button
              onClick={() => setRatingFilter(null)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
                ratingFilter === null
                  ? "bg-brand text-white shadow-sm"
                  : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-background"
              }`}
            >
              All ({reviews.length})
            </button>
            {[1, 2, 3, 4, 5].map((r) => (
              <button
                key={r}
                onClick={() => setRatingFilter(r)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
                  ratingFilter === r
                    ? "bg-brand text-white shadow-sm"
                    : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-background"
                }`}
              >
                {r} ★ ({reviews.filter((rev) => rev.rating === r).length})
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filtered.map((review, index) => (
              <Link
                key={review.id}
                href={`/reviews/${review.id}`}
                className="block animate-fade-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Card
                  className={`cursor-pointer card-hover-border card-interactive ${ratingBorderColor(review.rating)}`}
                >
                  <CardContent className="flex items-center gap-4">
                    <div className="size-9 rounded-full bg-gradient-to-br from-orange-200 to-amber-200 dark:from-orange-800 dark:to-amber-800 flex items-center justify-center text-xs font-semibold text-orange-700 dark:text-orange-200 shrink-0">
                      {review.author_name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{review.author_name}</p>
                      <StarRating rating={review.rating} />
                      {review.text && (
                        <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                          {review.text}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(review.review_time)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {review.sentiment_label && (
                        <Badge className={sentimentColor(review.sentiment_label)}>
                          {review.sentiment_label}
                        </Badge>
                      )}
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
            {filtered.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No reviews match the selected filter.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
