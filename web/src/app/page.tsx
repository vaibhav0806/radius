"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  MessageSquare,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: Bell,
    title: "Smart Monitoring",
    description:
      "Automatically track new Google reviews across all your locations. Get instant alerts for negative reviews so you can respond fast.",
  },
  {
    icon: MessageSquare,
    title: "AI Response Drafts",
    description:
      "Our AI learns your brand voice and drafts personalized responses. Just review, tweak if needed, and publish.",
  },
  {
    icon: TrendingUp,
    title: "Sentiment Analytics",
    description:
      "Track customer sentiment over time. See rating trends, response rates, and identify areas for improvement.",
  },
];

const steps = [
  { number: "1", title: "Connect Google", description: "Link your Google Business Profile in one click." },
  { number: "2", title: "Set Your Voice", description: "Tell us your brand tone and we'll match it." },
  { number: "3", title: "Review & Publish", description: "Approve AI drafts and publish responses instantly." },
];

const starterFeatures = [
  "1 location",
  "Unlimited reviews",
  "AI response drafts",
  "Sentiment analysis",
  "Email alerts",
];

const growthFeatures = [
  "Up to 5 locations",
  "Everything in Starter",
  "Priority support",
  "Advanced analytics",
];

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <div className="relative mx-auto max-w-5xl px-6 pb-24 pt-20 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Never Miss a Review.
            <br />
            Always Respond On-Brand.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            AI-powered review management for local businesses. Monitor Google
            reviews, get instant response drafts, and build customer loyalty —
            all on autopilot.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            {isLoggedIn ? (
              <Link href="/dashboard">
                <Button size="lg">
                  Go to Dashboard
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/register">
                  <Button size="lg">
                    Get Started Free
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
                <a href="#features">
                  <Button variant="outline" size="lg">
                    See How It Works
                  </Button>
                </a>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-muted/40 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight">
            Everything you need to manage reviews
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
            Stop losing customers to unanswered reviews. ReviewFlow handles it
            all.
          </p>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title}>
                <CardHeader>
                  <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="size-5 text-primary" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight">
            How It Works
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
            Get up and running in minutes, not hours.
          </p>
          <div className="mt-16 grid gap-12 sm:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  {step.number}
                </div>
                <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-muted/40 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight">
            Simple, transparent pricing
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
            Start free, upgrade when you&apos;re ready.
          </p>
          <div className="mx-auto mt-16 grid max-w-3xl gap-8 sm:grid-cols-2">
            {/* Starter */}
            <Card>
              <CardHeader>
                <CardTitle>Starter</CardTitle>
                <div className="mt-2">
                  <span className="text-3xl font-bold">$29</span>
                  <span className="text-muted-foreground">/mo</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {starterFeatures.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="size-4 text-green-600" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="block">
                  <Button variant="outline" className="w-full">
                    Get Started
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Growth */}
            <Card className="ring-2 ring-primary">
              <CardHeader>
                <CardTitle>Growth</CardTitle>
                <div className="mt-2">
                  <span className="text-3xl font-bold">$59</span>
                  <span className="text-muted-foreground">/mo</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {growthFeatures.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="size-4 text-green-600" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="block">
                  <Button className="w-full">Get Started</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <span className="text-lg font-semibold tracking-tight">
            ReviewFlow
          </span>
          <p className="mt-2 text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} ReviewFlow. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
