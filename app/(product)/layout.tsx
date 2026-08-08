import { AppShell } from "@/components/AppShell";
import { EngagementHeartbeat } from "@/components/EngagementHeartbeat";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProductLayout({ children }: { children: React.ReactNode }) {
  const { user, supabase } = await requireUser();
  const { data } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  const isAdmin = Boolean(data?.is_admin);
  return <>{!isAdmin && <EngagementHeartbeat />}<AppShell isAdmin={isAdmin}>{children}</AppShell></>;
}
