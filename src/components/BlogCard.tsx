"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ExternalLink } from "lucide-react";

export interface BlogCardPost {
  slug: string;
  title: string;
  excerpt: string;
  images: string[];
  createdAt: string;
  sourceUrl: string | null;
}

export default function BlogCard({
  post,
  priority = false,
}: {
  post: BlogCardPost;
  priority?: boolean;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const cover = post.images[0];

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 transition-colors hover:border-zinc-700">
      <div className="relative aspect-[4/5] overflow-hidden">
        <Link href={`/blog/${post.slug}`} className="block h-full w-full" aria-label={post.title}>
          {cover ? (
            <>
              {!imageLoaded && (
                <div className="card-image-loader" aria-hidden="true">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg
                      viewBox="0 0 64 64"
                      className="brush-silhouette"
                      style={{ width: "clamp(56px, 14vw, 96px)", height: "auto", opacity: 0.13 }}
                      fill="#fbbf24"
                      aria-hidden="true"
                    >
                      <g transform="rotate(-45 32 32)">
                        <rect x="9" y="27" width="27" height="10" rx="5" />
                        <rect x="36" y="25" width="5" height="14" rx="1.5" />
                        <path d="M41 26 L57 19.5 Q61.5 32 57 44.5 L41 38 Q43.5 32 41 26 Z" />
                      </g>
                      <path d="M50 3 Q55.5 9.5 50 14.5 Q44.5 9.5 50 3 Z" />
                    </svg>
                  </div>
                </div>
              )}
              <Image
                src={`/api/files/${cover}`}
                alt={post.title}
                fill
                priority={priority}
                unoptimized
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                onLoad={() => setImageLoaded(true)}
                className={`object-cover transition-all duration-700 ease-out ${
                  imageLoaded ? "opacity-100" : "opacity-0"
                } group-hover:scale-105 group-hover:duration-500`}
              />
            </>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-zinc-900/60 px-4 text-center">
              <span className="text-2xl">🎨</span>
              <span className="text-xs text-zinc-500">Kép hamarosan</span>
            </div>
          )}
        </Link>
        {post.sourceUrl && (
          <a
            href={post.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Megtekintem a Cults3D-on"
            className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700/80 bg-zinc-950/60 text-zinc-300 backdrop-blur-sm transition-colors hover:border-amber-600/60 hover:text-amber-500"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <Link href={`/blog/${post.slug}`} className="mt-0">
          <h3 className="text-base font-semibold leading-snug text-zinc-100 transition-colors group-hover:text-amber-500">
            {post.title}
          </h3>
        </Link>

        <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-zinc-400">
          {post.excerpt}
        </p>

        <div className="mt-4 text-xs text-zinc-500">
          {new Date(post.createdAt).toLocaleDateString("hu-HU")}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-zinc-800/80 pt-4">
          <Link
            href={`/blog/${post.slug}`}
            className="text-sm font-medium text-zinc-400 transition-colors hover:text-amber-500"
          >
            Olvasom →
          </Link>
        </div>
      </div>
    </article>
  );
}
