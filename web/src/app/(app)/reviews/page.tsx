"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
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
  const color =
    rating <= 2
      ? "text-red-500"
      : rating === 3
        ? "text-yellow-500"
        : "text-green-500";

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`size-4 ${i <= rating ? color : "text-gray-300"}`}
          fill={i <= rating ? "currentColor" : "none"}
        />
      ))}
    </div>
  );
}

function sentimentVariant(label: string) {
  switch (label) {
    case "positive":
      return "default" as const;
    case "negative":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
}

function sentimentColor(label: string) {
  switch (label) {
    case "positive":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "negative":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    default:
      return "";
  }
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
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">Reviews</h1>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : reviews.length === 0 ? (
        <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-dashed">
          <p className="max-w-sm text-center text-muted-foreground">
            No reviews yet. Connect a Google Business Profile location to get
            started.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Filter by rating:</span>
            <button
              onClick={() => setRatingFilter(null)}
              className={`rounded-md px-3 py-1 text-sm ${
                ratingFilter === null
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            {[1, 2, 3, 4, 5].map((r) => (
              <button
                key={r}
                onClick={() => setRatingFilter(r)}
                className={`rounded-md px-3 py-1 text-sm ${
                  ratingFilter === r
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {r} <Star className="mb-0.5 inline size-3" />
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {filtered.map((review) => (
              <Link
                key={review.id}
                href={`/reviews/${review.id}`}
                className="block transition-colors hover:opacity-80"
              >
                <Card className="cursor-pointer transition-shadow hover:ring-2 hover:ring-ring/30">
                  <CardContent className="space-y-3 pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{review.author_name}</span>
                        <StarRating rating={review.rating} />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(review.review_time)}
                      </span>
                    </div>
                    {review.text && (
                      <p className="text-sm">{review.text}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {review.sentiment_label && (
                          <Badge
                            variant={sentimentVariant(review.sentiment_label)}
                            className={sentimentColor(review.sentiment_label)}
                          >
                            {review.sentiment_label}
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm font-medium text-muted-foreground hover:text-foreground">
                        View &amp; Respond
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-sm text-muted-foreground">
                No reviews match the selected filter.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
