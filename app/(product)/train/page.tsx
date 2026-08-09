import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getDiagnosticProgress } from "@/lib/diagnostic";
import { isAudienceSegment } from "@/lib/audience";
import { isDailyLessonComplete } from "@/lib/lessons";
import { localDateKey } from "@/lib/dates";

function nestedSlug(value: unknown) {
  if (Array.isArray(value)) return (value[0] as { slug?: string } | undefined)?.slug ?? null;
  if (value && typeof value === "object" && "slug" in value) return String((value as { slug?: unknown }).slug ?? "") || null;
  return null;
}

export default async function TrainPage() {
  const { user, supabase } = await requireUser();
  const day = localDateKey();

  const [{ data: profile }, { data: todaySession }] = await Promise.all([
    supabase.from("profiles").select("audience_segment").eq("id", user.id).single(),
    supabase.from("training_sessions").select("id,status").eq("user_id", user.id).eq("session_date", day).maybeSingle(),
  ]);

  if (!isAudienceSegment(profile?.audience_segment)) redirect("/onboarding/audience");

  const diagnostic = await getDiagnosticProgress(supabase, user.id);
  if (!diagnostic.completedSessionKey) redirect("/onboarding");

  if (todaySession?.status !== "completed") {
    const lessonDone = await isDailyLessonComplete(supabase, user.id);
    redirect(lessonDone ? "/training" : "/lesson");
  }

  const { data: scores } = await supabase
    .from("user_skill_scores")
    .select("score,reliability,attempts,skills(slug)")
    .eq("user_id", user.id)
    .gt("attempts", 0)
    .order("score")
    .limit(8);

  const bestNext = (scores ?? [])
    .map((row) => ({ row, slug: nestedSlug(row.skills) }))
    .filter((item) => item.slug)
    .sort((a, b) => {
      const ar = Math.max(0, Math.min(1, Number(a.row.reliability ?? 0)));
      const br = Math.max(0, Math.min(1, Number(b.row.reliability ?? 0)));
      const ae = 50 + (Number(a.row.score) - 50) * ar;
      const be = 50 + (Number(b.row.score) - 50) * br;
      return ae - be;
    })[0];

  redirect(bestNext?.slug ? `/practice/${bestNext.slug}` : "/skills");
}
