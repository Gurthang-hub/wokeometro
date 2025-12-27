import { NextResponse } from "next/server";
import db from "@/data/wokeometro_base.json";

type TitleType = "movie" | "series";

type WokeTitle = {
  id: string;
  type: TitleType;
  title: string;
  year: number;
  woke_score: number;
  score_source?: "auto" | "manual";
  tmdb_popularity?: number | null;
};

function norm(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const q = norm(searchParams.get("q") || "");
  const type = (searchParams.get("type") || "all") as TitleType | "all";
  const reviewedOnly = (searchParams.get("reviewed") || "0") === "1";
  const limit = Math.min(Number(searchParams.get("limit") || "50"), 100);

  if (!q) return NextResponse.json({ results: [] });

  const list = db as WokeTitle[];

  const filtered = list.filter((t) => {
    if (type !== "all" && t.type !== type) return false;
    if (reviewedOnly && (t.score_source || "auto") !== "manual") return false;

    const hay = norm(`${t.title} ${t.year} ${t.type}`);
    return hay.includes(q);
  });

  filtered.sort((a, b) => {
    const pa = typeof a.tmdb_popularity === "number" ? a.tmdb_popularity : -1;
    const pb = typeof b.tmdb_popularity === "number" ? b.tmdb_popularity : -1;
    if (pb !== pa) return pb - pa;
    return (b.year || 0) - (a.year || 0);
  });

  const results = filtered.slice(0, limit).map((t) => ({
    id: t.id,
    type: t.type,
    title: t.title,
    year: t.year,
    woke_score: t.woke_score,
    score_source: (t.score_source || "auto") as "auto" | "manual",
  }));

  return NextResponse.json({ results });
}
