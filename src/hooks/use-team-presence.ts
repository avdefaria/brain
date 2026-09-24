import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

// Presença real via Supabase Realtime Presence — cada aba autenticada se anuncia
// num canal compartilhado; a lista de "online agora" é o snapshot em memória do
// canal (efêmero, sem tabela nova). Não persiste nada, some quando o cliente cai.
let sharedOnlineIds = new Set<string>();
const listeners = new Set<(ids: Set<string>) => void>();

function notify(ids: Set<string>) {
  sharedOnlineIds = ids;
  listeners.forEach((fn) => fn(ids));
}

let channelRefCount = 0;
let channel: ReturnType<typeof supabase.channel> | null = null;

export function useTeamPresenceTracker() {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  useEffect(() => {
    if (!userId) return;
    channelRefCount += 1;
    if (!channel) {
      channel = supabase.channel("team-presence", { config: { presence: { key: userId } } });
      channel
        .on("presence", { event: "sync" }, () => {
          const state = channel!.presenceState();
          notify(new Set(Object.keys(state)));
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await channel!.track({ online_at: new Date().toISOString() });
          }
        });
    }
    return () => {
      channelRefCount -= 1;
      if (channelRefCount <= 0 && channel) {
        supabase.removeChannel(channel);
        channel = null;
        notify(new Set());
      }
    };
  }, [userId]);
}

export function useTeamOnlineIds(): Set<string> {
  const [ids, setIds] = useState<Set<string>>(sharedOnlineIds);
  useEffect(() => {
    listeners.add(setIds);
    setIds(sharedOnlineIds);
    return () => { listeners.delete(setIds); };
  }, []);
  return ids;
}
