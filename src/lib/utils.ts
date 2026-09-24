import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Formats a stored date/timestamp string as DD/MM/YYYY using its calendar
// date directly, without reinterpreting it in the viewer's local timezone
// (avoids the classic UTC-midnight-rolls-back-a-day bug).
export function formatCalendarDatePtBr(isoDateOrTimestamp: string): string {
  const datePart = isoDateOrTimestamp.slice(0, 10);
  const [year, month, day] = datePart.split("-");
  return `${day}/${month}/${year}`;
}

// Strips HTML tags from rich-text content (e.g. Tiptap output) for display
// in plain-text contexts. Also normalizes the "empty editor" HTML (`<p></p>`)
// down to an empty string instead of leaking markup to the user.
export function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  const withoutTags = html.replace(/<[^>]*>/g, " ");
  return withoutTags.replace(/\s+/g, " ").trim();
}

// Busca endereço pelo CEP via ViaCEP (serviço público gratuito, sem chave) —
// usado pra autocompletar rua/bairro/cidade/UF nos formulários de cadastro.
export async function fetchAddressByCep(cep: string): Promise<{
  street: string;
  neighborhood: string;
  city: string;
  state: string;
} | null> {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.erro) return null;
    return {
      street: data.logradouro || "",
      neighborhood: data.bairro || "",
      city: data.localidade || "",
      state: data.uf || "",
    };
  } catch {
    return null;
  }
}
