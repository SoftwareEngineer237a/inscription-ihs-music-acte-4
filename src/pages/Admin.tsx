import { useEffect, useMemo, useState } from "react";
import { listRegistrations } from "../api";
import { BrandHeader } from "../components/BrandHeader";
import { StaffNav } from "../components/StaffNav";
import { CONFIG, usesLocalApi } from "../config";
import { formatDateTime, matchesQuery, presenceRate } from "../lib/format";
import type { Registration } from "../types";

type Filter = "all" | "present" | "absent";

export default function Admin() {
  const [rows, setRows] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    document.title = `Tableau de bord — ${CONFIG.organization}`;
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const result = await listRegistrations();
      if (!result.ok) {
        setError(result.error || "Impossible de charger les inscriptions.");
        return;
      }
      setRows(result.rows);
    } catch {
      setError("Impossible de charger les inscriptions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const presentCount = rows.filter((row) => row.present === "OUI").length;
  const absentCount = rows.length - presentCount;

  const visible = useMemo(() => {
    return rows.filter((row) => {
      if (filter === "present" && row.present !== "OUI") return false;
      if (filter === "absent" && row.present !== "NON") return false;
      return matchesQuery(row, query);
    });
  }, [rows, filter, query]);

  function exportCsv() {
    const headers = [
      "Code",
      "Nom complet",
      "Téléphone",
      "Email",
      "Attentes",
      "Date d'inscription",
      "Présent",
      "Heure d'entrée",
    ];
    const lines = visible.map((row) =>
      [
        row.code,
        row.nom,
        row.telephone,
        row.email,
        row.attentes,
        row.dateInscription,
        row.present,
        row.heureEntree ?? "",
      ]
        .map(csvCell)
        .join(";"),
    );
    const csv = `\uFEFF${headers.join(";")}\n${lines.join("\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ihs-acte4-inscrits.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl px-4 pb-10 pt-5">
      <BrandHeader />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl text-cream">Tableau de bord</h1>
          <p className="mt-1 text-sm text-cream/55">
            Inscriptions {CONFIG.organization} — {CONFIG.eventName}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="h-11 rounded-xl border border-cream/15 px-4 text-sm text-cream/80"
          >
            Actualiser
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={visible.length === 0}
            className="h-11 rounded-xl bg-gold px-4 text-sm font-semibold text-ink disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>
      </div>

      {usesLocalApi() ? (
        <p className="mb-5 rounded-2xl border border-gold/25 bg-gold/10 px-4 py-3 text-sm text-gold-soft">
          Mode local : les données restent dans ce navigateur. Renseignez
          <span className="font-mono"> apiUrl </span>
          dans la configuration pour utiliser Google Sheets.
        </p>
      ) : null}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Inscrits" value={String(rows.length)} />
        <Stat label="Présents" value={String(presentCount)} />
        <Stat label="Non présents" value={String(absentCount)} />
        <Stat label="Taux de présence" value={presenceRate(rows.length, presentCount)} />
      </div>

      <div className="mb-4 flex flex-col gap-3 md:flex-row">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher par nom, téléphone ou code"
          className="h-12 w-full rounded-2xl border border-cream/12 bg-ink-2 px-4 text-base text-cream outline-none placeholder:text-cream/30 focus:border-gold/60"
        />
        <div className="flex shrink-0 rounded-2xl border border-cream/12 p-1">
          <FilterBtn current={filter} id="all" onClick={setFilter}>
            Tous
          </FilterBtn>
          <FilterBtn current={filter} id="present" onClick={setFilter}>
            Présents
          </FilterBtn>
          <FilterBtn current={filter} id="absent" onClick={setFilter}>
            Non présents
          </FilterBtn>
        </div>
      </div>

      {error ? (
        <p className="rounded-2xl border border-wine/40 bg-wine/15 px-4 py-3 text-sm">{error}</p>
      ) : null}

      {loading ? (
        <p className="py-16 text-center text-sm text-cream/50">Chargement des inscriptions…</p>
      ) : visible.length === 0 ? (
        <p className="py-16 text-center text-sm text-cream/50">
          Aucune inscription ne correspond à votre recherche.
        </p>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-cream/10 md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-wider text-cream/50">
                <tr>
                  <th className="px-3 py-3 font-medium">Code</th>
                  <th className="px-3 py-3 font-medium">Nom</th>
                  <th className="px-3 py-3 font-medium">Téléphone</th>
                  <th className="px-3 py-3 font-medium">Email</th>
                  <th className="px-3 py-3 font-medium">Attentes</th>
                  <th className="px-3 py-3 font-medium">Date</th>
                  <th className="px-3 py-3 font-medium">Présent</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row.code} className="border-t border-cream/8 align-top">
                    <td className="px-3 py-3 font-mono text-xs text-gold-soft">{row.code}</td>
                    <td className="px-3 py-3 font-medium">{row.nom}</td>
                    <td className="px-3 py-3 text-cream/75">{row.telephone}</td>
                    <td className="px-3 py-3 text-cream/75">{row.email}</td>
                    <td className="max-w-xs px-3 py-3 text-cream/65">{row.attentes}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-cream/60">
                      {formatDateTime(row.dateInscription)}
                    </td>
                    <td className="px-3 py-3">
                      <PresenceBadge value={row.present} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {visible.map((row) => (
              <article
                key={row.code}
                className="rounded-2xl border border-cream/10 bg-ink-2 px-4 py-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-cream">{row.nom}</p>
                    <p className="mt-0.5 font-mono text-xs text-gold-soft">{row.code}</p>
                  </div>
                  <PresenceBadge value={row.present} />
                </div>
                <p className="mt-3 text-sm text-cream/70">{row.telephone}</p>
                <p className="text-sm text-cream/70">{row.email}</p>
                <p className="mt-2 text-sm text-cream/55">{row.attentes}</p>
                <p className="mt-3 text-xs text-cream/40">
                  Inscrit le {formatDateTime(row.dateInscription)}
                </p>
              </article>
            ))}
          </div>
        </>
      )}

      <StaffNav current="admin" />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gold/15 bg-gradient-to-b from-white/5 to-transparent px-4 py-4">
      <p className="text-xs tracking-wide text-cream/50">{label}</p>
      <p className="mt-1 font-display text-3xl text-gold">{value}</p>
    </div>
  );
}

function FilterBtn({
  current,
  id,
  onClick,
  children,
}: {
  current: Filter;
  id: Filter;
  onClick: (value: Filter) => void;
  children: string;
}) {
  const active = current === id;
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className={`h-10 flex-1 rounded-xl px-3 text-sm md:flex-none ${
        active ? "bg-gold text-ink" : "text-cream/65"
      }`}
    >
      {children}
    </button>
  );
}

function PresenceBadge({ value }: { value: "OUI" | "NON" }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        value === "OUI"
          ? "bg-emerald-500/15 text-emerald-300"
          : "bg-white/8 text-cream/55"
      }`}
    >
      {value === "OUI" ? "Présent" : "Non présent"}
    </span>
  );
}

function csvCell(value: string): string {
  const safe = value.replace(/"/g, '""');
  return `"${safe}"`;
}
