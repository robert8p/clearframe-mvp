import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Linking, Platform, Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { ActionLink, Body, Card, Eyebrow, HeroPanel, PrimaryButton, Screen, Title } from "@/components/ui";
import { CogniMark } from "@/components/brand";
import { useEntitlements } from "@/lib/entitlements";
import { PRIVACY_URL, SUBSCRIPTION_TERMS_URL, TERMS_URL } from "@/lib/legal";
import { colors, glow, radius, typography } from "@/lib/theme";
import type { CogniPurchasePackage } from "@/lib/purchases";

function firstParam(value: string | string[] | undefined, fallback: string) { return Array.isArray(value) ? value[0] ?? fallback : value ?? fallback; }
function planLabel(pkg: CogniPurchasePackage) { return pkg.kind === "annual" ? "Annual" : "Monthly"; }
function periodLabel(pkg: CogniPurchasePackage) { return pkg.kind === "annual" ? "year" : "month"; }

function Benefit({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}><View accessible={false} style={{ marginTop: 2, width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(34,197,94,.13)", borderWidth: 1, borderColor: "rgba(34,197,94,.40)", alignItems: "center", justifyContent: "center" }}><View style={{ width: 8, height: 4, borderLeftWidth: 1.8, borderBottomWidth: 1.8, borderColor: colors.green, transform: [{ rotate: "-45deg" }], marginTop: -2 }} /></View><Text style={{ flex: 1, color: colors.text, fontSize: 15.5, lineHeight: 23, ...typography.bodyMedium }}>{children}</Text></View>;
}

export default function PaywallScreen() {
  const params = useLocalSearchParams<{ feature?: string | string[]; source?: string | string[] }>();
  const feature = firstParam(params.feature, "cogni_pro"); const source = firstParam(params.source, "paywall");
  const { isPro, stateReliable, offering, billingStatus, billingMessage, config, purchase, restore, refresh, recordAnalytics } = useEntitlements();
  const [selectedKind, setSelectedKind] = useState<"monthly" | "annual">("annual"); const [busy, setBusy] = useState(false); const [error, setError] = useState("");

  useEffect(() => { void recordAnalytics("paywall_viewed", { feature, source, experiment: config.paywallExperiment }); }, [config.paywallExperiment, feature, recordAnalytics, source]);
  useEffect(() => { if (offering?.annual) setSelectedKind("annual"); else if (offering?.monthly) setSelectedKind("monthly"); }, [offering]);

  const selected = useMemo(() => selectedKind === "annual" ? offering?.annual ?? offering?.monthly ?? null : offering?.monthly ?? offering?.annual ?? null, [offering, selectedKind]);
  const storeName = Platform.OS === "ios" ? "App Store" : "Google Play"; const purchaseReady = stateReliable && config.monetizationEnabled && billingStatus === "ready" && Boolean(selected); const preview = stateReliable && !config.monetizationEnabled;
  const leavePaywall = () => {
    if (source === "profile") {
      router.replace("/(tabs)/profile");
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/home");
  };
  const dismiss = async () => { await recordAnalytics("paywall_dismissed", { feature, source, experiment: config.paywallExperiment }); leavePaywall(); };

  const buy = async () => {
    if (!selected || !purchaseReady || busy) return; setBusy(true); setError("");
    try { const result = await purchase(selected, source); Alert.alert(result.ok ? "Cogni Pro active" : result.outcome === "cancelled" ? "Purchase cancelled" : "Subscription update", result.message, [{ text: result.ok ? "Continue" : "OK", onPress: result.ok ? leavePaywall : undefined }]); }
    catch { setError("Cogni couldn't confirm the purchase result. Check your store purchase history before trying again, or use Restore purchases."); }
    finally { setBusy(false); }
  };

  const restorePurchases = async () => {
    if (busy || billingStatus === "not_configured") return; setBusy(true); setError("");
    try { const result = await restore(source); Alert.alert(result.ok ? "Purchases restored" : result.outcome === "no_subscription" ? "Nothing to restore" : "Restore incomplete", result.message, [{ text: result.ok ? "Continue" : "OK", onPress: result.ok ? leavePaywall : undefined }]); }
    catch { setError("Cogni couldn't restore purchases. Check your connection and try again."); }
    finally { setBusy(false); }
  };

  const reloadPlans = async () => {
    if (busy) return; setBusy(true); setError("");
    try { await refresh(false); } catch { setError("Cogni couldn't check subscription availability. Please try again."); }
    finally { setBusy(false); }
  };

  const plan = (pkg: CogniPurchasePackage | null, saving?: number | null) => {
    if (!pkg) return null; const selectedPlan = selected?.identifier === pkg.identifier;
    return <Pressable key={pkg.identifier} accessibilityRole="radio" accessibilityState={{ checked: selectedPlan, disabled: busy }} accessibilityLabel={`${planLabel(pkg)} Cogni Pro, ${pkg.priceString} per ${periodLabel(pkg)}${saving ? `, save ${saving} percent compared with monthly` : ""}`} disabled={busy} onPress={() => setSelectedKind(pkg.kind)} style={({ pressed }) => ({ opacity: pressed ? .84 : 1 })}>
      <LinearGradient colors={selectedPlan ? ["rgba(245,158,11,.20)", "rgba(139,92,246,.20)", "rgba(18,33,61,.96)"] : ["rgba(18,33,61,.92)", "rgba(15,23,42,.96)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ minHeight: 96, borderRadius: radius.lg, borderWidth: selectedPlan ? 1.5 : 1, borderColor: selectedPlan ? colors.gold : colors.line, padding: 15, gap: 5, boxShadow: selectedPlan ? glow.warm : undefined }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}><Text style={{ color: colors.text, fontSize: 17, ...typography.heading }}>{planLabel(pkg)}</Text>{saving && saving > 0 ? <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: "rgba(245,158,11,.13)", borderWidth: 1, borderColor: "rgba(245,158,11,.40)" }}><Text style={{ color: colors.gold, fontSize: 12.5, ...typography.label }}>Save {saving}%</Text></View> : null}</View>
        <Text style={{ color: colors.text, fontSize: 22, ...typography.metric }}>{pkg.priceString} <Text style={{ color: colors.muted, fontSize: 14, ...typography.body }}>/ {periodLabel(pkg)}</Text></Text>
        {pkg.introText ? <Text style={{ color: colors.cyan, fontSize: 13.5, lineHeight: 19, ...typography.bodyMedium }}>{pkg.introText}, then {pkg.priceString} / {periodLabel(pkg)}</Text> : null}
      </LinearGradient>
    </Pressable>;
  };

  return <Screen contentStyle={{ paddingTop: 18, paddingBottom: 52 }}>
    <View style={{ alignItems: "flex-end" }}><Pressable accessibilityRole="button" accessibilityLabel="Not now" onPress={() => void dismiss()} hitSlop={12} style={({ pressed }) => ({ minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 24, opacity: pressed ? .65 : 1 })}><Text style={{ color: colors.muted, fontSize: 14.5, ...typography.label }}>Not now</Text></Pressable></View>

    <HeroPanel tone="gold" eyebrow="Cogni Pro" title="Go deeper. Explore further." body="Daily core learning stays intact. Pro adds more choice, more focused practice and a fuller view of your progress." titleSize={31} artworkSize={128} renderArtwork={(size) => <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}><CogniMark size={size} /><View style={{ position: "absolute", width: Math.max(46, size * .48), height: Math.max(46, size * .48), borderRadius: Math.max(23, size * .24), alignItems: "center", justifyContent: "center", backgroundColor: "rgba(245,158,11,.14)", borderWidth: 1, borderColor: "rgba(251,191,36,.48)", boxShadow: glow.warm }}><Text accessible={false} style={{ color: colors.gold, fontSize: Math.max(24, size * .23) }}>♛</Text></View></View>} />

    <Card variant="glass" style={{ gap: 13 }}><Benefit>Unlimited additional focused practice</Benefit><Benefit>Train a specific skill whenever you choose</Benefit><Benefit>Full available skill-progress history and trends</Benefit><Benefit>Cogni Pro follows your account across supported devices</Benefit><Text style={{ color: colors.muted, fontSize: 13.5, lineHeight: 20, ...typography.body }}>Your starting check, daily lesson and assigned core training stay free.</Text></Card>

    {isPro ? <Card variant="glass"><Eyebrow style={{ color: colors.gold }}>Already active</Eyebrow><Title size={25}>You have Cogni Pro.</Title><Body muted>Your Cogni Pro subscription is active.</Body><PrimaryButton label="Continue" onPress={leavePaywall} /></Card> : preview ? <Card variant="glass" style={{ gap: 13 }}><Eyebrow>Test preview</Eyebrow><Title size={25}>Keep exploring for free</Title><Body muted>Paid subscriptions are not enabled in this preview. You can try focused practice and available progress history without subscribing.</Body><PrimaryButton label="Continue learning" onPress={leavePaywall} />{billingStatus !== "not_configured" ? <PrimaryButton secondary label="Restore purchases" onPress={() => void restorePurchases()} disabled={busy} loading={busy} /> : null}</Card> : <Card variant="glass" style={{ gap: 13 }}><Eyebrow style={{ color: colors.gold }}>Choose your plan</Eyebrow>{billingStatus === "loading" ? <View style={{ minHeight: 92, justifyContent: "center", alignItems: "center", gap: 10 }}><ActivityIndicator color={colors.cyan} /><Text style={{ color: colors.muted }}>Loading prices from {storeName}…</Text></View> : null}{offering && stateReliable ? <View accessibilityRole="radiogroup" style={{ gap: 10 }}>{plan(offering.annual, offering.annualSavingPercent)}{plan(offering.monthly)}</View> : null}{billingStatus !== "loading" && billingStatus !== "ready" ? <Text accessibilityLiveRegion="polite" style={{ color: colors.muted, fontSize: 14.5, lineHeight: 21, ...typography.body }}>{billingMessage ?? "Subscription options are unavailable right now."}</Text> : null}{!stateReliable ? <Body muted>We couldn&apos;t verify subscription availability. Your current access has not been changed. Check your connection and try again.</Body> : null}{!stateReliable || billingStatus === "error" || billingStatus === "no_offerings" ? <PrimaryButton secondary label="Try loading plans again" onPress={() => void reloadPlans()} disabled={busy} /> : null}<PrimaryButton label={busy ? "Working…" : selected ? `Subscribe — ${selected.priceString} / ${periodLabel(selected)}` : "Subscribe"} onPress={() => void buy()} disabled={!purchaseReady || busy} /><PrimaryButton secondary label={busy ? "Working…" : "Restore purchases"} onPress={() => void restorePurchases()} disabled={busy || billingStatus === "not_configured"} /><Text style={{ color: colors.soft, fontSize: 12.5, lineHeight: 19, textAlign: "center", ...typography.body }}>Payment is handled by {storeName}. Your subscription renews automatically at the store-displayed price and billing period until you cancel in your store subscription settings. Cancelling stops future renewals; paid access normally continues until the current period ends.</Text></Card>}

    {error ? <Text accessibilityLiveRegion="assertive" selectable style={{ color: colors.danger, lineHeight: 22 }}>{error}</Text> : null}
    <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "center", columnGap: 4 }}><ActionLink label="Privacy" onPress={() => void Linking.openURL(PRIVACY_URL)} /><ActionLink label="Terms" onPress={() => void Linking.openURL(TERMS_URL)} /><ActionLink label="Subscription terms" onPress={() => void Linking.openURL(SUBSCRIPTION_TERMS_URL)} /></View>
  </Screen>;
}
