import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

const DB_PATH = path.join(process.cwd(), "src", "data", "wokeometro_base.json");
const BACKUP_DIR = path.join(process.cwd(), "src", "data", "backups");

type TitleType = "movie" | "series";
type WokeTitle = {
  id: string;
  type: TitleType;
  title: string;
  year: number;
  woke_score: number;
  flags: string[];
  notes?: string;
  score_source?: "auto" | "manual";
  reviewed_at?: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function asStringArray(v: unknown, limit = 30): string[] {
  if (!Array.isArray(v)) return [];
  const arr = v
    .map((x) => String(x ?? "").trim())
    .filter(Boolean)
    .slice(0, limit);
  return Array.from(new Set(arr));
}

function safeString(v: unknown, max = 2000): string {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, max);
}

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function tsFilename() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    "_" +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

function readDB(): WokeTitle[] {
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("DB inválida: no es un array");
  return parsed as WokeTitle[];
}

function writeDBAtomic(list: WokeTitle[]) {
  // Backup ANTES de escribir (esto te salva la vida)
  ensureDir(BACKUP_DIR);
  const backupPath = path.join(BACKUP_DIR, `wokeometro_base_${tsFilename()}.json`);
  fs.copyFileSync(DB_PATH, backupPath);

  // Escritura atómica: escribe a .tmp y luego renombra
  const tmpPath = DB_PATH + ".tmp";
  fs.writeFileSync(tmpPath, JSON.stringify(list, null, 2), "utf-8");
  fs.renameSync(tmpPath, DB_PATH);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const id = String((body as any)?.id ?? "").trim();
    if (!id) {
      return NextResponse.json({ ok: false, error: "Falta id" }, { status: 400 });
    }

    const woke_score_raw = Number((body as any)?.woke_score);
    const flags_raw = (body as any)?.flags;
    const notes_raw = (body as any)?.notes;

    const list = readDB();
    const idx = list.findIndex((t) => t.id === id);
    if (idx === -1) {
      return NextResponse.json({ ok: false, error: "No encontrado" }, { status: 404 });
    }

    // Score: si no viene válido, NO lo cambiamos
    const nextScore = Number.isFinite(woke_score_raw)
      ? clamp(woke_score_raw, 0, 10)
      : list[idx].woke_score;

    // Flags: si no viene array, NO lo cambiamos (si viene, puede ser [])
    const nextFlags = Array.isArray(flags_raw)
      ? asStringArray(flags_raw, 30)
      : (Array.isArray(list[idx].flags) ? list[idx].flags : []);

    // Notes: opcional
    const nextNotes =
      typeof notes_raw === "string"
        ? safeString(notes_raw, 2000)
        : (typeof list[idx].notes === "string" ? list[idx].notes! : "");

    // BLINDAJE: una vez manual, siempre manual (nunca volver a auto)
    // y reviewed_at siempre se establece/actualiza al guardar
    list[idx] = {
      ...list[idx],
      woke_score: nextScore,
      flags: nextFlags,
      notes: nextNotes,
      score_source: "manual",
      reviewed_at: new Date().toISOString(),
    };

    writeDBAtomic(list);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Error desconocido" },
      { status: 500 }
    );
  }
}
