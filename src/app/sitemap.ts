import type { MetadataRoute } from "next";
import { getProducts, listBlogPosts } from "@/lib/db";
import { SITE_URL, absoluteUrl, ogImageFor } from "@/lib/seo";

// Google kép-sitemap: URL-enként legfeljebb ennyi kép (bélyegkép + továbbiak).
const MAX_IMAGES_PER_PRODUCT = 5;

export default function sitemap(): MetadataRoute.Sitemap {
  const products = getProducts();

  // A portfólió kategória-oldalai. A kategória a címkék között is él, ezért a
  // ?tag=<Kategória> URL a kategória-szűrő — a portfólió szűrője a kategóriát
  // is egyezésnek veszi, így ez a URL mindig helyesen szűr. Csak azok a
  // kategóriák kerülnek bele, amikben van termék.
  const categories = [...new Set(products.map((p) => p.category))].sort();
  const categoryUrls: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${SITE_URL}/portfolio?tag=${encodeURIComponent(category)}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.7,
  }));

  // A termékek képei — a Termék JSON-LD-vel összhangban: bélyegkép + a további
  // képek, mind raszter (OG) formátumban. A Google kép-sitemapja nem fogad el
  // SVG-t, ezért az SVG bélyegképekhez a generált PNG változat kerül bele.
  const productUrls: MetadataRoute.Sitemap = products.map((p) => {
    const thumb = p.thumbnail ?? p.images[0];
    const images = [
      ogImageFor(p),
      ...p.images
        .filter((img) => img !== thumb)
        .map((img) => ogImageFor({ thumbnail: img, images: [img] })),
    ]
      .filter((u, i, arr) => arr.indexOf(u) === i) // duplikátumok eltávolítása
      .slice(0, MAX_IMAGES_PER_PRODUCT);

    return {
      url: `${SITE_URL}/portfolio/${p.id}`,
      lastModified: new Date(p.createdAt),
      changeFrequency: "weekly" as const,
      priority: p.isAvailable ? 0.8 : 0.5,
      images,
    };
  });

  return [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
      images: [absoluteUrl("/images/og-default.png")],
    },
    {
      url: `${SITE_URL}/portfolio`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/aszf`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/aszf/en`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.2,
    },
    ...categoryUrls,
    ...productUrls,
    ...blogUrls(),
  ];
}

function blogUrls(): MetadataRoute.Sitemap {
  const { posts } = listBlogPosts(500, 0, true);
  return posts.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.createdAt),
    changeFrequency: "monthly" as const,
    priority: 0.6,
    images: post.images.length ? post.images.map((img) => absoluteUrl(img)) : undefined,
  }));
}
