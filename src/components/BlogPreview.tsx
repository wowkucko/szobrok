import Link from "next/link";
import { ArrowRight } from "lucide-react";
import SectionHeading from "./SectionHeading";
import BlogCard from "./BlogCard";
import { listBlogPosts } from "@/lib/db";

export default async function BlogPreview() {
  const { posts } = listBlogPosts(3, 0);
  if (posts.length === 0) return null;

  return (
    <section id="blog" className="scroll-mt-20 border-b border-zinc-800/60">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <SectionHeading
          index="05"
          title="Legfrissebb bejegyzéseink"
          subtitle="A műhely és az új modellek történetei — a Cults3D-ről szemezgetve, magyarul."
        />

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, index) => (
            <BlogCard key={post.id} post={post} priority={index === 0} />
          ))}
        </div>

        <div className="mt-10 flex justify-end">
          <Link
            href="/blog"
            className="inline-flex h-12 items-center gap-2 rounded-full border border-zinc-700 px-6 text-sm font-medium text-zinc-200 transition-colors hover:border-amber-600 hover:text-amber-500"
          >
            Tovább a teljes blogra
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
