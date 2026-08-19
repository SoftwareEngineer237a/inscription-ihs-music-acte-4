import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { registerParticipant } from "../api";
import { BrandHeader } from "../components/BrandHeader";
import { CONFIG, EVENT_FLYER_URL } from "../config";
import { downloadBadgeImage } from "../lib/badgeImage";
import { validateRegistration, type FormErrors } from "../lib/validate";

const LAST_BADGE_KEY = "ihs_acte4_last_badge";

type BadgeData = { nom: string; code: string };

function readStoredBadge(): BadgeData | null {
  try {
    const raw = sessionStorage.getItem(LAST_BADGE_KEY);
    return raw ? (JSON.parse(raw) as BadgeData) : null;
  } catch {
    return null;
  }
}

export default function Register() {
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [attentes, setAttentes] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [badge, setBadge] = useState<BadgeData | null>(null);
  const [qrUrl, setQrUrl] = useState("");
  const [flyerOk, setFlyerOk] = useState(Boolean(EVENT_FLYER_URL));
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    document.title = `${CONFIG.organization} — ${CONFIG.eventName} | Inscription`;
    const stored = readStoredBadge();
    if (stored) setBadge(stored);
  }, []);

  useEffect(() => {
    if (!badge) {
      setQrUrl("");
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(badge.code, {
      width: 280,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#0c0a09", light: "#ffffff" },
    }).then((url) => {
      if (!cancelled) setQrUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [badge]);

  const charCount = useMemo(() => attentes.length, [attentes]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError("");
    const nextErrors = validateRegistration({ nom, telephone, email, attentes });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const result = await registerParticipant({
        nom: nom.trim(),
        telephone: telephone.trim(),
        email: email.trim(),
        attentes: attentes.trim(),
      });
      if (!result.ok) {
        setFormError(result.error || "L'inscription n'a pas pu être enregistrée.");
        return;
      }
      const nextBadge = { nom: result.nom, code: result.code };
      sessionStorage.setItem(LAST_BADGE_KEY, JSON.stringify(nextBadge));
      setBadge(nextBadge);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setFormError("Impossible d'enregistrer l'inscription. Réessayez dans un instant.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDownload() {
    if (!badge) return;
    setDownloading(true);
    try {
      await downloadBadgeImage(badge.nom, badge.code);
    } catch {
      setFormError("Le téléchargement a échoué. Vous pouvez aussi faire une capture d'écran.");
    } finally {
      setDownloading(false);
    }
  }

  function newRegistration() {
    sessionStorage.removeItem(LAST_BADGE_KEY);
    setBadge(null);
    setNom("");
    setTelephone("");
    setEmail("");
    setAttentes("");
    setErrors({});
    setFormError("");
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-lg px-4 pb-16 pt-4">
      {!badge ? (
        <>
          {flyerOk && EVENT_FLYER_URL ? (
            <div className="mb-6 overflow-hidden rounded-3xl border border-gold/25 bg-ink-2 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
              <img
                src={EVENT_FLYER_URL}
                alt={`Flyer du concert ${CONFIG.organization} ${CONFIG.eventName}`}
                className="mx-auto h-auto w-full object-contain"
                onError={() => setFlyerOk(false)}
              />
            </div>
          ) : (
            <div className="mb-6 overflow-hidden rounded-3xl border border-gold/25 bg-[radial-gradient(ellipse_at_top,_rgba(201,168,76,0.18),_transparent_60%)] px-6 py-16 text-center">
              <p className="font-display text-xs tracking-[0.35em] text-gold-soft">
                {CONFIG.organization.toUpperCase()}
              </p>
              <h1 className="mt-3 font-display text-5xl text-gold">{CONFIG.eventName}</h1>
              <p className="mt-4 text-sm tracking-[0.25em] text-cream/70">CONCERT GRATUIT</p>
            </div>
          )}

          <BrandHeader />

          <div className="mb-8 space-y-3">
            <p className="inline-flex rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-medium tracking-wide text-gold-soft">
              Concert gratuit
            </p>
            <h1 className="font-display text-3xl leading-tight text-cream">
              {CONFIG.organization} — {CONFIG.eventName}
            </h1>
            <p className="text-[15px] leading-relaxed text-cream/70">
              Votre inscription nous aide à estimer le nombre de personnes attendues
              et à faciliter l'accueil le jour du concert.
            </p>
          </div>
        </>
      ) : (
        <BrandHeader compact />
      )}

      {badge ? (
        <section className="space-y-5">
          <article
            id="badge-card"
            className="relative overflow-hidden rounded-[28px] border border-gold/40 bg-gradient-to-b from-[#1a1612] to-ink px-5 pb-8 pt-7 text-center shadow-[0_24px_70px_rgba(0,0,0,0.4)]"
          >
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
            <p className="font-display text-[11px] tracking-[0.32em] text-gold-soft">
              {CONFIG.organization.toUpperCase()}
            </p>
            <p className="mt-1 font-display text-3xl text-gold">{CONFIG.eventName}</p>
            <div className="mt-4 flex items-center justify-center gap-2 text-emerald-300">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/15 text-sm">
                ✓
              </span>
              <p className="text-xs font-medium tracking-[0.22em]">INSCRIPTION CONFIRMÉE</p>
            </div>
            <h2 className="mt-3 font-display text-[1.7rem] leading-snug text-white">
              {badge.nom}
            </h2>
            <div className="mx-auto mt-6 w-fit rounded-3xl bg-white p-3">
              {qrUrl ? (
                <img src={qrUrl} alt={`QR code ${badge.code}`} className="h-52 w-52" />
              ) : (
                <div className="h-52 w-52 animate-pulse bg-stone-200" />
              )}
            </div>
            <p className="mt-5 font-mono text-sm tracking-widest text-gold-soft">
              {badge.code}
            </p>
            <p className="mt-3 text-sm text-cream/65">
              Présentez ce QR code à l'entrée le jour du concert.
            </p>
          </article>

          <button
            type="button"
            onClick={onDownload}
            disabled={downloading}
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-gold text-base font-semibold text-ink transition hover:bg-gold-soft disabled:opacity-60"
          >
            {downloading ? "Préparation de l'image…" : "Télécharger mon badge"}
          </button>
          <p className="text-center text-xs leading-relaxed text-cream/45">
            L'image se télécharge sur votre téléphone. Vous pouvez aussi simplement
            faire une capture d'écran de ce badge.
          </p>
          <button
            type="button"
            onClick={newRegistration}
            className="flex h-12 w-full items-center justify-center rounded-2xl border border-cream/15 text-sm text-cream/70"
          >
            Nouvelle inscription
          </button>
        </section>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {formError ? (
            <p className="rounded-2xl border border-wine/40 bg-wine/15 px-4 py-3 text-sm text-cream">
              {formError}
            </p>
          ) : null}

          <Field
            label="Nom complet"
            error={errors.nom}
            htmlFor="nom"
          >
            <input
              id="nom"
              name="name"
              autoComplete="name"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className={inputClass(Boolean(errors.nom))}
              placeholder="Votre nom et prénom"
            />
          </Field>

          <Field label="Numéro de téléphone" error={errors.telephone} htmlFor="telephone">
            <input
              id="telephone"
              name="tel"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              className={inputClass(Boolean(errors.telephone))}
              placeholder="Ex. 07 00 00 00 00"
            />
          </Field>

          <Field label="Adresse email" error={errors.email} htmlFor="email">
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass(Boolean(errors.email))}
              placeholder="vous@email.com"
            />
          </Field>

          <Field
            label="Qu'est-ce que vous attendez de ce programme ?"
            error={errors.attentes}
            htmlFor="attentes"
          >
            <textarea
              id="attentes"
              name="attentes"
              rows={4}
              value={attentes}
              onChange={(e) => setAttentes(e.target.value)}
              className={`${inputClass(Boolean(errors.attentes))} resize-y min-h-[120px]`}
              placeholder="Partagez en quelques mots ce que vous espérez vivre…"
              maxLength={500}
            />
            <p className="mt-1 text-right text-[11px] text-cream/35">{charCount}/500</p>
          </Field>

          <button
            type="submit"
            disabled={submitting}
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-gold text-base font-semibold text-ink transition hover:bg-gold-soft disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Inscription en cours…" : "S'inscrire"}
          </button>
        </form>
      )}

      <footer className="mt-16 text-center text-[11px] text-cream/30">
        <p>{CONFIG.organization}</p>
        <p className="mt-2 space-x-3">
          <a href="#/admin" className="hover:text-cream/50">
            Tableau de bord
          </a>
          <span aria-hidden="true">·</span>
          <a href="#/scan" className="hover:text-cream/50">
            Contrôle d'entrée
          </a>
        </p>
      </footer>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-cream/85">
        {label}
      </label>
      {children}
      {error ? <p className="mt-1.5 text-sm text-[#e8a0a8]">{error}</p> : null}
    </div>
  );
}

function inputClass(hasError: boolean): string {
  return [
    "w-full rounded-2xl border bg-ink-2 px-4 py-3.5 text-base text-cream outline-none transition placeholder:text-cream/30",
    hasError
      ? "border-[#c45c68] focus:border-[#e8a0a8]"
      : "border-cream/12 focus:border-gold/60",
  ].join(" ");
}
