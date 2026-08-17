import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SITE_NAME } from "@/lib/data";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-6 py-24">
        <div className="w-full max-w-md text-center">
          <p className="text-sm font-medium tracking-widest text-amber-500">
            404
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            Ez az alkotás nem található
          </h1>
          <p className="mt-4 text-base leading-7 text-zinc-400">
            A keresett oldal nem létezik, vagy a darab már nem szerepel a
            kínálatunkban. Visszatérsz a galériához?
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/portfolio"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-amber-600 px-6 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-500"
            >
              Megvásárolható alkotások
            </Link>
            <Link
              href="/"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-zinc-700 px-6 text-sm font-medium text-zinc-200 transition-colors hover:border-amber-600 hover:text-amber-500"
            >
              Vissza a főoldalra
            </Link>
          </div>
          <p className="mt-8 text-xs text-zinc-600">
            {SITE_NAME} — kézzel festett, 3D nyomtatott szobrok
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
