/** Horodatage aligné sur le format Google Apps Script. */
export function nowStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value.includes("T") ? value : value.replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function presenceRate(total: number, present: number): string {
  if (total === 0) return "0 %";
  return `${Math.round((present / total) * 100)} %`;
}

export function normalizeSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function extractCode(raw: string): string {
  const match = raw.toUpperCase().match(/IHS-ACT4-[A-Z0-9]{6}/);
  return match ? match[0] : raw.trim();
}

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Identifiant public : IHS-ACT4-XXXXXX — jamais un numéro de ligne. */
export function generateCode(): string {
  const bytes = new Uint32Array(6);
  crypto.getRandomValues(bytes);
  let suffix = "";
  for (let i = 0; i < 6; i += 1) {
    suffix += CODE_CHARS[bytes[i] % CODE_CHARS.length];
  }
  return `IHS-ACT4-${suffix}`;
}

export function matchesQuery(
  row: { nom: string; telephone: string; code: string; email?: string },
  query: string,
): boolean {
  const q = normalizeSearch(query);
  if (!q) return true;
  const phoneQ = query.replace(/\s+/g, "");
  return (
    normalizeSearch(row.nom).includes(q) ||
    row.telephone.replace(/\s+/g, "").includes(phoneQ) ||
    row.code.toLowerCase().includes(query.trim().toLowerCase()) ||
    normalizeSearch(row.email ?? "").includes(q)
  );
}
