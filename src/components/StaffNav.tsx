type Props = {
  current: "admin" | "scan";
};

export function StaffNav({ current }: Props) {
  const item = (href: string, label: string, active: boolean) => (
    <a
      href={href}
      className={`rounded-full px-4 py-2 text-sm transition ${
        active
          ? "bg-gold/15 text-gold-soft"
          : "text-cream/55 hover:text-cream"
      }`}
    >
      {label}
    </a>
  );

  return (
    <nav className="flex flex-wrap items-center justify-center gap-1 pb-8 pt-4">
      {item("#/", "Accueil", false)}
      {item("#/admin", "Tableau de bord", current === "admin")}
      {item("#/scan", "Contrôle d'entrée", current === "scan")}
    </nav>
  );
}
