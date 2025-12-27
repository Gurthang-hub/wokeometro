"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Splash from "@/components/Splash";
import { searchTitles } from "@/lib/data";
import type { TitleType, WokeTitle } from "@/lib/data";

function scoreLabel(score: number) {
  if (score >= 6) return "Alto";
  if (score >= 3) return "Mixto";
  return "Bajo";
}

function scoreStyles(score: number) {
  if (score >= 6) return "border-red-300/40 bg-red-500/10 text-red-100";
  if (score >= 3) return "border-amber-300/40 bg-amber-500/10 text-amber-100";
  return "border-emerald-300/40 bg-emerald-500/10 text-emerald-100";
}

export default function HomePage() {
  const router = useRouter();

  /* Splash */
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const seen = sessionStorage.getItem("wm_splash_seen");
    if (seen === "1") setReady(true);
    else {
      setTimeout(() => {
        sessionStorage.setItem("wm_splash_seen", "1");
        setReady(true);
      }, 1400);
    }
  }, []);

  /* Buscador */
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [type, setType] = useState<TitleType | "all">("all");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 200);
    return () => clearTimeout(t);
  }, [query]);

  const results = useMemo(() => {
    if (!debounced.trim()) return [];
    return searchTitles(debounced, {
      type,
      yearMin: 1900,
      yearMax: 2100,
      scoreMin: 0,
      scoreMax: 10,
    });
  }, [debounced, type]);

  function openTitle(t: WokeTitle) {
    router.push(`/title/${encodeURIComponent(t.id)}`);
  }

  if (!ready) return <Splash />;

  return (
    <main className="min-h-screen bg-neutral-800 text-neutral-100 flex flex-col">
      {/* CONTENIDO */}
      <div className="mx-auto w-full max-w-xl p-4 space-y-6 flex-1">
        {/* HEADER */}
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-semibold">Wokeómetro</h1>
          <p className="text-sm text-neutral-300">
            Introduce la película o serie que quieras consultar.
          </p>
        </header>

        {/* BUSCADOR */}
        <section className="rounded-2xl bg-neutral-700/60 p-3 space-y-3">
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar título…"
              className="w-full rounded-xl bg-neutral-900/70 border border-neutral-600 px-4 py-3 outline-none"
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="rounded-xl bg-neutral-900/70 border border-neutral-600 px-3 py-3"
            >
              <option value="all">Todos</option>
              <option value="movie">Películas</option>
              <option value="series">Series</option>
            </select>
          </div>

          {!query && (
            <div className="text-xs text-neutral-300 pt-1">
              Escribe para ver resultados. (Ej: Dune, Breaking Bad, The Last of Us)
            </div>
          )}
        </section>

        {/* RESULTADOS */}
        {query && (
          <section className="space-y-3">
            {results.map((t) => (
              <button
                key={t.id}
                onClick={() => openTitle(t)}
                className="w-full text-left rounded-2xl bg-neutral-700/60 p-4 hover:bg-neutral-700 transition"
              >
                <div className="flex justify-between items-center gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{t.title}</div>
                    <div className="text-xs text-neutral-300">
                      {t.year} · {t.type === "movie" ? "Película" : "Serie"}
                    </div>
                  </div>

                  {/* ✅ PUNTUACIÓN CON COLOR */}
                  <div
                    className={`shrink-0 rounded-xl border px-3 py-2 text-xs text-center ${scoreStyles(
                      t.woke_score
                    )}`}
                  >
                    <div className="font-semibold">{t.woke_score.toFixed(1)}/10</div>
                    <div className="text-[11px] text-neutral-200/90">
                      {scoreLabel(t.woke_score)}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </section>
        )}
      </div>

      {/* AVISO LEGAL – ABAJO DEL TODO */}
      <footer className="px-6 pb-6 text-[11px] leading-relaxed text-neutral-400">
        <b className="text-neutral-300">Aviso legal y de uso.</b> Wokeómetro es una
        herramienta informativa de carácter editorial y descriptivo. Los datos
        mostrados no constituyen una valoración artística, moral ni legal de las
        obras analizadas, ni una recomendación de consumo.
        <br /><br />
        La información se elabora a partir de fuentes públicas y accesibles,
        incluyendo bases de datos audiovisuales, descripciones oficiales,
        material promocional, metadatos culturales y análisis editoriales propios.
        <br /><br />
        Wokeómetro no está afiliado ni respaldado por productoras, plataformas
        de streaming ni titulares de derechos. El uso de esta plataforma implica
        la aceptación de estos términos.
      </footer>
    </main>
  );
}
