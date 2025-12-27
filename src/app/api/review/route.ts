import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

const ADMIN_PIN = process.env.ADMIN_PIN || "";

const DB_PATH = path.join(process.cwd(), "src", "data", "wokeometro_base.json");

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
};

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { id, woke_score, flags, notes, pin } = body as {
      id: string;
      woke_score: number;
      flags: string[];
      notes: string;
      pin: string;
    };

    if (!ADMIN_PIN) {
      return NextResponse.json(
        { ok: false, error: "ADMIN_PIN no configurado en .env.local" },
        { status: 500 }
      );
    }

    if (!pin || pin !== ADMIN_PIN) {
      return NextResponse.json({ ok: false, error: "PIN incorrecto" }, { status: 401 });
    }

    if (!id) {
      return NextResponse.json({ ok: false, error: "Falta id" }, { status: 400 });
    }

    // Lee el JSON desde disco (IMPORTANTE: no usamos import estático aquí)
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    const list = JSON.parse(raw) as WokeTitle[];

    const idx = list.findIndex((t) => t.id === id);
    if (idx === -1) {
      return NextResponse.json({ ok: false, error: "No encontrado" }, { status: 404 });
    }

    // Sanitiza datos
    const nextScore =
      typeof woke_score === "number" && !Number.isNaN(woke_score)
        ? Math.max(0, Math.min(10, woke_score))
        : list[idx].woke_score;

    const nextFlags = Array.isArray(flags)
      ? flags.map((s) => String(s).trim()).filter(Boolean).slice(0, 30)
      : list[idx].flags;

    const nextNotes = typeof notes === "string" ? notes.trim().slice(0, 2000) : list[idx].notes;

    list[idx] = {
      ...list[idx],
      woke_score: nextScore,
      flags: nextFlags,
      notes: nextNotes,
      score_source: "manual",
    };

    fs.writeFileSync(DB_PATH, JSON.stringify(list, null, 2), "utf-8");

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Error desconocido" },
      { status: 500 }
    );
  }
}
