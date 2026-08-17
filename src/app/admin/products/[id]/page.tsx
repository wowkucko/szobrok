import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import ProductForm from "@/components/admin/ProductForm";
import {
  getCategoryOptions,
  getProductById,
  getTagOptions,
} from "@/lib/db";

export const metadata: Metadata = {
  title: "Termék szerkesztése",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = getProductById(id);
  if (!product) notFound();
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
            <Pencil className="h-7 w-7 text-amber-500" />
            Termék szerkesztése
          </h1>
          <p className="mt-3 text-sm text-zinc-400">
            <span className="text-zinc-300">{product.title}</span>
            <span className="ml-2 text-zinc-600">(id: {product.id})</span>
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-10">
        <ProductForm
          mode="edit"
          product={product}
          tagOptions={tagOptions}
          categoryOptions={categoryOptions}
        />
      </main>
    </div>
  );
}
