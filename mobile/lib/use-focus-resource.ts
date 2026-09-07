import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useAuth } from "./auth";
import { createRequestEpoch } from "./request-safety";
type Snapshot<T> = { owner:string|null; data:T|null; loading:boolean; error:string };
/** In-memory stale-while-refresh, scoped to one signed-in account and focused screen. */
export function useFocusResource<T>(loader:(signal:AbortSignal)=>Promise<T>) {
  const { session } = useAuth();
  const owner = session?.user.id ?? null;
  const [state,setState] = useState<Snapshot<T>>({owner:null,data:null,loading:true,error:""});
  const epoch = useRef(createRequestEpoch());
  const active = useRef<AbortController|null>(null);
  const reload = useCallback(async () => {
    active.current?.abort(); const controller = new AbortController(); active.current = controller;
    const id = epoch.current.next();
    setState(previous => ({owner,data:previous.owner === owner ? previous.data : null,loading:true,error:""}));
    if(!owner) { setState({owner:null,data:null,loading:false,error:"Please sign in again."}); return; }
    try {
      const data = await loader(controller.signal);
      if(epoch.current.isCurrent(id) && !controller.signal.aborted) setState({owner,data,loading:false,error:""});
    } catch(error) {
      if(epoch.current.isCurrent(id) && !controller.signal.aborted) setState(previous => ({...previous,loading:false,error:error instanceof Error ? error.message : "Check your connection and try again."}));
    }
  },[loader,owner]);
  useFocusEffect(useCallback(() => {
    void reload();
    return () => { epoch.current.invalidate(); active.current?.abort(); };
  },[reload]));
  const data = state.owner === owner ? state.data : null;
  return { data, loading:!data && (state.loading || state.owner !== owner), refreshing:Boolean(data && state.loading), error:state.owner === owner ? state.error : "", reload };
}
