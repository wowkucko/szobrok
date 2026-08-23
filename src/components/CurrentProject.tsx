/* eslint-disable @next/next/no-img-element */
import { getCurrentProject } from "@/lib/db";
import { cardThumbUrlFor } from "@/lib/imageUrls";

export default async function CurrentProject() {
  const project = getCurrentProject();
  if (!project) return null;

  const pct = Math.max(0, Math.min(100, Math.round(project.progress)));

  return (
    <section className="scroll-mt-20 border-b border-zinc-800/60">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">
          Jelenleg készül
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
          Egy ízelítő a műhelyben zajló munkából — így áll most a legfrissebb
          alkotás.
        </p>

        <div className="mt-8 flex flex-col gap-8 sm:flex-row sm:items-center">
          {/* Termékkártya méretű kép */}
          <div className="w-full shrink-0 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 sm:w-72">
            {project.image ? (
              <img
                src={cardThumbUrlFor(project.image)}
                alt={project.title}
                className="aspect-[4/5] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[4/5] w-full items-center justify-center text-sm text-zinc-600">
                Nincs kép megadva
              </div>
            )}
          </div>

          <div className="flex-1">
            <h3 className="text-xl font-semibold tracking-tight text-zinc-100">
              {project.title}
            </h3>
            {project.description && (
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-zinc-300">
                {project.description}
              </p>
            )}
            <div className="mt-6 max-w-md">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Készültség</span>
                <span className="font-semibold text-amber-400">{pct}%</span>
              </div>
              <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
