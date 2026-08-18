import React, { useCallback, useState } from "react";
import { Alert, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { FormField } from "@/components/form-field";
import { CompactAction } from "@/components/interaction-cues";
import { OptionPicker } from "@/components/option-picker";
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
import { supabase } from "@/lib/supabase";
import { colors, gradients } from "@/lib/theme";
import type { MobileProfileResponse } from "@/lib/types";
import { Body, Card, Eyebrow, ErrorState, LoadingState, PrimaryButton, Screen, Title } from "@/components/ui";

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const [data, setData] = useState<MobileProfileResponse | null>(null); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [saved, setSaved] = useState("");
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
    setBusy(true); setError(""); setSaved("");
    try {
      const updated = await apiFetch<MobileProfileResponse>("/api/mobile/profile", {
        method: "POST",
        body: JSON.stringify({
          fullName: name || null,
          functionArea: functionArea || null,
          industry: isProfessional ? industry || null : null,
          primaryGoal: goal || null,
          studyStage: isStudent ? studyStage || null : null,
          responsibilityScope: isProfessional ? responsibilityScope || null : null,
          organisationScale: isProfessional ? organisationScale || null : null,
        }),
      });
      setData(updated); setSaved("Profile updated");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save profile."); }
    finally { setBusy(false); }
  }

  async function logout() { await signOut(); router.replace("/"); }

  function confirmDeleteAccount() {
    Alert.alert(
      "Delete Cogni account?",
      "This permanently deletes your account, scores, streak, answers and learning history. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete account", style: "destructive", onPress: () => void deleteAccount() },
      ],
    );
  }

  async function deleteAccount() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      await apiFetch<{ ok: boolean }>("/api/mobile/account", { method: "DELETE" });
      await supabase.auth.signOut({ scope: "local" });
      router.replace("/");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not delete your account."); setBusy(false); }
  }

  const initials = (name || data.profile.email || "C").split(/\s+/).map((part) => part[0]).join("").slice(0,2).toUpperCase();
  const xp = data.profile.xp ?? 0; const streak = data.profile.current_streak ?? 0; const answers = data.summary.answers;
  const milestones = [
    { icon: "⚡", label: "100 XP", unlocked: xp >= 100 },
    { icon: "✓", label: "10 answers", unlocked: answers >= 10 },
    { icon: "🔥", label: "3-day streak", unlocked: streak >= 3 },
  ];

  return <Screen>
    <LinearGradient colors={["rgba(38,43,112,.95)", "rgba(15,20,51,.98)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 28, borderWidth: 1, borderColor: colors.line, padding: 20, alignItems: "center", gap: 10 }}>
      <LinearGradient colors={[...gradients.orb]} style={{ width: 88, height: 88, borderRadius: 44, padding: 4 }}><View style={{ flex: 1, borderRadius: 40, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg2 }}><Text accessibilityLabel={`Profile initials ${initials}`} style={{ color: colors.white, fontSize: 27, fontWeight: "900" }}>{initials}</Text></View></LinearGradient>
      <Title size={27}>{name || "Your Cogni profile"}</Title><Text selectable style={{ color: colors.muted, fontSize: 14.5 }}>{data.profile.email}</Text>{meta ? <CompactAction accent label={meta.label} hint="Change your learning context" onPress={() => router.push("/onboarding")} /> : null}
      <View accessible accessibilityLabel={`${xp} XP. ${answers} answers. ${streak} ${streak===1?"day":"days"} streak.`} style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 18, marginTop: 6 }}><View style={{ alignItems: "center", minWidth: 64 }}><Text style={{ color: colors.text, fontSize: 21, fontWeight: "900" }}>{xp}</Text><Text style={{ color: colors.soft, fontSize: 12.5 }}>XP</Text></View><View style={{ alignItems: "center", minWidth: 64 }}><Text style={{ color: colors.text, fontSize: 21, fontWeight: "900" }}>{answers}</Text><Text style={{ color: colors.soft, fontSize: 12.5 }}>Answers</Text></View><View style={{ alignItems: "center", minWidth: 64 }}><Text style={{ color: colors.text, fontSize: 21, fontWeight: "900" }}>{streak}</Text><Text style={{ color: colors.soft, fontSize: 12.5 }}>Streak</Text></View></View>
    </LinearGradient>

    <Card><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}><Eyebrow>Milestones</Eyebrow><Text style={{ color: colors.soft, fontSize: 12.5 }}>Progress markers</Text></View><View style={{ gap: 0 }}>{milestones.map((item, index) => <View accessible accessibilityLabel={`${item.label}. ${item.unlocked ? "Unlocked" : "Locked"}.`} key={item.label} style={{ minHeight: 62, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: index === milestones.length - 1 ? 0 : 1, borderBottomColor: colors.line }}><Text accessible={false} style={{ width: 30, fontSize: 21, textAlign: "center", opacity: item.unlocked ? 1 : .48 }}>{item.icon}</Text><View style={{ flex: 1, gap: 2 }}><Text style={{ color: colors.text, fontSize: 15.5, lineHeight: 21, fontWeight: "800" }}>{item.label}</Text><Text style={{ color: item.unlocked ? colors.green : colors.soft, fontSize: 12.5, lineHeight: 18, fontWeight: "700" }}>{item.unlocked ? "Unlocked" : "Not yet unlocked"}</Text></View><Text accessible={false} style={{ color: item.unlocked ? colors.green : colors.soft, fontSize: 18, fontWeight: "900" }}>{item.unlocked ? "✓" : "○"}</Text></View>)}</View></Card>

    <Card><Eyebrow>Learning context</Eyebrow><Body muted>Changing context never resets your scores, XP, streak or history. It changes the situations Cogni uses next.</Body><PrimaryButton label="Change learning context" secondary onPress={() => router.push("/onboarding")} /></Card>

    {audience ? <Card>
      <Eyebrow>Personalisation</Eyebrow><Body muted>{isCasual ? "Keep your interests and learning goal current so Cogni can favour useful everyday situations." : "These structured choices connect directly to Cogni's scenario tags, so personalisation actually changes what you see."}</Body>
      <View style={{ gap: 18 }}>
        <FormField label="Name" value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={colors.soft} />
        <OptionPicker label={functionLabelForAudience(audience)} value={functionArea} options={functionOptionsForAudience(audience)} onChange={setFunctionArea} />
        {isStudent ? <OptionPicker label="Study stage" value={studyStage} options={STUDY_STAGE_OPTIONS} onChange={setStudyStage} /> : null}
        {isProfessional ? <OptionPicker label="Industry" value={industry} options={INDUSTRY_OPTIONS} onChange={setIndustry} /> : null}
        {isProfessional ? <OptionPicker label="Responsibility scope" value={responsibilityScope} options={RESPONSIBILITY_OPTIONS} onChange={setResponsibilityScope} /> : null}
        {isProfessional ? <OptionPicker label="Organisation scale" value={organisationScale} options={ORGANISATION_SCALE_OPTIONS} onChange={setOrganisationScale} /> : null}
        <OptionPicker label={isCasual ? "What would you like to get better at?" : "Primary goal"} value={goal} options={goalOptionsForAudience(audience)} onChange={setGoal} />
      </View>
      {saved ? <Text accessibilityLiveRegion="polite" style={{ color: colors.green, fontWeight: "800", lineHeight: 22 }}>{saved}</Text> : null}
      {error ? <Text accessibilityLiveRegion="assertive" selectable style={{ color: colors.danger, lineHeight: 22 }}>{error}</Text> : null}
      <PrimaryButton label={busy ? "Saving…" : "Save profile"} disabled={busy} onPress={() => void save()} />
    </Card> : null}

    <Card>
      <Eyebrow>Account</Eyebrow><Body muted>Your session is stored securely on this device. You can also reset your password or permanently remove your account.</Body>
      <PrimaryButton label="Reset password" secondary onPress={() => router.push("/forgot-password")} />
      <PrimaryButton label="Sign out" secondary onPress={() => void logout()} />
      <PrimaryButton label={busy ? "Working…" : "Delete account"} secondary disabled={busy} onPress={confirmDeleteAccount} />
    </Card>
  </Screen>;
}
