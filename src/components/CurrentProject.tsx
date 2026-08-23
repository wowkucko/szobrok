/* eslint-disable @next/next/no-img-element */
import { getCurrentProject } from "@/lib/db";
import { cardThumbUrlFor } from "@/lib/imageUrls";

export default async function CurrentProject() {
  const project = getCurrentProject();
  if (!project) return null;

  const pct = Math.max(0, Math.min(100, Math.round(project.progress)));
  const updated = new Date(project.updatedAt);
  const updatedLabel = `${updated.getFullYear()}. ${String(
    updated.getMonth() + 1
  ).padStart(2, "0")}. ${String(updated.getDate()).padStart(2, "0")}.`;

  return (
    <section className="scroll-mt-20 border-b border-zinc-800/60">
      <div className="mx-auto max-w-3xl px-6 py-16">
        {/* Címzóna: középre igazítva */}
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
            </span>
            Jelenleg készül
          </span>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-400">
            Egy ízelítő a műhelyben zajló munkából — így áll most a legfrissebb
            alkotás.
          </p>
        </div>

        {/* Középre rendezett oszlop: keretezett kártya + szöveg */}
        <div className="mt-10 flex flex-col items-center gap-8">
          <div className="group relative w-full max-w-xs overflow-hidden rounded-[1.4rem] border border-zinc-700/70 bg-gradient-to-b from-zinc-800/40 to-zinc-900/60 p-2 shadow-xl shadow-black/40 ring-1 ring-white/5">
            <div className="overflow-hidden rounded-[1.1rem]">
              {project.image ? (
                <img
                  src={cardThumbUrlFor(project.image)}
                  alt={project.title}
                  className="aspect-[4/5] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
              ) : (
                <div className="flex aspect-[4/5] w-full items-center justify-center text-sm text-zinc-600">
                  Nincs kép megadva
                </div>
              )}
            </div>
            <span className="absolute left-4 top-4 rounded-full bg-zinc-950/80 px-3 py-1 text-xs font-semibold text-amber-400 backdrop-blur-sm">
              Folyamatban
            </span>
          </div>

          <div className="w-full max-w-xl text-center">
            <h3 className="text-xl font-semibold tracking-tight text-zinc-100 sm:text-2xl">
              {project.title}
            </h3>
            {project.description && (
              <p className="mx-auto mt-3 max-w-md whitespace-pre-line text-sm leading-7 text-zinc-300">
                {project.description}
              </p>
            )}

            <div className="mx-auto mt-7 max-w-md text-left">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Készültség</span>
                <span className="font-semibold text-amber-500">{pct}%</span>
              </div>
              <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-3 text-xs text-zinc-500">
                Utoljára frissítve: {updatedLabel}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
