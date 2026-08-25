import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { getBlogPostBySlug } from "@/lib/db";
import { SITE_NAME } from "@/lib/data";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);
  if (!post) return { title: `Blog | ${SITE_NAME}` };
  return {
    title: `${post.title} | ${SITE_NAME}`,
    description: post.excerpt || post.description.slice(0, 160),
    openGraph: {
      title: post.title,
      description: post.excerpt || post.description.slice(0, 160),
      images: post.images.length ? [post.images[0]] : [],
      type: "article",
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);
  if (!post) notFound();

  const paragraphs = post.description.split(/\n{2,}/).filter((p) => p.trim());

  return (
    <div className="flex flex-1 flex-col bg-zinc-950 text-zinc-100">
      <Navbar />
      <main className="mx-auto max-w-3xl flex-1 px-6 py-14">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-amber-500"
        >
          ← Vissza a blogra
        </Link>

        <p className="mt-8 text-xs uppercase tracking-widest text-amber-500">
          {post.source}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          {post.title}
        </h1>
        <p className="mt-3 text-sm text-zinc-500">
          Közzétéve oldalunkon: {new Date(post.createdAt).toLocaleDateString("hu-HU", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>

        {post.sourceUrl && (
          <a
            href={post.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-amber-600 px-6 py-3 text-sm font-semibold text-zinc-950 shadow-[0_0_24px_rgba(217,119,6,0.18)] transition-colors hover:bg-amber-500"
          >
            Megtekintem a Cults3D-on
            <ExternalLink className="h-4 w-4" />
          </a>
        )}

        {post.images[0] && (
          <div className="mt-8 overflow-hidden rounded-2xl border border-zinc-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.images[0]}
              alt={post.title}
              className="w-full object-cover"
            />
          </div>
        )}

        <article className="mt-8 space-y-5 text-[15px] leading-7 text-zinc-300">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </article>

        {post.sourceUrl && (
          <div className="mt-10 flex justify-center">
            <a
              href={post.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-600 px-6 py-3 text-sm font-semibold text-zinc-950 shadow-[0_0_24px_rgba(217,119,6,0.18)] transition-colors hover:bg-amber-500"
            >
              Megtekintem a Cults3D-on
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        )}

        <div className="mt-12 border-t border-zinc-800 pt-8">
          <Link
            href="/blog"
            className="text-sm font-medium text-amber-500 transition-colors hover:text-amber-400"
          >
            További bejegyzések →
          </Link>
        </div>
      </main>
      <Footer showNewsletter={false} />
    </div>
  );
}
