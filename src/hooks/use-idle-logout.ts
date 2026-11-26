import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  clearActivity,
  getIdleState,
  getLastActivity,
  recordActivity,
  setActivitySuppressed,
  trackActivityIn,
} from "@/lib/idle-session";

// Desloga o usuário depois de um tempo sem uso. Só deve rodar com sessão ativa.
export function useIdleLogout(enabled: boolean) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const loggingOut = useRef(false);

  const logout = useCallback(async () => {
    if (loggingOut.current) return;
    loggingOut.current = true;
    setActivitySuppressed(false);
    clearActivity();
    try {
      await supabase.auth.signOut();
    } catch {
      // mesmo que a chamada falhe, o estado local é limpo abaixo
    }
    setSecondsLeft(null);
    toast.warning("Sessão encerrada por inatividade", {
      description: "Entre novamente para continuar.",
    });
  }, []);

  const stayConnected = useCallback(() => {
    setActivitySuppressed(false);
    recordActivity({ force: true });
    setSecondsLeft(null);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    loggingOut.current = false;

    // Primeira vez (ou depois de limpar os dados do navegador): começa a contar agora.
    if (getLastActivity() === null) recordActivity({ force: true });

    const check = () => {
      if (loggingOut.current) return;
      const last = getLastActivity() ?? Date.now();
      const state = getIdleState(last, Date.now());
      if (state.status === "expired") {
        void logout();
      } else if (state.status === "warning") {
        setActivitySuppressed(true);
        setSecondsLeft(Math.ceil(state.remainingMs / 1000));
      } else {
        // Outra aba teve atividade: o aviso some sozinho.
        setActivitySuppressed(false);
        setSecondsLeft(null);
      }
    };

    check(); // ao abrir o app já confere (computador dormiu, navegador reaberto)
    const timer = window.setInterval(check, 1000);
    const stopTracking = trackActivityIn(window);
    const onWake = () => check();
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", onWake);

    return () => {
      window.clearInterval(timer);
      stopTracking();
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
      setActivitySuppressed(false);
    };
  }, [enabled, logout]);

  return { secondsLeft, stayConnected, logoutNow: logout };
}
