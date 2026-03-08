"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Star,
  AlertTriangle,
  MessageSquare,
  Clock,
  CheckCircle,
  MapPin,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fetchAPI } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
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
  const { user } = useAuth();

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }

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

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {getGreeting()}, {user?.name?.split(" ")[0] || "there"}
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s how your reviews are performing
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="skeleton-shimmer size-10 rounded-xl" />
                  <div className="skeleton-shimmer h-3 w-20 rounded" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="skeleton-shimmer h-8 w-16 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="skeleton-shimmer h-5 w-36 rounded" />
              </CardHeader>
              <CardContent>
                <div className="rounded-xl bg-muted/20 border border-border/30 p-4">
                  <div className="skeleton-shimmer h-[300px] w-full rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {getGreeting()}, {user?.name?.split(" ")[0] || "there"}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s how your reviews are performing
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="animate-fade-in-up bg-teal-50/50 dark:bg-teal-950/10 border-teal-100/50 dark:border-teal-900/20 card-hover-border" style={{ animationDelay: '0ms' }}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center icon-box">
                <MessageSquare className="size-5 text-teal-600 dark:text-teal-400" />
              </div>
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Total Reviews
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">
              {stats?.total_reviews ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card className="animate-fade-in-up bg-amber-50/50 dark:bg-amber-950/10 border-amber-100/50 dark:border-amber-900/20 card-hover-border" style={{ animationDelay: '50ms' }}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center icon-box">
                <Star className="size-5 text-amber-600 dark:text-amber-400" />
              </div>
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Avg Rating
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">
              {stats?.avg_rating?.toFixed(1) ?? "-"}
            </p>
          </CardContent>
        </Card>

        <Card className="animate-fade-in-up bg-orange-50/50 dark:bg-orange-950/10 border-orange-100/50 dark:border-orange-900/20 card-hover-border" style={{ animationDelay: '100ms' }}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center icon-box">
                <Clock className="size-5 text-orange-600 dark:text-orange-400" />
              </div>
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Pending
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p
              className={`text-3xl font-bold tabular-nums ${
                stats && stats.pending_responses > 0
                  ? "text-amber-500"
                  : ""
              }`}
            >
              {stats?.pending_responses ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card className="animate-fade-in-up bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-100/50 dark:border-emerald-900/20 card-hover-border" style={{ animationDelay: '150ms' }}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center icon-box">
                <CheckCircle className="size-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Response Rate
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">
              {`${stats?.response_rate?.toFixed(1) ?? 0}%`}
            </p>
          </CardContent>
        </Card>

        <Card className="animate-fade-in-up bg-rose-50/50 dark:bg-rose-950/10 border-rose-100/50 dark:border-rose-900/20 card-hover-border" style={{ animationDelay: '200ms' }}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center icon-box">
                <AlertTriangle className="size-5 text-rose-600 dark:text-rose-400" />
              </div>
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Negative
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p
              className={`text-3xl font-bold tabular-nums ${
                stats && stats.negative_count > 0 ? "text-destructive" : ""
              }`}
            >
              {stats?.negative_count ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {!hasLocation ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl bg-muted/30 border border-dashed border-border/50">
          <div className="size-16 rounded-2xl bg-brand/10 flex items-center justify-center mb-4">
            <MapPin className="size-7 text-brand" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Connect your first location</h2>
          <p className="text-muted-foreground mb-6">
            Start monitoring reviews by connecting your Google Business Profile
          </p>
          <Link className={cn(buttonVariants(), "rounded-full btn-shimmer")} href="/locations">
            Connect Location
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <Card className="card-hover-border">
              <CardHeader>
                <CardTitle className="text-base font-medium">Sentiment Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl bg-muted/20 border border-border/30 p-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={sentimentTrend}>
                      <defs>
                        <linearGradient id="sentimentGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#22c55e" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="var(--border)" strokeOpacity={0.5} horizontal vertical={false} />
                      <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis domain={[-1, 1]} fontSize={12} tickLine={false} axisLine={false} />
                      <RechartsTooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          const data = payload[0].payload;
                          return (
                            <div className="rounded-lg border bg-card px-3 py-2 text-sm shadow-md">
                              <p className="font-medium">{label}</p>
                              <p>Score: {Number(payload[0].value).toFixed(2)}</p>
                              <p className="text-muted-foreground">
                                Reviews: {data.count}
                              </p>
                            </div>
                          );
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#22c55e"
                        strokeWidth={2}
                        fill="url(#sentimentGrad)"
                        dot={{ r: 3, fill: "#22c55e", strokeWidth: 0 }}
                        activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover-border">
              <CardHeader>
                <CardTitle className="text-base font-medium">Rating Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl bg-muted/20 border border-border/30 p-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={ratingTrend}>
                      <defs>
                        <linearGradient id="ratingGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="var(--border)" strokeOpacity={0.5} horizontal vertical={false} />
                      <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis domain={[1, 5]} fontSize={12} tickLine={false} axisLine={false} />
                      <RechartsTooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          const data = payload[0].payload;
                          return (
                            <div className="rounded-lg border bg-card px-3 py-2 text-sm shadow-md">
                              <p className="font-medium">{label}</p>
                              <p>Rating: {Number(payload[0].value).toFixed(1)}</p>
                              <p className="text-muted-foreground">
                                Reviews: {data.count}
                              </p>
                            </div>
                          );
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fill="url(#ratingGrad)"
                        dot={{ r: 3, fill: "#3b82f6", strokeWidth: 0 }}
                        activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="card-hover-border">
              <CardHeader>
                <CardTitle className="text-base font-medium">Rating Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl bg-muted/20 border border-border/30 p-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={ratingData}>
                      <CartesianGrid stroke="var(--border)" strokeOpacity={0.5} horizontal vertical={false} />
                      <XAxis dataKey="rating" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis fontSize={12} allowDecimals={false} tickLine={false} axisLine={false} />
                      <RechartsTooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          return (
                            <div className="rounded-lg border bg-card px-3 py-2 text-sm shadow-md">
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
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover-border">
              <CardHeader>
                <CardTitle className="text-base font-medium">Sentiment Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl bg-muted/20 border border-border/30 p-4">
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
                      <RechartsTooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          return (
                            <div className="rounded-lg border bg-card px-3 py-2 text-sm shadow-md">
                              <p className="font-medium">{String(payload[0].name)}</p>
                              <p>Count: {payload[0].value}</p>
                            </div>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
