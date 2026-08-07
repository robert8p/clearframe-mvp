import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
const allowed=["diagnostic_started","diagnostic_completed","session_started","session_completed","challenge_viewed","explanation_viewed","user_returned"] as const;
const S=z.object({eventName:z.enum(allowed),properties:z.record(z.string(),z.unknown()).optional()});
export async function POST(req:Request){try{const b=S.parse(await req.json());const s=await createClient();const{data:{user}}=await s.auth.getUser();if(!user)return NextResponse.json({error:"Unauthorised"},{status:401});await s.from("analytics_events").insert({user_id:user.id,event_name:b.eventName,properties:b.properties??{}});return NextResponse.json({ok:true});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Invalid"},{status:400})}}
