"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Sparkles,
  BarChart3,
  Bell,
  MapPin,
  Menu,
  Mic,
  Star,
  Activity,
  TrendingUp,
  X,
  Zap,
  Globe,
  Heart,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/reveal";

function AnimatedCounter({
  target,
  prefix = "",
  suffix = "",
  className,
}: {
  target: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const start = performance.now();
          const duration = 1200;
          const animate = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const value = eased * target;
            const display = target % 1 === 0 ? Math.round(value).toString() : value.toFixed(2);
            el.textContent = `${prefix}${display}${suffix}`;
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
          observer.unobserve(el);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, prefix, suffix]);

  return (
    <span ref={ref} className={className}>
      {prefix}0{suffix}
    </span>
  );
}

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("token"));
    let ticking = false;
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
      if (!ticking) {
        requestAnimationFrame(() => {
          const y = window.scrollY;
          document.querySelectorAll<HTMLElement>("[data-parallax]").forEach((el) => {
            const speed = parseFloat(el.dataset.parallax || "0");
            el.style.translate = `0 ${y * speed}px`;
          });
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const [activeSection, setActiveSection] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const navLinksRef = useRef<HTMLDivElement>(null);
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0 });

  const navItems = [
    { label: "Features", id: "features" },
    { label: "How It Works", id: "how-it-works" },
    { label: "Pricing", id: "pricing" },
  ];

  // Track which section is in view
  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>("section[id]");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { threshold: 0.2, rootMargin: "-100px 0px -40% 0px" }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  // Slide the pill to the active nav link
  useEffect(() => {
    const updatePill = () => {
      if (!navLinksRef.current || !activeSection) {
        setPillStyle({ left: 0, width: 0 });
        return;
      }
      const link = navLinksRef.current.querySelector<HTMLElement>(
        `[data-section="${activeSection}"]`
      );
      if (link) {
        setPillStyle({ left: link.offsetLeft, width: link.offsetWidth });
      }
    };
    updatePill();
    window.addEventListener("resize", updatePill);
    return () => window.removeEventListener("resize", updatePill);
  }, [activeSection]);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* ── Floating Navbar ── */}
      <nav
        className={cn(
          "fixed top-4 left-1/2 z-50 w-[calc(100%-1.5rem)] max-w-4xl rounded-3xl border px-6 transition-all duration-500 animate-nav-enter",
          scrolled
            ? "bg-white/60 dark:bg-white/[0.06] backdrop-blur-xl shadow-md shadow-black/[0.06] border-border/60"
            : "bg-white/50 dark:bg-white/[0.04] backdrop-blur-lg border-border/30",
          mobileOpen ? "py-3" : "py-2.5"
        )}
      >
        <div className="relative flex items-center justify-between min-h-[40px]">
          {/* Logo */}
          <Link href="/" className="relative z-10">
            <span className="text-[22px] font-extrabold tracking-[-0.02em] font-logo">radius</span>
          </Link>

          {/* Center nav links — absolutely centered */}
          <div
            ref={navLinksRef}
            className="hidden md:flex items-center gap-0.5 absolute left-1/2 -translate-x-1/2 bg-muted/60 rounded-full p-0.5"
          >
            {/* Sliding active pill */}
            <div
              className={cn(
                "absolute top-0.5 h-[calc(100%-4px)] bg-white dark:bg-background rounded-full shadow-sm transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                activeSection && pillStyle.width > 0 ? "opacity-100" : "opacity-0"
              )}
              style={{ left: pillStyle.left, width: pillStyle.width || 0 }}
            />
            {navItems.map((item) => (
              <a
                key={item.id}
                data-section={item.id}
                href={`#${item.id}`}
                className={cn(
                  "relative z-10 text-xs px-3 py-1 rounded-full transition-colors duration-200",
                  activeSection === item.id
                    ? "text-foreground"
                    : "text-foreground/50 hover:text-foreground"
                )}
              >
                {item.label}
              </a>
            ))}
          </div>

          {/* Right side */}
          <div className="relative z-10 flex items-center gap-3">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className={cn(buttonVariants({ size: "sm" }), "rounded-full btn-shimmer h-7 text-xs")}
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden sm:inline text-[13px] text-foreground/50 hover:text-foreground transition-colors duration-200"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className={cn(buttonVariants({ size: "sm" }), "rounded-full btn-shimmer h-7 px-4 text-xs")}
                >
                  Get Started
                </Link>
              </>
            )}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="hidden sm:flex items-center justify-center size-7 rounded-full text-foreground/40 hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Toggle theme"
            >
              <Sun className="hidden size-3.5 dark:block" />
              <Moon className="block size-3.5 dark:hidden" />
            </button>
            {/* Mobile hamburger */}
            <button
              className="md:hidden flex items-center justify-center size-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="size-3.5" /> : <Menu className="size-3.5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <div
          className={cn(
            "md:hidden grid transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
            mobileOpen ? "grid-rows-[1fr] opacity-100 mt-3" : "grid-rows-[0fr] opacity-0 mt-0"
          )}
        >
          <div className="overflow-hidden">
            <div className="flex flex-col gap-0.5 pb-1">
              {navItems.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "text-sm px-3 py-2 rounded-lg transition-colors duration-200",
                    activeSection === item.id
                      ? "text-foreground bg-muted"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {item.label}
                </a>
              ))}
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="flex items-center justify-center size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                aria-label="Toggle theme"
              >
                <Sun className="hidden size-4 dark:block" />
                <Moon className="block size-4 dark:hidden" />
              </button>
              {!isLoggedIn && (
                <div className="border-t border-border/40 mt-2 pt-2.5 flex flex-col gap-1.5">
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="text-sm px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      buttonVariants({ size: "sm" }),
                      "rounded-full btn-shimmer w-full justify-center"
                    )}
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-36 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        {/* Warm gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-orange-50/80 via-amber-50/40 to-transparent dark:from-orange-950/20 dark:via-amber-950/10 dark:to-transparent pointer-events-none" />

        {/* Floating orbs — each drifts at a different parallax rate */}
        <div data-parallax="-0.06" className="absolute top-16 left-[15%] w-80 h-80 bg-orange-200/60 dark:bg-orange-800/15 rounded-full blur-[100px] animate-float-1 pointer-events-none" />
        <div data-parallax="0.04" className="absolute top-32 right-[10%] w-[28rem] h-[28rem] bg-amber-200/50 dark:bg-amber-800/12 rounded-full blur-[120px] animate-float-2 pointer-events-none" />
        <div
          data-parallax="-0.1"
          className="absolute top-60 left-[40%] w-72 h-72 bg-teal-200/30 dark:bg-teal-800/10 rounded-full blur-[80px] animate-float-1 pointer-events-none"
          style={{ animationDelay: "-3s" }}
        />

        {/* Content */}
        <div data-parallax="0.12" className="relative mx-auto max-w-3xl px-6 text-center">
          {/* Pill badge */}
          <div className="animate-fade-in-up">
            <span className="inline-flex items-center gap-2 rounded-full border bg-white/60 dark:bg-muted/60 backdrop-blur-sm px-4 py-1.5 text-sm text-muted-foreground mb-8">
              <Sparkles className="size-3.5 text-brand" />
              AI-Powered Review Management
            </span>
          </div>

          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.08] animate-fade-in-up"
            style={{ animationDelay: "100ms" }}
          >
            Your reviews,
            <br />
            <span className="text-gradient-brand">answered perfectly.</span>
          </h1>

          <p
            className="mt-6 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto animate-fade-in-up"
            style={{ animationDelay: "200ms" }}
          >
            AI-powered review management that monitors, drafts, and publishes
            replies — so you can focus on running your business.
          </p>

          <div className="mt-10 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "text-base px-8 h-11 rounded-full btn-shimmer"
                )}
              >
                Go to Dashboard
                <ArrowRight className="ml-2 size-4" />
              </Link>
            ) : (
              <Link
                href="/register"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "text-base px-8 h-11 rounded-full btn-shimmer"
                )}
              >
                Start for free
                <ArrowRight className="ml-2 size-4" />
              </Link>
            )}
          </div>
        </div>

        {/* Dashboard mockup */}
        <div data-parallax="0.06" className="mx-auto mt-16 max-w-5xl px-6">
          <div className="animate-fade-in-up" style={{ animationDelay: "500ms" }}>
            <div className="relative">
              {/* Glow behind */}
              <div className="absolute -inset-8 bg-gradient-to-b from-orange-100/60 via-amber-50/40 to-transparent dark:from-orange-900/20 dark:via-transparent rounded-3xl blur-2xl pointer-events-none" />

              {/* Main card */}
              <div className="relative rounded-2xl bg-white/90 dark:bg-card/90 backdrop-blur-sm shadow-xl shadow-black/[0.04] dark:shadow-black/25 border border-white/60 dark:border-border/50 overflow-hidden animate-hover-float">
                {/* Top bar */}
                <div className="flex items-center gap-2 border-b border-border/40 px-5 py-3 bg-muted/30">
                  <div className="flex gap-1.5">
                    <div className="size-2.5 rounded-full bg-red-400/60" />
                    <div className="size-2.5 rounded-full bg-amber-400/60" />
                    <div className="size-2.5 rounded-full bg-green-400/60" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="rounded-md bg-muted px-4 py-0.5 text-[11px] text-muted-foreground">tryradius.app/dashboard</div>
                  </div>
                </div>

                {/* Dashboard content */}
                <div className="p-5">
                  {/* Stat cards row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    {[
                      { label: "Total Reviews", value: "1,284", change: "+12%", up: true },
                      { label: "Avg Rating", value: "4.7", change: "+0.3", up: true },
                      { label: "Response Rate", value: "98%", change: "+5%", up: true },
                      { label: "Sentiment", value: "92%", change: "+8%", up: true },
                    ].map((stat, i) => (
                      <div key={i} className="rounded-lg bg-muted/50 dark:bg-muted p-3">
                        <div className="text-[11px] text-muted-foreground mb-1">{stat.label}</div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-bold">{stat.value}</span>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                            <TrendingUp className="size-2.5" />{stat.change}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Bottom row: review + AI response + chart */}
                  <div className="grid md:grid-cols-5 gap-3">
                    {/* Review card */}
                    <div className="md:col-span-2 rounded-lg bg-muted/50 dark:bg-muted p-4">
                      <div className="text-[11px] font-medium text-muted-foreground mb-3">Latest Review</div>
                      <div className="flex items-center gap-2.5 mb-2.5">
                        <div className="size-7 rounded-full bg-gradient-to-br from-orange-200 to-amber-200 dark:from-orange-800 dark:to-amber-800 flex items-center justify-center text-[10px] font-semibold text-orange-700 dark:text-orange-200">
                          JD
                        </div>
                        <div>
                          <div className="text-xs font-medium leading-none mb-1">John D.</div>
                          <div className="flex gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className="size-2.5 fill-amber-400 text-amber-400" />
                            ))}
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        &quot;Absolutely love this place! The staff was incredibly friendly and the service was outstanding.&quot;
                      </p>
                    </div>

                    {/* AI response card */}
                    <div className="md:col-span-2 rounded-lg bg-muted/50 dark:bg-muted p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="secondary" className="text-[10px] gap-1 bg-brand/10 text-brand border-0 px-2 py-0.5">
                          <Sparkles className="size-2.5" />
                          AI Draft
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        &quot;Thank you so much, John! We&apos;re thrilled to hear about your wonderful experience. Our team takes great pride in service.&quot;
                        <span className="inline-block w-0.5 h-3 bg-brand ml-0.5 rounded-full animate-blink align-text-bottom" />
                      </p>
                      <div className="flex gap-2 mt-3">
                        <div className="rounded-md bg-foreground text-background px-2.5 py-1 text-[10px] font-medium">Publish</div>
                        <div className="rounded-md border border-border px-2.5 py-1 text-[10px] text-muted-foreground">Edit</div>
                      </div>
                    </div>

                    {/* Mini chart */}
                    <div className="md:col-span-1 rounded-lg bg-muted/50 dark:bg-muted p-4">
                      <div className="text-[11px] font-medium text-muted-foreground mb-3">Rating</div>
                      <div className="flex items-end gap-[3px] h-16">
                        {[35, 50, 40, 65, 55, 70, 60, 80, 75, 85, 78, 90].map((h, i) => (
                          <div
                            key={i}
                            className="flex-1 rounded-sm bg-brand/25 dark:bg-brand/30 transition-all hover:bg-brand/50"
                            style={{ height: `${h}%` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Social proof — commented out until we have real clients
        <div className="mx-auto mt-14 max-w-3xl px-6 animate-fade-in-up" style={{ animationDelay: "700ms" }}>
          <p className="text-center text-xs uppercase tracking-widest text-muted-foreground/70 mb-5">Trusted by 500+ local businesses</p>
          <div className="flex items-center justify-center gap-6 md:gap-10">
            {[
              { name: "Bloom Café", color: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400" },
              { name: "Urban Cuts", color: "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400" },
              { name: "PetPaws", color: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" },
              { name: "FreshBite", color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" },
              { name: "GlowSkin", color: "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400" },
            ].map((brand) => (
              <div key={brand.name} className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity duration-300">
                <div className={cn("size-5 rounded-full flex items-center justify-center text-[9px] font-bold", brand.color)}>
                  {brand.name[0]}
                </div>
                <span className="hidden sm:inline text-sm font-medium text-foreground/70 whitespace-nowrap">{brand.name}</span>
              </div>
            ))}
          </div>
        </div>
        */}
      </section>

      {/* ── Features — Bento Grid + Animated Mockups ── */}
      <section id="features" className="py-20 md:py-28 px-6">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <div className="text-center mb-14">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand mb-4">
                <Sparkles className="size-3" />
                Features
              </span>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
                Everything you need
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Monitor, respond, and analyze your reviews from a single dashboard.
              </p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-5">
            {/* Card 1: AI Responses — full width */}
            <Reveal delay={0} className="md:col-span-2">
              <div className="group card-hover-border bg-card border border-border/50 rounded-2xl overflow-hidden cursor-default">
                <div className="flex flex-col md:flex-row">
                  <div className="p-6 md:p-8 md:w-1/2 flex flex-col justify-center">
                    <h3 className="text-xl font-semibold mb-2">AI-Powered Responses</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-5">
                      Perfectly crafted replies that match your brand voice. Review, edit, and publish directly to Google — all in one click.
                    </p>
                    <a href="#how-it-works" className="text-sm font-medium inline-flex items-center gap-1.5 group/link hover:gap-2.5 transition-all duration-300">
                      See how it works <ArrowRight className="size-3.5" />
                    </a>
                  </div>
                  <div className="p-5 md:p-8 md:w-1/2">
                    <div className="rounded-xl bg-gradient-to-br from-orange-50 to-amber-50/50 dark:from-orange-950/30 dark:to-amber-950/20 p-4 border border-orange-100/50 dark:border-orange-900/20">
                      <div className="flex gap-3">
                        {/* Mini review */}
                        <div className="flex-1 rounded-lg bg-white/80 dark:bg-card/80 p-3 shadow-sm">
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className="size-5 rounded-full bg-gradient-to-br from-orange-200 to-amber-200 dark:from-orange-700 dark:to-amber-700" />
                            <div className="flex gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className="size-2 fill-amber-400 text-amber-400" />
                              ))}
                            </div>
                          </div>
                          <div className="h-1.5 w-full rounded bg-foreground/5 mb-1" />
                          <div className="h-1.5 w-3/4 rounded bg-foreground/5" />
                        </div>
                        {/* Arrow */}
                        <div className="flex items-center">
                          <ArrowRight className="size-3.5 text-muted-foreground/40" />
                        </div>
                        {/* Mini AI response with animated skeleton */}
                        <div className="flex-1 rounded-lg bg-white/80 dark:bg-card/80 p-3 shadow-sm">
                          <Badge variant="secondary" className="text-[9px] gap-0.5 bg-brand/10 text-brand border-0 px-1.5 py-0 mb-1.5">
                            <Sparkles className="size-2" />
                            AI
                          </Badge>
                          <div className="bar-grow-w h-1.5 rounded bg-brand/10 mb-1" style={{ width: "100%" }} />
                          <div className="bar-grow-w h-1.5 rounded bg-brand/10 mb-1" style={{ width: "83%", transitionDelay: "0.1s" }} />
                          <div className="bar-grow-w h-1.5 rounded bg-brand/10" style={{ width: "66%", transitionDelay: "0.2s" }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Card 2: Sentiment Analytics */}
            <Reveal delay={120}>
              <div className="group h-full card-hover-border bg-card border border-border/50 rounded-2xl overflow-hidden cursor-default flex flex-col">
                <div className="p-5 pb-0">
                  <div className="rounded-xl bg-gradient-to-br from-sky-50 to-indigo-50/50 dark:from-sky-950/30 dark:to-indigo-950/20 p-4 border border-sky-100/50 dark:border-sky-900/20">
                    <div className="flex items-end gap-1 h-20">
                      {[25, 40, 35, 55, 45, 60, 50, 70, 65, 80, 72, 85, 78, 92].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-sm bg-sky-300/50 dark:bg-sky-500/30 bar-grow group-hover:bg-sky-400/60 transition-colors duration-300"
                          style={{ height: `${h}%`, transitionDelay: `${i * 0.05}s` }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1.5">
                        <div className="size-1.5 rounded-full bg-sky-400" />
                        <span className="text-[10px] text-muted-foreground">Avg Rating</span>
                      </div>
                      <span className="text-xs font-semibold text-sky-600 dark:text-sky-400 flex items-center gap-0.5">
                        <TrendingUp className="size-3" />4.7
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-5 pt-4 flex flex-col flex-1">
                  <h3 className="text-lg font-semibold mb-1.5">Sentiment Analytics</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-4 flex-1">
                    Track rating trends, sentiment scores, and response rates over time. Understand how your reputation is evolving at a glance.
                  </p>
                  <a href="#" className="text-sm font-medium inline-flex items-center gap-1.5 group/link hover:gap-2.5 transition-all duration-300">
                    Explore analytics <ArrowRight className="size-3.5" />
                  </a>
                </div>
              </div>
            </Reveal>

            {/* Card 3: Real-time Alerts */}
            <Reveal delay={240}>
              <div className="group h-full card-hover-border bg-card border border-border/50 rounded-2xl overflow-hidden cursor-default flex flex-col">
                <div className="p-5 pb-0">
                  <div className="rounded-xl bg-gradient-to-br from-rose-50 to-pink-50/50 dark:from-rose-950/30 dark:to-pink-950/20 p-4 border border-rose-100/50 dark:border-rose-900/20">
                    {/* Bell with pulse ring */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-rose-400/20 animate-[pulse-ring_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
                        <div className="relative size-8 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center">
                          <Bell className="size-4 text-rose-500 dark:text-rose-400" />
                        </div>
                      </div>
                      <span className="text-xs font-medium text-rose-600 dark:text-rose-400">3 new alerts</span>
                    </div>
                    {/* Notification toasts */}
                    <div className="space-y-2">
                      {[
                        { color: "border-l-emerald-400", stars: 5, delay: "0s" },
                        { color: "border-l-red-400", stars: 2, delay: "0.15s" },
                        { color: "border-l-emerald-400", stars: 4, delay: "0.3s" },
                      ].map((toast, i) => (
                        <div
                          key={i}
                          className={cn(
                            "notification-toast rounded-lg bg-white/80 dark:bg-card/80 p-2 shadow-sm border-l-2 flex items-center gap-2",
                            toast.color
                          )}
                          style={{ transitionDelay: toast.delay }}
                        >
                          <div className="size-5 rounded-full bg-muted shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex gap-0.5 mb-0.5">
                              {[...Array(toast.stars)].map((_, j) => (
                                <div key={j} className="size-1 rounded-full bg-amber-400" />
                              ))}
                            </div>
                            <div className="h-1 w-3/4 rounded bg-foreground/5" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="p-5 pt-4 flex flex-col flex-1">
                  <h3 className="text-lg font-semibold mb-1.5">Real-time Alerts</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-4 flex-1">
                    Instant notifications for every review. Never miss a chance to respond quickly.
                  </p>
                  <a href="#" className="text-sm font-medium inline-flex items-center gap-1.5 group/link hover:gap-2.5 transition-all duration-300">
                    Set up alerts <ArrowRight className="size-3.5" />
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Trust — Asymmetric Bento ── */}
      <section className="py-24 md:py-32 px-6">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
                Built for local businesses
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Everything you need to manage your online reputation, in one place.
              </p>
            </div>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Row 1: Smart Monitoring (span-2) + AI Responses (span-1) */}
            <Reveal delay={0} className="lg:col-span-2">
              <div className="group h-full bg-orange-50/50 dark:bg-orange-950/10 rounded-2xl p-6 card-interactive cursor-default border border-orange-100/50 dark:border-orange-900/20">
                <div className="flex items-start gap-4">
                  <div className="size-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center icon-box shrink-0">
                    <Activity className="size-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold mb-1">Smart Monitoring</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                      Auto-sync reviews from Google every 15 minutes. Nothing slips through.
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <div className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Live &middot; Last sync 2m ago</span>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={70}>
              <div className="group h-full bg-teal-50/50 dark:bg-teal-950/10 rounded-2xl p-6 card-interactive cursor-default border border-teal-100/50 dark:border-teal-900/20">
                <div className="size-10 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center icon-box mb-3">
                  <Sparkles className="size-5 text-teal-600 dark:text-teal-400" />
                </div>
                <h3 className="text-base font-semibold mb-1">AI Responses</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Perfectly crafted replies in your brand voice, ready to publish.
                </p>
              </div>
            </Reveal>

            {/* Row 2: Sentiment (span-1) + Multi-Location (span-2) */}
            <Reveal delay={140}>
              <div className="group h-full bg-sky-50/50 dark:bg-sky-950/10 rounded-2xl p-6 card-interactive cursor-default border border-sky-100/50 dark:border-sky-900/20">
                <div className="size-10 rounded-xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center icon-box mb-3">
                  <BarChart3 className="size-5 text-sky-600 dark:text-sky-400" />
                </div>
                <h3 className="text-base font-semibold mb-1">Sentiment Analytics</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Track rating trends and sentiment scores over time.
                </p>
              </div>
            </Reveal>

            <Reveal delay={210} className="lg:col-span-2">
              <div className="group h-full bg-violet-50/50 dark:bg-violet-950/10 rounded-2xl p-6 card-interactive cursor-default border border-violet-100/50 dark:border-violet-900/20">
                <div className="flex items-start gap-4">
                  <div className="size-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center icon-box shrink-0">
                    <MapPin className="size-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold mb-1">Multi-Location</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                      Manage reviews across all your locations from a single dashboard.
                    </p>
                    <div className="flex items-center gap-3">
                      {["NYC", "LA", "CHI"].map((city, i) => (
                        <div key={city} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <div className="relative">
                            <div
                              className="absolute inset-0 rounded-full bg-violet-400/20 animate-[pulse-ring_2.5s_cubic-bezier(0.4,0,0.6,1)_infinite]"
                              style={{ animationDelay: `${i * 0.8}s` }}
                            />
                            <div className="relative size-2 rounded-full bg-violet-400" />
                          </div>
                          {city}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Row 3: Email Alerts + Brand Voice + Stats */}
            <Reveal delay={280}>
              <div className="group h-full bg-rose-50/50 dark:bg-rose-950/10 rounded-2xl p-6 card-interactive cursor-default border border-rose-100/50 dark:border-rose-900/20">
                <div className="size-10 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center icon-box mb-3">
                  <Bell className="size-5 text-rose-600 dark:text-rose-400" />
                </div>
                <h3 className="text-base font-semibold mb-1">Email Alerts</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Get instant notifications on negative reviews so you can act fast.
                </p>
              </div>
            </Reveal>

            <Reveal delay={350}>
              <div className="group h-full bg-amber-50/50 dark:bg-amber-950/10 rounded-2xl p-6 card-interactive cursor-default border border-amber-100/50 dark:border-amber-900/20">
                <div className="size-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center icon-box mb-3">
                  <Mic className="size-5 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-base font-semibold mb-1">Brand Voice</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Customize tone and style per location. The AI adapts to you.
                </p>
              </div>
            </Reveal>

            {/* Stats callout — dark contrast card */}
            <Reveal delay={420}>
              <div className="group h-full bg-[#0a0a0a] rounded-2xl p-6 card-interactive cursor-default">
                <div className="text-4xl font-bold tracking-tight mb-2 text-white">500+</div>
                <div className="text-sm text-white/60">
                  Local businesses trust Radius to manage their reviews
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="relative py-24 md:py-32 px-6 bg-muted/40 overflow-hidden">
        {/* Subtle radial brand glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-brand/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative mx-auto max-w-5xl">
          <Reveal>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
                How Radius works
              </h2>
              <p className="text-muted-foreground text-lg">
                Three steps to effortless review management.
              </p>
            </div>
          </Reveal>

          <div className="relative grid md:grid-cols-3 gap-12 md:gap-8">
            {/* Animated gradient line (desktop) */}
            <div className="hidden md:block absolute top-10 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] line-gradient-thick z-0" />

            {[
              {
                icon: Globe,
                title: "Connect",
                desc: "Link your Google Business Profile in one click. We start syncing every review immediately.",
                proof: { text: "Connected", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" },
              },
              {
                icon: Mic,
                title: "Configure",
                desc: "Set your brand voice, tone rules, and example responses. The AI learns to speak like you.",
                proofPills: true,
              },
              {
                icon: Zap,
                title: "Respond",
                desc: "Review AI-drafted responses, edit if needed, and publish directly to Google. That simple.",
                proof: { text: "Published", color: "bg-brand/10 text-brand" },
              },
            ].map((step, i) => (
              <Reveal key={i} delay={i * 150}>
                <div className="text-center relative z-10">
                  {/* Step circle with icon + double pulse ring */}
                  <div className="relative mx-auto mb-6 size-20">
                    <div
                      className="absolute inset-0 rounded-full border-2 border-brand/20 animate-[pulse-ring_2.5s_cubic-bezier(0.4,0,0.6,1)_infinite]"
                      style={{ animationDelay: `${i * 0.8}s` }}
                    />
                    <div
                      className="absolute inset-1 rounded-full border border-brand/10 animate-[pulse-ring_2.5s_cubic-bezier(0.4,0,0.6,1)_infinite]"
                      style={{ animationDelay: `${i * 0.8 + 0.4}s` }}
                    />
                    <div className="relative flex items-center justify-center size-20 rounded-full bg-muted border-2 border-brand/20 z-10 shadow-sm">
                      <step.icon className="size-7 text-brand" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-sm max-w-xs mx-auto leading-relaxed mb-3">
                    {step.desc}
                  </p>
                  {/* Mini proof elements */}
                  {step.proof && (
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium", step.proof.color)}>
                      <Check className="size-3" />
                      {step.proof.text}
                    </span>
                  )}
                  {step.proofPills && (
                    <div className="flex items-center justify-center gap-2">
                      {["Professional", "Friendly", "Casual"].map((tone, j) => (
                        <span
                          key={tone}
                          className={cn(
                            "rounded-full px-3 py-1 text-xs font-medium",
                            j === 1
                              ? "bg-brand/10 text-brand ring-1 ring-brand/20"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {tone}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 md:py-32 px-6">
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
                Simple pricing
              </h2>
              <p className="text-muted-foreground text-lg">
                Start free. Upgrade when you&apos;re ready.
              </p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto items-stretch">
            {/* Starter */}
            <Reveal delay={0} className="flex">
              <div className="relative rounded-2xl border bg-card p-8 card-interactive overflow-hidden flex flex-col w-full">
                <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none" />
                <div className="relative flex flex-col flex-1">
                  <h3 className="text-lg font-semibold mb-1">Starter</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    For single-location businesses
                  </p>
                  <div className="flex items-baseline gap-1 mb-8">
                    <AnimatedCounter target={9} prefix="$" className="text-5xl font-bold tracking-tight" />
                    <span className="text-muted-foreground">/mo</span>
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                    {[
                      "1 location",
                      "Unlimited reviews",
                      "AI response drafts",
                      "Sentiment analytics",
                      "Email alerts",
                    ].map((f, i) => (
                      <li
                        key={i}
                        className="price-feature flex items-center gap-3 text-sm"
                        style={{ transitionDelay: `${0.1 + i * 0.05}s` }}
                      >
                        <Check className="size-4 text-muted-foreground shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/register"
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "w-full rounded-full h-11"
                    )}
                  >
                    Get Started
                  </Link>
                </div>
              </div>
            </Reveal>

            {/* Growth (Popular) — animated gradient border */}
            <Reveal delay={120} className="flex">
              <div
                className="relative rounded-2xl p-px card-interactive flex flex-col w-full"
                style={{
                  background: "linear-gradient(180deg, oklch(0.55 0.15 175 / 0.4), oklch(0.55 0.15 175 / 0.1), transparent)",
                  backgroundSize: "100% 200%",
                  animation: "gradient-y 4s ease infinite",
                }}
              >
                {/* Glow behind */}
                <div className="absolute -inset-4 bg-brand/10 rounded-3xl blur-[60px] pointer-events-none" />
                <div className="relative rounded-2xl bg-card p-8 flex flex-col flex-1">
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-0.5 btn-shimmer">
                    Popular
                  </Badge>
                  <h3 className="text-lg font-semibold mb-1">Growth</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    For multi-location businesses
                  </p>
                  <div className="flex items-baseline gap-1 mb-8">
                    <AnimatedCounter target={19} prefix="$" className="text-5xl font-bold tracking-tight text-gradient-brand" />
                    <span className="text-muted-foreground">/mo</span>
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                    {[
                      "Up to 10 locations",
                      "Everything in Starter",
                      "Priority support",
                      "Custom voice per location",
                      "Advanced analytics",
                    ].map((f, i) => (
                      <li
                        key={i}
                        className="price-feature flex items-center gap-3 text-sm"
                        style={{ transitionDelay: `${0.1 + i * 0.05}s` }}
                      >
                        <Check className="size-4 text-brand shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/register"
                    className={cn(
                      buttonVariants(),
                      "w-full rounded-full h-11 btn-shimmer"
                    )}
                  >
                    Get Started
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── CTA — dark with dot pattern + dual glows ── */}
      <section className="relative py-24 md:py-32 px-6 bg-[#0a0a0a] overflow-hidden">
        <div className="absolute inset-0 bg-dot-pattern opacity-30 pointer-events-none" />
        {/* Radial glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-teal-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-1/2 left-[30%] -translate-x-1/2 -translate-y-1/2 w-[400px] h-[250px] bg-orange-500/[0.08] rounded-full blur-[100px] pointer-events-none" />
        {/* Floating orbs */}
        <div className="absolute top-20 right-[15%] w-32 h-32 bg-brand/10 rounded-full blur-[40px] animate-float-1 pointer-events-none" />
        <div className="absolute bottom-20 left-[10%] w-24 h-24 bg-orange-400/10 rounded-full blur-[30px] animate-float-2 pointer-events-none" />

        <div className="relative mx-auto max-w-3xl text-center">
          <Reveal>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-5 text-white">
              Ready to <span className="text-gradient-brand">transform</span> your reviews?
            </h2>
            <p className="text-white/40 text-lg mb-8">
              Join hundreds of local businesses using Radius to manage their online
              reputation.
            </p>
            {/* Trust stat pills */}
            <div className="flex items-center justify-center gap-3 mb-10 flex-wrap">
              {["500+ Businesses", "98% Response Rate", "4.7 Avg Rating"].map((stat) => (
                <span key={stat} className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/50">
                  {stat}
                </span>
              ))}
            </div>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link
                href="/register"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "text-base px-8 h-11 rounded-full btn-shimmer"
                )}
              >
                Start Free Trial
                <ArrowRight className="ml-2 size-4" />
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex items-center justify-center text-base px-8 h-11 rounded-full border border-white/20 text-white hover:bg-white/10 transition-colors font-medium"
              >
                See a Demo
              </Link>
            </div>
            <p className="mt-6 text-xs text-white/30">No credit card required</p>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative py-16 px-6 bg-[#fef7ed] dark:bg-muted/20">
        {/* Gradient top border */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand/30 to-transparent" />

        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-3 group">
                <span className="text-[22px] font-extrabold tracking-[-0.02em] font-logo">radius</span>
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed">
                AI-powered review management for local businesses.
              </p>
            </div>
            {[
              {
                title: "Product",
                links: [
                  { label: "Features", href: "#features" },
                  { label: "Pricing", href: "#pricing" },
                  { label: "How It Works", href: "#how-it-works" },
                ],
              },
              {
                title: "Company",
                links: [
                  { label: "About", href: "#" },
                  { label: "Blog", href: "#" },
                  { label: "Contact", href: "#" },
                ],
              },
              {
                title: "Legal",
                links: [
                  { label: "Privacy", href: "#" },
                  { label: "Terms", href: "#" },
                ],
              },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-sm font-semibold mb-4 text-foreground">
                  {col.title}
                </h4>
                <ul className="space-y-2.5 text-sm text-muted-foreground">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="link-underline hover:text-foreground transition-colors duration-200"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-foreground/10 pt-8 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
            <span>&copy; {new Date().getFullYear()} Radius.</span>
            <span className="flex items-center gap-1">
              Made with <Heart className="size-3 text-brand fill-brand" /> for local businesses
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
