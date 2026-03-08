"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { fetchAPI } from "@/lib/api";

const steps = [
  { label: "Business", value: 1 },
  { label: "Google", value: 2 },
  { label: "Brand Voice", value: 3 },
];

const stepTitles: Record<number, string> = {
  1: "Create your business",
  2: "Connect Google",
  3: "Set your brand voice",
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [type, setType] = useState("restaurant");
  const [creating, setCreating] = useState(false);
  const [businessId, setBusinessId] = useState("");

  const [connecting, setConnecting] = useState(false);

  const [tone, setTone] = useState("");
  const [businessContext, setBusinessContext] = useState("");
  const [savingVoice, setSavingVoice] = useState(false);

  async function handleCreateBusiness(e: React.FormEvent) {
    e.preventDefault();
    try {
      setCreating(true);
      setError("");
      const biz = await fetchAPI("/api/businesses", {
        method: "POST",
        body: JSON.stringify({ name, type }),
      });
      setBusinessId(biz.id);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create business");
    } finally {
      setCreating(false);
    }
  }

  async function handleConnectGoogle() {
    if (!businessId) return;
    try {
      setConnecting(true);
      setError("");
      const data = await fetchAPI(`/api/google/auth?business_id=${businessId}`);
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start OAuth");
      setConnecting(false);
    }
  }

  async function handleSaveVoice(e: React.FormEvent) {
    e.preventDefault();
    if (!businessId) return;
    try {
      setSavingVoice(true);
      setError("");
      await fetchAPI(`/api/businesses/${businessId}/brand-voice`, {
        method: "PUT",
        body: JSON.stringify({
          tone,
          business_context: businessContext,
          rules: "",
          examples: [],
        }),
      });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save brand voice");
    } finally {
      setSavingVoice(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg space-y-8 animate-fade-in-up">
        {/* Logo + heading */}
        <div className="space-y-3">
          <span className="text-xl font-extrabold tracking-[-0.02em] font-logo text-foreground">radius</span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Set up your account
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Step {step} of 3 &mdash; {stepTitles[step]}
            </p>
          </div>
        </div>

        {/* Visual stepper */}
        <div className="flex items-center justify-between">
          {steps.map((s, i) => (
            <div key={s.value} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`flex size-9 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                    step > s.value
                      ? "bg-brand text-white"
                      : step === s.value
                        ? "bg-brand/10 text-brand ring-2 ring-brand"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step > s.value ? (
                    <Check className="size-4" />
                  ) : (
                    s.value
                  )}
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`mx-2 mb-5 h-0.5 flex-1 rounded-full transition-colors ${
                    step > s.value ? "bg-brand" : "bg-border"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {error && (
          <p className="flex items-center gap-1.5 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </p>
        )}

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Create your business</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={handleCreateBusiness}>
                <div className="space-y-2">
                  <Label htmlFor="biz-name">Business Name</Label>
                  <Input
                    id="biz-name"
                    type="text"
                    placeholder="My Business"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Business Type</Label>
                  <Select value={type} onValueChange={(v) => { if (v) setType(v); }}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="restaurant">Restaurant</SelectItem>
                      <SelectItem value="clinic">Clinic</SelectItem>
                      <SelectItem value="salon">Salon</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full rounded-xl" size="lg" disabled={creating}>
                  {creating ? "Creating..." : "Create Business"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Connect Google Business Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Link your Google Business Profile so we can monitor your reviews
                automatically.
              </p>
              <Button
                className="w-full rounded-xl"
                size="lg"
                onClick={handleConnectGoogle}
                disabled={connecting}
              >
                {connecting
                  ? "Connecting..."
                  : "Connect Google Business Profile"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full rounded-xl"
                size="lg"
                onClick={() => setStep(3)}
              >
                I&apos;ll do this later
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Set your brand voice</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={handleSaveVoice}>
                <div className="space-y-2">
                  <Label htmlFor="tone">Tone</Label>
                  <Textarea
                    id="tone"
                    placeholder="e.g., Warm and friendly, professional but not stuffy"
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="context">Business Context</Label>
                  <Textarea
                    id="context"
                    placeholder="e.g., Family-owned Italian restaurant since 1985. Known for handmade pasta."
                    value={businessContext}
                    onChange={(e) => setBusinessContext(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button className="w-full rounded-xl" size="lg" disabled={savingVoice}>
                  {savingVoice ? "Saving..." : "Complete Setup"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
