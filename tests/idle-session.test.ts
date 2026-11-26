import { describe, expect, test } from "bun:test";
import { getIdleState, IDLE_TIMEOUT_MS, IDLE_WARNING_MS } from "../src/lib/idle-session";

const MIN = 60 * 1000;

describe("getIdleState", () => {
  const t0 = 1_000_000_000_000;

  test("recém-ativo está ativo", () => {
    expect(getIdleState(t0, t0).status).toBe("active");
  });

  test("29 min de inatividade ainda não avisa (limite de 30, aviso no último minuto)", () => {
    expect(getIdleState(t0, t0 + 28 * MIN).status).toBe("active");
  });

  test("entra em aviso no último minuto", () => {
    const state = getIdleState(t0, t0 + IDLE_TIMEOUT_MS - IDLE_WARNING_MS + 1);
    expect(state.status).toBe("warning");
    expect(state.remainingMs).toBeLessThanOrEqual(IDLE_WARNING_MS);
  });

  test("expira exatamente no limite", () => {
    expect(getIdleState(t0, t0 + IDLE_TIMEOUT_MS).status).toBe("expired");
  });

  test("computador dormiu por horas: expirado", () => {
    expect(getIdleState(t0, t0 + 8 * 60 * MIN).status).toBe("expired");
  });

  test("respeita limites customizados", () => {
    expect(getIdleState(t0, t0 + 5 * MIN, 5 * MIN, MIN).status).toBe("expired");
    expect(getIdleState(t0, t0 + 4.5 * MIN, 5 * MIN, MIN).status).toBe("warning");
  });
});
