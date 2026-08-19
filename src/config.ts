/**
 * Configuration centrale — le seul fichier à modifier
 * pour adapter l'événement, le flyer ou l'API.
 */
export const CONFIG = {
  organization: "IHS Music",
  eventName: "ACTE IV",
  flyerUrl: "/assets/flyer.jpg",
  logoUrl: "/assets/logo.png",
  /**
   * URL du déploiement Google Apps Script (se termine par /exec).
   * Laissez vide ou "..." pour le mode local (données dans ce navigateur).
   */
  apiUrl: "",
};

/** Alias demandé par le cahier des charges. */
export const EVENT_FLYER_URL = CONFIG.flyerUrl;

export function usesLocalApi(): boolean {
  const url = CONFIG.apiUrl.trim();
  return (
    url.length === 0 ||
    url === "..." ||
    url.includes("VOTRE_") ||
    url.includes("XXXX")
  );
}
