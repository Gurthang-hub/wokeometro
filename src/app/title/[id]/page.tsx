import Link from "next/link";
import Image from "next/image";
import Flags from "@/components/Flags";
import ReviewPanel from "./ReviewPanel";
import { getAllTitles, getTitleById } from "@/lib/data";

function scoreBucket(score: number) {
  if (score >= 6) return { label: "Alto", hint: "Carga ideológica explícita" };
  if (score >= 3) return { label: "Mixto", hint: "Presencia moderada o contextual" };
  return { label: "Bajo", hint: "Baja carga ideológica" };
}

function MiniBar({ score }: { score: number }) {
  const s = Math.max(0, Math.min(10, score));
  const pct = (s / 10) * 100;

  return (
    <div className="relative w-28">
      <div
        className="absolute -top-2 w-0 h-0 border-x-[6px] border-x-transparent border-b-[10px] border-b-neutral-100/80"
        style={{ left: `calc(${pct}% - 6px)` }}
      />
      <div className="h-2 w-full overflow-hidden rounded-full border border-neutral-500 flex">
        <div className="w-1/3 bg-emerald-400" />
        <div className="w-1/3 bg-amber-400" />
        <div className="w-1/3 bg-red-400" />
      </div>
    </div>
  );
}

function scorePillStyles(score: number) {
  if (score >= 6) return "border-red-300/40 bg-red-500/10 text-red-100";
  if (score >= 3) return "border-amber-300/40 bg-amber-500/10 text-amber-100";
  return "border-emerald-300/40 bg-emerald-500/10 text-emerald-100";
}

function TagChips({ items }: { items: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.slice(0, 14).map((x) => (
        <span
          key={x}
          className="rounded-lg border border-neutral-600 bg-neutral-900/40 px-2 py-1 text-[11px] text-neutral-200"
        >
          {x}
        </span>
      ))}
    </div>
  );
}

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

          <section className="rounded-2xl bg-neutral-700/60 p-5">
            <h1 className="text-xl font-semibold">Título no encontrado</h1>
            <p className="mt-2 text-sm text-neutral-300">
              Este ID no existe en la base local (todavía).
            </p>

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

  const bucket = scoreBucket(t.woke_score);
  const flags = t.flags ?? [];
  const synopsis = t.overview_es || t.overview || t.overview_en || "Sin sinopsis disponible.";

  const genres = Array.isArray(t.genres) ? (t.genres as string[]) : [];
  const keywords = Array.isArray(t.keywords) ? (t.keywords as string[]) : [];
  const tags = [...genres, ...keywords].filter(Boolean);

  const backdrop_path = t.backdrop_path ?? null;

  return (
    <main className="min-h-screen bg-neutral-800 p-4 text-neutral-100">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link href="/" className="text-sm text-neutral-400 underline">
          ← Volver
        </Link>

        {/* HERO con backdrop difuminado */}
        <section className="relative rounded-3xl bg-neutral-700/40 ring-1 ring-white/5 p-4 md:p-5">
          <BackdropBlur backdrop_path={backdrop_path} title={t.title} />

          <div className="flex items-start gap-4">
            <PosterHero poster_path={t.poster_path ?? null} title={t.title} />

            <div className="space-y-1 min-w-0">
              <h1 className="text-2xl font-semibold">{t.title}</h1>
              <div className="text-sm text-neutral-200/90">
                {t.year} · {t.type === "movie" ? "Película" : "Serie"}
              </div>
            </div>
          </div>
        </section>

        {/* Indicador */}
        <section className="rounded-2xl bg-neutral-700/60 p-4 space-y-3 ring-1 ring-white/5">
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-neutral-300">Wokeómetro</div>

            <div className="flex items-center gap-3">
              <MiniBar score={t.woke_score} />
              <div className={`rounded-xl border px-3 py-2 text-xs text-center ${scorePillStyles(t.woke_score)}`}>
                <div className="font-semibold">{t.woke_score.toFixed(1)}/10</div>
                <div className="text-[11px] text-neutral-200/90">
                  {bucket.label} · {(t.score_source ?? "auto") === "auto" ? "Auto" : "Revisado"}
                </div>
              </div>
            </div>
          </div>

          {flags.length > 0 ? (
            <Flags flags={flags} />
          ) : (
            <div className="text-xs text-neutral-400">Sin indicadores marcados.</div>
          )}
        </section>

        {/* Sinopsis */}
        <section className="rounded-2xl bg-neutral-700/60 p-4 ring-1 ring-white/5">
          <h2 className="text-sm font-semibold mb-2">Sinopsis</h2>
          <p className="text-sm text-neutral-200 leading-relaxed">{synopsis}</p>
        </section>

        {/* Tags debajo de sinopsis */}
        {tags.length > 0 && (
          <section className="rounded-2xl bg-neutral-700/60 p-4 ring-1 ring-white/5">
            <h2 className="text-sm font-semibold mb-2">Temas y etiquetas</h2>
            <TagChips items={tags} />
          </section>
        )}

        {/* Revisión editorial */}
        <section className="rounded-2xl bg-neutral-700/60 p-4 ring-1 ring-white/5">
          <h2 className="text-sm font-semibold mb-2">Revisión editorial</h2>
          <p className="text-xs text-neutral-300">
            {t.notes?.trim() ? t.notes : "Sin notas editoriales."}
          </p>
        </section>

        <ReviewPanel title id={t.id} />

        <footer className="pt-2 text-xs text-neutral-400">
          Indicador informativo. Aquí no se juzga, se informa.
        </footer>
      </div>
    </main>
  );
}
