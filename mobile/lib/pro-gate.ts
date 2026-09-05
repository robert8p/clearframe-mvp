import { router } from "expo-router";
import { useEntitlements } from "@/lib/entitlements";

export function useProGate() {
  const entitlements = useEntitlements();

  function openFocusedPractice(slug: string, source: string) {
    if (entitlements.needsProForFocusedPractice) {
      void entitlements.recordAnalytics("premium_feature_selected", { feature: "focused_practice", source });
      router.push({ pathname: "/paywall", params: { feature: "focused_practice", source } });
      return false;
    }
    router.push(`/train/practice/${encodeURIComponent(slug)}`);
    return true;
  }

  function openPaywall(source: string, feature = "cogni_pro") {
    void entitlements.recordAnalytics("premium_feature_selected", { feature, source });
    router.push({ pathname: "/paywall", params: { feature, source } });
  }

  return { ...entitlements, openFocusedPractice, openPaywall };
}
