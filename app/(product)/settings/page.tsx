import { requireUser } from "@/lib/auth";
import { ProfileForm } from "@/components/ProfileForm";

export default async function SettingsPage() {
  const { user, supabase } = await requireUser();
  const { data } = await supabase.from("profiles").select("full_name,industry,job_role").eq("id", user.id).single();

  return (
    <>
      <div className="cg-kicker">Profile</div>
      <h1>Your account</h1>
      <p>Keep your profile details current so Cogni can feel more personal without becoming noisy.</p>
      <ProfileForm initialName={data?.full_name ?? ""} initialIndustry={data?.industry ?? ""} initialRole={data?.job_role ?? ""} />
    </>
  );
}
