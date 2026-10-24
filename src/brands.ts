import catalog_ from "./brandCatalog.json";

// Local brand logos from a curated Simple Icons catalog (src/brandCatalog.json).
// Matching is by name, so it runs offline and sends nothing to a provider. A wrong or missing match falls back to initials.
export type Brand = { title: string; hex: string; path: string };

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const catalog = new Map<string, Brand>(
  (catalog_ as Brand[]).map((brand) => [normalize(brand.title), brand]),
);

// Common names that differ from the brand title in the catalog.
const aliases: Record<string, string> = {
  aws: "amazonwebservices",
  google: "google",
  gmail: "gmail",
  icloud: "icloud",
};

// Host labels such as "github" from "github.com", or a plain name such as "Netflix".
const hostLabel = (value: string) => {
  const clean = value.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
  const parts = clean.split(".").filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 2] : parts[0] || "";
};

export function brandFor(value: string | undefined | null): Brand | null {
  if (!value) return null;
  const tokens = value.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  if (!tokens.length) return null;
  const candidates = [normalize(value), tokens[0], hostLabel(value)];
  for (const key of candidates) {
    const direct = catalog.get(key);
    if (direct) return direct;
    const aliased = aliases[key] && catalog.get(aliases[key]);
    if (aliased) return aliased;
  }
  return null;
}

// Brand for a record: its name first, then the website or provider host.
export function brandForRecord(title: string, website?: string) {
  return brandFor(title) ?? brandFor(website ?? "");
}
