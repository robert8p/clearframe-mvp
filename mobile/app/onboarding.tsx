import React, { useEffect, useState } from "react";
import { Redirect, router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { CogniLogo } from "@/components/brand";
import { OptionPicker } from "@/components/option-picker";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { isMobileAudience, MOBILE_AUDIENCES, type MobileAudience } from "@/lib/audience";
import {
  functionLabelForAudience,
  functionOptionsForAudience,
  goalOptionsForAudience,
  INDUSTRY_OPTIONS,
  ORGANISATION_SCALE_OPTIONS,
  RESPONSIBILITY_OPTIONS,
  STUDY_STAGE_OPTIONS,
} from "@/lib/context-options";
import { colors } from "@/lib/theme";
import type { MobileProfileResponse } from "@/lib/types";
import { Body, Card, Eyebrow, LoadingState, PrimaryButton, Screen, Title } from "@/components/ui";

export default function OnboardingScreen() {
  const { session, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [audience, setAudience] = useState<MobileAudience | "">("");
  const [functionArea, setFunctionArea] = useState("");
  const [industry, setIndustry] = useState("");
  const [goal, setGoal] = useState("");
  const [studyStage, setStudyStage] = useState("");
  const [responsibilityScope, setResponsibilityScope] = useState("");
  const [organisationScale, setOrganisationScale] = useState("");

  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }
    apiFetch<MobileProfileResponse>("/api/mobile/profile")
      .then((data) => {
        setAudience(isMobileAudience(data.profile.audience_segment) ? data.profile.audience_segment : "");
        setFunctionArea(data.profile.function_area ?? "");
        setIndustry(data.profile.industry ?? "");
        setGoal(data.profile.primary_goal ?? "");
        setStudyStage(data.profile.study_stage ?? "");
        setResponsibilityScope(data.profile.responsibility_scope ?? "");
        setOrganisationScale(data.profile.organisation_scale ?? "");
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load your profile."))
      .finally(() => setLoading(false));
  }, [session]);

  if (authLoading || loading) return <LoadingState />;
  if (!session) return <Redirect href="/login" />;

  const selectedAudience = isMobileAudience(audience) ? audience : null;
  const isCasual = selectedAudience === "casual";
  const isStudent = selectedAudience === "university_student";
  const isProfessional = Boolean(selectedAudience && !isCasual && !isStudent);

  function chooseAudience(next: MobileAudience) {
    if (audience === next) return;
    setAudience(next);
    setFunctionArea("");
    setIndustry("");
    setGoal("");
    setStudyStage("");
    setResponsibilityScope("");
    setOrganisationScale("");
    setError("");
  }

  async function save() {
    if (busy) return;
    if (!selectedAudience) {
      setError("Choose a learning context first.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      await apiFetch("/api/mobile/profile", {
        method: "POST",
        body: JSON.stringify({
          audienceSegment: selectedAudience,
          functionArea: functionArea || null,
          industry: isCasual || isStudent ? null : industry || null,
          primaryGoal: goal || null,
          studyStage: isStudent ? studyStage || null : null,
          responsibilityScope: isProfessional ? responsibilityScope || null : null,
          organisationScale: isProfessional ? organisationScale || null : null,
        }),
      });
      router.replace("/(tabs)/train");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save your learning context.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={{ alignItems: "center", marginBottom: 2 }}>
        <CogniLogo compact centered animated={false} />
      </View>
      <LinearGradient colors={["rgba(30,40,96,.95)", "rgba(13,19,48,.98)"]} style={{ borderRadius: 26, borderWidth: 1, borderColor: colors.line, padding: 18, gap: 7 }}>
        <Eyebrow>Make Cogni relevant to you</Eyebrow>
        <Title size={29}>What kind of learning context fits you?</Title>
        <Body muted>Choose the situations and goals that feel most relevant now. This is about context—not ability—and you can change it later without losing progress.</Body>
      </LinearGradient>

      <View accessibilityRole="radiogroup" style={{ gap: 10 }}>
        {MOBILE_AUDIENCES.map((item) => (
          <Pressable
            accessibilityRole="radio"
            accessibilityLabel={item.label}
            accessibilityHint={item.text}
            accessibilityState={{ selected: audience === item.slug }}
            key={item.slug}
            onPress={() => chooseAudience(item.slug)}
            style={({ pressed }) => ({ opacity: pressed ? .80 : 1 })}
          >
            <View style={{ minHeight: 88, padding: 14, borderRadius: 21, borderCurve: "continuous", borderWidth: 1, borderColor: audience === item.slug ? colors.cyan : colors.lineStrong, backgroundColor: audience === item.slug ? "rgba(107,92,255,.16)" : "rgba(16,23,53,.92)", flexDirection: "row", alignItems: "center", gap: 13 }}>
              <LinearGradient colors={audience === item.slug ? ["rgba(0,229,255,.20)", "rgba(184,85,255,.24)"] : ["rgba(32,43,85,.9)", "rgba(20,28,60,.9)"]} style={{ width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 23 }}>{item.icon}</Text>
              </LinearGradient>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ color: colors.text, fontSize: 17, lineHeight: 23, fontWeight: "900" }}>{item.label}</Text>
                <Text style={{ color: colors.muted, fontSize: 13.5, lineHeight: 20 }}>{item.text}</Text>
              </View>
              {audience === item.slug ? <Text accessibilityLabel="Selected" style={{ color: colors.cyan, fontSize: 20, fontWeight: "900" }}>✓</Text> : null}
            </View>
          </Pressable>
        ))}
      </View>

      {selectedAudience ? (
        <Card>
          <Eyebrow>Optional — tailor scenarios further</Eyebrow>
          <Body muted style={{ fontSize: 14, lineHeight: 20 }}>
            {isCasual ? "Choose the everyday areas you care about so Cogni can favour situations that feel useful." : "These details let Cogni match examples to your real context instead of guessing from free text."}
          </Body>
          <View style={{ gap: 18 }}>
            <OptionPicker label={functionLabelForAudience(selectedAudience)} value={functionArea} options={functionOptionsForAudience(selectedAudience)} onChange={setFunctionArea} />
            {isStudent ? <OptionPicker label="Study stage" value={studyStage} options={STUDY_STAGE_OPTIONS} onChange={setStudyStage} /> : null}
            {isProfessional ? <OptionPicker label="Industry" value={industry} options={INDUSTRY_OPTIONS} onChange={setIndustry} /> : null}
            {isProfessional ? <OptionPicker label="Responsibility scope" hint="This affects the scale and consequence of situations Cogni chooses." value={responsibilityScope} options={RESPONSIBILITY_OPTIONS} onChange={setResponsibilityScope} /> : null}
            {isProfessional ? <OptionPicker label="Organisation scale" value={organisationScale} options={ORGANISATION_SCALE_OPTIONS} onChange={setOrganisationScale} /> : null}
            <OptionPicker label={isCasual ? "What would you like to get better at?" : "What do you most want to improve?"} value={goal} options={goalOptionsForAudience(selectedAudience)} onChange={setGoal} />
          </View>
        </Card>
      ) : null}

      {selectedAudience ? (
        <Card style={{ borderColor: "rgba(0,229,255,.28)" }}>
          <Eyebrow>What happens next</Eyebrow>
          <Title size={23}>A short starting check, not a pass/fail test</Title>
          <Body muted>Plan for about 4–6 minutes. Cogni uses those answers to choose a useful starting focus. Early scores deliberately carry limited evidence until you have answered more.</Body>
          <Body muted style={{ fontSize: 14, lineHeight: 20 }}>Your learning context changes which situations feel relevant; it does not raise or lower your assumed ability.</Body>
        </Card>
      ) : null}

      {error ? (
        <Text accessibilityLiveRegion="assertive" selectable style={{ color: colors.danger, lineHeight: 22 }}>
          {error}
        </Text>
      ) : null}
      <PrimaryButton label={busy ? "Saving…" : "Continue to Cogni"} disabled={busy} onPress={() => void save()} />
    </Screen>
  );
}
