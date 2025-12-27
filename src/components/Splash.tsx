"use client";

export default function Splash() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-800">
      <div className="text-center select-none">
        <h1 className="relative text-4xl font-semibold tracking-tight text-neutral-200">
          <span className="relative z-10">Wokeómetro</span>

          {/* Ola animada */}
          <span className="absolute inset-0 overflow-hidden">
            <span className="block h-full w-full animate-wave bg-gradient-to-r from-emerald-400 via-emerald-200 to-emerald-400 opacity-60" />
          </span>
        </h1>

        <p className="mt-3 text-sm text-neutral-400">
          Aquí no se juzga. Se informa.
        </p>
      </div>
    </div>
  );
}
