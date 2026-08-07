import { createClient } from "@/lib/supabase/server";
export async function getAdminUser(){const s=await createClient();const{data:{user}}=await s.auth.getUser();if(!user)return null;const{data}=await s.from("profiles").select("is_admin").eq("id",user.id).single();return data?.is_admin?user:null;}
