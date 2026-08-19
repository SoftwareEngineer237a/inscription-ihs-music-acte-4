import { FormEvent, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { checkIn, lookupByCode, searchRegistrations } from "../api";
import { BrandHeader } from "../components/BrandHeader";
import { StaffNav } from "../components/StaffNav";
import { CONFIG } from "../config";
import { extractCode, formatDateTime } from "../lib/format";
import type { LookupResponse, Registration } from "../types";

type Phase = "camera" | "result";

type ResultState =
  | { kind: "valid"; data: Extract<LookupResponse, { found: true }> }
  | { kind: "already"; data: Extract<LookupResponse, { found: true }> }
  | { kind: "invalid"; raw: string }
  | { kind: "error"; message: string };

export default function Scan() {
  const [phase, setPhase] = useState<Phase>("camera");
  const [result, setResult] = useState<ResultState | null>(null);
  const [camError, setCamError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [manualQuery, setManualQuery] = useState("");
  const [matches, setMatches] = useState<Registration[]>([]);
  const [searching, setSearching] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handlingRef = useRef(false);

  useEffect(() => {
    document.title = `Contrôle d'entrée — ${CONFIG.organization}`;
  }, []);

  useEffect(() => {
    if (phase !== "camera") return;

    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;
    handlingRef.current = false;
    setCamError("");

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 8, qrbox: { width: 220, height: 220 } },
        (decoded) => {
          if (handlingRef.current) return;
          handlingRef.current = true;
          void onDecoded(decoded);
        },
        () => undefined,
      )
      .catch(() => {
        setCamError(
          "Caméra indisponible. Autorisez l'accès ou utilisez la recherche manuelle ci-dessous.",
        );
      });

    return () => {
      scanner
        .stop()
        .catch(() => undefined)
        .finally(() => {
          try {
            scanner.clear();
          } catch {
            /* ignore */
          }
        });
      scannerRef.current = null;
    };
  }, [phase]);

  async function stopCamera() {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      if (scanner.isScanning) await scanner.stop();
    } catch {
      /* déjà arrêté */
    }
  }

  async function onDecoded(raw: string) {
    setBusy(true);
    await stopCamera();
    const code = extractCode(raw);
    try {
      const lookup = await lookupByCode(code);
      applyLookup(lookup, code);
    } catch {
      setResult({ kind: "error", message: "Recherche impossible. Vérifiez la connexion." });
    } finally {
      setBusy(false);
      setPhase("result");
    }
  }

  function applyLookup(lookup: LookupResponse, raw: string) {
    setConfirmed(false);
    if (!lookup.ok) {
      setResult({ kind: "error", message: lookup.error });
      return;
    }
    if (!lookup.found) {
      setResult({ kind: "invalid", raw });
      return;
    }
    if (lookup.present === "OUI") {
      setResult({ kind: "already", data: lookup });
      return;
    }
    setResult({ kind: "valid", data: lookup });
  }

  async function validateEntry() {
    if (!result || result.kind !== "valid") return;
    setConfirming(true);
    try {
      const response = await checkIn(result.data.code);
      if (!response.ok) {
        setResult({ kind: "error", message: response.error });
        return;
      }
      setConfirmed(true);
      setResult({
        kind: response.already ? "already" : "valid",
        data: {
          ok: true,
          found: true,
          code: response.code,
          nom: response.nom,
          telephone: result.data.telephone,
          email: result.data.email,
          present: "OUI",
          dateInscription: result.data.dateInscription,
          heureEntree: response.heureEntree,
        },
      });
    } catch {
      setResult({ kind: "error", message: "La validation n'a pas pu être enregistrée." });
    } finally {
      setConfirming(false);
    }
  }

  async function onManualSearch(event: FormEvent) {
    event.preventDefault();
    const q = manualQuery.trim();
    if (!q) return;
    setSearching(true);
    setMatches([]);
    try {
      const response = await searchRegistrations(q);
      if (response.ok) setMatches(response.rows.slice(0, 8));
    } catch {
      setMatches([]);
    } finally {
      setSearching(false);
    }
  }

  async function selectMatch(row: Registration) {
    await stopCamera();
    setMatches([]);
    setManualQuery("");
    applyLookup(
      {
        ok: true,
        found: true,
        code: row.code,
        nom: row.nom,
        telephone: row.telephone,
        email: row.email,
        present: row.present,
        dateInscription: row.dateInscription,
        heureEntree: row.heureEntree,
      },
      row.code,
    );
    setPhase("result");
  }

  function resetScan() {
    setResult(null);
    setConfirmed(false);
    setBusy(false);
    setMatches([]);
    setPhase("camera");
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-lg px-4 pb-10 pt-5">
      <BrandHeader />
      <h1 className="font-display text-3xl text-cream">Contrôle d'entrée</h1>
      <p className="mt-2 text-sm leading-relaxed text-cream/60">
        Scannez le badge pour fluidifier l'accueil et estimer la présence.
        Une personne sans QR code n'est pas refusée pour autant.
      </p>

      {phase === "camera" ? (
        <div className="mt-6 overflow-hidden rounded-3xl border border-cream/10 bg-black">
          <div id="qr-reader" className="min-h-[280px] overflow-hidden" />
        </div>
      ) : null}

      {camError && phase === "camera" ? (
        <p className="mt-3 rounded-2xl border border-gold/25 bg-gold/10 px-4 py-3 text-sm text-gold-soft">
          {camError}
        </p>
      ) : null}

      {busy ? (
        <p className="mt-4 text-center text-sm text-cream/60">Recherche de l'inscription…</p>
      ) : null}

      {phase === "result" && result ? <ResultCard result={result} confirmed={confirmed} /> : null}

      {phase === "result" && result?.kind === "valid" && !confirmed ? (
        <button
          type="button"
          onClick={() => void validateEntry()}
          disabled={confirming}
          className="mt-4 flex h-14 w-full items-center justify-center rounded-2xl bg-gold text-base font-semibold text-ink disabled:opacity-60"
        >
          {confirming ? "Validation…" : "Valider l'entrée"}
        </button>
      ) : null}

      {phase === "result" ? (
        <button
          type="button"
          onClick={resetScan}
          className="mt-3 flex h-12 w-full items-center justify-center rounded-2xl border border-cream/15 text-sm text-cream/75"
        >
          Scanner un autre badge
        </button>
      ) : null}

      <section className="mt-10">
        <h2 className="text-sm font-semibold tracking-wide text-cream/80">
          Recherche manuelle de secours
        </h2>
        <p className="mt-1 text-xs text-cream/45">Par nom ou numéro de téléphone, sans QR code.</p>
        <form onSubmit={(e) => void onManualSearch(e)} className="mt-3 flex gap-2">
          <input
            type="search"
            value={manualQuery}
            onChange={(e) => setManualQuery(e.target.value)}
            placeholder="Nom ou téléphone"
            className="h-12 flex-1 rounded-2xl border border-cream/12 bg-ink-2 px-4 text-base text-cream outline-none placeholder:text-cream/30 focus:border-gold/60"
          />
          <button
            type="submit"
            disabled={searching}
            className="h-12 rounded-2xl bg-gold px-4 text-sm font-semibold text-ink disabled:opacity-60"
          >
            OK
          </button>
        </form>
        {matches.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {matches.map((row) => (
              <li key={row.code}>
                <button
                  type="button"
                  onClick={() => void selectMatch(row)}
                  className="w-full rounded-2xl border border-cream/10 bg-ink-2 px-4 py-3 text-left"
                >
                  <span className="block font-medium text-cream">{row.nom}</span>
                  <span className="mt-0.5 block text-xs text-cream/50">
                    {row.telephone} · {row.code}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {searching ? <p className="mt-3 text-sm text-cream/45">Recherche…</p> : null}
      </section>

      <StaffNav current="scan" />
    </div>
  );
}

function ResultCard({
  result,
  confirmed,
}: {
  result: ResultState;
  confirmed: boolean;
}) {
  if (result.kind === "invalid") {
    return (
      <article className="mt-6 rounded-3xl border border-[#c45c68]/50 bg-[#3a1518] px-5 py-6">
        <p className="font-display text-2xl tracking-wide text-[#ffc9ce]">QR CODE INVALIDE</p>
        <p className="mt-3 text-sm leading-relaxed text-cream/75">
          Ce code n'est pas reconnu. La personne peut tout de même être accueillie —
          aidez-la via la recherche manuelle si besoin.
        </p>
      </article>
    );
  }

  if (result.kind === "error") {
    return (
      <article className="mt-6 rounded-3xl border border-gold/30 bg-gold/10 px-5 py-6">
        <p className="font-medium text-gold-soft">{result.message}</p>
      </article>
    );
  }

  if (result.kind === "already") {
    return (
      <article className="mt-6 rounded-3xl border border-amber-400/40 bg-amber-950/40 px-5 py-6">
        <p className="font-display text-2xl tracking-wide text-amber-200">
          INSCRIPTION DÉJÀ VALIDÉE
        </p>
        <p className="mt-4 text-xl font-medium text-white">{result.data.nom}</p>
        <p className="mt-1 font-mono text-sm text-gold-soft">{result.data.code}</p>
        <p className="mt-4 text-sm text-cream/70">
          Heure d'entrée : {formatDateTime(result.data.heureEntree)}
        </p>
      </article>
    );
  }

  return (
    <article className="mt-6 rounded-3xl border border-emerald-400/35 bg-emerald-950/35 px-5 py-6">
      <p className="font-display text-2xl tracking-wide text-emerald-200">
        {confirmed ? "ENTRÉE ENREGISTRÉE" : "INSCRIPTION VALIDE"}
      </p>
      <p className="mt-4 text-xl font-medium text-white">{result.data.nom}</p>
      <p className="mt-1 font-mono text-sm text-gold-soft">{result.data.code}</p>
      <p className="mt-4 text-sm text-cream/70">
        Statut : {confirmed || result.data.present === "OUI" ? "Présent" : "Pas encore présent"}
      </p>
      {result.data.heureEntree ? (
        <p className="mt-1 text-sm text-cream/70">
          Heure d'entrée : {formatDateTime(result.data.heureEntree)}
        </p>
      ) : null}
    </article>
  );
}
