"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { MapPin, Trash2, Clock, CheckCircle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { fetchAPI } from "@/lib/api";

interface Business {
  id: string;
  name: string;
  type: string;
}

interface Location {
  id: string;
  name: string;
  address: string;
  poll_enabled: boolean;
  last_polled_at: string | null;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function LocationsPage() {
  const searchParams = useSearchParams();
  const connected = searchParams.get("connected") === "true";

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const biz = await fetchAPI("/api/businesses");
      setBusinesses(biz);
      if (biz.length > 0) {
        const locs = await fetchAPI(`/api/businesses/${biz[0].id}/locations`);
        setLocations(locs);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect() {
    if (businesses.length === 0) return;
    try {
      setConnecting(true);
      setError("");
      const data = await fetchAPI(
        `/api/google/auth?business_id=${businesses[0].id}`
      );
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start OAuth");
      setConnecting(false);
    }
  }

  async function handleDelete(locationId: string) {
    if (businesses.length === 0) return;
    try {
      setError("");
      await fetchAPI(
        `/api/businesses/${businesses[0].id}/locations/${locationId}`,
        { method: "DELETE" }
      );
      setLocations((prev) => prev.filter((l) => l.id !== locationId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete location");
    }
  }

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Locations</h1>
            <p className="text-muted-foreground">Manage your connected business locations</p>
          </div>
          <div className="skeleton-shimmer h-9 w-56 rounded" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="skeleton-shimmer h-5 w-40 rounded" />
                <div className="skeleton-shimmer h-4 w-56 rounded" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="skeleton-shimmer h-5 w-16 rounded" />
                <div className="skeleton-shimmer h-4 w-32 rounded" />
              </CardContent>
              <CardFooter className="flex justify-between">
                <div className="skeleton-shimmer h-8 w-24 rounded" />
                <div className="skeleton-shimmer size-8 rounded" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <div className="space-y-8 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Locations</h1>
          <p className="text-muted-foreground">Manage your connected business locations</p>
        </div>
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl bg-muted/30 border border-dashed border-border/50">
          <div className="size-16 rounded-2xl bg-brand/10 flex items-center justify-center mb-4">
            <MapPin className="size-7 text-brand" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No business found</h2>
          <p className="text-muted-foreground mb-6">
            Create a business first to connect locations
          </p>
          <Link className={cn(buttonVariants(), "rounded-full btn-shimmer")} href="/settings">
            Go to Settings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Locations</h1>
          <p className="text-muted-foreground">Manage your connected business locations</p>
        </div>
        <Button onClick={handleConnect} disabled={connecting} className="rounded-full btn-shimmer">
          {connecting ? "Connecting..." : "Connect Google Business Profile"}
        </Button>
      </div>

      {connected && (
        <Alert className="border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400">
          <CheckCircle className="size-4" />
          <AlertTitle>Location connected</AlertTitle>
          <AlertDescription>
            Google Business Profile connected successfully! Your reviews will be synced shortly.
          </AlertDescription>
        </Alert>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {locations.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl bg-muted/30 border border-dashed border-border/50">
          <div className="size-16 rounded-2xl bg-brand/10 flex items-center justify-center mb-4">
            <MapPin className="size-7 text-brand" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No locations yet</h2>
          <p className="text-muted-foreground mb-6">
            Connect your Google Business Profile to get started
          </p>
          <Button onClick={handleConnect} disabled={connecting} className="rounded-full btn-shimmer">
            {connecting ? "Connecting..." : "Connect Google Business Profile"}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <TooltipProvider>
            {locations.map((location, index) => (
              <Card key={location.id} className="card-hover-border overflow-hidden animate-fade-in-up" style={{ animationDelay: `${index * 75}ms` }}>
                <div className="h-0.5 bg-gradient-to-r from-brand/60 via-brand to-brand/60" />
                <CardHeader>
                  <CardTitle className="font-semibold">{location.name}</CardTitle>
                  {location.address && (
                    <CardDescription>{location.address}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    {location.poll_enabled ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 dark:text-green-400">
                        <span className="relative flex size-2">
                          <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
                          <span className="relative inline-flex size-2 rounded-full bg-green-500" />
                        </span>
                        Active
                      </span>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="size-3" />
                    <span>
                      Last polled:{" "}
                      {location.last_polled_at
                        ? timeAgo(location.last_polled_at)
                        : "Never"}
                    </span>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Link className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "rounded-full")} href={`/reviews?location_id=${location.id}`}>
                    View Reviews
                  </Link>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(location.id)}
                        />
                      }
                    >
                      <Trash2 className="size-4" />
                    </TooltipTrigger>
                    <TooltipContent>Delete location</TooltipContent>
                  </Tooltip>
                </CardFooter>
              </Card>
            ))}
          </TooltipProvider>
        </div>
      )}
    </div>
  );
}
