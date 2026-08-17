"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import SectionHeading from "./SectionHeading";

const ABOUT_IMAGES = [
  "/images/about-1.svg",
  "/images/about-2.svg",
  "/images/about-3.svg",
];

const SLIDE_INTERVAL_MS = 4000;

export default function About() {
  const [expanded, setExpanded] = useState(false);
  const [slide, setSlide] = useState(0);
  const sectionRef = useRef<HTMLElement | null>(null);

  // A három kép automatikusan váltakozik (lágy keresztfade-del).
  useEffect(() => {
    const timer = setInterval(() => {
      setSlide((s) => (s + 1) % ABOUT_IMAGES.length);
    }, SLIDE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  // Ha a szekció teljesen kikerült a képernyőről (tovább görgettél),
  // a kibontott szöveg automatikusan becsukódik.
  useEffect(() => {
    if (!expanded) return;
    const onScroll = () => {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        setExpanded(false);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [expanded]);

  return (
    <section
      id="rolam"
      ref={sectionRef}
      className="scroll-mt-20 border-b border-zinc-800/60"
    >
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-24 md:grid-cols-2">
        {/* Automatikusan váltakozó képváltó: a három illusztráció lágy
            átúszással követi egymást, alul kattintható indikátor-pöttyökkel. */}
        <div className="relative aspect-square w-full overflow-hidden">
          {ABOUT_IMAGES.map((src, i) => (
            <Image
              key={src}
              src={src}
              alt=""
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className={`object-cover transition-opacity duration-1000 ease-out ${
                i === slide ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
            {ABOUT_IMAGES.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSlide(i)}
                aria-label={`A Rólam kép ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === slide
                    ? "w-5 bg-amber-500"
                    : "w-1.5 bg-zinc-500/70 hover:bg-zinc-400"
                }`}
              />
            ))}
          </div>
        </div>
        <div>
          <SectionHeading index="03" title="Rólam" />
          <div
            className={`relative mt-8 space-y-5 text-lg leading-8 text-zinc-400 ${
              expanded ? "" : "line-clamp-6 md:line-clamp-9"
            }`}
          >
            <p>
              2024 óta foglalkozom figurafestéssel. A hobbim egy Bambulab P1P
              FDM nyomtatóval indult, de a még magasabb szintű, részletgazdag,
              gyűjtői minőségű szobrok megalkotásához később beszereztem egy
              Elegoo Saturn 4 Ultra gyanta alapú nyomtatót is. A digitális
              modellek kézzelfogható műalkotássá formálása adja számomra azt az
              alkotói szabadságot, amiért teljesen beleszerettem ebbe a
              folyamatba.
            </p>
            <p>
              Magamnak festem azokat a modelleket, amelyek igazán tetszenek —
              minden darab úgy készül, ahogy otthon, a polcomon is szívesen
              látnám. Az elkészült szobrok egy darabig nálam díszelgenek, de
              sajnos a hely szűkös: így a kedvenceimnek is új otthont kell
              keresnem, ezért kerülnek eladásra.
            </p>
            <p>
              A figurák életre keltése igazi szenvedély számomra, ahol a
              legapróbb részletek finomhangolása hozza el a végső varázst.
              Munkáim során ötvözöm az airbrush adta lágy átmeneteket és a
              precíz ecsetkezelést: az alapszínek és árnyékok felvitelénél egy
              Harder &amp; Steenbeck Infinity 2024 CRplus fújópisztoly segít, míg a
              részletek kidolgozásához több mint 200 darabos The Army Painter
              Warpaints Fanatic prémium készletemet, valamint a Vallejo
              minőségi festékeit hívom segítségül. Legfőbb inspirációm a
              fantáziavilágok karakterei, valamint az a folyamat, ahogyan egy
              nyers, szürke műanyagból vagy gyantából egy egyedi, élettel teli
              gyűjtői darab válik.
            </p>
            {!expanded && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-zinc-950 to-transparent"
              />
            )}
          </div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-amber-500 transition-colors hover:text-amber-400"
          >
            {expanded ? "Bezárás" : "Bővebben"}
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-300 ${
                expanded ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
      </div>
    </section>
  );
}
