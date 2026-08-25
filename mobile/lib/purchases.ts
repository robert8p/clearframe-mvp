import { Platform } from "react-native";
import Purchases, {
  INTRO_ELIGIBILITY_STATUS,
  LOG_LEVEL,
  type CustomerInfo,
  type CustomerInfoUpdateListener,
  type PurchasesOffering,
  type PurchasesPackage,
} from "react-native-purchases";

const APPLE_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY?.trim() ?? "";
const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY?.trim() ?? "";

let configured = false;
let identifiedUserId: string | null = null;
let listener: CustomerInfoUpdateListener | null = null;

export type CogniPurchasePackage = {
  kind: "monthly" | "annual";
  identifier: string;
  productId: string;
  priceString: string;
  price: number;
  currencyCode: string;
  introText: string | null;
  raw: PurchasesPackage;
};

export type CogniOffering = {
  identifier: string;
  monthly: CogniPurchasePackage | null;
  annual: CogniPurchasePackage | null;
  annualSavingPercent: number | null;
};

function apiKey() {
  if (Platform.OS === "ios") return APPLE_API_KEY;
  if (Platform.OS === "android") return GOOGLE_API_KEY;
  return "";
}

export function hasRevenueCatPublicKey() {
  return Boolean(apiKey());
}

export async function identifyPurchasesUser(userId: string) {
  const key = apiKey();
  if (!key) return false;
  if (!configured) {
    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);
    Purchases.configure({ apiKey: key, appUserID: userId });
    configured = true;
    identifiedUserId = userId;
    return true;
  }
  if (identifiedUserId !== userId) {
    await Purchases.logIn(userId);
    identifiedUserId = userId;
  }
  return true;
}

// Cogni only uses authenticated, custom App User IDs. RevenueCat documents that
// calling logOut() creates an anonymous ID, so sign-out clears app state only.
// A later authenticated account switch is performed directly with logIn(newUuid).
export function clearLocalPurchasesUserState() {
  identifiedUserId = null;
  if (listener) {
    Purchases.removeCustomerInfoUpdateListener(listener);
    listener = null;
  }
}

export async function getCustomerInfo() {
  if (!configured) return null;
  return Purchases.getCustomerInfo();
}

export function listenForCustomerInfo(onUpdate: (customerInfo: CustomerInfo) => void) {
  if (!configured) return () => undefined;
  if (listener) Purchases.removeCustomerInfoUpdateListener(listener);
  listener = onUpdate;
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => {
    if (listener === onUpdate) {
      Purchases.removeCustomerInfoUpdateListener(onUpdate);
      listener = null;
    }
  };
}

function productId(value: string) {
  return value.split(":", 1)[0];
}

function kindForPackage(pkg: PurchasesPackage): "monthly" | "annual" | null {
  const id = productId(pkg.product.identifier);
  if (id === "cogni_pro_monthly") return "monthly";
  if (id === "cogni_pro_annual") return "annual";
  const identifier = pkg.identifier.toLowerCase();
  if (identifier.includes("monthly")) return "monthly";
  if (identifier.includes("annual") || identifier.includes("year")) return "annual";
  return null;
}

type IntroPriceShape = {
  priceString?: string | null;
  periodNumberOfUnits?: number | null;
  periodUnit?: string | null;
  cycles?: number | null;
};

function introDescription(intro: IntroPriceShape | null | undefined) {
  if (!intro?.priceString) return null;
  const units = Number(intro.periodNumberOfUnits ?? 1) || 1;
  const unit = String(intro.periodUnit ?? "period").toLowerCase();
  const cycles = Number(intro.cycles ?? 1) || 1;
  const duration = units * cycles;
  const plural = duration === 1 ? unit : `${unit}s`;
  if (/^[£$€]?0(?:[.,]0+)?$/.test(intro.priceString.replace(/\s/g, ""))) return `${duration} ${plural} free`;
  return `${intro.priceString} for ${duration} ${plural}`;
}

async function eligibleIntroText(pkg: PurchasesPackage) {
  if (Platform.OS !== "ios") return null;
  const product = pkg.product as typeof pkg.product & { introPrice?: IntroPriceShape | null };
  if (!product.introPrice) return null;
  try {
    const eligibility = await Purchases.checkTrialOrIntroductoryPriceEligibility([product.identifier]);
    if (eligibility[product.identifier]?.status !== INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE) return null;
    return introDescription(product.introPrice);
  } catch {
    return null;
  }
}

async function toCogniPackage(pkg: PurchasesPackage): Promise<CogniPurchasePackage | null> {
  const kind = kindForPackage(pkg);
  if (!kind) return null;
  const product = pkg.product;
  return {
    kind,
    identifier: pkg.identifier,
    productId: productId(product.identifier),
    priceString: product.priceString,
    price: product.price,
    currencyCode: product.currencyCode,
    introText: await eligibleIntroText(pkg),
    raw: pkg,
  };
}

export async function loadDefaultOffering(): Promise<CogniOffering | null> {
  if (!configured) return null;
  const offerings = await Purchases.getOfferings();
  const offering: PurchasesOffering | null = offerings.current ?? offerings.all?.default ?? null;
  if (!offering) return null;
  const packages = (await Promise.all(offering.availablePackages.map(toCogniPackage))).filter((value): value is CogniPurchasePackage => Boolean(value));
  const monthly = packages.find((pkg) => pkg.kind === "monthly") ?? null;
  const annual = packages.find((pkg) => pkg.kind === "annual") ?? null;
  const annualSavingPercent = monthly && annual && monthly.currencyCode === annual.currencyCode && monthly.price > 0
    ? Math.max(0, Math.round((1 - annual.price / (monthly.price * 12)) * 100))
    : null;
  return { identifier: offering.identifier, monthly, annual, annualSavingPercent };
}

export async function purchaseCogniPackage(pkg: CogniPurchasePackage) {
  if (!configured) throw new Error("billing_not_configured");
  return Purchases.purchasePackage(pkg.raw);
}

export async function restoreCogniPurchases() {
  if (!configured) throw new Error("billing_not_configured");
  return Purchases.restorePurchases();
}

export function isPurchaseCancellation(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const record = error as { userCancelled?: unknown; code?: unknown };
  return record.userCancelled === true || record.code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR;
}

export function purchaseErrorCode(error: unknown) {
  if (!error || typeof error !== "object") return "unknown";
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" || typeof code === "number" ? String(code).slice(0, 120) : "unknown";
}
