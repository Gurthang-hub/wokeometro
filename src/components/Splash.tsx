"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type Props = {
  children: React.ReactNode;
  textMs?: number;  // tiempo mostrando "Wokeómetro"
  totalMs?: number; // tiempo total antes de quitar splash
};

export default function SplashGate({ children, textMs = 700, totalMs = 1600 }: Props) {
  const [phase, setPhase] = useState<"text" | "logo" | "done">("text");

  useEffect(() => {
    const t1 = window.setTimeout(() => setPhase("logo"), textMs);
    const t2 = window.setTimeout(() => setPhase("done"), totalMs);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [textMs, totalMs]);

  return (
    <>
      {children}

      {phase !== "done" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900">
          <div className="text-center select-none">
            {/* TEXTO */}
            <h1
              className={[
                "relative text-4xl font-semibold tracking-tight text-neutral-200",
                phase === "text" ? "opacity-100" : "opacity-0",
                "transition-opacity duration-200",
              ].join(" ")}
            >
              <span className="relative z-10">Wokeómetro</span>

              {/* ola animada */}
              <span className="absolute inset-0 overflow-hidden rounded-md">
                <span className="block h-full w-full animate-wave bg-gradient-to-r from-emerald-400 via-emerald-200 to-emerald-400 opacity-60" />
              </span>
            </h1>

            {/* LOGO Wo */}
            <div
              className={[
                "mt-0 flex items-center justify-center",
                phase === "logo" ? "opacity-100" : "opacity-0",
                "transition-opacity duration-200",
              ].join(" ")}
            >
              <div className="h-28 w-28 rounded-2xl bg-neutral-800 flex items-center justify-center shadow-lg ring-1 ring-white/10 animate-scale-in">
                <Image src="/logo-wo.png" alt="Wo" width={96} height={96} priority />
              </div>
            </div>

            {/* Subtítulo (siempre, pero suave) */}
            <p
              className={[
                "mt-3 text-sm text-neutral-400",
                phase === "text" ? "opacity-100" : "opacity-70",
                "transition-opacity duration-200",
              ].join(" ")}
            >
              Aquí no se juzga. Se informa.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
