import React, { useState } from "react";
import { Alert, Share, Text, View } from "react-native";
import { router } from "expo-router";
import { Body, Card, Eyebrow, PrimaryButton, Screen, Title } from "@/components/ui";
import { DeviceToolsNotice, PracticeRhythm } from "@/components/practice-tools";
import { useNotebook } from "@/lib/notebook";
import { MAX_IDEAS, type SavedIdea } from "@/lib/notebook-store";
import { SkillMotif, motifForSkill } from "@/components/visuals";
import { colors } from "@/lib/theme";

function SavedIdeaCard({ idea }: { idea: SavedIdea }) {
  const tools = useNotebook(); const [open, setOpen] = useState(false), [sharing, setSharing] = useState(false), [shareError, setShareError] = useState("");
  const remove = () => Alert.alert("Remove saved idea?", "Only this device’s copy will be removed. Your online answers and scores stay unchanged.", [{ text: "Keep", style: "cancel" }, { text: "Remove", style: "destructive", onPress: () => { void tools.remove(idea.id).catch(() => undefined); } }]);
  async function share() {
    if (sharing) return; setSharing(true); setShareError("");
    try { await Share.share({ title: "A thinking prompt from Cogni", message: `${idea.title}\n\n${idea.principle}${idea.application ? `\n\nTry this: ${idea.application}` : ""}\n\nA thinking prompt from Cogni.` }); }
    catch { setShareError("Could not open sharing. Try again."); }
    finally { setSharing(false); }
  }
  return <Card><View style={{flexDirection:"row",gap:12,alignItems:"center"}}><SkillMotif kind={motifForSkill(idea.title)} size={48} /><View style={{flex:1}}><Eyebrow>Saved {idea.savedOn}</Eyebrow></View></View><Title size={24}>{idea.title}</Title>
    {open ? <><Body>{idea.principle}</Body>{idea.application ? <Body muted>{idea.application}</Body> : null}<PrimaryButton secondary label="Hide idea" onPress={() => setOpen(false)} /><Body muted style={{ fontSize: 12, lineHeight: 18 }}>Sharing includes only the displayed idea—not your account, scores or practice history.</Body><PrimaryButton secondary label="Share idea" loading={sharing} onPress={() => void share()} />{shareError ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>{shareError}</Text> : null}<PrimaryButton secondary label="Remove saved idea" disabled={tools.busy} onPress={remove} /></> : <><Body muted>Before revealing it, try recalling the idea and one situation where you could use it.</Body><PrimaryButton secondary label="Reveal idea" onPress={() => setOpen(true)} /></>}
  </Card>;
}
export default function ToolkitScreen() {
  const tools = useNotebook();
  const clear = () => Alert.alert("Clear device practice tools?", "Remove saved ideas, this device’s practice-day record and your weekly target. Your online account, answers and scores are not affected.", [{ text: "Keep", style: "cancel" }, { text: "Clear device tools", style: "destructive", onPress: () => { void tools.clear().catch(() => undefined); } }]);
  return <Screen><Eyebrow>Keep it useful</Eyebrow><Title size={31}>Your thinking toolkit</Title><Body muted>Revisit an idea before your next decision. These tools are private to this account on this device; they do not sync across devices.</Body><DeviceToolsNotice />
    <PracticeRhythm editable />
    <View style={{ gap: 8 }}><Title size={25}>Saved ideas</Title><Body muted style={{ fontSize: 14, lineHeight: 21 }}>Keeps your latest {MAX_IDEAS} ideas. Available offline after saving. Saving a new idea beyond the limit replaces the oldest.</Body></View>
    {tools.ready && tools.data.ideas.length ? tools.data.ideas.map(idea => <SavedIdeaCard key={idea.id} idea={idea} />) : <Card><Title size={23}>{tools.ready ? "An idea you’ll actually use." : "Opening device storage…"}</Title><Body muted>{tools.ready ? "After answering a question, choose Save key idea. Or save today’s reflection prompt from Home. There is no score for collecting ideas." : "Online learning still works if device storage is unavailable."}</Body><PrimaryButton label="Return to Home" onPress={() => router.replace("/(tabs)/home")} /></Card>}
    <PrimaryButton secondary label="Clear device tools" disabled={tools.busy} onPress={clear} />
    <Body muted style={{ fontSize: 12, lineHeight: 18 }}>Stored in encrypted device storage. Clearing app data or uninstalling can remove these tools. Deleting your account clears this device’s tools as well.</Body>
  </Screen>;
}
