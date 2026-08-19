import { CONFIG } from "../config";

type Props = {
  compact?: boolean;
};

export function BrandHeader({ compact = false }: Props) {
  return (
    <header className={`flex items-center gap-3 ${compact ? "mb-5" : "mb-6"}`}>
      <img
        src={CONFIG.logoUrl}
        alt=""
        className={compact ? "h-10 w-10 rounded-full" : "h-12 w-12 rounded-full"}
      />
      <div>
        <p className="font-display text-[11px] font-semibold tracking-[0.28em] text-gold-soft">
          {CONFIG.organization.toUpperCase()}
        </p>
        <p className="font-display text-lg font-semibold tracking-wide text-cream">
          {CONFIG.eventName}
        </p>
      </div>
    </header>
  );
}
