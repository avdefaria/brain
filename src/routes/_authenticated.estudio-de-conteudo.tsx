import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/estudio-de-conteudo")({
  component: EstudioDeConteudoPage,
});

// O estúdio é um app separado, servido em /estudio/ (proxy). Ele pede a sessão
// do Brain por postMessage e troca o token por um cookie próprio — o Brain só
// responde ao próprio iframe, na própria origem.
function EstudioDeConteudoPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    async function ouvir(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (e.source !== iframeRef.current?.contentWindow) return;
      if (e.data?.tipo !== "estudio:pede-sessao") return;
      const { data } = await supabase.auth.getSession();
      iframeRef.current?.contentWindow?.postMessage(
        { tipo: "brain:sessao", token: data.session?.access_token ?? null },
        window.location.origin,
      );
    }
    window.addEventListener("message", ouvir);
    return () => window.removeEventListener("message", ouvir);
  }, []);

  return (
    <div className="overflow-hidden bg-[var(--bg-1)]" style={{ height: "calc(100vh - 60px)" }}>
      <iframe
        ref={iframeRef}
        src="/estudio/"
        title="Estúdio de conteúdo"
        className="block h-full w-full border-0"
      />
    </div>
  );
}
