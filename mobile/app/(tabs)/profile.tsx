import { useNotebook } from "@/lib/notebook";
import React, { useCallback, useState } from "react";
import { Alert, Linking, Switch, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { FormField } from "@/components/form-field";
import { CompactAction } from "@/components/interaction-cues";
import { OptionPicker } from "@/components/option-picker";
import { AchievementShelf } from "@/components/achievements";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { isMobileAudience, mobileAudienceMeta } from "@/lib/audience";
import {
  functionLabelForAudience,
  functionOptionsForAudience,
  goalOptionsForAudience,
  INDUSTRY_OPTIONS,
  ORGANISATION_SCALE_OPTIONS,
  RESPONSIBILITY_OPTIONS,
  STUDY_STAGE_OPTIONS,
} from "@/lib/context-options";
import { useFeedback } from "@/lib/feedback";
import { PRIVACY_URL, SUPPORT_URL, TERMS_URL } from "@/lib/legal";
import { useProGate } from "@/lib/pro-gate";
import { supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";
import appConfig from "../../app.json";
import type { MobileProfileResponse } from "@/lib/types";
import { ActionLink, Body, Card, Eyebrow, ErrorState, LoadingState, PrimaryButton, Screen, Title } from "@/components/ui";

function readableDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function PreferenceRow({
  title,
  description,
  value,
  onValueChange,
  disabled,
}: {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={{ minHeight: 68, flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 10 }}>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ color: colors.text, fontSize: 16, lineHeight: 22, fontWeight: "800" }}>{title}</Text>
        <Text style={{ color: colors.muted, fontSize: 13.5, lineHeight: 19 }}>{description}</Text>
      </View>
      <Switch
        accessibilityLabel={title}
        accessibilityHint={description}
        disabled={disabled}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "rgba(91,107,158,.46)", true: "rgba(0,229,255,.44)" }}
        thumbColor={value ? colors.cyan : colors.soft}
        ios_backgroundColor="rgba(91,107,158,.46)"
      />
    </View>
  );
}

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const notebook = useNotebook();
  const { isPro, stateReliable, config, entitlement, billingStatus, managementUrl, restore, openPaywall } = useProGate();
  const { ready: feedbackReady, soundEnabled, hapticsEnabled, setSoundEnabled, setHapticsEnabled, playFeedback } = useFeedback();
  const [data, setData] = useState<MobileProfileResponse | null>(null); const [loading, setLoading] = useState(true); const [pending, setPending] = useState<"save" | "restore" | "delete" | "signout" | null>(null); const [error, setError] = useState(""); const [saved, setSaved] = useState("");
  const busy = pending !== null;
  const [name, setName] = useState(""); const [functionArea, setFunctionArea] = useState(""); const [industry, setIndustry] = useState(""); const [goal, setGoal] = useState("");
  const [studyStage, setStudyStage] = useState(""); const [responsibilityScope, setResponsibilityScope] = useState(""); const [organisationScale, setOrganisationScale] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const result = await apiFetch<MobileProfileResponse>("/api/mobile/profile");
      setData(result); setName(result.profile.full_name ?? ""); setFunctionArea(result.profile.function_area ?? ""); setIndustry(result.profile.industry ?? ""); setGoal(result.profile.primary_goal ?? "");
      setStudyStage(result.profile.study_stage ?? ""); setResponsibilityScope(result.profile.responsibility_scope ?? ""); setOrganisationScale(result.profile.organisation_scale ?? "");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load profile."); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  if (loading) return <LoadingState />;
  if (error && !data) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!data) return null;

  const audience = isMobileAudience(data.profile.audience_segment) ? data.profile.audience_segment : null;
  const isCasual = audience === "casual"; const isStudent = audience === "university_student"; const isProfessional = Boolean(audience && !isCasual && !isStudent);
  const meta = mobileAudienceMeta(audience);

  async function save() {
    if (busy || !audience) return;
    setPending("save"); setError(""); setSaved("");
    try {
      const updated = await apiFetch<MobileProfileResponse>("/api/mobile/profile", {
        method: "POST",
        body: JSON.stringify({
          fullName: name.trim() || null,
          functionArea: functionArea || null,
          industry: isProfessional ? industry || null : null,
          primaryGoal: goal || null,
          studyStage: isStudent ? studyStage || null : null,
          responsibilityScope: isProfessional ? responsibilityScope || null : null,
          organisationScale: isProfessional ? organisationScale || null : null,
        }),
      });
      setData(updated); setName(updated.profile.full_name ?? ""); setSaved("Profile updated");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save profile."); }
    finally { setPending(null); }
  }

  async function logout() {
    if (busy) return;
    setPending("signout");
    try { await signOut(); router.replace("/"); }
    catch { Alert.alert("Could not sign out", "Check your connection and try again. Your account is still signed in."); }
    finally { setPending(null); }
  }

  async function openExternal(url: string) {
    try { await Linking.openURL(url); }
    catch { Alert.alert("Could not open this page", "Check your connection and try again. You can also contact Cogni Support from your profile."); }
  }

  async function restoreFromProfile() {
    if (busy || billingStatus === "not_configured") return;
    setPending("restore");
    try {
      const result = await restore("profile");
      Alert.alert(result.ok ? "Purchases restored" : result.outcome === "no_subscription" ? "Nothing to restore" : "Restore incomplete", result.message);
    } catch {
      Alert.alert("Restore incomplete", "Cogni couldn't restore purchases. Check your connection and try again.");
    } finally { setPending(null); }
  }

  function confirmDeleteAccount() {
    if (busy) return;
    const subscriptionWarning = " Deleting your Cogni account does not cancel an App Store or Google Play subscription. Cancel or manage that separately in your store subscription settings if you do not want it to renew.";
    Alert.alert(
      "Delete Cogni account?",
      `This permanently deletes your Cogni account, scores, streak, answers, learning history and subscription access in Cogni. This cannot be undone.${subscriptionWarning}`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete account", style: "destructive", onPress: () => void deleteAccount() },
      ],
    );
  }

  async function deleteAccount() {
    if (busy) return;
    setPending("delete"); setError("");
    try {
      await apiFetch<{ ok: boolean }>("/api/mobile/account", { method: "DELETE" });
      let localClearFailed = false;
      try { await notebook.clear(); } catch { localClearFailed = true; }
      await supabase.auth.signOut({ scope: "local" });
      if (localClearFailed) Alert.alert("Online account deleted", "Device storage could not be cleared. Remove Cogni’s app data in Android Settings to erase unreadable local copies.");
      router.replace("/");
    } catch (caught) {
      Alert.alert("Deletion incomplete", caught instanceof Error ? caught.message : "Could not delete your account. Please try again.");
      setPending(null);
    }
  }

  const initials = (name.trim() || data.profile.email || "C").split(/\s+/).map((part) => part[0]).join("").slice(0,2).toUpperCase();
  const xp = data.profile.xp ?? 0; const streak = data.profile.current_streak ?? 0; const answers = data.summary.answers;
  const expiry = readableDate(entitlement?.expiration_date);
  const subscriptionSummary = !stateReliable
    ? "We couldn't verify your subscription status. Reopen this screen when you're connected, or restore a purchase below."
    : isPro
    ? entitlement?.status === "cancelled" ? `Active until ${expiry ?? "the end of the paid period"}; renewal cancelled.`
      : entitlement?.billing_issue ? `Access is active while the store resolves a billing issue${expiry ? `, currently through ${expiry}` : ""}.`
        : `Active${expiry ? ` through ${expiry}` : ""}${entitlement?.will_renew ? "; set to renew in the store" : ""}.`
    : entitlement?.status === "expired" || entitlement?.status === "refunded" || entitlement?.status === "revoked"
      ? `Free plan. Previous Cogni Pro access is ${entitlement.status}.`
      : !config.monetizationEnabled
        ? "Paid subscriptions are not enabled in this preview. Daily learning, focused practice and available history are free to explore."
        : "Free plan. Your daily core learning remains available.";
  return <Screen>
    <View style={{ gap: 5 }}><Eyebrow>Your account</Eyebrow><Title>Make Cogni yours</Title><Body muted>Manage your learning, feedback and account in one place.</Body></View>
    <Card style={{ alignItems: "center", gap: 10 }}>
      <View style={{ minWidth: 56, minHeight: 56, padding: 12, borderRadius: 18, backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" }}><Text accessibilityLabel={`Profile initials ${initials}`} style={{ color: colors.cyan, fontSize: 21, fontWeight: "800" }}>{initials}</Text></View>
      <Title size={25}>{name.trim() || "Your Cogni profile"}</Title><Text selectable style={{ color: colors.muted, fontSize: 14.5 }}>{data.profile.email}</Text>{meta ? <CompactAction accent label={meta.label} hint="Change your learning context" onPress={() => router.push("/onboarding")} /> : null}
      <View accessible accessibilityLabel={`${xp} XP. ${answers} answers. ${streak} ${streak===1?"day":"days"} streak.`} style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 18, marginTop: 6 }}><View style={{ alignItems: "center", minWidth: 64 }}><Text style={{ color: colors.text, fontSize: 21, fontWeight: "900" }}>{xp}</Text><Text style={{ color: colors.soft, fontSize: 12.5 }}>XP</Text></View><View style={{ alignItems: "center", minWidth: 64 }}><Text style={{ color: colors.text, fontSize: 21, fontWeight: "900" }}>{answers}</Text><Text style={{ color: colors.soft, fontSize: 12.5 }}>Answers</Text></View><View style={{ alignItems: "center", minWidth: 64 }}><Text style={{ color: colors.text, fontSize: 21, fontWeight: "900" }}>{streak}</Text><Text style={{ color: colors.soft, fontSize: 12.5 }}>Streak</Text></View></View>
      <ActionLink label="Get help" onPress={() => router.push("/support")} />
    </Card>

    <AchievementShelf achievements={data.achievements ?? []} title="Your achievements" />

    <Card><Eyebrow>Learning context</Eyebrow><Body muted>Changing context never resets your scores, XP, streak or history. It changes the situations Cogni uses next.</Body><PrimaryButton label="Change learning context" secondary onPress={() => router.push("/onboarding")} /></Card>

    <Card>
      <Eyebrow>Feedback</Eyebrow>
      <Title size={23}>Sound and touch</Title>
      <Body muted>Short sounds mark answer results and session completion. Spoken feedback takes priority when a screen reader is on.</Body>
      <View style={{ borderTopWidth: 1, borderTopColor: colors.line, marginTop: 2 }}>
        <Body muted style={{ fontSize: 14, lineHeight: 21 }}>On iPhone, sounds respect Silent mode. On Android, they follow media volume. Turn sounds off here for quiet practice.</Body>
        <PreferenceRow title="Sound effects" description="Subtle tones for answers and session completion." value={soundEnabled} disabled={!feedbackReady} onValueChange={setSoundEnabled} />
        <View style={{ height: 1, backgroundColor: colors.line }} />
        <PreferenceRow title="Haptic feedback" description="Gentle touch feedback for selections and results." value={hapticsEnabled} disabled={!feedbackReady} onValueChange={setHapticsEnabled} />
      </View>
      <PrimaryButton label="Preview feedback" secondary disabled={!feedbackReady || (!soundEnabled && !hapticsEnabled)} accessibilityHint="Try your current sound and haptic settings." onPress={() => playFeedback("complete")} />
    </Card>

    <Card style={{ borderColor: isPro ? "rgba(0,229,255,.36)" : colors.line }}>
      <Eyebrow>Subscription</Eyebrow>
      <Title size={24}>{!stateReliable ? "Status unavailable" : isPro ? "Cogni Pro" : !config.monetizationEnabled ? "Cogni preview" : "Cogni Free"}</Title>
      <Body muted>{subscriptionSummary}</Body>
      {!isPro ? <PrimaryButton label={stateReliable && !config.monetizationEnabled ? "About Cogni Pro" : "Explore Cogni Pro"} onPress={() => openPaywall("profile", "cogni_pro")} /> : null}
      {managementUrl ? <PrimaryButton secondary label="Manage subscription" onPress={() => void openExternal(managementUrl)} /> : null}
      <PrimaryButton secondary label={pending === "restore" ? "Restoring…" : "Restore purchases"} loading={pending === "restore"} disabled={busy || billingStatus === "not_configured"} onPress={() => void restoreFromProfile()} />
      {billingStatus === "not_configured" ? <Body muted style={{ fontSize: 13, lineHeight: 19 }}>Store purchases and restoration are unavailable in this build.</Body> : null}
      <Body muted style={{ fontSize: 13, lineHeight: 19 }}>Purchases and cancellations are handled by Apple or Google. Deleting your Cogni account does not cancel a store subscription.</Body>
    </Card>

    {audience ? <Card>
      <Eyebrow>Personalisation</Eyebrow><Body muted>{isCasual ? "Keep your interests and learning goal current so Cogni can favour useful everyday situations." : "Your choices help Cogni find relevant situations to practise."}</Body>
      <View style={{ gap: 18 }}>
        <FormField label="Name" editable={!busy} autoComplete="name" maxLength={100} value={name} onChangeText={(value) => { setName(value); setSaved(""); }} placeholder="Your name" placeholderTextColor={colors.soft} />
        <OptionPicker label={functionLabelForAudience(audience)} value={functionArea} options={functionOptionsForAudience(audience)} onChange={(value) => { if (!busy) { setFunctionArea(value); setSaved(""); } } } />
        {isStudent ? <OptionPicker label="Study stage" value={studyStage} options={STUDY_STAGE_OPTIONS} onChange={(value) => { if (!busy) { setStudyStage(value); setSaved(""); } } } /> : null}
        {isProfessional ? <OptionPicker label="Industry" value={industry} options={INDUSTRY_OPTIONS} onChange={(value) => { if (!busy) { setIndustry(value); setSaved(""); } } } /> : null}
        {isProfessional ? <OptionPicker label="Your responsibilities" value={responsibilityScope} options={RESPONSIBILITY_OPTIONS} onChange={(value) => { if (!busy) { setResponsibilityScope(value); setSaved(""); } } } /> : null}
        {isProfessional ? <OptionPicker label="Organisation size" value={organisationScale} options={ORGANISATION_SCALE_OPTIONS} onChange={(value) => { if (!busy) { setOrganisationScale(value); setSaved(""); } } } /> : null}
        <OptionPicker label={isCasual ? "What would you like to get better at?" : "Primary goal"} value={goal} options={goalOptionsForAudience(audience)} onChange={(value) => { if (!busy) { setGoal(value); setSaved(""); } } } />
      </View>
      {saved ? <Text accessibilityLiveRegion="polite" style={{ color: colors.green, fontWeight: "800", lineHeight: 22 }}>{saved}</Text> : null}
      {error ? <Text accessibilityLiveRegion="assertive" selectable style={{ color: colors.danger, lineHeight: 22 }}>{error}</Text> : null}
      <PrimaryButton label={pending === "save" ? "Saving…" : "Save profile"} loading={pending === "save"} disabled={busy} onPress={() => void save()} />
    </Card> : null}

    <Card style={{ borderColor: "rgba(0,229,255,.24)" }}>
      <Eyebrow>Privacy & trust</Eyebrow><Title size={23}>Built to support learning, not label you</Title>
      <Body muted>Cogni checks your answers securely and keeps your learning history linked to your account. Your sign-in session is stored securely on this device.</Body>
      <Body muted style={{ fontSize: 14, lineHeight: 20 }}>Your Development Scores describe your learning so far. The evidence level shows how much practice supports each score. They are not a ranking against other people or a formal assessment. You can delete your account and learning history at any time.</Body>
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", columnGap: 4 }}><ActionLink label="Privacy policy" onPress={() => void openExternal(PRIVACY_URL)} /><ActionLink label="Terms" onPress={() => void openExternal(TERMS_URL)} /><ActionLink label="Support" onPress={() => void openExternal(SUPPORT_URL)} /></View>
    </Card>

    <Card>
      <Eyebrow>Account</Eyebrow><Body muted>Your session is stored securely on this device. You can also change your password or permanently remove your account.</Body>
      <PrimaryButton label="Cogni Support" secondary onPress={() => router.push("/support")} />
      <PrimaryButton label="Change password" secondary onPress={() => router.push({ pathname: "/auth/recovery", params: { source: "profile" } })} />
      <PrimaryButton label="Saved ideas & weekly rhythm" secondary onPress={() => router.push("/toolkit")} />
      <PrimaryButton label={pending === "signout" ? "Signing out…" : "Sign out"} loading={pending === "signout"} secondary disabled={busy} onPress={() => void logout()} />
      <PrimaryButton label={pending === "delete" ? "Deleting account…" : "Delete account"} loading={pending === "delete"} secondary disabled={busy} onPress={confirmDeleteAccount} />
    </Card>
    <Text selectable style={{ color: colors.soft, fontSize: 12, lineHeight: 18, textAlign: "center" }}>Cogni {appConfig.expo.version} · Test preview</Text>
  </Screen>;
}
