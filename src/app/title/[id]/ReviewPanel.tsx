"use client";

import { useMemo, useState } from "react";
import { WOKE_FLAGS, type WokeFlagId } from "@/lib/wokeFlags";

type Status =
  | { type: "idle"; msg: "" }
  | { type: "ok"; msg: string }
  | { type: "err"; msg: string };

type Props = {
  id?: string;

  // valores iniciales (pueden venir vacíos)
  initialScore?: number;
  initialFlags?: string[];
  initialNotes?: string;
  initialSource?: "auto" | "manual";
};

// Helpers "a prueba de balas" para no depender de campos exactos en WOKE_FLAGS
function getFlagLabel(f: any): string {
  return (
    (typeof f?.label === "string" && f.label) ||
    (typeof f?.name === "string" && f.name) ||
    (typeof f?.title === "string" && f.title) ||
    String(f?.id ?? "Flag")
  );
}

function getFlagDesc(f: any): string {
  return (
    (typeof f?.desc === "string" && f.desc) ||
    (typeof f?.hint === "string" && f.hint) ||
    (typeof f?.description === "string" && f.description) ||
    (typeof f?.subtitle === "string" && f.subtitle) ||
    ""
  );
}

function getFlagWeight(f: any): number {
  const w = Number(f?.weight);
  return Number.isFinite(w) ? w : 0;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function ReviewPanel({
  id,
  initialScore = 0,
  initialFlags = [],
  initialNotes = "",
  initialSource = "auto",
}: Props) {
  const safeId = (typeof id === "string" ? id : "").trim();

  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<Status>({ type: "idle", msg: "" });

  const [selectedFlags, setSelectedFlags] = useState<WokeFlagId[]>(
    (Array.isArray(initialFlags) ? (initialFlags as WokeFlagId[]) : []) ?? []
  );
  const [notes, setNotes] = useState<string>(initialNotes ?? "");

  // ✅ nuevo: modo score
  const [scoreMode, setScoreMode] = useState<"auto" | "manual">(
    initialSource === "manual" ? "manual" : "auto"
  );

  // ✅ nuevo: score manual editable (slider/stepper)
  const [manualScore, setManualScore] = useState<number>(() => {
    const n = Number(initialScore);
    return clamp(Number.isFinite(n) ? n : 0, 0, 10);
  });

  // score auto en base a pesos de flags
  const computedScore = useMemo(() => {
    const total = selectedFlags.reduce((acc, fid) => {
      const def: any = (WOKE_FLAGS as any[]).find((x) => x?.id === fid);
      return acc + getFlagWeight(def);
    }, 0);

    const s = clamp(Math.round(total), 0, 10);
    return s;
  }, [selectedFlags]);

  const scoreToShow = useMemo(() => {
    return scoreMode === "manual"
      ? clamp(manualScore, 0, 10)
      : clamp(computedScore, 0, 10);
  }, [scoreMode, manualScore, computedScore]);

  function toggleFlag(flagId: WokeFlagId) {
    setSelectedFlags((prev) => {
      const has = prev.includes(flagId);
      return has ? prev.filter((x) => x !== flagId) : [...prev, flagId];
    });
    setStatus({ type: "idle", msg: "" });
  }

  function bumpScore(delta: number) {
    setManualScore((s) => clamp(Math.round((s + delta) * 10) / 10, 0, 10));
    setStatus({ type: "idle", msg: "" });
  }

  async function saveReview() {
    if (!safeId) {
      setStatus({ type: "err", msg: "Falta id: no puedo guardar esta ficha." });
      return;
    }

    setSaving(true);
    setStatus({ type: "idle", msg: "" });

    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: safeId,
          flags: selectedFlags,
          notes: notes ?? "",
          woke_score: scoreToShow,
          score_source: scoreMode, // ✅ auto/manual según tu elección
          pin: pin ?? "",
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          typeof data?.error === "string"
            ? data.error
            : "No se pudo guardar (error desconocido).";
        setStatus({ type: "err", msg });
        setSaving(false);
        return;
      }

      setStatus({ type: "ok", msg: "Guardado. Marcado como Revisado." });
      setSaving(false);
      setOpen(false);
    } catch (e: any) {
      setStatus({ type: "err", msg: e?.message ?? "Error de red al guardar." });
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl bg-neutral-700/60 ring-1 ring-white/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Revisión editorial</div>
          <div className="text-xs text-neutral-300">
            Marca flags, ajusta el score (Auto o Manual) y añade notas. (PIN para guardar)
          </div>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-xl bg-neutral-900/60 border border-neutral-600 px-4 py-2 text-sm hover:bg-neutral-900/80 transition"
        >
          {open ? "Cerrar" : "Abrir"}
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-4">
          {/* ✅ Score mode + score control */}
          <div className="rounded-2xl border border-neutral-600 bg-neutral-900/25 p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">Score</div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setScoreMode("auto")}
                  className={`rounded-lg border px-3 py-1 text-xs transition ${
                    scoreMode === "auto"
                      ? "border-emerald-300/40 bg-emerald-500/10 text-emerald-100"
                      : "border-neutral-600 bg-neutral-900/40 text-neutral-200 hover:bg-neutral-900/60"
                  }`}
                >
                  Auto
                </button>
                <button
                  onClick={() => setScoreMode("manual")}
                  className={`rounded-lg border px-3 py-1 text-xs transition ${
                    scoreMode === "manual"
                      ? "border-amber-300/40 bg-amber-500/10 text-amber-100"
                      : "border-neutral-600 bg-neutral-900/40 text-neutral-200 hover:bg-neutral-900/60"
                  }`}
                >
                  Manual
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-neutral-300">
                {scoreMode === "auto"
                  ? "Auto = se calcula según flags (si tus flags no tienen peso, quedará bajo)."
                  : "Manual = tú decides el número, con o sin flags."}
              </div>
              <div className="text-sm text-neutral-100">
                <span className="font-semibold">{scoreToShow.toFixed(1)}</span>/10
              </div>
            </div>

            {/* Controles manuales */}
            <div className={`${scoreMode === "manual" ? "" : "opacity-40 pointer-events-none"} space-y-2`}>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => bumpScore(-0.5)}
                  className="rounded-lg border border-neutral-600 bg-neutral-900/40 px-3 py-2 text-xs hover:bg-neutral-900/60 transition"
                >
                  −0.5
                </button>

                <input
                  type="range"
                  min={0}
                  max={10}
                  step={0.5}
                  value={manualScore}
                  onChange={(e) => setManualScore(Number(e.target.value))}
                  className="w-full"
                />

                <button
                  onClick={() => bumpScore(+0.5)}
                  className="rounded-lg border border-neutral-600 bg-neutral-900/40 px-3 py-2 text-xs hover:bg-neutral-900/60 transition"
                >
                  +0.5
                </button>

                <input
                  type="number"
                  min={0}
                  max={10}
                  step={0.5}
                  value={manualScore}
                  onChange={(e) => setManualScore(clamp(Number(e.target.value || 0), 0, 10))}
                  className="w-20 rounded-lg bg-neutral-900/70 border border-neutral-600 px-2 py-2 text-xs outline-none"
                />
              </div>

              <div className="text-[11px] text-neutral-400">
                Consejo: usa Manual cuando “se nota” pero no quieres forzar flags.
              </div>
            </div>
          </div>

          {/* listado de flags */}
          <div className="grid gap-3">
            {(WOKE_FLAGS as any[]).map((f) => {
              const id = f?.id as WokeFlagId;
              const checked = selectedFlags.includes(id);
              const label = getFlagLabel(f);
              const desc = getFlagDesc(f);

              return (
                <label
                  key={String(f?.id ?? label)}
                  className="flex items-start gap-3 rounded-xl border border-neutral-600 bg-neutral-900/30 p-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleFlag(id)}
                    className="mt-1"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{label}</div>
                    {desc ? <div className="text-xs text-neutral-300">{desc}</div> : null}
                  </div>
                </label>
              );
            })}
          </div>

          {/* pin + notas */}
          <div className="grid gap-3">
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="PIN"
              className="w-full rounded-xl bg-neutral-900/70 border border-neutral-600 px-4 py-3 outline-none focus:ring-2 focus:ring-white/10"
            />

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas editoriales (opcional)"
              rows={4}
              className="w-full rounded-xl bg-neutral-900/70 border border-neutral-600 px-4 py-3 outline-none focus:ring-2 focus:ring-white/10"
            />
          </div>

          {/* guardar */}
          <div className="flex items-center gap-3">
            <button
              onClick={saveReview}
              disabled={saving}
              className="rounded-xl bg-neutral-900/60 border border-neutral-600 px-4 py-2 text-sm hover:bg-neutral-900/80 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {saving ? "Guardando..." : "Guardar revisión"}
            </button>

            {!safeId && (
              <div className="text-xs text-amber-200">Falta id (no se puede guardar).</div>
            )}

            {status.type !== "idle" && (
              <div
                className={`text-xs ${
                  status.type === "ok" ? "text-emerald-200" : "text-red-200"
                }`}
              >
                {status.msg}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
