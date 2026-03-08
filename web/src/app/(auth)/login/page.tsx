"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, Star, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  // Fix: Next.js misses popstate when navigating back to a hash URL on a different route
  useEffect(() => {
    const onPopState = () => {
      if (window.location.pathname !== "/login") {
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
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
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
            Your reviews,
            <br />
            <span className="text-gradient-brand">answered perfectly.</span>
          </h2>
          <p className="text-white/50 text-sm mb-10">
            AI-powered review management for local businesses.
          </p>

          {/* Mini review card mockup */}
          <div
            className="rounded-xl bg-white/[0.07] backdrop-blur-sm border border-white/10 p-4 mb-3 animate-fade-in-up"
            style={{ animationDelay: "200ms" }}
          >
            <div className="flex items-center gap-2.5 mb-2">
              <div className="size-7 rounded-full bg-gradient-to-br from-orange-400 to-amber-400 flex items-center justify-center text-[10px] font-bold text-white">
                JD
              </div>
              <div>
                <div className="text-xs font-medium text-white/90">John D.</div>
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="size-2.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>
            </div>
            <p className="text-[11px] text-white/50 leading-relaxed">
              &quot;Absolutely love this place! The staff was incredibly friendly and the service was outstanding.&quot;
            </p>
          </div>

          {/* AI response card */}
          <div
            className="rounded-xl bg-white/[0.07] backdrop-blur-sm border border-white/10 p-4 animate-fade-in-up"
            style={{ animationDelay: "400ms" }}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="size-3 text-brand" />
              <span className="text-[10px] font-medium text-brand">AI Draft</span>
            </div>
            <p className="text-[11px] text-white/50 leading-relaxed">
              &quot;Thank you so much, John! We&apos;re thrilled to hear about your wonderful experience...&quot;
              <span className="inline-block w-0.5 h-3 bg-brand ml-0.5 rounded-full animate-blink align-text-bottom" />
            </p>
          </div>

          {/* Trust stats */}
          <div className="flex items-center gap-5 mt-8">
            {["500+ Businesses", "98% Response Rate"].map((stat) => (
              <span key={stat} className="text-[11px] text-white/30 flex items-center gap-1.5">
                <div className="size-1 rounded-full bg-brand/50" />
                {stat}
              </span>
            ))}
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
              Welcome back
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in to your account
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
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
            <div className="space-y-2 animate-fade-in-up" style={{ animationDelay: "150ms" }}>
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
            <div className="animate-fade-in-up" style={{ animationDelay: "200ms" }}>
              <Button type="submit" className="w-full rounded-full btn-shimmer" size="lg" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground animate-fade-in-up" style={{ animationDelay: "250ms" }}>
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-brand link-underline hover:text-brand/80 transition-colors">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
