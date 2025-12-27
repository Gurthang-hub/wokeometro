import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import fs from "node:fs";
import path from "node:path";

const TOKEN = process.env.TMDB_BEARER_TOKEN;
if (!TOKEN) {
  console.error("❌ Falta TMDB_BEARER_TOKEN en .env.local");
  process.exit(1);
}

const OUT = path.join(process.cwd(), "src", "data", "wokeometro_base.json");

const START_YEAR = 2015;
const END_YEAR = 2025;

const LANG = "es-ES";

// “Relevantes” (ajustable)
const MIN_VOTE_COUNT = 200;     // mínimo nº de votos
const MIN_VOTE_AVG = 5.0;       // mínimo nota media
const MAX_PAGES_PER_YEAR = 10;  // cap para no explotar (sube si quieres más)

function range(a, b) {
  const r = [];
  for (let y = a; y <= b; y++) r.push(y);
  return r;
}

async function tmdb(url) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText} -> ${text.slice(0, 250)}`);
  }
  return res.json();
}

function normTitle(obj, type) {
  const title = type === "movie" ? obj.title : obj.name;
  const date = type === "movie" ? obj.release_date : obj.first_air_date;
  const year = date ? Number(date.slice(0, 4)) : 0;

  return {
    id: `tmdb_${type}_${obj.id}`,
    tmdb_id: obj.id,
    type, // "movie" | "series"
    title: title || "Sin título",
    year,
    overview: obj.overview || "",
    poster_path: obj.poster_path || null,

    // campos wokeómetro (vacíos por ahora)
    woke_score: 0,
    flags: [],
    notes: "",
  };
}

async function fetchDiscoverMovie(year) {
  const items = [];
  let page = 1;

  while (page <= MAX_PAGES_PER_YEAR) {
    const url =
      `https://api.themoviedb.org/3/discover/movie?` +
      new URLSearchParams({
        language: LANG,
        sort_by: "popularity.desc",
        include_adult: "false",
        include_video: "false",
        page: String(page),
        primary_release_year: String(year),
        "vote_count.gte": String(MIN_VOTE_COUNT),
        "vote_average.gte": String(MIN_VOTE_AVG),
      });

    const data = await tmdb(url);
    for (const m of data.results ?? []) items.push(normTitle(m, "movie"));
    if (!data.total_pages || page >= data.total_pages) break;
    page++;
  }

  return items;
}

async function fetchDiscoverTV(year) {
  const items = [];
  let page = 1;

  while (page <= MAX_PAGES_PER_YEAR) {
    const url =
      `https://api.themoviedb.org/3/discover/tv?` +
      new URLSearchParams({
        language: LANG,
        sort_by: "popularity.desc",
        include_adult: "false",
        page: String(page),
        first_air_date_year: String(year),
        "vote_count.gte": String(MIN_VOTE_COUNT),
        "vote_average.gte": String(MIN_VOTE_AVG),
      });

    const data = await tmdb(url);
    for (const tv of data.results ?? []) items.push(normTitle(tv, "series"));
    if (!data.total_pages || page >= data.total_pages) break;
    page++;
  }

  return items;
}

function dedupeById(list) {
  const map = new Map();
  for (const x of list) map.set(x.id, x);
  return [...map.values()];
}

async function main() {
  const YEARS = range(START_YEAR, END_YEAR);
  console.log("Años:", YEARS.join(", "));
  console.log("Relevantes:", { MIN_VOTE_COUNT, MIN_VOTE_AVG, MAX_PAGES_PER_YEAR });

  const all = [];

  for (const y of YEARS) {
    console.log(`\n=== ${y} ===`);
    const movies = await fetchDiscoverMovie(y);
    console.log(`Movies: ${movies.length}`);
    const tv = await fetchDiscoverTV(y);
    console.log(`Series: ${tv.length}`);
    all.push(...movies, ...tv);
  }

  const finalList = dedupeById(all);

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(finalList, null, 2), "utf-8");

  console.log(`\n✅ Guardado: ${OUT}`);
  console.log(`Total títulos: ${finalList.length}`);
}

main().catch((e) => {
  console.error("❌ Error:", e.message);
  process.exit(1);
});
