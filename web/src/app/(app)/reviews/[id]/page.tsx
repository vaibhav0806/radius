"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Sparkles,
  Star,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
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

function statusBadge(status: string) {
  switch (status) {
    case "sent":
      return "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300";
    case "skipped":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-secondary text-secondary-foreground";
  }
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
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
      <div className="space-y-6 animate-fade-in-up">
        <Link className={cn(buttonVariants({ variant: "ghost", size: "sm" }))} href="/reviews">
          <ArrowLeft className="size-4" />
          Back to Reviews
        </Link>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="skeleton-shimmer h-64 w-full rounded-xl" />
          <div className="skeleton-shimmer h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <Link className={cn(buttonVariants({ variant: "ghost", size: "sm" }))} href="/reviews">
          <ArrowLeft className="size-4" />
          Back to Reviews
        </Link>
        <p className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="size-4" />
          {error || "Review not found"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Link className={cn(buttonVariants({ variant: "ghost", size: "sm" }))} href="/reviews">
        <ArrowLeft className="size-4" />
        Back to Reviews
      </Link>

      {error && (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="size-4" />
          {error}
        </p>
      )}
      {successMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          <CheckCircle className="size-4 shrink-0" />
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left column - Review Card */}
        <Card className="card-hover-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback className="bg-gradient-to-br from-orange-200 to-amber-200 dark:from-orange-800 dark:to-amber-800 text-orange-700 dark:text-orange-200">
                  {getInitials(review.author_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{review.author_name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(review.review_time)}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className={`size-5 ${i <= review.rating ? "text-amber-400" : "text-muted-foreground/30"}`}
                  fill={i <= review.rating ? "currentColor" : "none"}
                />
              ))}
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            {review.text && (
              <p className="text-sm leading-relaxed">{review.text}</p>
            )}
            {review.sentiment_label && (
              <Badge className={sentimentColor(review.sentiment_label)}>
                {review.sentiment_label}
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Right column - Response Editor Card */}
        <Card className="card-hover-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-brand" />
              AI Response
            </CardTitle>
            {response && (
              <CardAction>
                <Badge className={statusBadge(response.status)}>
                  {response.status}
                </Badge>
              </CardAction>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {!response && actionLoading !== "regenerate" ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  No AI response generated yet.
                </p>
                <Button
                  className="rounded-full btn-shimmer"
                  onClick={handleRegenerate}
                  disabled={actionLoading === "regenerate"}
                >
                  Generate Response
                </Button>
              </div>
            ) : !response && actionLoading === "regenerate" ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Generating response...
                </p>
                <Button disabled>Generating...</Button>
              </div>
            ) : isSent ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
                  <CheckCircle className="size-4 shrink-0" />
                  Response published
                </div>
                <div className="whitespace-pre-wrap rounded-lg bg-muted/50 p-4 text-sm">
                  {response.draft_text}
                </div>
              </div>
            ) : isSkipped ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                  This review was skipped
                </div>
                <Collapsible
                  open={showInstructions}
                  onOpenChange={setShowInstructions}
                >
                  <CollapsibleTrigger className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition-all hover:bg-muted hover:text-foreground">
                    <RefreshCw className="size-4" />
                    Regenerate
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-3 space-y-3">
                      <Textarea
                        placeholder="Optional: extra instructions for regeneration"
                        value={extraInstructions}
                        onChange={(e) => setExtraInstructions(e.target.value)}
                        rows={2}
                      />
                      <Button
                        className="rounded-full"
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
                  </CollapsibleContent>
                </Collapsible>
              </div>
            ) : (
              <>
                <Textarea
                  id="draft-text"
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  className="min-h-[200px]"
                  rows={8}
                />
              </>
            )}
          </CardContent>
          {isDraft && response && (
            <CardFooter className="flex-col gap-3">
              <div className="flex w-full items-center justify-between">
                <div>
                  {isDraftModified && (
                    <Button
                      className="rounded-full"
                      variant="outline"
                      size="sm"
                      onClick={handleSaveEdit}
                      disabled={actionLoading === "save"}
                    >
                      {actionLoading === "save" ? "Saving..." : "Save Edit"}
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    className="rounded-full btn-shimmer"
                    onClick={handleApprove}
                    disabled={!!actionLoading}
                    size="sm"
                  >
                    {actionLoading === "approve"
                      ? "Publishing..."
                      : "Approve & Publish"}
                  </Button>
                  <Button
                    className="rounded-full"
                    variant="ghost"
                    size="sm"
                    onClick={handleSkip}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === "skip" ? "Skipping..." : "Skip"}
                  </Button>
                </div>
              </div>
              <div className="w-full">
                <Collapsible
                  open={showInstructions}
                  onOpenChange={setShowInstructions}
                >
                  <CollapsibleTrigger className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition-all hover:bg-muted hover:text-foreground">
                    <RefreshCw className="size-4" />
                    Regenerate
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-3 space-y-3">
                      <Textarea
                        placeholder="Optional: extra instructions for regeneration"
                        value={extraInstructions}
                        onChange={(e) => setExtraInstructions(e.target.value)}
                        rows={2}
                      />
                      <Button
                        className="rounded-full"
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
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
