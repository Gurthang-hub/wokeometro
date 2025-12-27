import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "node:fs";
import path from "node:path";

const TOKEN = process.env.TMDB_BEARER_TOKEN;
if (!TOKEN) {
  console.error("❌ Falta TMDB_BEARER_TOKEN en .env.local");
  process.exit(1);
}

const DB_PATH = path.join(process.cwd(), "src", "data", "wokeometro_base.json");
const LIMIT = 500;

const SLEEP_MS = 220; // suaviza rate limit
const MAX_RETRIES = 5;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function tmdb(url) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });

    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("retry-after") || "1");
      const wait = Math.max(1000, retryAfter * 1000);
      console.log(`⏳ 429 Rate limit. Esperando ${wait}ms...`);
      await sleep(wait);
      continue;
    }

    if (!res.ok) {
      const text = await res.text();
      if (attempt === MAX_RETRIES) {
        throw new Error(`${res.status} ${res.statusText} -> ${text.slice(0, 200)}`);
      }
      await sleep(700 * attempt);
      continue;
    }

    return res.json();
  }
  throw new Error("❌ Fallo TMDb tras reintentos.");
}

function safeArr(x) {
  return Array.isArray(x) ? x : [];
}

function normalize(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/**
 * Heurística rápida, NEUTRA:
 * No “condena”, solo detecta señales de enfoque temático/político/identitario.
 * Ajustable después.
 */
function autoScoreAndFlags({ overview_es, overview_en, genres, keywords }) {
  const text = normalize(`${overview_es}\n${overview_en}`);
  const g = new Set(safeArr(genres).map((x) => normalize(x)));
  const k = new Set(safeArr(keywords).map((x) => normalize(x)));

  const flags = new Set();
  let score = 0;

  // Señales por texto (básicas)
  const rules = [
    { re: /\bactivism|activista|activismo|protest|manifestaci/, add: 1.3, flag: "Activismo explícito" },
    { re: /\bpolitic|politi|election|eleccion|campaign|campaña|government|gobierno\b/, add: 1.1, flag: "Tema político central" },
    { re: /\bidentity|identidad|intersection|intersecc|minority|minoria|racial|racismo\b/, add: 1.2, flag: "Enfoque identitario" },
    { re: /\bgender|género|trans|transition|transici|pronoun|pronombre\b/, add: 1.3, flag: "Tema de género/identidad" },
    { re: /\blgbt|lgtb|queer|gay|lesbian|homosex|bisex\b/, add: 1.0, flag: "Subtrama LGTBIQ+" },
    { re: /\bfeminism|feminist|feminismo|patriarchy|patriarc|misogyn|machismo\b/, add: 1.1, flag: "Enfoque feminista" },
    { re: /\breligion|religious|church|iglesia|fe|faith|christian|cristian\b/, add: 0.9, flag: "Tema religioso presente" },
    { re: /\bsatire|satira|parody|parodia\b/, add: 0.6, flag: "Tono satírico" },
  ];

  for (const r of rules) {
    if (r.re.test(text)) {
      score += r.add;
      flags.add(r.flag);
    }
  }

  // Señales por géneros (suave)
  if (g.has("documentary") || g.has("documental")) {
    score += 0.8;
    flags.add("Documental / no-ficción");
  }
  if (g.has("news") || g.has("talk")) {
    score += 1.2;
    flags.add("Actualidad / debate");
  }

  // Señales por keywords (si TMDb devuelve)
  const keywordSignals = [
    { kw: ["social justice", "activism", "feminism", "racism", "gender identity"], add: 1.0, flag: "Keywords sociopolíticas" },
    { kw: ["lgbt", "transgender", "queer"], add: 1.0, flag: "Keywords LGTBIQ+" },
  ];
  for (const ks of keywordSignals) {
    for (const w of ks.kw) {
      if (k.has(normalize(w))) {
        score += ks.add;
        flags.add(ks.flag);
        break;
      }
    }
  }

  // Normaliza a 0..10 con una base mínima (para que no todo sea 0)
  // Score bruto típico ~0..6 → lo escalamos suave.
  let scaled = Math.round(Math.min(10, Math.max(0, score * 1.6)) * 10) / 10;

  // Evita que obras sin señales se vayan a 0 absoluto: mínimo 1.0
  if (scaled === 0) scaled = 1.0;

  return {
    woke_score: scaled,
    flags: Array.from(flags),
    score_source: "auto",
  };
}

async function fetchDetails(type, tmdbId, lang) {
  const endpoint = type === "movie" ? "movie" : "tv";
  const url =
    `https://api.themoviedb.org/3/${endpoint}/${tmdbId}?` +
    new URLSearchParams({ language: lang });
  return tmdb(url);
}

async function fetchKeywords(type, tmdbId) {
  const endpoint = type === "movie" ? "movie" : "tv";
  const url = `https://api.themoviedb.org/3/${endpoint}/${tmdbId}/keywords`;
  const data = await tmdb(url);

  // movies: { keywords: [...] } ; tv: { results: [...] }
  const arr = data.keywords || data.results || [];
  return safeArr(arr).map((x) => x.name).filter(Boolean);
}

function readDB() {
  if (!fs.existsSync(DB_PATH)) {
    console.error("❌ No existe:", DB_PATH);
    process.exit(1);
  }
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  return JSON.parse(raw);
}

function writeDB(list) {
  fs.writeFileSync(DB_PATH, JSON.stringify(list, null, 2), "utf-8");
}

async function main() {
  const db = readDB();

  // TOP 500: usamos el orden actual de tu DB como “proxy” de relevancia.
  // (Tu importador ya venía ordenado por popularidad por año/páginas.)
  const top = db.slice(0, LIMIT);

  console.log(`🎯 Enriqueciendo TOP ${top.length}...`);

  const enriched = [];
  for (let i = 0; i < top.length; i++) {
    const t = top[i];
    const idx = i + 1;

    if (!t.tmdb_id || !t.type) {
      console.log(`⚠️ [${idx}/${top.length}] Saltado (faltan campos):`, t?.id);
      enriched.push(t);
      continue;
    }

    process.stdout.write(`⏳ [${idx}/${top.length}] ${t.title}... `);

    // 1) detalles ES y EN
    const es = await fetchDetails(t.type, t.tmdb_id, "es-ES");
    await sleep(SLEEP_MS);
    const en = await fetchDetails(t.type, t.tmdb_id, "en-US");
    await sleep(SLEEP_MS);

    // 2) keywords
    let keywords = [];
    try {
      keywords = await fetchKeywords(t.type, t.tmdb_id);
    } catch {
      keywords = [];
    }
    await sleep(SLEEP_MS);

    const genres = safeArr(es.genres).map((g) => g.name).filter(Boolean);

    const overview_es = es.overview || t.overview || "";
    const overview_en = en.overview || "";

    const popularity = typeof es.popularity === "number" ? es.popularity : null;
    const vote_count = typeof es.vote_count === "number" ? es.vote_count : null;
    const vote_average = typeof es.vote_average === "number" ? es.vote_average : null;

    // 3) score provisional + flags
    const auto = autoScoreAndFlags({ overview_es, overview_en, genres, keywords });

    const merged = {
      ...t,
      // Conserva overview “principal” en español
      overview: overview_es,
      overview_es,
      overview_en,
      genres,
      keywords,
      tmdb_popularity: popularity,
      tmdb_vote_count: vote_count,
      tmdb_vote_average: vote_average,

      // Score auto (si ya hubiese manual, no lo pisamos)
      woke_score: typeof t.woke_score === "number" && t.woke_score !== 0 ? t.woke_score : auto.woke_score,
      flags: Array.isArray(t.flags) && t.flags.length ? t.flags : auto.flags,
      score_source: t.score_source || auto.score_source,
    };

    enriched.push(merged);
    console.log("OK");
  }

  // Reemplaza los primeros 500 en la DB por su versión enriquecida
  const updated = [...enriched, ...db.slice(LIMIT)];
  writeDB(updated);

  console.log(`\n✅ Actualizado: ${DB_PATH}`);
  console.log(`✅ TOP ${LIMIT} enriquecido con ES+EN + genres + keywords + score auto`);
}

main().catch((e) => {
  console.error("\n❌ Error:", e.message);
  process.exit(1);
});
