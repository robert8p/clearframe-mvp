import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  clearLocalPurchasesUserState,
  getCustomerInfo,
  hasRevenueCatPublicKey,
  identifyPurchasesUser,
  isPurchaseCancellation,
  listenForCustomerInfo,
  loadDefaultOffering,
  purchaseCogniPackage,
  purchaseErrorCode,
  restoreCogniPurchases,
  type CogniOffering,
  type CogniPurchasePackage,
} from "@/lib/purchases";

export type MonetizationConfig = {
  monetizationEnabled: boolean;
  freeCoreSessionsPerDay: number;
  focusedPracticeIsPro: boolean;
  progressHistoryFreeDays: number;
  proactivePaywallMinSessions: number;
  paywallExperiment: string;
};

type ServerEntitlement = {
  entitlement: string;
  status: string;
  product_id: string | null;
  store: string | null;
  purchase_date: string | null;
  expiration_date: string | null;
  will_renew: boolean;
  billing_issue: boolean;
  environment: string;
  updated_at: string;
};

export type ServerEntitlementState = {
  isPro: boolean;
  stateReliable: boolean;
  entitlement: ServerEntitlement | null;
  config: MonetizationConfig;
  serverTime: string;
};

type ActionResult = {
  ok: boolean;
  outcome: "success" | "cancelled" | "no_subscription" | "error" | "pending_verification";
  message: string;
};

type EntitlementValue = {
  loading: boolean;
  isPro: boolean;
  localStoreShowsPro: boolean;
  stateReliable: boolean;
  entitlement: ServerEntitlement | null;
  config: MonetizationConfig;
  offering: CogniOffering | null;
  billingStatus: "not_configured" | "loading" | "ready" | "no_offerings" | "error";
  billingMessage: string | null;
  managementUrl: string | null;
  needsProForFocusedPractice: boolean;
  refresh: (syncStore?: boolean) => Promise<void>;
  purchase: (pkg: CogniPurchasePackage, source?: string) => Promise<ActionResult>;
  restore: (source?: string) => Promise<ActionResult>;
  recordAnalytics: (eventName: string, properties?: Record<string, string | number | boolean | null>) => Promise<void>;
};

const SAFE_DEFAULT_CONFIG: MonetizationConfig = {
  monetizationEnabled: false,
  freeCoreSessionsPerDay: 1,
  focusedPracticeIsPro: true,
  progressHistoryFreeDays: 7,
  proactivePaywallMinSessions: 3,
  paywallExperiment: "control",
};

const EntitlementContext = createContext<EntitlementValue | null>(null);

function localPro(customerInfo: Awaited<ReturnType<typeof getCustomerInfo>>) {
  return Boolean(customerInfo?.entitlements.active?.pro?.isActive);
}

export function EntitlementProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [server, setServer] = useState<ServerEntitlementState>({
    isPro: false,
    stateReliable: false,
    entitlement: null,
    config: SAFE_DEFAULT_CONFIG,
    serverTime: new Date(0).toISOString(),
  });
  const [loading, setLoading] = useState(false);
  const [offering, setOffering] = useState<CogniOffering | null>(null);
  const [billingStatus, setBillingStatus] = useState<EntitlementValue["billingStatus"]>("not_configured");
  const [billingMessage, setBillingMessage] = useState<string | null>(null);
  const [managementUrl, setManagementUrl] = useState<string | null>(null);
  const [localStoreShowsPro, setLocalStoreShowsPro] = useState(false);
  const activeUser = useRef<string | null>(null);

  const recordAnalytics = useCallback(async (eventName: string, properties: Record<string, string | number | boolean | null> = {}) => {
    if (!userId) return;
    // Telemetry is deliberately best-effort. A measurement outage must never delay
    // paywall dismissal, the native purchase sheet, restoration, or entitlement use.
    void apiFetch("/api/mobile/analytics", { method: "POST", body: JSON.stringify({ eventName, properties }) }).catch((error) => {
      if (__DEV__) console.warn("Cogni monetisation analytics failed", error);
    });
  }, [userId]);

  const loadServerState = useCallback(async () => {
    if (!userId) return null;
    const next = await apiFetch<ServerEntitlementState>("/api/mobile/entitlements");
    setServer(next);
    return next;
  }, [userId]);

  const syncServerState = useCallback(async () => {
    if (!userId) return null;
    const next = await apiFetch<ServerEntitlementState>("/api/mobile/entitlements/sync", { method: "POST" });
    setServer(next);
    return next;
  }, [userId]);

  const refreshStore = useCallback(async () => {
    if (!userId || !hasRevenueCatPublicKey()) {
      setOffering(null);
      setBillingStatus("not_configured");
      setBillingMessage("Subscriptions are not configured for this build yet.");
      setManagementUrl(null);
      setLocalStoreShowsPro(false);
      return false;
    }
    setBillingStatus("loading");
    try {
      const identified = await identifyPurchasesUser(userId);
      if (!identified) {
        setBillingStatus("not_configured");
        return false;
      }
      const [customerInfo, nextOffering] = await Promise.all([getCustomerInfo(), loadDefaultOffering()]);
      setManagementUrl(customerInfo?.managementURL ?? null);
      setLocalStoreShowsPro(localPro(customerInfo));
      setOffering(nextOffering);
      if (nextOffering?.monthly || nextOffering?.annual) {
        setBillingStatus("ready");
        setBillingMessage(null);
      } else {
        setBillingStatus("no_offerings");
        setBillingMessage("Cogni Pro isn't available from this storefront right now.");
      }
      return true;
    } catch (error) {
      setBillingStatus("error");
      setBillingMessage("Cogni couldn't load subscription options. Check your connection and try again.");
      if (__DEV__) console.warn("RevenueCat refresh failed", error);
      return false;
    }
  }, [userId]);

  const refresh = useCallback(async (syncStore = false) => {
    if (!userId) return;
    setLoading(true);
    try {
      if (syncStore && hasRevenueCatPublicKey()) {
        try { await syncServerState(); } catch { await loadServerState(); }
      } else {
        await loadServerState();
      }
      await refreshStore();
    } finally {
      setLoading(false);
    }
  }, [loadServerState, refreshStore, syncServerState, userId]);

  useEffect(() => {
    let cancelled = false;
    let removeCustomerListener: () => void = () => {};

    if (!userId) {
      activeUser.current = null;
      clearLocalPurchasesUserState();
      setServer({ isPro: false, stateReliable: false, entitlement: null, config: SAFE_DEFAULT_CONFIG, serverTime: new Date(0).toISOString() });
      setOffering(null);
      setBillingStatus("not_configured");
      setBillingMessage(null);
      setManagementUrl(null);
      setLocalStoreShowsPro(false);
      setLoading(false);
      return () => undefined;
    }

    activeUser.current = userId;
    setLoading(true);
    void (async () => {
      try {
        await loadServerState();
        const storeReady = await refreshStore();
        if (!cancelled && storeReady) {
          removeCustomerListener = listenForCustomerInfo((customerInfo) => {
            if (cancelled || activeUser.current !== userId) return;
            setManagementUrl(customerInfo.managementURL ?? null);
            setLocalStoreShowsPro(Boolean(customerInfo.entitlements.active?.pro?.isActive));
            void syncServerState().catch((error) => {
              if (__DEV__) console.warn("Server entitlement listener sync failed", error);
            });
          });
        }
      } catch (error) {
        if (__DEV__) console.warn("Entitlement initialization failed", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const onAppState = (state: AppStateStatus) => {
      if (state === "active" && !cancelled && activeUser.current === userId) void refresh(true);
    };
    const subscription = AppState.addEventListener("change", onAppState);

    return () => {
      cancelled = true;
      removeCustomerListener();
      subscription.remove();
    };
  }, [loadServerState, refresh, refreshStore, syncServerState, userId]);

  const purchase = useCallback(async (pkg: CogniPurchasePackage, source = "paywall"): Promise<ActionResult> => {
    if (!userId) return { ok: false, outcome: "error", message: "Please sign in again." };
    await recordAnalytics("purchase_started", { package: pkg.kind, product_id: pkg.productId, offering: offering?.identifier ?? "default", source });
    try {
      const result = await purchaseCogniPackage(pkg);
      setManagementUrl(result.customerInfo.managementURL ?? null);
      setLocalStoreShowsPro(Boolean(result.customerInfo.entitlements.active?.pro?.isActive));
      await recordAnalytics("purchase_completed", { package: pkg.kind, product_id: pkg.productId, offering: offering?.identifier ?? "default", source });
      try {
        const verified = await syncServerState();
        if (verified?.isPro) return { ok: true, outcome: "success", message: "Cogni Pro is active." };
      } catch (error) {
        if (__DEV__) console.warn("Post-purchase server verification pending", error);
      }
      return { ok: false, outcome: "pending_verification", message: "Your purchase completed, but Cogni is still verifying access. Keep the app open and try Restore purchases if this persists." };
    } catch (error) {
      const cancelled = isPurchaseCancellation(error);
      await recordAnalytics("purchase_failed", { package: pkg.kind, product_id: pkg.productId, source, error_code: cancelled ? "cancelled" : purchaseErrorCode(error) });
      return cancelled
        ? { ok: false, outcome: "cancelled", message: "Purchase cancelled. You haven't been charged by Cogni." }
        : { ok: false, outcome: "error", message: "The purchase didn't complete. No Cogni access was unlocked." };
    }
  }, [offering?.identifier, recordAnalytics, syncServerState, userId]);

  const restore = useCallback(async (source = "paywall"): Promise<ActionResult> => {
    if (!userId) return { ok: false, outcome: "error", message: "Please sign in again." };
    await recordAnalytics("restore_started", { source });
    try {
      const customerInfo = await restoreCogniPurchases();
      setManagementUrl(customerInfo.managementURL ?? null);
      setLocalStoreShowsPro(Boolean(customerInfo.entitlements.active?.pro?.isActive));
      const verified = await syncServerState();
      const restored = Boolean(verified?.isPro);
      await recordAnalytics("restore_completed", { source, outcome: restored ? "subscription_restored" : "no_subscription" });
      return restored
        ? { ok: true, outcome: "success", message: "Cogni Pro has been restored." }
        : { ok: false, outcome: "no_subscription", message: "No active Cogni Pro subscription was found for this store account." };
    } catch (error) {
      const message = error instanceof ApiError && error.code === "billing_unavailable"
        ? "Your store restore completed, but Cogni couldn't verify server access yet. Try again shortly."
        : "Cogni couldn't restore purchases. Check your connection and store account, then try again.";
      await recordAnalytics("restore_completed", { source, outcome: "error", error_code: purchaseErrorCode(error) });
      return { ok: false, outcome: "error", message };
    }
  }, [recordAnalytics, syncServerState, userId]);

  const value = useMemo<EntitlementValue>(() => ({
    loading,
    isPro: server.isPro,
    localStoreShowsPro,
    stateReliable: server.stateReliable,
    entitlement: server.entitlement,
    config: server.config,
    offering,
    billingStatus,
    billingMessage,
    managementUrl,
    needsProForFocusedPractice: Boolean(server.stateReliable && server.config.monetizationEnabled && server.config.focusedPracticeIsPro && !server.isPro),
    refresh,
    purchase,
    restore,
    recordAnalytics,
  }), [billingMessage, billingStatus, loading, localStoreShowsPro, managementUrl, offering, purchase, recordAnalytics, refresh, restore, server]);

  return <EntitlementContext.Provider value={value}>{children}</EntitlementContext.Provider>;
}

export function useEntitlements() {
  const value = React.useContext(EntitlementContext);
  if (!value) throw new Error("useEntitlements must be used inside EntitlementProvider");
  return value;
}
