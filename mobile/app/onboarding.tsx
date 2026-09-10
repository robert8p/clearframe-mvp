import React, { useEffect, useState } from "react";
import { Redirect, router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { CogniLogo, CogniMark } from "@/components/brand";
import { OptionPicker } from "@/components/option-picker";
import { SkillMotif, type MotifKind } from "@/components/visuals";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { isMobileAudience, MOBILE_AUDIENCES, type MobileAudience } from "@/lib/audience";
import { functionLabelForAudience, functionOptionsForAudience, goalOptionsForAudience, INDUSTRY_OPTIONS, ORGANISATION_SCALE_OPTIONS, RESPONSIBILITY_OPTIONS, STUDY_STAGE_OPTIONS } from "@/lib/context-options";
import { colors, glow, radius, typography } from "@/lib/theme";
import type { MobileProfileResponse } from "@/lib/types";
import { Body, EditorialPanel, Eyebrow, LoadingState, PrimaryButton, Screen, Title } from "@/components/ui";

function audienceMotif(slug: string, index: number): MotifKind { const v = slug.toLowerCase(); if (/student|study|learn/.test(v)) return "growth"; if (/leader|manager|professional|work/.test(v)) return "decisions"; return (["perspective", "reasoning", "growth", "decisions"] as MotifKind[])[index % 4]; }

export default function OnboardingScreen() {
  const { session, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true); const [showDetails, setShowDetails] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [audience, setAudience] = useState<MobileAudience | "">(""); const [functionArea, setFunctionArea] = useState(""); const [industry, setIndustry] = useState(""); const [goal, setGoal] = useState(""); const [studyStage, setStudyStage] = useState(""); const [responsibilityScope, setResponsibilityScope] = useState(""); const [organisationScale, setOrganisationScale] = useState("");

  useEffect(() => {
    if (!session) { setLoading(false); return; }
    apiFetch<MobileProfileResponse>("/api/mobile/profile").then(data => {
      setAudience(isMobileAudience(data.profile.audience_segment) ? data.profile.audience_segment : ""); setFunctionArea(data.profile.function_area ?? ""); setIndustry(data.profile.industry ?? ""); setGoal(data.profile.primary_goal ?? ""); setStudyStage(data.profile.study_stage ?? ""); setResponsibilityScope(data.profile.responsibility_scope ?? ""); setOrganisationScale(data.profile.organisation_scale ?? "");
    }).catch(caught => setError(caught instanceof Error ? caught.message : "Could not load your profile.")).finally(() => setLoading(false));
  }, [session]);

  if (authLoading || loading) return <LoadingState />;
  if (!session) return <Redirect href="/login" />;
  const selectedAudience = isMobileAudience(audience) ? audience : null;
  const isCasual = selectedAudience === "casual"; const isStudent = selectedAudience === "university_student"; const isProfessional = Boolean(selectedAudience && !isCasual && !isStudent);

  function chooseAudience(next: MobileAudience) {
    if (audience === next) return;
    setAudience(next); setFunctionArea(""); setIndustry(""); setGoal(""); setStudyStage(""); setResponsibilityScope(""); setOrganisationScale(""); setError("");
  }

  async function save() {
    if (busy) return;
    if (!selectedAudience) { setError("Choose a learning context first."); return; }
    setBusy(true); setError("");
    try {
      await apiFetch("/api/mobile/profile", { method: "POST", body: JSON.stringify({ audienceSegment: selectedAudience, functionArea: functionArea || null, industry: isCasual || isStudent ? null : industry || null, primaryGoal: goal || null, studyStage: isStudent ? studyStage || null : null, responsibilityScope: isProfessional ? responsibilityScope || null : null, organisationScale: isProfessional ? organisationScale || null : null }) });
      router.replace("/(tabs)/train");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save your learning context."); }
    finally { setBusy(false); }
  }

  return <Screen>
    <View style={{ alignItems: "center", marginBottom: 2 }}><CogniLogo compact centered animated={false} /></View>

    <LinearGradient colors={["rgba(37,99,235,.32)", "rgba(139,92,246,.18)", "rgba(15,23,42,.94)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ minHeight: 250, borderRadius: radius.xl, borderWidth: 1, borderColor: "rgba(111,168,255,.36)", padding: 20, overflow: "hidden", boxShadow: glow.blue }}>
      <View pointerEvents="none" accessible={false} style={{ position: "absolute", right: -18, top: 12, opacity: .78 }}><CogniMark size={142} /></View>
      <View style={{ maxWidth: "70%", gap: 8 }}><Eyebrow>Personalised learning</Eyebrow><Title size={31}>Make Cogni relevant to you</Title><Body muted style={{ fontSize: 14.5, lineHeight: 21 }}>Choose the situations and goals that matter now. Cogni uses that context to make practice feel useful from the start.</Body></View>
      <View style={{ position: "absolute", left: 20, right: 20, bottom: 18, flexDirection: "row", alignItems: "center", gap: 8 }}><View style={{ flex: 1, height: 5, borderRadius: 999, backgroundColor: colors.cyan }} /><View style={{ flex: 1, height: 5, borderRadius: 999, backgroundColor: "rgba(71,85,105,.42)" }} /><View style={{ flex: 1, height: 5, borderRadius: 999, backgroundColor: "rgba(71,85,105,.42)" }} /></View>
    </LinearGradient>

    <EditorialPanel style={{ padding: 17 }}><Eyebrow>Choose your context</Eyebrow><Body muted>This is about context—not ability—and you can change it later without losing progress.</Body></EditorialPanel>

    <View accessibilityRole="radiogroup" style={{ gap: 10 }}>
      {MOBILE_AUDIENCES.map((item, index) => {
        const selected = audience === item.slug;
        return <Pressable accessibilityRole="radio" accessibilityLabel={item.label} accessibilityHint={item.text} accessibilityState={{ checked: selected, disabled: busy }} disabled={busy} key={item.slug} onPress={() => chooseAudience(item.slug)} style={({ pressed }) => ({ opacity: pressed ? .8 : 1 })}>
          <LinearGradient colors={selected ? ["rgba(37,99,235,.34)", "rgba(139,92,246,.18)"] : ["rgba(18,33,61,.92)", "rgba(15,23,42,.94)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ minHeight: 94, padding: 14, borderRadius: radius.lg, borderWidth: selected ? 1.5 : 1, borderColor: selected ? colors.cyan : colors.line, flexDirection: "row", alignItems: "center", gap: 13, boxShadow: selected ? glow.cyan : undefined }}>
            <SkillMotif kind={audienceMotif(item.slug, index)} size={50} />
            <View style={{ flex: 1, gap: 3 }}><Text style={{ color: colors.text, fontSize: 17, lineHeight: 23, ...typography.heading }}>{item.label}</Text><Text style={{ color: colors.muted, fontSize: 13.5, lineHeight: 20, ...typography.body }}>{item.text}</Text></View>
            <View accessibilityLabel={selected ? "Selected" : undefined} accessible={selected} style={{ width: 24, height: 24, borderRadius: 12, borderWidth: selected ? 6 : 1.5, borderColor: selected ? colors.cyan : colors.soft, backgroundColor: selected ? "rgba(34,211,238,.10)" : "transparent" }} />
          </LinearGradient>
        </Pressable>;
      })}
    </View>

    {selectedAudience ? <PrimaryButton secondary label={showDetails ? "Hide optional details" : "Personalise further (optional)"} disabled={busy} onPress={() => setShowDetails(value => !value)} /> : null}

    {selectedAudience && showDetails ? <EditorialPanel style={{ borderColor: "rgba(139,92,246,.30)" }}><Eyebrow>Optional · tailor scenarios further</Eyebrow><Body muted style={{ fontSize: 14, lineHeight: 20 }}>{isCasual ? "Choose the everyday areas you care about so Cogni can favour situations that feel useful." : "These details let Cogni match examples to your real context instead of guessing from free text."}</Body><View style={{ gap: 18 }}><OptionPicker label={functionLabelForAudience(selectedAudience)} value={functionArea} options={functionOptionsForAudience(selectedAudience)} onChange={setFunctionArea} />{isStudent ? <OptionPicker label="Study stage" value={studyStage} options={STUDY_STAGE_OPTIONS} onChange={setStudyStage} /> : null}{isProfessional ? <OptionPicker label="Industry" value={industry} options={INDUSTRY_OPTIONS} onChange={setIndustry} /> : null}{isProfessional ? <OptionPicker label="Responsibility scope" hint="This affects the scale and consequence of situations Cogni chooses." value={responsibilityScope} options={RESPONSIBILITY_OPTIONS} onChange={setResponsibilityScope} /> : null}{isProfessional ? <OptionPicker label="Organisation scale" value={organisationScale} options={ORGANISATION_SCALE_OPTIONS} onChange={setOrganisationScale} /> : null}<OptionPicker label={isCasual ? "What would you like to get better at?" : "What do you most want to improve?"} value={goal} options={goalOptionsForAudience(selectedAudience)} onChange={setGoal} /></View></EditorialPanel> : null}

    {selectedAudience ? <EditorialPanel style={{ borderColor: "rgba(34,211,238,.28)" }}><View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}><CogniMark size={52} animated={false} /><View style={{ flex: 1 }}><Eyebrow>What happens next</Eyebrow><Title size={23}>A short starting check</Title></View></View><Body muted>Plan for about 4–6 minutes. Cogni uses those answers to choose a useful starting focus. Your early scores become more reliable as you practise.</Body><Body muted style={{ fontSize: 13.5, lineHeight: 20 }}>It is not a pass/fail test. Your learning context changes which situations feel relevant; it does not raise or lower your assumed ability.</Body></EditorialPanel> : null}

    {error ? <Text accessibilityLiveRegion="assertive" selectable style={{ color: colors.danger, lineHeight: 22, ...typography.body }}>{error}</Text> : null}
    <PrimaryButton label={busy ? "Saving…" : "Continue to Cogni"} disabled={busy || !selectedAudience} loading={busy} trailingArrow onPress={() => void save()} />
  </Screen>;
}
