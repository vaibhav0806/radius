"use client";

import { useEffect, useState } from "react";
import { Star, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchAPI } from "@/lib/api";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface DashboardStats {
  total_reviews: number;
  avg_rating: number;
  pending_responses: number;
  response_rate: number;
  negative_count: number;
}

interface TrendPoint {
  date: string;
  value: number;
  count: number;
}

interface LocationStats {
  total_reviews: number;
  avg_rating: number;
  rating_distribution: Record<string, number>;
  sentiment_distribution: Record<string, number>;
  response_rate: number;
  pending_count: number;
  sentiment_trend: TrendPoint[];
  rating_trend: TrendPoint[];
}

interface Business {
  id: string;
}

interface Location {
  id: string;
}

const RATING_COLORS: Record<number, string> = {
  1: "#ef4444",
  2: "#ef4444",
  3: "#eab308",
  4: "#22c55e",
  5: "#22c55e",
};

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "#22c55e",
  neutral: "#6b7280",
  negative: "#ef4444",
};

function formatWeekDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [locationStats, setLocationStats] = useState<LocationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasLocation, setHasLocation] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const dashboardStats: DashboardStats = await fetchAPI("/api/dashboard/stats");
      setStats(dashboardStats);

      try {
        const businesses: Business[] = await fetchAPI("/api/businesses");
        if (businesses.length > 0) {
          const locations: Location[] = await fetchAPI(
            `/api/businesses/${businesses[0].id}/locations`
          );
          if (locations.length > 0) {
            setHasLocation(true);
            const locStats: LocationStats = await fetchAPI(
              `/api/locations/${locations[0].id}/reviews/stats`
            );
            setLocationStats(locStats);
          }
        }
      } catch {
        // No businesses/locations yet - charts won't show
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }

  const ratingData = locationStats
    ? [1, 2, 3, 4, 5].map((r) => ({
        rating: `${r}`,
        count: locationStats.rating_distribution[String(r)] || 0,
        fill: RATING_COLORS[r],
      }))
    : [];

  const sentimentData = locationStats
    ? Object.entries(locationStats.sentiment_distribution).map(([key, value]) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        value,
        fill: SENTIMENT_COLORS[key] || "#6b7280",
      }))
    : [];

  const sentimentTrend = locationStats
    ? locationStats.sentiment_trend.map((p) => ({
        ...p,
        date: formatWeekDate(p.date),
      }))
    : [];

  const ratingTrend = locationStats
    ? locationStats.rating_trend.map((p) => ({
        ...p,
        date: formatWeekDate(p.date),
      }))
    : [];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Reviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {loading ? "..." : stats?.total_reviews ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              <span className="flex items-center gap-1">
                Avg Rating
                <Star className="size-3.5 text-yellow-500" fill="currentColor" />
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {loading ? "..." : stats?.avg_rating?.toFixed(1) ?? "-"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Responses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-3xl font-bold ${
                !loading && stats && stats.pending_responses > 0
                  ? "text-amber-500"
                  : ""
              }`}
            >
              {loading ? "..." : stats?.pending_responses ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Response Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {loading ? "..." : `${stats?.response_rate?.toFixed(1) ?? 0}%`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              <span className="flex items-center gap-1">
                Negative Reviews
                <AlertTriangle className="size-3.5 text-muted-foreground" />
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-3xl font-bold ${
                !loading && stats && stats.negative_count > 0 ? "text-red-500" : ""
              }`}
            >
              {loading ? "..." : stats?.negative_count ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {!loading && !hasLocation ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-dashed">
          <p className="text-muted-foreground">
            Connect a location to see charts
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Sentiment Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                    Loading...
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={sentimentTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis domain={[-1, 1]} fontSize={12} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          const data = payload[0].payload;
                          return (
                            <div className="rounded-md border bg-background px-3 py-2 text-sm shadow-sm">
                              <p className="font-medium">{label}</p>
                              <p>Score: {Number(payload[0].value).toFixed(2)}</p>
                              <p className="text-muted-foreground">
                                Reviews: {data.count}
                              </p>
                            </div>
                          );
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#22c55e"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rating Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                    Loading...
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={ratingTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis domain={[1, 5]} fontSize={12} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          const data = payload[0].payload;
                          return (
                            <div className="rounded-md border bg-background px-3 py-2 text-sm shadow-sm">
                              <p className="font-medium">{label}</p>
                              <p>Rating: {Number(payload[0].value).toFixed(1)}</p>
                              <p className="text-muted-foreground">
                                Reviews: {data.count}
                              </p>
                            </div>
                          );
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Rating Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                    Loading...
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={ratingData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="rating" fontSize={12} />
                      <YAxis fontSize={12} allowDecimals={false} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          return (
                            <div className="rounded-md border bg-background px-3 py-2 text-sm shadow-sm">
                              <p className="font-medium">{label} Stars</p>
                              <p>Reviews: {payload[0].value}</p>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {ratingData.map((entry, index) => (
                          <Cell key={index} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sentiment Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                    Loading...
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={sentimentData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) =>
                          `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                        }
                      >
                        {sentimentData.map((entry, index) => (
                          <Cell key={index} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          return (
                            <div className="rounded-md border bg-background px-3 py-2 text-sm shadow-sm">
                              <p className="font-medium">{String(payload[0].name)}</p>
                              <p>Count: {payload[0].value}</p>
                            </div>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
