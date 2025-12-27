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

// ==== Config (cámbialo si quieres) ====
const START = 0;          // desde qué índice empieza
const END = Infinity;     // hasta qué índice (Infinity = todos)
const SAVE_EVERY = 25;    // guarda cada N títulos (checkpoint)
const SLEEP_MS = 230;     // suaviza rate limit
const MAX_RETRIES = 6;    // reintentos por petición
// ======================================

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function tmdb(url) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });

    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("retry-after") || "2");
      const wait = Math.max(1500, retryAfter * 1000);
      console.log(`⏳ 429 Rate limit. Esperando ${wait}ms...`);
      await sleep(wait);
      continue;
    }

    if (!res.ok) {
      const text = await res.text();
      if (attempt === MAX_RETRIES) {
        throw new Error(`${res.status} ${res.statusText} -> ${text.slice(0, 200)}`);
      }
      await sleep(800 * attempt);
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

function autoScoreAndFlags({ overview_es, overview_en, genres, keywords }) {
  const text = normalize(`${overview_es}\n${overview_en}`);
  const g = new Set(safeArr(genres).map((x) => normalize(x)));
  const k = new Set(safeArr(keywords).map((x) => normalize(x)));

  const flags = new Set();
  let score = 0;

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

  if (g.has("documentary") || g.has("documental")) {
    score += 0.8;
    flags.add("Documental / no-ficción");
  }

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

  let scaled = Math.round(Math.min(10, Math.max(0, score * 1.6)) * 10) / 10;
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
  const arr = data.keywords || data.results || [];
  return safeArr(arr).map((x) => x.name).filter(Boolean);
}

function readDB() {
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  return JSON.parse(raw);
}

function writeDB(list) {
  fs.writeFileSync(DB_PATH, JSON.stringify(list, null, 2), "utf-8");
}

function isAlreadyEnriched(t) {
  return (
    typeof t.overview_es === "string" &&
    typeof t.overview_en === "string" &&
    Array.isArray(t.genres) &&
    Array.isArray(t.keywords) &&
    typeof t.tmdb_vote_count !== "undefined"
  );
}

async function main() {
  const db = readDB();
  const total = db.length;
  const end = Math.min(total, END === Infinity ? total : END);

  console.log(`📚 DB: ${total} títulos`);
  console.log(`🎯 Procesando: ${START} -> ${end - 1}`);
  console.log(`💾 Guardado cada: ${SAVE_EVERY}`);

  let changed = 0;

  for (let i = START; i < end; i++) {
    const t = db[i];
    const n = i + 1;

    if (!t?.tmdb_id || !t?.type) {
      console.log(`⚠️ [${n}/${total}] Saltado (sin tmdb_id/type)`);
      continue;
    }

    if (isAlreadyEnriched(t)) {
      // ya enriquecido, no repetimos llamadas
      continue;
    }

    process.stdout.write(`⏳ [${n}/${total}] ${t.title}... `);

    const es = await fetchDetails(t.type, t.tmdb_id, "es-ES");
    await sleep(SLEEP_MS);
    const en = await fetchDetails(t.type, t.tmdb_id, "en-US");
    await sleep(SLEEP_MS);

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

    const auto = autoScoreAndFlags({ overview_es, overview_en, genres, keywords });

    db[i] = {
      ...t,
      overview: overview_es,
      overview_es,
      overview_en,
      genres,
      keywords,
      tmdb_popularity: popularity,
      tmdb_vote_count: vote_count,
      tmdb_vote_average: vote_average,

      woke_score: typeof t.woke_score === "number" && t.woke_score !== 0 ? t.woke_score : auto.woke_score,
      flags: Array.isArray(t.flags) && t.flags.length ? t.flags : auto.flags,
      score_source: t.score_source || auto.score_source,
    };

    changed++;
    console.log("OK");

    if (changed % SAVE_EVERY === 0) {
      writeDB(db);
      console.log(`💾 Checkpoint guardado (${changed} cambiados)`);
    }
  }

  writeDB(db);
  console.log(`\n✅ Terminado. Cambiados: ${changed}`);
  console.log(`✅ Actualizado: ${DB_PATH}`);
}

main().catch((e) => {
  console.error("\n❌ Error:", e.message);
  process.exit(1);
});
