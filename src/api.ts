/**
 * Client API unique.
 * Toute communication passe par Google Apps Script (jamais le Sheet en direct).
 * Si apiUrl n'est pas configuré, un stockage local reproduit le même contrat.
 */
import { CONFIG, usesLocalApi } from "./config";
import { generateCode, matchesQuery, nowStamp } from "./lib/format";
import type {
  CheckinResponse,
  ListResponse,
  LookupResponse,
  RegisterPayload,
  RegisterResponse,
  Registration,
} from "./types";

const STORAGE_KEY = "ihs_acte4_inscriptions";

function gasUrl(params: Record<string, string>): string {
  const url = new URL(CONFIG.apiUrl);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url.toString();
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error("Réponse réseau invalide.");
  }
  return (await response.json()) as T;
}

async function postAction<T>(payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(CONFIG.apiUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });
  return readJson<T>(response);
}

function readLocal(): Registration[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Registration[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(rows: Registration[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

function uniqueCode(existing: Registration[]): string {
  for (let i = 0; i < 12; i += 1) {
    const code = generateCode();
    if (!existing.some((row) => row.code === code)) return code;
  }
  return generateCode();
}

function localRegister(payload: RegisterPayload): RegisterResponse {
  const nom = payload.nom.trim();
  const telephone = payload.telephone.trim();
  const email = payload.email.trim();
  const attentes = payload.attentes.trim();
  if (!nom || !telephone || !email || !attentes) {
    return { ok: false, error: "Tous les champs sont obligatoires." };
  }
  const rows = readLocal();
  const code = uniqueCode(rows);
  const row: Registration = {
    code,
    nom,
    telephone,
    email,
    attentes,
    present: "NON",
    dateInscription: nowStamp(),
    heureEntree: null,
  };
  rows.unshift(row);
  writeLocal(rows);
  return { ok: true, code, nom };
}

function toLookup(row: Registration): Extract<LookupResponse, { found: true }> {
  return {
    ok: true,
    found: true,
    code: row.code,
    nom: row.nom,
    telephone: row.telephone,
    email: row.email,
    present: row.present,
    dateInscription: row.dateInscription,
    heureEntree: row.heureEntree,
  };
}

function localLookup(code: string): LookupResponse {
  const row = readLocal().find((item) => item.code.toUpperCase() === code.toUpperCase());
  if (!row) return { ok: true, found: false };
  return toLookup(row);
}

function localList(): ListResponse {
  return { ok: true, rows: readLocal() };
}

function localSearch(query: string): ListResponse {
  return { ok: true, rows: readLocal().filter((row) => matchesQuery(row, query)) };
}

function localCheckin(code: string): CheckinResponse {
  const rows = readLocal();
  const index = rows.findIndex((row) => row.code.toUpperCase() === code.toUpperCase());
  if (index < 0) return { ok: false, error: "Inscription introuvable." };
  const current = rows[index];
  if (current.present === "OUI") {
    return {
      ok: true,
      already: true,
      code: current.code,
      nom: current.nom,
      present: "OUI",
      heureEntree: current.heureEntree,
    };
  }
  const updated: Registration = {
    ...current,
    present: "OUI",
    heureEntree: nowStamp(),
  };
  rows[index] = updated;
  writeLocal(rows);
  return {
    ok: true,
    already: false,
    code: updated.code,
    nom: updated.nom,
    present: "OUI",
    heureEntree: updated.heureEntree,
  };
}

export async function registerParticipant(
  payload: RegisterPayload,
): Promise<RegisterResponse> {
  if (usesLocalApi()) return localRegister(payload);
  return postAction<RegisterResponse>({ action: "register", ...payload });
}

export async function lookupByCode(code: string): Promise<LookupResponse> {
  if (usesLocalApi()) return localLookup(code);
  return readJson<LookupResponse>(
    await fetch(gasUrl({ action: "lookup", code })),
  );
}

export async function listRegistrations(): Promise<ListResponse> {
  if (usesLocalApi()) return localList();
  return readJson<ListResponse>(await fetch(gasUrl({ action: "list" })));
}

export async function searchRegistrations(query: string): Promise<ListResponse> {
  if (usesLocalApi()) return localSearch(query);
  return readJson<ListResponse>(
    await fetch(gasUrl({ action: "search", q: query })),
  );
}

export async function checkIn(code: string): Promise<CheckinResponse> {
  if (usesLocalApi()) return localCheckin(code);
  return postAction<CheckinResponse>({ action: "checkin", code });
}
