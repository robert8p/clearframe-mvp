import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { AdminChallengeForm } from "@/components/AdminChallengeForm";
import { AdminLessonForm } from "@/components/AdminLessonForm";
import { audienceMeta } from "@/lib/audience";

function audienceLabel(values: unknown) {
  if (!Array.isArray(values) || values.includes("all")) return "All";
  return values.map((value) => audienceMeta(value)?.shortLabel ?? String(value)).join(", ");
}

export default async function AdminPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("challenges").select("id,title,challenge_type,interaction_type,difficulty,is_published,audience_segments,scenario_context").order("created_at", { ascending: false }).limit(30);
  return (
    <>
      <div className="cg-kicker">Internal</div><h1>Content management</h1><p>Create, preview and publish audience-aware Cogni challenges without touching the database.</p>
      <div className="cg-grid two" style={{ alignItems: "start" }}>
        <div className="cg-grid"><AdminChallengeForm /><AdminLessonForm /></div>
        <section className="cg-card"><h2>Recent content</h2><div className="cg-admin-table-wrap"><table className="table"><thead><tr><th>Challenge</th><th>Format</th><th>Audience</th><th>Diff.</th></tr></thead><tbody>{(data ?? []).map((x: any) => <tr key={x.id}><td><Link href={`/admin/challenges/${x.id}`}><strong>{x.title}</strong>{x.scenario_context && <small className="cg-table-sub">{x.scenario_context}</small>}<small className="cg-table-open">Open preview ›</small></Link></td><td>{String(x.interaction_type ?? x.challenge_type).replaceAll("_", " ")}</td><td>{audienceLabel(x.audience_segments)}</td><td>{x.difficulty}</td></tr>)}</tbody></table></div></section>
      </div>
    </>
  );
}
