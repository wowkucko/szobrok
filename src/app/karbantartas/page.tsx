import type { Metadata } from "next";
import { Wrench } from "lucide-react";
import { readMaintenance } from "@/lib/maintenance";

// A karbantartás oldalt ne indexelje a Google — a látogatók itt csak a
// tájékoztató szöveget látják.
export const metadata: Metadata = {
  title: "Karbantartás",
  robots: { index: false, follow: false },
};

// Mindig az aktuális adatbázis-állapot szerinti szöveg jelenjen meg.
export const dynamic = "force-dynamic";

export default async function KarbantartasPage() {
  const { message } = readMaintenance();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 text-center text-zinc-100">
      <div className="w-full max-w-lg">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-600/40 bg-amber-600/10">
          <Wrench className="h-8 w-8 text-amber-500" aria-hidden />
        </div>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">
          Karbantartás
        </h1>
        <p className="mt-4 whitespace-pre-line text-base leading-7 text-zinc-400">
          {message}
        </p>
        <div className="mt-10 flex items-center justify-center gap-2 text-xs text-zinc-600">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
          Az oldal jelenleg fejlesztés alatt áll
        </div>
      </div>
    </main>
  );
}
