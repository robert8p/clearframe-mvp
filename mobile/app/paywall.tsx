import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Linking, Platform, Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ActionLink, Body, Card, Eyebrow, PrimaryButton, Screen, Title } from "@/components/ui";
import { useEntitlements } from "@/lib/entitlements";
import { PRIVACY_URL, SUBSCRIPTION_TERMS_URL, TERMS_URL } from "@/lib/legal";
import { colors, glow } from "@/lib/theme";
import type { CogniPurchasePackage } from "@/lib/purchases";

function firstParam(value: string | string[] | undefined, fallback: string) {
  return Array.isArray(value) ? value[0] ?? fallback : value ?? fallback;
}

function planLabel(pkg: CogniPurchasePackage) {
  return pkg.kind === "annual" ? "Annual" : "Monthly";
}

function periodLabel(pkg: CogniPurchasePackage) {
  return pkg.kind === "annual" ? "year" : "month";
}

export default function PaywallScreen() {
  const params = useLocalSearchParams<{ feature?: string | string[]; source?: string | string[] }>();
  const feature = firstParam(params.feature, "cogni_pro");
  const source = firstParam(params.source, "paywall");
  const {
    isPro,
    offering,
    billingStatus,
    billingMessage,
    config,
    purchase,
    restore,
    refresh,
    recordAnalytics,
  } = useEntitlements();
  const [selectedKind, setSelectedKind] = useState<"monthly" | "annual">("annual");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void recordAnalytics("paywall_viewed", { feature, source, experiment: config.paywallExperiment });
  }, [config.paywallExperiment, feature, recordAnalytics, source]);

  useEffect(() => {
    if (offering?.annual) setSelectedKind("annual");
    else if (offering?.monthly) setSelectedKind("monthly");
  }, [offering]);

  const selected = useMemo(() => selectedKind === "annual" ? offering?.annual ?? offering?.monthly ?? null : offering?.monthly ?? offering?.annual ?? null, [offering, selectedKind]);
  const storeName = Platform.OS === "ios" ? "App Store" : "Google Play";
  const purchaseReady = billingStatus === "ready" && Boolean(selected);

  const dismiss = async () => {
    await recordAnalytics("paywall_dismissed", { feature, source, experiment: config.paywallExperiment });
    router.back();
  };

  const buy = async () => {
    if (!selected || busy) return;
    setBusy(true);
    const result = await purchase(selected, source);
    setBusy(false);
    Alert.alert(result.ok ? "Cogni Pro active" : result.outcome === "cancelled" ? "Purchase cancelled" : "Subscription update", result.message, [
      { text: result.ok ? "Continue" : "OK", onPress: result.ok ? () => router.back() : undefined },
    ]);
  };

  const restorePurchases = async () => {
    if (busy || billingStatus === "not_configured") return;
    setBusy(true);
    const result = await restore(source);
    setBusy(false);
    Alert.alert(result.ok ? "Purchases restored" : result.outcome === "no_subscription" ? "Nothing to restore" : "Restore incomplete", result.message, [
      { text: result.ok ? "Continue" : "OK", onPress: result.ok ? () => router.back() : undefined },
    ]);
  };

  const plan = (pkg: CogniPurchasePackage | null, saving?: number | null) => {
    if (!pkg) return null;
    const selectedPlan = selected?.identifier === pkg.identifier;
    return (
      <Pressable
        key={pkg.identifier}
        accessibilityRole="radio"
        accessibilityState={{ checked: selectedPlan, disabled: busy }}
        accessibilityLabel={`${planLabel(pkg)} Cogni Pro, ${pkg.priceString} per ${periodLabel(pkg)}${saving ? `, save ${saving} percent compared with monthly` : ""}`}
        disabled={busy}
        onPress={() => setSelectedKind(pkg.kind)}
        style={({ pressed }) => ({
          minHeight: 92,
          borderRadius: 18,
          borderCurve: "continuous",
          borderWidth: selectedPlan ? 2 : 1,
          borderColor: selectedPlan ? colors.cyan : colors.line,
          backgroundColor: selectedPlan ? "rgba(0,229,255,.08)" : "rgba(13,20,47,.86)",
          padding: 15,
          gap: 5,
          opacity: pressed ? 0.84 : 1,
          boxShadow: selectedPlan ? glow.cyan : undefined,
        })}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: "900" }}>{planLabel(pkg)}</Text>
          {saving && saving > 0 ? <Text style={{ color: colors.cyan, fontSize: 13, fontWeight: "900" }}>Save {saving}%</Text> : null}
        </View>
        <Text style={{ color: colors.text, fontSize: 21, fontWeight: "900" }}>{pkg.priceString} <Text style={{ color: colors.muted, fontSize: 14, fontWeight: "700" }}>/ {periodLabel(pkg)}</Text></Text>
        {pkg.introText ? <Text style={{ color: colors.cyan, fontSize: 13.5, lineHeight: 19, fontWeight: "800" }}>{pkg.introText}, then {pkg.priceString} / {periodLabel(pkg)}</Text> : null}
      </Pressable>
    );
  };

  return (
    <Screen contentStyle={{ paddingTop: 28, paddingBottom: 52 }}>
      <View style={{ alignItems: "flex-end" }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Not now" onPress={() => void dismiss()} hitSlop={12} style={({ pressed }) => ({ minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 24, opacity: pressed ? 0.65 : 1 })}>
          <Text style={{ color: colors.muted, fontSize: 15, fontWeight: "900" }}>Not now</Text>
        </Pressable>
      </View>

      <View style={{ gap: 9 }}>
        <Eyebrow>Cogni Pro</Eyebrow>
        <Title>More practice. Deeper progress.</Title>
        <Body muted>Keep the free daily learning habit. Upgrade when you want to accelerate it.</Body>
      </View>

      <Card style={{ gap: 13 }}>
        <Text style={{ color: colors.text, fontSize: 16, lineHeight: 23, fontWeight: "800" }}>✓ Unlimited additional focused practice</Text>
        <Text style={{ color: colors.text, fontSize: 16, lineHeight: 23, fontWeight: "800" }}>✓ Train a specific skill whenever you choose</Text>
        <Text style={{ color: colors.text, fontSize: 16, lineHeight: 23, fontWeight: "800" }}>✓ Cogni Pro follows your account across supported devices</Text>
        <Text style={{ color: colors.muted, fontSize: 13.5, lineHeight: 20 }}>Your starting check, daily lesson and assigned core training stay free.</Text>
      </Card>

      {isPro ? (
        <Card>
          <Eyebrow>Already active</Eyebrow>
          <Title size={25}>You have Cogni Pro.</Title>
          <Body muted>Your server-verified entitlement is active.</Body>
          <PrimaryButton label="Continue" onPress={() => router.back()} />
        </Card>
      ) : (
        <Card style={{ gap: 13 }}>
          <Eyebrow>Choose your plan</Eyebrow>
          {billingStatus === "loading" ? <View style={{ minHeight: 92, justifyContent: "center", alignItems: "center", gap: 10 }}><ActivityIndicator color={colors.cyan} /><Text style={{ color: colors.muted }}>Loading prices from {storeName}…</Text></View> : null}
          {offering ? <View accessibilityRole="radiogroup" style={{ gap: 10 }}>{plan(offering.annual, offering.annualSavingPercent)}{plan(offering.monthly)}</View> : null}
          {billingStatus !== "loading" && billingStatus !== "ready" ? <Text accessibilityLiveRegion="polite" style={{ color: colors.muted, fontSize: 14.5, lineHeight: 21 }}>{billingMessage ?? "Subscription options are unavailable right now."}</Text> : null}
          {billingStatus === "error" || billingStatus === "no_offerings" ? <PrimaryButton secondary label="Try loading plans again" onPress={() => void refresh(false)} disabled={busy} /> : null}
          <PrimaryButton
            label={busy ? "Working…" : selected ? `Subscribe — ${selected.priceString} / ${periodLabel(selected)}` : "Subscribe"}
            onPress={() => void buy()}
            disabled={!purchaseReady || busy}
          />
          <PrimaryButton secondary label={busy ? "Working…" : "Restore purchases"} onPress={() => void restorePurchases()} disabled={busy || billingStatus === "not_configured"} />
          <Text style={{ color: colors.soft, fontSize: 12.5, lineHeight: 19, textAlign: "center" }}>
            Payment is handled by {storeName}. Your subscription renews automatically at the store-displayed price and billing period until you cancel in your store subscription settings. Cancelling stops future renewals; paid access normally continues until the current period ends.
          </Text>
        </Card>
      )}

      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "center", columnGap: 4 }}>
        <ActionLink label="Privacy" onPress={() => void Linking.openURL(PRIVACY_URL)} />
        <ActionLink label="Terms" onPress={() => void Linking.openURL(TERMS_URL)} />
        <ActionLink label="Subscription terms" onPress={() => void Linking.openURL(SUBSCRIPTION_TERMS_URL)} />
      </View>
    </Screen>
  );
}
