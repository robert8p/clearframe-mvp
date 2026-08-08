import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getOrCreateDailyTrainingSession } from "@/lib/recommendation";
import { getOrAssignDailyLesson, isDailyLessonComplete } from "@/lib/lessons";
import { DailyLesson } from "@/components/DailyLesson";

export const dynamic = "force-dynamic";

export default async function LessonPage() {
  const { user, supabase } = await requireUser();
  const session = await getOrCreateDailyTrainingSession(supabase, user.id, 5);
  if (!session.id) redirect("/dashboard");
  if (session.status === "completed") redirect("/session-complete");
  if (await isDailyLessonComplete(supabase, user.id)) redirect("/training");
  const lesson = await getOrAssignDailyLesson(supabase, user.id, session.id);
  if (!lesson) redirect("/training");
  return <DailyLesson lesson={lesson} />;
}
