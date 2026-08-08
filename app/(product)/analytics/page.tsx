import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AnalyticsPage() {
  await requireAdmin();
  const admin = createAdminClient();
  const now = Date.now();
  const d1 = new Date(now - 86400000).toISOString();
  const d7 = new Date(now - 7 * 86400000).toISOString();
  const d30 = new Date(now - 30 * 86400000).toISOString();
  const [profiles, responses, e1, e7, e30] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("user_responses").select("id", { count: "exact", head: true }),
    admin.from("analytics_events").select("user_id").gte("created_at", d1),
    admin.from("analytics_events").select("user_id").gte("created_at", d7),
    admin.from("analytics_events").select("user_id").gte("created_at", d30),
  ]);
  const unique = (r: any) => new Set((r.data ?? []).map((x: any) => x.user_id)).size;
  const metrics = [["Users", profiles.count ?? 0], ["DAU", unique(e1)], ["WAU", unique(e7)], ["MAU", unique(e30)], ["Responses", responses.count ?? 0]];
  return <><div className="cg-kicker">Internal analytics</div><h1>Product health</h1><div className="cg-grid three">{metrics.map(([label, value]) => <section className="cg-card" key={label}><div className="cg-kicker">{label}</div><div className="cg-stat">{value}</div></section>)}<section className="cg-card"><div className="cg-kicker">North star</div><h2 style={{ marginTop: 10 }}>4+ sessions / week</h2><p>Add cohort/session reporting once usage volume is meaningful.</p></section></div></>;
}
