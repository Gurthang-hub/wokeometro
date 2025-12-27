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

  // score auto en base a pesos de flags (si tus flags no tienen weight, será 0)
  const computedScore = useMemo(() => {
    const total = selectedFlags.reduce((acc, fid) => {
      const def: any = (WOKE_FLAGS as any[]).find((x) => x?.id === fid);
      return acc + getFlagWeight(def);
    }, 0);

    // Normaliza a 0..10 (aquí redondeo, ajusta si quieres curva distinta)
    const s = Math.max(0, Math.min(10, Math.round(total)));
    return s;
  }, [selectedFlags]);

  const scoreToShow = useMemo(() => {
    // Si venía manual, respetamos ese score inicial; si no, usamos computed
    if (initialSource === "manual") {
      const n = Number(initialScore);
      return Math.max(0, Math.min(10, Number.isFinite(n) ? n : 0));
    }
    return computedScore;
  }, [initialSource, initialScore, computedScore]);

  function toggleFlag(flagId: WokeFlagId) {
    setSelectedFlags((prev) => {
      const has = prev.includes(flagId);
      return has ? prev.filter((x) => x !== flagId) : [...prev, flagId];
    });
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
          score_source: "manual", // al guardar, pasa a "revisado"
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
            Marca flags y añade notas. (Requiere PIN para guardar)
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
                    {desc ? (
                      <div className="text-xs text-neutral-300">{desc}</div>
                    ) : null}
                  </div>
                </label>
              );
            })}
          </div>

          {/* score calculado */}
          <div className="text-sm text-neutral-200">
            Score calculado: <span className="font-semibold">{scoreToShow}/10</span>
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
