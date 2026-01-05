"use client";

import WokeLevelPanelClient from "./WokeLevelPanelClient";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Splash from "../components/Splash";
import { searchTitles } from "@/lib/data";
import type { TitleType, WokeTitle } from "@/lib/data";

function scoreLabel(score: number) {
  // Mantengo tu etiquetado actual si lo usas aquí; si ya lo cambiaste en ficha, da igual.
  if (score >= 8) return "Alto";
  if (score >= 5) return "Mixto";
  return "Bajo";
}

function scoreStyles(score: number) {
  if (score >= 8) return "border-red-300/35 bg-red-500/10 text-red-100";
  if (score >= 5) return "border-amber-300/35 bg-amber-500/10 text-amber-100";
  return "border-emerald-300/35 bg-emerald-500/10 text-emerald-100";
}

export default function HomePage() {
  const router = useRouter();

  // Splash una vez por sesión
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const seen = sessionStorage.getItem("wm_splash_seen");
    if (seen === "1") setReady(true);
  }, []);

  useEffect(() => {
    if (ready) return;
    const t = setTimeout(() => {
      sessionStorage.setItem("wm_splash_seen", "1");
      setReady(true);
    }, 1600);
    return () => clearTimeout(t);
  }, [ready]);

  // Buscador
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [type, setType] = useState<TitleType | "all">("all");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 180);
    return () => clearTimeout(t);
  }, [query]);

  const results: WokeTitle[] = useMemo(() => {
    const q = debounced.trim();
    if (!q) return [];
    return searchTitles(q, {
      type,
      yearMin: 1900,
      yearMax: 2100,
      scoreMin: 0,
      scoreMax: 10,
    });
  }, [debounced, type]);

  function openTitle(t: WokeTitle) {
    const id = t?.id;
    if (!id || typeof id !== "string" || !id.trim()) return;
    router.push(`/title/${encodeURIComponent(id)}`);
  }

  if (!ready) return <Splash />;

  return (
    <main className="min-h-screen bg-neutral-800 text-neutral-100">
      <div className="mx-auto max-w-5xl px-4 pt-6 pb-10">
        {/* Header centrado, sin ruido */}
        <header className="text-center space-y-2 mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Wokeómetro</h1>
          <p className="text-sm text-neutral-300">
            Introduce la película o serie que quieras consultar.
          </p>
        </header>

        {/* Buscador: más bajo, más lineal, menos “bloque” */}
        <section className="mx-auto max-w-2xl">
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar título…"
              className="w-full rounded-xl bg-neutral-900/55 border border-neutral-700 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-white/10"
            />

            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="rounded-xl bg-neutral-900/55 border border-neutral-700 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-white/10"
              aria-label="Filtrar por tipo"
            >
              <option value="all">Todo</option>
              <option value="movie">Películas</option>
              <option value="series">Series</option>
            </select>
          </div>

          {/* Ayuda mínima */}
          {query.trim().length === 0 && (
            <div className="mt-3 text-center text-xs text-neutral-400">
              Ejemplos: <span className="text-neutral-200">Dune</span>,{" "}
              <span className="text-neutral-200">The Last of Us</span>
            </div>
          )}
        </section>

        {/* Resultados */}
        {query.trim().length > 0 && (
          <section className="mx-auto max-w-3xl mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Resultados</h2>
              <div className="text-xs text-neutral-400">{results.length} encontrados</div>
            </div>

            {results.length === 0 ? (
              <div className="rounded-2xl bg-neutral-900/35 ring-1 ring-white/5 p-4 text-sm text-neutral-300">
                Sin resultados. Prueba otro título.
              </div>
            ) : (
              <div className="grid gap-2">
                {results.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => openTitle(t)}
                    className="text-left rounded-2xl bg-neutral-900/30 ring-1 ring-white/5 px-4 py-3 hover:bg-neutral-900/45 transition"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{t.title}</div>
                        <div className="text-xs text-neutral-400">
                          {t.year} · {t.type === "movie" ? "Película" : "Serie"}
                        </div>
                      </div>

                      <div
                        className={`shrink-0 rounded-xl border px-3 py-2 text-xs text-center ${scoreStyles(
                          t.woke_score
                        )}`}
                      >
                        <div className="font-semibold">{t.woke_score.toFixed(1)}/10</div>
                        <div className="text-[11px] text-neutral-200/90">{scoreLabel(t.woke_score)}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Aviso legal abajo del todo, más discreto */}
        <footer className="mt-10 text-center text-[11px] leading-relaxed text-neutral-500">
          <div className="opacity-70">
            Wokeómetro es una herramienta informativa. No busca juzgar, ofender ni descalificar
            a nadie. Las valoraciones reflejan criterios editoriales y pueden variar con el tiempo.
          </div>
          <div className="mt-2 opacity-60">
            Pósters e información de producción proceden de TMDB. Wokeómetro no está afiliado a TMDB
            ni a ninguna productora. © sus respectivos propietarios.
          </div>
        </footer>
      </div>
    </main>
  );
}
