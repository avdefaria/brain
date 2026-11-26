import { useCallback, useEffect, useState } from "react";

// "Modo gravação": embaça nomes de clientes e contas na tela, para gravar
// conteúdo sem expor quem é cliente. Fica salvo no navegador e vale para todas
// as telas que usam este hook.
const STORAGE_KEY = "brain:hide-client-names";
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function usePrivacyMode() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const sync = () => setHidden(read());
    sync();
    listeners.add(sync);
    window.addEventListener("storage", sync); // outras abas
    return () => {
      listeners.delete(sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = useCallback(() => {
    const next = !read();
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // sem localStorage: vale só até recarregar a página
    }
    setHidden(next);
    listeners.forEach((fn) => fn());
  }, []);

  return { hidden, toggle };
}
