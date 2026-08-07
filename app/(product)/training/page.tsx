import { requireUser } from "@/lib/auth";
import { ChallengeRunner } from "@/components/ChallengeRunner";
import { getDailyChallenges } from "@/lib/recommendation";
export default async function Training(){const {user,supabase}=await requireUser();const challenges=await getDailyChallenges(supabase,user.id,5);return <ChallengeRunner challenges={challenges as never[]} mode="training"/>}
