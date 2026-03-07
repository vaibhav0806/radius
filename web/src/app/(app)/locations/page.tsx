"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { MapPin, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
      <div className="space-y-8">
        <h1 className="text-2xl font-semibold tracking-tight">Locations</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-semibold tracking-tight">Locations</h1>
        <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-dashed">
          <div className="text-center">
            <p className="mb-4 text-muted-foreground">
              Create a business first
            </p>
            <Link href="/settings">
              <Button>Go to Settings</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Locations</h1>
        <Button onClick={handleConnect} disabled={connecting}>
          {connecting ? "Connecting..." : "Connect Google Business Profile"}
        </Button>
      </div>

      {connected && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          Google Business Profile connected successfully!
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {locations.length === 0 ? (
        <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-dashed">
          <div className="text-center">
            <MapPin className="mx-auto mb-4 size-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              No locations yet. Connect your Google Business Profile to get
              started.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {locations.map((location) => (
            <Card key={location.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle>{location.name}</CardTitle>
                  <button
                    onClick={() => handleDelete(location.id)}
                    className="text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {location.address && (
                  <p className="text-sm text-muted-foreground">
                    {location.address}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block size-2 rounded-full ${
                      location.poll_enabled ? "bg-green-500" : "bg-gray-400"
                    }`}
                  />
                  <span className="text-sm text-muted-foreground">
                    {location.poll_enabled ? "Polling active" : "Polling inactive"}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Last polled:{" "}
                  {location.last_polled_at
                    ? timeAgo(location.last_polled_at)
                    : "Never"}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
