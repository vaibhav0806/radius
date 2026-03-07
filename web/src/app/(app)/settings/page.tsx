"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fetchAPI } from "@/lib/api";

interface Business {
  id: string;
  name: string;
  type: string;
  brand_voice_config?: string;
}

interface BrandVoiceConfig {
  tone: string;
  business_context: string;
  rules: string;
  examples: string[];
}

interface BillingStatus {
  status: string;
  current_period_end?: string;
}

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const billingResult = searchParams.get("billing");

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingAction, setBillingAction] = useState(false);

  const [name, setName] = useState("");
  const [type, setType] = useState("restaurant");
  const [creating, setCreating] = useState(false);

  const [tone, setTone] = useState("");
  const [businessContext, setBusinessContext] = useState("");
  const [rules, setRules] = useState("");
  const [examples, setExamples] = useState<string[]>([""]);
  const [savingVoice, setSavingVoice] = useState(false);
  const [voiceSuccess, setVoiceSuccess] = useState("");

  useEffect(() => {
    loadBusinesses();
  }, []);

  async function loadBusinesses() {
    try {
      setLoading(true);
      setError("");
      const biz = await fetchAPI("/api/businesses");
      setBusinesses(biz);
      if (biz.length > 0) {
        loadBilling(biz[0].id);
      }
      if (biz.length > 0 && biz[0].brand_voice_config) {
        try {
          const config: BrandVoiceConfig = JSON.parse(biz[0].brand_voice_config);
          setTone(config.tone || "");
          setBusinessContext(config.business_context || "");
          setRules(config.rules || "");
          setExamples(
            config.examples && config.examples.length > 0
              ? config.examples
              : [""]
          );
        } catch {
          // Invalid JSON, ignore
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load businesses");
    } finally {
      setLoading(false);
    }
  }

  async function loadBilling(bizId: string) {
    try {
      setBillingLoading(true);
      const data = await fetchAPI(`/api/billing/status?business_id=${bizId}`);
      setBillingStatus(data);
    } catch {
      // Billing endpoint may not exist yet
    } finally {
      setBillingLoading(false);
    }
  }

  async function handleUpgrade() {
    if (businesses.length === 0) return;
    try {
      setBillingAction(true);
      const data = await fetchAPI("/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ business_id: businesses[0].id }),
      });
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start checkout");
    } finally {
      setBillingAction(false);
    }
  }

  async function handleCancel() {
    if (businesses.length === 0) return;
    if (!window.confirm("Are you sure you want to cancel your subscription?")) return;
    try {
      setBillingAction(true);
      setError("");
      await fetchAPI("/api/billing/cancel", {
        method: "POST",
        body: JSON.stringify({ business_id: businesses[0].id }),
      });
      setBillingStatus({ status: "inactive" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel subscription");
    } finally {
      setBillingAction(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      setCreating(true);
      setError("");
      const biz = await fetchAPI("/api/businesses", {
        method: "POST",
        body: JSON.stringify({ name, type }),
      });
      setBusinesses([biz]);
      setName("");
      setType("restaurant");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create business");
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveVoice(e: React.FormEvent) {
    e.preventDefault();
    if (businesses.length === 0) return;
    try {
      setSavingVoice(true);
      setError("");
      setVoiceSuccess("");
      const filteredExamples = examples.filter((ex) => ex.trim() !== "");
      await fetchAPI(`/api/businesses/${businesses[0].id}/brand-voice`, {
        method: "PUT",
        body: JSON.stringify({
          tone,
          business_context: businessContext,
          rules,
          examples: filteredExamples,
        }),
      });
      setVoiceSuccess("Brand voice saved successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save brand voice"
      );
    } finally {
      setSavingVoice(false);
    }
  }

  function addExample() {
    setExamples([...examples, ""]);
  }

  function removeExample(index: number) {
    setExamples(examples.filter((_, i) => i !== index));
  }

  function updateExample(index: number, value: string) {
    const updated = [...examples];
    updated[index] = value;
    setExamples(updated);
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      {billingResult === "success" && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          Subscription activated!
        </div>
      )}

      {billingResult === "cancel" && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
          Checkout was cancelled.
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Business Profile</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : businesses.length > 0 ? (
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium">Name: </span>
                  <span className="text-sm text-muted-foreground">
                    {businesses[0].name}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium">Type: </span>
                  <span className="text-sm capitalize text-muted-foreground">
                    {businesses[0].type}
                  </span>
                </div>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleCreate}>
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
                <Button disabled={creating}>
                  {creating ? "Creating..." : "Create Business"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Brand Voice</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : businesses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Create a business first to configure brand voice.
              </p>
            ) : (
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
                  <Label htmlFor="business-context">Business Context</Label>
                  <Textarea
                    id="business-context"
                    placeholder="e.g., Family-owned Italian restaurant since 1985. Known for handmade pasta."
                    value={businessContext}
                    onChange={(e) => setBusinessContext(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rules">Rules</Label>
                  <Textarea
                    id="rules"
                    placeholder="e.g., Never mention competitor restaurants. Don't offer discounts."
                    value={rules}
                    onChange={(e) => setRules(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Example Responses</Label>
                  <div className="space-y-3">
                    {examples.map((example, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <Textarea
                          placeholder={`Example response ${index + 1}`}
                          value={example}
                          onChange={(e) => updateExample(index, e.target.value)}
                          rows={2}
                          className="flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => removeExample(index)}
                          className="mt-2 text-muted-foreground transition-colors hover:text-destructive"
                          disabled={examples.length === 1}
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addExample}
                  >
                    <Plus className="size-4" />
                    Add example
                  </Button>
                </div>
                {voiceSuccess && (
                  <p className="text-sm text-green-600 dark:text-green-400">
                    {voiceSuccess}
                  </p>
                )}
                <Button disabled={savingVoice}>
                  {savingVoice ? "Saving..." : "Save Brand Voice"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Billing</CardTitle>
          </CardHeader>
          <CardContent>
            {loading || billingLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : businesses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Create a business first to manage billing.
              </p>
            ) : billingStatus?.status === "active" ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium">Status: </span>
                    <span className="text-sm text-green-600 dark:text-green-400">
                      Active subscription
                    </span>
                  </div>
                  {billingStatus.current_period_end && (
                    <div>
                      <span className="text-sm font-medium">
                        Current period ends:{" "}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(billingStatus.current_period_end).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
                <Button
                  variant="destructive"
                  onClick={handleCancel}
                  disabled={billingAction}
                >
                  {billingAction ? "Cancelling..." : "Cancel Subscription"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  No active subscription
                </p>
                <Button onClick={handleUpgrade} disabled={billingAction}>
                  {billingAction ? "Redirecting..." : "Upgrade"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
