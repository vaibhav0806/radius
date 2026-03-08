"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, Star, ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  // Fix: Next.js misses popstate when navigating back to a hash URL on a different route
  useEffect(() => {
    const onPopState = () => {
      if (window.location.pathname !== "/register") {
        window.location.reload();
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(email, password, name);
      router.push("/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel — immersive brand showcase */}
      <div className="relative hidden w-1/2 items-center justify-center overflow-hidden bg-[#0a0a0a] lg:flex">
        {/* Dot pattern */}
        <div className="absolute inset-0 bg-dot-pattern opacity-20 pointer-events-none" />

        {/* Floating orbs */}
        <div className="absolute top-[20%] left-[15%] w-72 h-72 bg-orange-500/10 rounded-full blur-[100px] animate-float-1 pointer-events-none" />
        <div className="absolute bottom-[20%] right-[10%] w-80 h-80 bg-teal-500/10 rounded-full blur-[120px] animate-float-2 pointer-events-none" />
        <div
          className="absolute top-[60%] left-[50%] w-56 h-56 bg-amber-500/[0.08] rounded-full blur-[80px] animate-float-1 pointer-events-none"
          style={{ animationDelay: "-3s" }}
        />

        <div className="relative z-10 max-w-md px-12">
          {/* Logo */}
          <div className="mb-8">
            <span className="text-2xl font-extrabold tracking-[-0.02em] font-logo text-white">radius</span>
          </div>

          <h2 className="text-3xl font-semibold text-white tracking-tight mb-3">
            Start managing reviews
            <br />
            <span className="text-gradient-brand">in minutes.</span>
          </h2>
          <p className="text-white/50 text-sm mb-10">
            Join 500+ local businesses already using Radius.
          </p>

          {/* Value props */}
          <div className="space-y-4 mb-10">
            {[
              "AI-powered responses in your brand voice",
              "Real-time review monitoring & alerts",
              "Sentiment analytics & rating trends",
            ].map((item, i) => (
              <div
                key={item}
                className="flex items-center gap-3 animate-fade-in-up"
                style={{ animationDelay: `${200 + i * 100}ms` }}
              >
                <div className="size-6 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
                  <Check className="size-3 text-brand" />
                </div>
                <span className="text-sm text-white/60">{item}</span>
              </div>
            ))}
          </div>

          {/* Mini dashboard preview */}
          <div
            className="rounded-xl bg-white/[0.07] backdrop-blur-sm border border-white/10 p-4 animate-fade-in-up"
            style={{ animationDelay: "500ms" }}
          >
            <div className="flex items-center gap-1.5 mb-3">
              <Sparkles className="size-3 text-brand" />
              <span className="text-[10px] font-medium text-brand">Live Dashboard</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Reviews", value: "1,284" },
                { label: "Avg Rating", value: "4.7" },
                { label: "Response", value: "98%" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-lg bg-white/[0.05] p-2">
                  <div className="text-[9px] text-white/30 mb-0.5">{stat.label}</div>
                  <div className="text-sm font-bold text-white/80">{stat.value}</div>
                </div>
              ))}
            </div>
            <div className="flex items-end gap-[2px] h-10 mt-3">
              {[35, 50, 40, 65, 55, 70, 60, 80, 75, 85, 78, 90].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-brand/20"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="relative flex w-full flex-col items-center justify-center bg-background px-6 lg:w-1/2">
        {/* Back to home */}
        <Link
          href="/"
          className="absolute top-6 left-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Home
        </Link>

        <div className="w-full max-w-sm">
          <div className="mb-8 animate-fade-in-up">
            {/* Mobile logo */}
            <div className="mb-6 lg:hidden">
              <span className="text-lg font-extrabold tracking-[-0.02em] font-logo text-foreground">radius</span>
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Create your account
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Start managing reviews in minutes
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2 animate-fade-in-up" style={{ animationDelay: "150ms" }}>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <div className="animate-fade-in-up" style={{ animationDelay: "250ms" }}>
              <Button type="submit" className="w-full rounded-full btn-shimmer" size="lg" disabled={loading}>
                {loading ? "Creating account..." : "Sign up"}
              </Button>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground animate-fade-in-up" style={{ animationDelay: "300ms" }}>
            Already have an account?{" "}
            <Link href="/login" className="text-brand link-underline hover:text-brand/80 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
