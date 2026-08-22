import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Gift, Users } from "lucide-react";
import ReferralPromo from "@/components/ReferralPromo";
import {
  getMaxActiveCouponDiscount,
  REFERRAL_MIN_CLICKS,
} from "@/lib/db";

export const metadata: Metadata = {
  title: "Oszd meg és kapj kedvezményt",
  description:
    "Készíts egyedi megosztó linket, oszd meg Facebookon, és 5 kattintás után feloldasz egy kedvezményes kuponkódot — regisztráció nélkül.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/akcio" },
};

// A kedvezmény mértéke az adminban kezelt kuponoktól függ, ezért minden
// kérésnél frissen olvassuk a DB-t (ne fagyasszuk be a build idejére).
export const dynamic = "force-dynamic";

export default function AkcioPage() {
  const maxDiscount = getMaxActiveCouponDiscount();
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="relative overflow-hidden">
        {/* Háttér dekoráció */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(217,119,6,0.12),transparent_55%)]" />
        <div className="pointer-events-none absolute -right-32 top-10 h-72 w-72 rounded-full bg-amber-600/10 blur-3xl" />

        <div className="relative mx-auto max-w-3xl px-6 py-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-amber-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Vissza a főoldalra
          </Link>

          <div className="mt-10 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-600/30 bg-amber-600/10 px-4 py-1.5 text-xs font-medium text-amber-500">
              <Gift className="h-3.5 w-3.5" />
              Limitált akció
            </span>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
              Oszd meg, és kapj{" "}
              <span className="text-amber-500">{maxDiscount}% kedvezményt</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-zinc-400">
              Készíts egy saját megosztó linket, posztold Facebookon — ha{" "}
              <span className="font-medium text-zinc-200">
                {REFERRAL_MIN_CLICKS} ember
              </span>{" "}
              rákattint, azonnal megkapod a kedvezményes kuponkódot. Semmilyen
              regisztráció nem kell hozzá.
            </p>
          </div>

          <div className="mt-10">
            <ReferralPromo minClicks={REFERRAL_MIN_CLICKS} />
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Feature
              icon={<Users className="h-5 w-5 text-amber-500" />}
              title="Valódi elérés"
              text="A kupon csak akkor nyílik meg, ha tényleg kattintanak a linkre — nem a saját gépeden."
            />
            <Feature
              icon={<Gift className="h-5 w-5 text-amber-500" />}
              title="Azonnali jutalom"
              text="A 3. lépésnél rögtön látod a kódot, amit a megrendelésnél beírsz."
            />
            <Feature
              icon={<ArrowLeft className="h-5 w-5 text-amber-500" />}
              title="Fiók nélkül"
              text="Nincs regisztráció, nincs jelszó. Egy kattintás, és kész a linked."
            />
          </div>

          <p className="mt-10 text-center text-xs leading-5 text-zinc-600">
            Kérdésed van? Írj a{" "}
            <Link
              href="/#kapcsolat"
              className="text-zinc-500 underline-offset-2 hover:text-amber-500 hover:underline"
            >
              kapcsolatfelvételi űrlapon
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950">
        {icon}
      </div>
      <h3 className="mt-4 text-sm font-semibold text-zinc-200">{title}</h3>
      <p className="mt-1.5 text-xs leading-5 text-zinc-500">{text}</p>
    </div>
  );
}
