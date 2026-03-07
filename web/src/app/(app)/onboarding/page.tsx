"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fetchAPI } from "@/lib/api";

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

  async function handleConnect() {
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
    <div className="mx-auto max-w-lg space-y-8 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Set up your account
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Step {step} of 3
        </p>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Create your business</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleCreateBusiness}>
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
                <Label htmlFor="biz-type">Business Type</Label>
                <select
                  id="biz-type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="restaurant">Restaurant</option>
                  <option value="clinic">Clinic</option>
                  <option value="salon">Salon</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <Button className="w-full" disabled={creating}>
                {creating ? "Creating..." : "Continue"}
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
            <Button className="w-full" onClick={handleConnect} disabled={connecting}>
              {connecting ? "Connecting..." : "Connect Google Business Profile"}
            </Button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="block w-full text-center text-sm text-muted-foreground hover:text-foreground"
            >
              I&apos;ll do this later
            </button>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Set your brand voice</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSaveVoice}>
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
              <Button className="w-full" disabled={savingVoice}>
                {savingVoice ? "Saving..." : "Complete Setup"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
