// Limite de inatividade da sessão (logout automático).
//
// Por que existe: o Supabase renova o token sozinho (autoRefreshToken), então
// sem isto a sessão ficava aberta para sempre num computador sem uso.
//
// Como funciona: toda atividade do usuário grava o horário em localStorage
// (compartilhado entre abas). Um relógio confere esse horário; passando do
// limite, desloga. Ao abrir o app depois de um tempo parado (computador
// dormindo, navegador fechado), a conferência também roda e desloga.
//
// Limitação conhecida: é controle no navegador. Ele protege o caso real
// (computador deixado aberto), mas não impede quem já copiou o token. O
// controle no servidor (timebox/inactivity do Supabase) exige plano Pro.

export const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // sem uso por 30 min => sai
export const IDLE_WARNING_MS = 60 * 1000; // aviso no último minuto

const STORAGE_KEY = "brain:last-activity";
const WRITE_THROTTLE_MS = 2_000;

export type IdleState =
  | { status: "active"; remainingMs: number }
  | { status: "warning"; remainingMs: number }
  | { status: "expired"; remainingMs: 0 };

// Pura e sem relógio próprio: recebe "agora" para ser testável.
export function getIdleState(
  lastActivity: number,
  now: number,
  timeoutMs: number = IDLE_TIMEOUT_MS,
  warningMs: number = IDLE_WARNING_MS,
): IdleState {
  const remainingMs = timeoutMs - (now - lastActivity);
  if (remainingMs <= 0) return { status: "expired", remainingMs: 0 };
  if (remainingMs <= warningMs) return { status: "warning", remainingMs };
  return { status: "active", remainingMs };
}

export function getLastActivity(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

let lastWrite = 0;
let suppressed = false;

// Durante o aviso de "sua sessão vai acabar", mexer o mouse sem querer não deve
// renovar a sessão: só o botão "Continuar conectado" renova.
export function setActivitySuppressed(value: boolean) {
  suppressed = value;
}

export function recordActivity(options: { force?: boolean } = {}) {
  if (suppressed && !options.force) return;
  const now = Date.now();
  if (!options.force && now - lastWrite < WRITE_THROTTLE_MS) return;
  lastWrite = now;
  try {
    localStorage.setItem(STORAGE_KEY, String(now));
  } catch {
    // Sem localStorage (modo restrito): a sessão continua valendo sem limite
    // de inatividade, em vez de deslogar o usuário por engano.
  }
}

export function clearActivity() {
  lastWrite = 0;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignorar
  }
}

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "wheel", "scroll", "touchstart"] as const;

// Liga a detecção de atividade numa janela. Serve para a janela do Brain e
// também para o iframe do estúdio (mesma origem), cujos cliques não chegam à
// janela de fora. Devolve a função que desliga.
export function trackActivityIn(win: Window): () => void {
  const handler = () => recordActivity();
  try {
    for (const type of ACTIVITY_EVENTS) {
      win.addEventListener(type, handler, { passive: true, capture: true });
    }
  } catch {
    return () => {};
  }
  return () => {
    try {
      for (const type of ACTIVITY_EVENTS) {
        win.removeEventListener(type, handler, { capture: true });
      }
    } catch {
      // janela já descartada
    }
  };
}
