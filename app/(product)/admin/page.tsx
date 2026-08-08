import { requireAdmin } from "@/lib/auth";
import { AdminChallengeForm } from "@/components/AdminChallengeForm";

export default async function AdminPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("challenges").select("id,title,challenge_type,difficulty,is_published").order("created_at", { ascending: false }).limit(20);
  return <><div className="cg-kicker">Internal</div><h1>Content management</h1><p>Create, review and publish Cogni challenges without touching the database.</p><div className="cg-grid two" style={{ alignItems: "start" }}><AdminChallengeForm/><section className="cg-card"><h2>Recent content</h2><table className="table"><thead><tr><th>Challenge</th><th>Type</th><th>Diff.</th></tr></thead><tbody>{(data ?? []).map((x: { id: string; title: string; challenge_type: string; difficulty: number }) => <tr key={x.id}><td>{x.title}</td><td>{x.challenge_type}</td><td>{x.difficulty}</td></tr>)}</tbody></table></section></div></>;
}
