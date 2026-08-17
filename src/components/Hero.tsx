import Image from "next/image";

export default function Hero() {
  return (
    <section className="overflow-hidden border-b border-zinc-800/60 bg-[radial-gradient(ellipse_at_top,rgba(217,119,6,0.08),transparent_60%)]">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-28">
        <div>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Kézzel festett 3D nyomtatott szobrok{" "}
            <span className="bg-gradient-to-r from-amber-500 to-amber-700 bg-clip-text text-transparent">
              & gyűjtői figurák
            </span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-zinc-400">
            Szenvedéllyel megálmodott, egyedileg nyomtatott és részletgazdagon
            megfestett alkotások gyűjtőknek és rajongóknak.
          </p>
        </div>
        <div className="group relative">
          {/* Puha borostyán fény a kép mögött */}
          <div
            aria-hidden="true"
            className="absolute -inset-12 rounded-full bg-amber-600/10 blur-3xl transition-colors duration-700 group-hover:bg-amber-500/25"
          />
          {/* A kép élei fokozatosan elmosódnak a háttérbe (radial maszk) */}
          <div
            className="relative transition-all duration-700 ease-out group-hover:-translate-y-1 group-hover:scale-[1.02] group-hover:[filter:drop-shadow(0_0_28px_rgba(217,119,6,0.35))]"
            style={{
              WebkitMaskImage:
                "radial-gradient(ellipse 95% 90% at 50% 50%, black 55%, transparent 100%)",
              maskImage:
                "radial-gradient(ellipse 95% 90% at 50% 50%, black 55%, transparent 100%)",
            }}
          >
            <Image
              src="/images/workshop.svg"
              alt="A műhely — airbrush festés közben, forgótányéron álló T-Rex szoborral"
              width={600}
              height={327}
              priority
              className="h-auto w-full"
            />
            {/* Finom sötétítés a kép tetején és alján */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-zinc-950/40 to-transparent"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-zinc-950/50 to-transparent"
            />
          </div>
          {/* Képaláírás */}
          <span className="absolute bottom-4 left-4 rounded-full border border-zinc-700/80 bg-zinc-950/70 px-3 py-1 text-[11px] text-zinc-300 backdrop-blur-sm">
            A műhely — festés közben
          </span>
        </div>
      </div>
    </section>
  );
}
