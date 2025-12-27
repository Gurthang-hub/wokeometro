import base from "@/data/wokeometro_base.json";

export type TitleType = "movie" | "series";

export type WokeTitle = {
  id: string;
  tmdb_id?: number;
  type: TitleType;
  title: string;
  year: number;

  overview?: string;
  overview_es?: string;
  overview_en?: string;

  poster_path?: string | null;

  woke_score: number;
  flags: string[];
  notes?: string;

  // Para “Solo revisados” (si existe en tu JSON)
  score_source?: "auto" | "manual";
  reviewed?: boolean;
};

function norm(s: string) {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

function slug(s: string) {
  return norm(s)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function ensureId(t: Partial<WokeTitle>): string {
  if (typeof t.id === "string" && t.id.trim()) return t.id.trim();

  // Si tienes tmdb_id, hacemos un id estable
  if (typeof t.tmdb_id === "number" && (t.type === "movie" || t.type === "series")) {
    return `tmdb_${t.type}_${t.tmdb_id}`;
  }

  // Fallback estable por título/año/tipo
  const safeType = t.type === "movie" || t.type === "series" ? t.type : "movie";
  const safeYear = typeof t.year === "number" ? t.year : 0;
  const safeTitle = typeof t.title === "string" ? t.title : "untitled";
  return `local_${safeType}_${safeYear}_${slug(safeTitle)}`;
}

const TITLES: WokeTitle[] = (base as any[]).map((raw) => {
  const t = raw as Partial<WokeTitle>;

  return {
    ...t,
    id: ensureId(t),
    type: t.type === "movie" || t.type === "series" ? t.type : "movie",
    title: typeof t.title === "string" ? t.title : "Sin título",
    year: typeof t.year === "number" ? t.year : 0,

    flags: Array.isArray(t.flags) ? t.flags : [],
    woke_score: typeof t.woke_score === "number" ? t.woke_score : 0,

    overview: (t as any).overview ?? "",
  } as WokeTitle;
});

export function getAllTitles(): WokeTitle[] {
  return TITLES;
}

export function getTitleById(id: string): WokeTitle | undefined {
  const want = decodeURIComponent(String(id ?? "")).trim();
  if (!want) return undefined;

  // Match exacto (primero)
  let t = TITLES.find((x) => x.id === want);
  if (t) return t;

  // Match normalizado (por si el id viene con encoding raro)
  const w = norm(want);
  t = TITLES.find((x) => norm(x.id) === w);
  return t;
}

// --- SEARCH: soporta 2 firmas ---
// 1) Antigua (con filtros año/score):
type SearchOptsLegacy = {
  type: TitleType | "all";
  yearMin: number;
  yearMax: number;
  scoreMin: number;
  scoreMax: number;
};

// 2) Nueva (minimal):
type SearchOptsSimple = {
  type: TitleType | "all";
  reviewedOnly?: boolean;
  limit?: number;
};

function isLegacy(opts: any): opts is SearchOptsLegacy {
  return opts && typeof opts.yearMin !== "undefined" && typeof opts.scoreMin !== "undefined";
}

export function searchTitles(query: string, opts: SearchOptsLegacy): WokeTitle[];
export function searchTitles(query: string, opts: SearchOptsSimple): WokeTitle[];
export function searchTitles(query: string, opts: any): WokeTitle[] {
  const q = norm(query);
  const type: TitleType | "all" = opts?.type ?? "all";
  const limit: number = Number.isFinite(opts?.limit) ? opts.limit : 50;

  // reviewedOnly (solo en modo simple)
  const reviewedOnly: boolean = Boolean(opts?.reviewedOnly);

  // Filtros legacy (si existen)
  const yearMin = isLegacy(opts) && Number.isFinite(opts.yearMin) ? opts.yearMin : 0;
  const yearMax = isLegacy(opts) && Number.isFinite(opts.yearMax) ? opts.yearMax : 9999;
  const scoreMin = isLegacy(opts) && Number.isFinite(opts.scoreMin) ? opts.scoreMin : 0;
  const scoreMax = isLegacy(opts) && Number.isFinite(opts.scoreMax) ? opts.scoreMax : 10;

  const res = TITLES.filter((t) => {
    if (type !== "all" && t.type !== type) return false;

    if (isLegacy(opts)) {
      if (t.year < yearMin || t.year > yearMax) return false;
      if (t.woke_score < scoreMin || t.woke_score > scoreMax) return false;
    }

    if (reviewedOnly) {
      const isReviewed = t.reviewed === true || t.score_source === "manual";
      if (!isReviewed) return false;
    }

    if (!q) return true;

    const hay = norm(`${t.title} ${t.year} ${t.type}`);
    return hay.includes(q);
  });

  return res
    .sort((a, b) => (b.year - a.year) || a.title.localeCompare(b.title))
    .slice(0, limit);
}
