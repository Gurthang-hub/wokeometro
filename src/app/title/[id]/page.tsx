import Link from "next/link";
import Image from "next/image";
import Flags from "@/components/Flags";
import ReviewPanel from "./ReviewPanel";
import { getAllTitles, getTitleById } from "@/lib/data";
import WokeLevelPanelClient from "./WokeLevelPanelClient";

function tmdbImg(
  path?: string | null,
  size: "w92" | "w154" | "w342" | "w500" | "w780" | "original" = "w500"
) {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

function PosterHero({ poster_path, title }: { poster_path?: string | null; title: string }) {
  const url = tmdbImg(poster_path, "w500");
  if (!url) {
    return <div className="h-44 w-32 shrink-0 rounded-xl bg-neutral-900/60 ring-1 ring-white/10" />;
  }

  return (
    <div className="h-44 w-32 shrink-0 overflow-hidden rounded-xl ring-1 ring-white/10 bg-neutral-900/30">
      <Image
        src={url}
        alt={`Póster de ${title}`}
        width={500}
        height={750}
        className="h-full w-full object-cover"
        priority
      />
    </div>
  );
}

function BackdropBlur({ backdrop_path, title }: { backdrop_path?: string | null; title: string }) {
  const url = tmdbImg(backdrop_path, "w780");
  if (!url) return null;

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden rounded-3xl">
      <Image
        src={url}
        alt={`Fondo de ${title}`}
        fill
        className="object-cover opacity-40 blur-xl scale-110"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-900/40 via-neutral-900/70 to-neutral-900/95" />
      <div className="absolute inset-0 shadow-[inset_0_0_120px_rgba(0,0,0,0.65)]" />
    </div>
  );
}

function pickCompany(t: any) {
  const arr = Array.isArray(t?.production_companies) ? t.production_companies : [];
  const first = arr.find((x: any) => x?.name) || arr[0];
  return first?.name ? String(first.name) : "";
}

function pickDirector(t: any) {
  // si el script metió credits
  const crew = Array.isArray(t?.credits?.crew) ? t.credits.crew : Array.isArray(t?.crew) ? t.crew : [];
  const d = crew.find((x: any) => x?.job === "Director" && x?.name) || crew.find((x: any) => x?.department === "Directing" && x?.name);
  return d?.name ? String(d.name) : "";
}

function pickWriter(t: any) {
  const crew = Array.isArray(t?.credits?.crew) ? t.credits.crew : Array.isArray(t?.crew) ? t.crew : [];
  const w =
    crew.find((x: any) => (x?.job === "Writer" || x?.job === "Screenplay" || x?.job === "Story") && x?.name) ||
    crew.find((x: any) => x?.department === "Writing" && x?.name);
  return w?.name ? String(w.name) : "";
}

export default async function TitlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId ?? "");

  const total = getAllTitles().length;
  const t: any = getTitleById(id);

  if (!t) {
    return (
      <main className="min-h-screen bg-neutral-800 p-4 text-neutral-100">
        <div className="mx-auto max-w-3xl space-y-6">
          <Link href="/" className="text-sm text-neutral-400 underline">
            ← Volver
          </Link>

          <section className="rounded-2xl bg-neutral-700/60 p-5 ring-1 ring-white/5">
            <h1 className="text-xl font-semibold">Título no encontrado</h1>
            <p className="mt-2 text-sm text-neutral-300">Este ID no existe en la base local (todavía).</p>

            <div className="mt-4 rounded-xl bg-neutral-900/40 p-3 text-xs text-neutral-300">
              <div>
                <span className="text-neutral-400">ID recibido:</span>{" "}
                <span className="font-mono">{String(id)}</span>
              </div>
              <div className="mt-1">
                <span className="text-neutral-400">Títulos cargados:</span> {total}
              </div>
            </div>
          </section>

          <footer className="pt-2 text-xs text-neutral-400">
            Indicador informativo. Aquí no se juzga, se informa.
          </footer>
        </div>
      </main>
    );
  }

  const score = typeof t.woke_score === "number" ? t.woke_score : 0;
  const flags = Array.isArray(t.flags) ? (t.flags as string[]) : [];

  const synopsis =
    t.overview_es ||
    t.overview ||
    t.overview_en ||
    "Sin sinopsis disponible.";

  // Tags (si siguen existiendo en tu base)
  const genres = Array.isArray(t.genres) ? (t.genres as string[]) : [];
  const keywords = Array.isArray(t.keywords) ? (t.keywords as string[]) : [];
  const tags = [...genres, ...keywords].filter(Boolean).slice(0, 18);

  const editorialLine =
    "El nivel mide cuánto el mensaje condiciona la obra (tono moral, jerarquía de personajes y sacrificio de coherencia narrativa), incluso sin agenda explícita.";

  const sourceText =
    (t.score_source ?? "auto") === "auto" ? "Cálculo automático" : "Revisado manualmente";

  const company = pickCompany(t);
  const director = pickDirector(t);
  const writer = pickWriter(t);

  return (
    <main className="min-h-screen bg-neutral-800 p-4 text-neutral-100">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link href="/" className="text-sm text-neutral-400 underline">
          ← Volver
        </Link>

        {/* HERO */}
        <section className="relative rounded-3xl bg-neutral-900/25 ring-1 ring-white/5 p-4 md:p-5">
          <BackdropBlur backdrop_path={t.backdrop_path ?? null} title={t.title} />

          <div className="flex items-start gap-4">
            <PosterHero poster_path={t.poster_path ?? null} title={t.title} />

            <div className="space-y-1 min-w-0">
              <h1 className="text-2xl font-semibold">{t.title}</h1>
              <div className="text-sm text-neutral-200/90">
                {t.year} · {t.type === "movie" ? "Película" : "Serie"}
              </div>

              {/* Datos TMDB enriquecidos */}
              {company && <div className="text-sm text-neutral-200/90">Productora: {company}</div>}
              {director && <div className="text-sm text-neutral-200/90">Director: {director}</div>}
              {writer && <div className="text-sm text-neutral-200/90">Guion: {writer}</div>}
            </div>
          </div>
        </section>

        {/* PANEL NIVEL WOKE (animación + encendido) */}
        <WokeLevelPanelClient
          titleId={t.id}
          targetScore={score}
          sourceText={sourceText}
          editorialLine={editorialLine}
          flags={flags}
          tags={tags}
        />

        {/* SINOPSIS (simple, sin useState aquí para no romper Next) */}
        <section className="rounded-2xl bg-neutral-900/30 ring-1 ring-white/5 p-4">
          <h2 className="text-sm font-semibold mb-2 tracking-wide text-neutral-200/90">SINOPSIS</h2>
          <p className="text-sm text-neutral-200 leading-relaxed">{synopsis}</p>
        </section>

        {/* ACLARACIÓN (tu texto editorial al usuario) */}
        <section className="rounded-2xl bg-neutral-900/30 ring-1 ring-white/5 p-4">
          <h2 className="text-sm font-semibold mb-2 tracking-wide text-neutral-200/90">ACLARACIÓN</h2>
          <p className="text-sm text-neutral-200 leading-relaxed">
            {t.notes?.trim() ? t.notes : "Sin aclaración editorial todavía."}
          </p>
        </section>

        {/* PANEL DE REVISIÓN (tu herramienta, con PIN) */}
        <ReviewPanel
          id={t.id}
          initialScore={score}
          initialFlags={flags}
          initialNotes={t.notes ?? ""}
          initialSource={(t.score_source ?? "auto") as any}
        />

        <footer className="pt-2 text-xs text-neutral-400">
          Indicador informativo. Aquí no se juzga, se informa.
        </footer>
      </div>
    </main>
  );
}
