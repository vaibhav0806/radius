"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, X, CheckCircle, CircleCheck, Info, Building2, Mic, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
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

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

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
      setCancelDialogOpen(false);
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
    <div className="space-y-8 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your business, brand voice, and billing
        </p>
      </div>

      {billingResult === "success" && (
        <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          <CircleCheck className="size-4" />
          <AlertTitle>Subscription activated!</AlertTitle>
        </Alert>
      )}

      {billingResult === "cancel" && (
        <Alert className="border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
          <Info className="size-4" />
          <AlertTitle>Checkout was cancelled.</AlertTitle>
        </Alert>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Tabs defaultValue="business">
        <TabsList className="bg-muted/30 p-1">
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="brand-voice">Brand Voice</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="business">
          <Card className="card-hover-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="size-4 text-brand" />
                Business Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  <div className="skeleton-shimmer h-4 w-48 rounded" />
                  <div className="skeleton-shimmer h-4 w-32 rounded" />
                </div>
              ) : businesses.length > 0 ? (
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium">Name</dt>
                    <dd className="text-sm text-muted-foreground">
                      {businesses[0].name}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium">Type</dt>
                    <dd className="text-sm capitalize text-muted-foreground">
                      {businesses[0].type}
                    </dd>
                  </div>
                </dl>
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
                  <Button type="submit" className="rounded-full btn-shimmer" disabled={creating}>
                    {creating ? "Creating..." : "Create Business"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="brand-voice">
          <Card className="card-hover-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="size-4 text-brand" />
                Brand Voice
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  <div className="skeleton-shimmer h-4 w-24 rounded" />
                  <div className="skeleton-shimmer h-16 w-full rounded" />
                  <div className="skeleton-shimmer h-4 w-32 rounded" />
                  <div className="skeleton-shimmer h-20 w-full rounded" />
                </div>
              ) : businesses.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Create a business first to configure brand voice.
                </p>
              ) : (
                <form className="space-y-6" onSubmit={handleSaveVoice}>
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
                  <div className="space-y-3">
                    <Label>Example Responses</Label>
                    <div className="space-y-3">
                      {examples.map((example, index) => (
                        <div key={index} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">
                              Example {index + 1}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => removeExample(index)}
                              disabled={examples.length === 1}
                              className="text-destructive hover:text-destructive"
                            >
                              <X className="size-3" />
                            </Button>
                          </div>
                          <Textarea
                            placeholder={`Example response ${index + 1}`}
                            value={example}
                            onChange={(e) => updateExample(index, e.target.value)}
                            rows={2}
                          />
                        </div>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={addExample}
                    >
                      <Plus className="size-4" />
                      Add example
                    </Button>
                  </div>
                  {voiceSuccess && (
                    <p className="flex items-center gap-1.5 text-sm text-brand">
                      <CheckCircle className="size-4" />
                      {voiceSuccess}
                    </p>
                  )}
                  <Button type="submit" className="rounded-full btn-shimmer" disabled={savingVoice}>
                    {savingVoice ? "Saving..." : "Save Brand Voice"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card className="card-hover-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="size-4 text-brand" />
                Billing
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading || billingLoading ? (
                <div className="space-y-3">
                  <div className="skeleton-shimmer h-4 w-40 rounded" />
                  <div className="skeleton-shimmer h-4 w-56 rounded" />
                  <div className="skeleton-shimmer h-8 w-36 rounded" />
                </div>
              ) : businesses.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Create a business first to manage billing.
                </p>
              ) : billingStatus?.status === "active" ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Status:</span>
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        Active
                      </Badge>
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
                  <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                    <AlertDialogTrigger
                      render={
                        <Button variant="destructive" className="rounded-full" disabled={billingAction}>
                          {billingAction ? "Cancelling..." : "Cancel Subscription"}
                        </Button>
                      }
                    />
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will cancel your subscription. You will lose access
                          to premium features at the end of the current billing
                          period.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          variant="destructive"
                          onClick={handleCancel}
                          disabled={billingAction}
                        >
                          {billingAction ? "Cancelling..." : "Confirm"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    No active subscription
                  </p>
                  <Button className="rounded-full btn-shimmer" onClick={handleUpgrade} disabled={billingAction}>
                    {billingAction ? "Redirecting..." : "Upgrade"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
