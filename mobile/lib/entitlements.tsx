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

type AccountScope = {
  userId: string | null;
  active: boolean;
  serverRequest: number;
  refreshes: number;
};

type EntitlementSnapshot = {
  account: AccountScope;
  server: ServerEntitlementState;
  loading: boolean;
  offering: CogniOffering | null;
  billingStatus: EntitlementValue["billingStatus"];
  billingMessage: string | null;
  managementUrl: string | null;
  localStoreShowsPro: boolean;
};

function emptySnapshot(account: AccountScope): EntitlementSnapshot {
  return {
    account,
    server: { isPro: false, stateReliable: false, entitlement: null, config: SAFE_DEFAULT_CONFIG, serverTime: new Date(0).toISOString() },
    loading: Boolean(account.userId),
    offering: null,
    billingStatus: "not_configured",
    billingMessage: null,
    managementUrl: null,
    localStoreShowsPro: false,
  };
}

function changedAccountResult(): ActionResult {
  return { ok: false, outcome: "error", message: "Your account changed. Reopen this screen to check subscription access." };
}

export function EntitlementProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  // A new scope also distinguishes A → B → A while earlier requests are pending.
  const account = useMemo<AccountScope>(() => ({ userId, active: true, serverRequest: 0, refreshes: 0 }), [userId]);
  const activeAccount = useRef(account);
  activeAccount.current = account;
  const [stored, setStored] = useState<EntitlementSnapshot>(() => emptySnapshot(account));
  // Hide the previous account's state in the first render, before effects run.
  const current = stored.account === account ? stored : emptySnapshot(account);
  const snapshot = useRef(current);
  snapshot.current = current;
  const { server, loading, offering, billingStatus, billingMessage, managementUrl, localStoreShowsPro } = current;
  const storeQueue = useRef<Promise<unknown>>(Promise.resolve());
  const actionInFlight = useRef(false);

  const ownsAccount = useCallback(() => Boolean(userId && account.active && activeAccount.current === account), [account, userId]);
  const updateState = useCallback((patch: Partial<Omit<EntitlementSnapshot, "account">>) => {
    if (!ownsAccount()) return;
    const next = { ...snapshot.current, ...patch, account };
    snapshot.current = next;
    setStored(next);
  }, [account, ownsAccount]);

  // RevenueCat has one native identity. Serialize identity changes with store
  // actions so a late logIn for an old account cannot own the next purchase.
  const withStore = useCallback(<T,>(action: () => Promise<T>): Promise<T> => {
    const next = storeQueue.current.then(action, action);
    storeQueue.current = next.then(() => undefined, () => undefined);
    return next;
  }, []);

  const recordAnalytics = useCallback(async (eventName: string, properties: Record<string, string | number | boolean | null> = {}) => {
    if (!ownsAccount()) return;
    // Telemetry must never delay the native purchase sheet or restoration.
    void apiFetch("/api/mobile/analytics", { method: "POST", body: JSON.stringify({ eventName, properties }) }).catch((error) => {
      if (__DEV__) console.warn("Cogni monetisation analytics failed", error);
    });
  }, [ownsAccount]);

  const requestServerState = useCallback(async (sync: boolean) => {
    if (!ownsAccount()) return null;
    const request = ++account.serverRequest;
    try {
      const next = sync
        ? await apiFetch<ServerEntitlementState>("/api/mobile/entitlements/sync", { method: "POST" })
        : await apiFetch<ServerEntitlementState>("/api/mobile/entitlements");
      if (!ownsAccount() || request !== account.serverRequest) return null;
      updateState({ server: next });
      return next;
    } catch (error) {
      if (ownsAccount() && request === account.serverRequest) {
        updateState({ server: { ...snapshot.current.server, stateReliable: false } });
      }
      throw error;
    }
  }, [account, ownsAccount, updateState]);

  const loadServerState = useCallback(() => requestServerState(false), [requestServerState]);
  const syncServerState = useCallback(() => requestServerState(true), [requestServerState]);

  const refreshStore = useCallback(async () => {
    if (!ownsAccount()) return false;
    if (!hasRevenueCatPublicKey()) {
      updateState({ offering: null, billingStatus: "not_configured", billingMessage: "Subscriptions are not configured for this build yet.", managementUrl: null, localStoreShowsPro: false });
      return false;
    }
    updateState({ billingStatus: "loading" });
    return withStore(async () => {
      if (!ownsAccount()) return false;
      try {
        const identified = await identifyPurchasesUser(userId!);
        if (!ownsAccount()) return false;
        if (!identified) {
          updateState({ offering: null, billingStatus: "not_configured", billingMessage: "Subscriptions are not configured for this build yet." });
          return false;
        }
        const [customerInfo, nextOffering] = await Promise.all([getCustomerInfo(), loadDefaultOffering()]);
        if (!ownsAccount()) return false;
        const ready = Boolean(nextOffering?.monthly || nextOffering?.annual);
        updateState({
          managementUrl: customerInfo?.managementURL ?? null,
          localStoreShowsPro: localPro(customerInfo),
          offering: nextOffering,
          billingStatus: ready ? "ready" : "no_offerings",
          billingMessage: ready ? null : "Cogni Pro isn't available from this storefront right now.",
        });
        return true;
      } catch (error) {
        updateState({ offering: null, billingStatus: "error", billingMessage: "Cogni couldn't load subscription options. Check your connection and try again." });
        if (__DEV__) console.warn("RevenueCat refresh failed", error);
        return false;
      }
    });
  }, [ownsAccount, updateState, userId, withStore]);

  const refresh = useCallback(async (syncStore = false) => {
    if (!ownsAccount()) return;
    account.refreshes += 1;
    updateState({ loading: true });
    try {
      if (syncStore && hasRevenueCatPublicKey()) {
        try { await syncServerState(); } catch { if (ownsAccount()) await loadServerState(); }
      } else {
        await loadServerState();
      }
    } finally {
      if (ownsAccount()) await refreshStore();
      account.refreshes -= 1;
      updateState({ loading: account.refreshes > 0 });
    }
  }, [account, loadServerState, ownsAccount, refreshStore, syncServerState, updateState]);

  useEffect(() => {
    account.active = true;
    let cancelled = false;
    let removeCustomerListener: () => void = () => {};

    if (!userId) {
      // Preserve queue ordering even if sign-out happens during native logIn.
      void withStore(async () => {
        if (activeAccount.current === account) clearLocalPurchasesUserState();
      });
      return () => { account.active = false; };
    }

    account.refreshes += 1;
    updateState({ loading: true });
    void (async () => {
      try {
        try { await loadServerState(); } catch (error) {
          if (__DEV__) console.warn("Entitlement state is unavailable", error);
        }
        if (cancelled || !ownsAccount()) return;
        const storeReady = await refreshStore();
        if (!cancelled && ownsAccount() && storeReady) {
          removeCustomerListener = listenForCustomerInfo((customerInfo) => {
            if (cancelled || !ownsAccount()) return;
            updateState({ managementUrl: customerInfo.managementURL ?? null, localStoreShowsPro: localPro(customerInfo) });
            void syncServerState().catch((error) => {
              if (__DEV__) console.warn("Server entitlement listener sync failed", error);
            });
          });
        }
      } catch (error) {
        if (__DEV__) console.warn("Entitlement initialization failed", error);
      } finally {
        account.refreshes -= 1;
        if (!cancelled) updateState({ loading: account.refreshes > 0 });
      }
    })();

    const onAppState = (state: AppStateStatus) => {
      if (state === "active" && !cancelled && ownsAccount()) {
        void refresh(true).catch((error) => {
          if (__DEV__) console.warn("Foreground entitlement refresh failed", error);
        });
      }
    };
    const subscription = AppState.addEventListener("change", onAppState);

    return () => {
      cancelled = true;
      account.active = false;
      removeCustomerListener();
      subscription.remove();
    };
  }, [account, loadServerState, ownsAccount, refresh, refreshStore, syncServerState, updateState, userId, withStore]);

  const purchase = useCallback(async (pkg: CogniPurchasePackage, source = "paywall"): Promise<ActionResult> => {
    const blocked = (): ActionResult | null => {
      if (!ownsAccount()) return changedAccountResult();
      const state = snapshot.current;
      if (!state.server.stateReliable) return { ok: false, outcome: "error", message: "Cogni couldn't verify subscription availability. Refresh and try again." };
      if (!state.server.config.monetizationEnabled) return { ok: false, outcome: "error", message: "Cogni Pro subscriptions aren't available yet." };
      if (!hasRevenueCatPublicKey() || state.billingStatus !== "ready" || !state.offering) return { ok: false, outcome: "error", message: "Subscription options aren't ready. Refresh and try again." };
      const loadedPackage = pkg.kind === "monthly" ? state.offering.monthly : pkg.kind === "annual" ? state.offering.annual : null;
      if (!loadedPackage || loadedPackage !== pkg) return { ok: false, outcome: "error", message: "Subscription options changed. Select a current plan and try again." };
      return null;
    };
    const unavailable = blocked();
    if (unavailable) return unavailable;
    if (actionInFlight.current) return { ok: false, outcome: "error", message: "A store request is already in progress. Wait for it to finish." };
    actionInFlight.current = true;
    try {
      return await withStore(async () => {
        const queuedBlock = blocked();
        if (queuedBlock) return queuedBlock;
        try {
          const identified = await identifyPurchasesUser(userId!);
          const launchBlock = blocked();
          if (launchBlock) return launchBlock;
          if (!identified) return { ok: false, outcome: "error", message: "Subscriptions are not configured for this build yet." };
          if (snapshot.current.server.isPro) return { ok: true, outcome: "success", message: "Cogni Pro is already active." };
          void recordAnalytics("purchase_started", { package: pkg.kind, product_id: pkg.productId, offering: snapshot.current.offering?.identifier ?? "default", source });
          const result = await purchaseCogniPackage(pkg);
          if (!ownsAccount()) return changedAccountResult();
          updateState({ managementUrl: result.customerInfo.managementURL ?? null, localStoreShowsPro: localPro(result.customerInfo) });
          void recordAnalytics("purchase_completed", { package: pkg.kind, product_id: pkg.productId, offering: snapshot.current.offering?.identifier ?? "default", source });
          try {
            const verified = await syncServerState();
            if (!ownsAccount()) return changedAccountResult();
            if (verified?.stateReliable && verified.isPro) return { ok: true, outcome: "success", message: "Cogni Pro is active." };
          } catch (error) {
            if (__DEV__) console.warn("Post-purchase server verification pending", error);
          }
          if (!ownsAccount()) return changedAccountResult();
          return { ok: false, outcome: "pending_verification", message: "Your purchase completed, but Cogni is still verifying access. Keep the app open and try Restore purchases if this persists." };
        } catch (error) {
          if (!ownsAccount()) return changedAccountResult();
          const cancelled = isPurchaseCancellation(error);
          void recordAnalytics("purchase_failed", { package: pkg.kind, product_id: pkg.productId, source, error_code: cancelled ? "cancelled" : purchaseErrorCode(error) });
          return cancelled
            ? { ok: false, outcome: "cancelled", message: "Purchase cancelled." }
            : { ok: false, outcome: "error", message: "The purchase didn't complete. Check your store account before trying again." };
        }
      });
    } finally {
      actionInFlight.current = false;
    }
  }, [ownsAccount, recordAnalytics, syncServerState, updateState, userId, withStore]);

  const restore = useCallback(async (source = "paywall"): Promise<ActionResult> => {
    if (!ownsAccount()) return changedAccountResult();
    if (!hasRevenueCatPublicKey()) return { ok: false, outcome: "error", message: "Subscriptions are not configured for this build yet." };
    if (actionInFlight.current) return { ok: false, outcome: "error", message: "A store request is already in progress. Wait for it to finish." };
    actionInFlight.current = true;
    try {
      return await withStore(async () => {
        if (!ownsAccount()) return changedAccountResult();
        let restoredInStore = false;
        try {
          // Existing subscribers can restore even while new sales are disabled or
          // the offering cannot load. Always identify this Cogni account first.
          const identified = await identifyPurchasesUser(userId!);
          if (!ownsAccount()) return changedAccountResult();
          if (!identified) return { ok: false, outcome: "error", message: "Subscriptions are not configured for this build yet." };
          void recordAnalytics("restore_started", { source });
          const customerInfo = await restoreCogniPurchases();
          if (!ownsAccount()) return changedAccountResult();
          restoredInStore = localPro(customerInfo);
          updateState({ managementUrl: customerInfo.managementURL ?? null, localStoreShowsPro: restoredInStore });
          const verified = await syncServerState();
          if (!ownsAccount()) return changedAccountResult();
          if (!verified?.stateReliable || (restoredInStore && !verified.isPro)) {
            return { ok: false, outcome: "pending_verification", message: "Your store restore completed, but Cogni is still verifying access. Try again shortly." };
          }
          const restored = verified.isPro;
          void recordAnalytics("restore_completed", { source, outcome: restored ? "subscription_restored" : "no_subscription" });
          return restored
            ? { ok: true, outcome: "success", message: "Cogni Pro has been restored." }
            : { ok: false, outcome: "no_subscription", message: "No active Cogni Pro subscription was found for this store account." };
        } catch (error) {
          if (!ownsAccount()) return changedAccountResult();
          const pending = restoredInStore || (error instanceof ApiError && error.code === "billing_unavailable");
          const message = pending
            ? "Your store restore completed, but Cogni couldn't verify server access yet. Try again shortly."
            : "Cogni couldn't restore purchases. Check your connection and store account, then try again.";
          void recordAnalytics("restore_completed", { source, outcome: "error", error_code: purchaseErrorCode(error) });
          return { ok: false, outcome: pending ? "pending_verification" : "error", message };
        }
      });
    } finally {
      actionInFlight.current = false;
    }
  }, [ownsAccount, recordAnalytics, syncServerState, updateState, userId, withStore]);

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
