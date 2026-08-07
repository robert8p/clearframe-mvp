"use client";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
export function SignOutButton(){
  const router=useRouter();
  return <button className="button ghost" onClick={async()=>{await createClient().auth.signOut(); router.push("/"); router.refresh();}}>Sign out</button>
}
