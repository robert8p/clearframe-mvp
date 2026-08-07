import type { SupabaseClient } from "@supabase/supabase-js";

export async function getDailyChallenges(supabase: SupabaseClient, userId: string, count=5) {
  const [{ data: weak }, { data: recent }] = await Promise.all([
    supabase.from("user_skill_scores").select("skill_id,score,last_seen_at").eq("user_id", userId).order("score").limit(4),
    supabase.from("user_responses").select("challenge_id").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
  ]);
  const recentIds = new Set((recent ?? []).map(x => x.challenge_id));
  const weakIds=(weak??[]).map(x=>x.skill_id);
  if(weakIds.length){
    const {data:maps}=await supabase.from("challenge_skill_mapping").select("challenge_id").in("skill_id",weakIds).limit(60);
    const ids=[...new Set((maps??[]).map(x=>x.challenge_id))].filter(id=>!recentIds.has(id));
    if(ids.length){
      const {data}=await supabase.from("challenges").select("id,title,prompt,options,challenge_type,difficulty,confidence_required").in("id",ids).eq("is_published",true).eq("is_diagnostic",false).limit(count);
      if((data?.length??0)>=count) return data!;
    }
  }
  const {data}=await supabase.from("challenges").select("id,title,prompt,options,challenge_type,difficulty,confidence_required").eq("is_published",true).eq("is_diagnostic",false).order("sort_order").limit(count+20);
  return (data??[]).filter(x=>!recentIds.has(x.id)).slice(0,count);
}
