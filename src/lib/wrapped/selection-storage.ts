const PREFIX = "foaling-wrapped-facts:";

export function getStoredFactIds(season: string): string[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${PREFIX}${season}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return null;
  }
}

export function setStoredFactIds(season: string, ids: string[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${PREFIX}${season}`, JSON.stringify(ids));
}

export function clearStoredFactIds(season: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`${PREFIX}${season}`);
}
