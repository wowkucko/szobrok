import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import ProductForm from "@/components/admin/ProductForm";
import { getCategoryOptions, getTagOptions } from "@/lib/db";

export const metadata: Metadata = {
  title: "Új termék",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function NewProductPage() {
  const tagOptions = getTagOptions();
  const categoryOptions = getCategoryOptions();
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800/60 bg-[radial-gradient(ellipse_at_top,rgba(217,119,6,0.08),transparent_60%)]">
        <div className="mx-auto max-w-4xl px-6 py-8">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-amber-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Vissza a termékekhez
          </Link>
          <h1 className="mt-4 flex items-center gap-3 text-3xl font-semibold tracking-tight">
            <Plus className="h-7 w-7 text-amber-500" />
            Új termék
          </h1>
          <p className="mt-3 text-sm text-zinc-400">
            Töltsd ki az adatokat — a termék azonnal megjelenik a listában, a
            nyilvános oldalak pedig legfeljebb 1 percen belül frissülnek.
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-10">
        <ProductForm
          mode="create"
          tagOptions={tagOptions}
          categoryOptions={categoryOptions}
        />
      </main>
    </div>
  );
}
