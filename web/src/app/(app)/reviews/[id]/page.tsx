"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { fetchAPI } from "@/lib/api";

interface Review {
  id: string;
  author_name: string;
  rating: number;
  text: string;
  review_time: string;
  sentiment_label?: string;
}

interface ReviewResponse {
  id: string;
  review_id: string;
  draft_text: string;
  status: string;
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

function statusVariant(status: string) {
  switch (status) {
    case "sent":
      return "default" as const;
    case "approved":
      return "default" as const;
    case "skipped":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

function statusColor(status: string) {
  switch (status) {
    case "sent":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "approved":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "skipped":
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
    default:
      return "";
  }
}

export default function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [review, setReview] = useState<Review | null>(null);
  const [response, setResponse] = useState<ReviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [draftText, setDraftText] = useState("");
  const [originalDraft, setOriginalDraft] = useState("");
  const [extraInstructions, setExtraInstructions] = useState("");
  const [showInstructions, setShowInstructions] = useState(false);

  const [actionLoading, setActionLoading] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      // Load reviews to find the one we need
      const businesses: Business[] = await fetchAPI("/api/businesses");
      if (businesses.length === 0) {
        setError("No business found");
        return;
      }
      const locations: Location[] = await fetchAPI(
        `/api/businesses/${businesses[0].id}/locations`
      );
      let foundReview: Review | null = null;
      for (const loc of locations) {
        try {
          const locReviews: Review[] = await fetchAPI(
            `/api/locations/${loc.id}/reviews`
          );
          const match = locReviews.find((r) => r.id === id);
          if (match) {
            foundReview = match;
            break;
          }
        } catch {
          // Skip locations that fail
        }
      }

      if (!foundReview) {
        setError("Review not found");
        return;
      }
      setReview(foundReview);

      // Load response
      try {
        const resp = await fetchAPI(`/api/reviews/${id}/response`);
        setResponse(resp);
        setDraftText(resp.draft_text || "");
        setOriginalDraft(resp.draft_text || "");
      } catch {
        // No response yet
        setResponse(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load review");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegenerate() {
    try {
      setActionLoading("regenerate");
      setError("");
      setSuccessMessage("");
      const body: Record<string, string> = {};
      if (extraInstructions.trim()) {
        body.extra_instructions = extraInstructions.trim();
      }
      const resp = await fetchAPI(`/api/reviews/${id}/response/regenerate`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setResponse(resp);
      setDraftText(resp.draft_text || "");
      setOriginalDraft(resp.draft_text || "");
      setExtraInstructions("");
      setShowInstructions(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate");
    } finally {
      setActionLoading("");
    }
  }

  async function handleSaveEdit() {
    try {
      setActionLoading("save");
      setError("");
      setSuccessMessage("");
      const resp = await fetchAPI(`/api/reviews/${id}/response`, {
        method: "PUT",
        body: JSON.stringify({ draft_text: draftText }),
      });
      setResponse(resp);
      setOriginalDraft(draftText);
      setSuccessMessage("Draft saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save edit");
    } finally {
      setActionLoading("");
    }
  }

  async function handleApprove() {
    try {
      setActionLoading("approve");
      setError("");
      setSuccessMessage("");
      const resp = await fetchAPI(`/api/reviews/${id}/response/approve`, {
        method: "POST",
      });
      setResponse(resp);
      setDraftText(resp.draft_text || "");
      setOriginalDraft(resp.draft_text || "");
      setSuccessMessage("Response published to Google!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setActionLoading("");
    }
  }

  async function handleSkip() {
    try {
      setActionLoading("skip");
      setError("");
      setSuccessMessage("");
      const resp = await fetchAPI(`/api/reviews/${id}/response/skip`, {
        method: "POST",
      });
      setResponse(resp);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to skip");
    } finally {
      setActionLoading("");
    }
  }

  const isDraftModified = draftText !== originalDraft;
  const isDraft = response?.status === "draft";
  const isSent = response?.status === "sent";
  const isSkipped = response?.status === "skipped";

  if (loading) {
    return (
      <div className="space-y-8">
        <Link
          href="/reviews"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Reviews
        </Link>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="space-y-8">
        <Link
          href="/reviews"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Reviews
        </Link>
        <p className="text-sm text-destructive">{error || "Review not found"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/reviews"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Reviews
      </Link>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {successMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          {successMessage}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Review details */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{review.author_name}</span>
                  <StarRating rating={review.rating} />
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatDate(review.review_time)}
                </span>
              </div>
              {review.text && <p className="text-sm">{review.text}</p>}
              {review.sentiment_label && (
                <Badge
                  variant={sentimentVariant(review.sentiment_label)}
                  className={sentimentColor(review.sentiment_label)}
                >
                  {review.sentiment_label}
                </Badge>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Response editor */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Response</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!response ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    No AI response generated yet.
                  </p>
                  <Button
                    onClick={handleRegenerate}
                    disabled={actionLoading === "regenerate"}
                  >
                    {actionLoading === "regenerate"
                      ? "Generating..."
                      : "Generate Response"}
                  </Button>
                </div>
              ) : isSent ? (
                <div className="space-y-3">
                  <Badge
                    variant={statusVariant("sent")}
                    className={statusColor("sent")}
                  >
                    Published
                  </Badge>
                  <p className="whitespace-pre-wrap text-sm">
                    {response.draft_text}
                  </p>
                </div>
              ) : isSkipped ? (
                <div className="space-y-3">
                  <Badge
                    variant={statusVariant("skipped")}
                    className={statusColor("skipped")}
                  >
                    Skipped
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    This review was skipped.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Badge
                    variant={statusVariant(response.status)}
                    className={statusColor(response.status)}
                  >
                    {response.status}
                  </Badge>
                  <div className="space-y-2">
                    <Label htmlFor="draft-text">Draft</Label>
                    <Textarea
                      id="draft-text"
                      value={draftText}
                      onChange={(e) => setDraftText(e.target.value)}
                      rows={6}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {isDraftModified && (
                      <Button
                        variant="outline"
                        onClick={handleSaveEdit}
                        disabled={actionLoading === "save"}
                      >
                        {actionLoading === "save" ? "Saving..." : "Save Edit"}
                      </Button>
                    )}
                    {isDraft && (
                      <>
                        <Button
                          onClick={handleApprove}
                          disabled={!!actionLoading}
                        >
                          {actionLoading === "approve"
                            ? "Publishing..."
                            : "Approve & Publish"}
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={handleSkip}
                          disabled={!!actionLoading}
                        >
                          {actionLoading === "skip" ? "Skipping..." : "Skip"}
                        </Button>
                      </>
                    )}
                  </div>
                  {isDraft && (
                    <div className="space-y-2 border-t pt-3">
                      <button
                        type="button"
                        onClick={() => setShowInstructions(!showInstructions)}
                        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                      >
                        <RefreshCw className="size-3" />
                        Regenerate
                      </button>
                      {showInstructions && (
                        <div className="space-y-2">
                          <Textarea
                            placeholder="Optional: extra instructions for regeneration"
                            value={extraInstructions}
                            onChange={(e) =>
                              setExtraInstructions(e.target.value)
                            }
                            rows={2}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRegenerate}
                            disabled={actionLoading === "regenerate"}
                          >
                            {actionLoading === "regenerate"
                              ? "Regenerating..."
                              : "Regenerate"}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
