import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Ticket } from "lucide-react";
import AdminCoupons from "@/components/admin/AdminCoupons";

export const metadata: Metadata = {
  title: "Kuponok",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AdminCouponsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800/60 bg-[radial-gradient(ellipse_at_top,rgba(217,119,6,0.08),transparent_60%)]">
        <div className="mx-auto max-w-4xl px-6 py-10">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-amber-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Vissza az adminhoz
          </Link>
          <h1 className="mt-4 flex items-center gap-3 text-3xl font-semibold tracking-tight">
            <Ticket className="h-7 w-7 text-amber-500" />
            Kuponok
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
            Több kupont is létrehozhatsz, és tetszés szerint kapcsolgathatod őket.
            Az akciós oldalon a feloldáskor a rendszer véletlenszerűen ad egy
            <span className="text-amber-500"> aktív</span> kupont a látogatónak.
            Inaktív kódot a rendszer nem oszt ki, de a már kiadott (régebben
            feloldott) kuponok továbbra is érvényesek maradnak.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <AdminCoupons />
      </main>
    </div>
  );
}
