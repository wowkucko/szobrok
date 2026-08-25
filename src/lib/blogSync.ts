// Blog szinkron: Cults3D letöltés -> Gemini fordítás/SEO -> DB mentés.
// Háttérfolyamatként fut: a hívó (admin/cron útvonal) nem várakoztatja a
// kérést, a munka a szerveren folytatódik, miközben az állapot a DB-ben
// (blog_sources.sync_status / sync_progress / sync_total) jelenik meg.
// Megszakítás esetén is folytatható: a deduplikáció (cults_id) miatt az
// újraindítás csak a még hiányzó bejegyzéseket tölti le.

import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import {
  listBlogSources,
  listBlogKeywords,
  getBlogPostByCultsId,
  insertBlogPost,
  uniqueSlug,
  touchBlogSource,
  updateBlogSourceSync,
  countBlogPostsBySource,
  listUntranslatedPosts,
  updateBlogPostTranslation,
} from "@/lib/db";
import { getCultsUserCreations } from "@/lib/cults";
import { translateBlogPost } from "@/lib/gemini";
import { optimizeImage } from "@/lib/optimizeImage";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");
const CONTENT_TYPE_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

/** Futó szinkronok leállítása (forrás törlésekor / Leállítás gomb). */
const cancelled = new Set<string>();
export function cancelSync(username: string): void {
  cancelled.add(username);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function downloadImage(imageUrl: string): Promise<string | null> {
  if (!imageUrl) return null;
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    const raw = new Uint8Array(await res.arrayBuffer());
    let ext = CONTENT_TYPE_EXT[contentType] ?? (path.extname(imageUrl).toLowerCase() || ".jpg");
    let data: Uint8Array = raw;
    const optimized = await optimizeImage(raw, contentType || "image/jpeg");
    if (optimized) {
      data = optimized.data as Uint8Array;
      ext = optimized.ext;
    }
    const base = `blog-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const name = `${base}${ext}`;
    mkdirSync(UPLOAD_DIR, { recursive: true });
    writeFileSync(path.join(UPLOAD_DIR, name), data);
    return `/api/files/${name}`;
  } catch {
    return null;
  }
}

/** Gemini fordítás újrapróbálással (429 / hálózati hiba esetén backoff). */
async function translateWithRetry(
  input: { title: string; description: string; keywords: string[] },
  geminiKey: string | undefined
): Promise<{ translated: { title: string; excerpt: string; description: string }; ok: boolean }> {
  const fallback = {
    title: input.title,
    excerpt: "",
    description: input.description,
  };
  if (!geminiKey || !input.description) return { translated: fallback, ok: false };

  let lastErr: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const translated = await translateBlogPost(input, geminiKey);
      return { translated, ok: true };
    } catch (e) {
      lastErr = e;
      const msg = String(e);
      // 429 (rate limit) vagy hálózati hiba -> várj és próbáld újra
      if (attempt < 3 && (/429|rate|ECONN|ETIMEDOUT|fetch failed/i.test(msg))) {
        await sleep(1000 * Math.pow(2, attempt));
        continue;
      }
      break;
    }
  }
  console.error(`[blogSync] fordítás sikertelen (${input.title}):`, lastErr);
  return { translated: fallback, ok: false };
}

export interface SyncResult {
  username: string;
  imported: number;
  skipped: number;
  remaining: number;
}

export interface SyncOptions {
  /** Egy futásban importált új bejegyzések max száma. Alapértelmezett: korlátlan. */
  maxNew?: number;
  apiUser?: string;
  apiKey?: string;
  geminiKey?: string;
  /** Szünet két bejegyzés között (Gemini/EPI nyomás csökkentése). */
  batchDelayMs?: number;
}

/**
 * Egy forrás teljes szinkronja a háttérben. Nem dob hibát a hívónak:
 * az állapotot a DB-ben rögzíti (sync_status / sync_progress / sync_total).
 */
export async function syncSource(
  username: string,
  opts: SyncOptions = {}
): Promise<SyncResult> {
  const apiUser = opts.apiUser ?? process.env.CULTS3D_USERNAME;
  const apiKey = opts.apiKey ?? process.env.CULTS3D_API_KEY;
  const geminiKey = opts.geminiKey ?? process.env.GEMINI_API_KEY;
  const batchDelay = opts.batchDelayMs && opts.batchDelayMs > 0 ? opts.batchDelayMs : 500;

  if (!apiUser || !apiKey) {
    updateBlogSourceSync(username, {
      status: "error",
      error: "Hiányzik a CULTS3D_USERNAME vagy CULTS3D_API_KEY környezeti változó.",
    });
    return { username, imported: 0, skipped: 0, remaining: -1 };
  }

  // Friss indítás: ne legyen leállítva az előző futásból.
  cancelled.delete(username);

  updateBlogSourceSync(username, { status: "syncing", progress: 0, total: 0, error: null });
  try {
    const creations = await getCultsUserCreations(username, {
      apiUser,
      apiKey,
      maxPages: 1000,
    });
    updateBlogSourceSync(username, { total: creations.length });

    const keywords = listBlogKeywords().map((k) => k.keyword);
    const limit = opts.maxNew && opts.maxNew > 0 ? opts.maxNew : creations.length;
    const base = countBlogPostsBySource(username);
    let imported = 0;
    let skipped = 0;

    for (const c of creations) {
      // Leállítási kérés közben: azonnal abbahagyjuk. A már beillesztett
      // bejegyzések megmaradnak, az állapot „cancelled" lesz.
      if (cancelled.has(username)) {
        cancelled.delete(username);
        updateBlogSourceSync(username, { status: "cancelled", error: null });
        touchBlogSource(username);
        return { username, imported, skipped, remaining: -1 };
      }
      if (getBlogPostByCultsId(c.slug)) {
        skipped++;
        continue;
      }

      const { translated, ok } = await translateWithRetry(
        { title: c.title, description: c.description, keywords },
        geminiKey
      );
      const image = await downloadImage(c.image);

      insertBlogPost({
        source: username,
        cultsId: c.slug,
        slug: uniqueSlug(translated.title || c.title),
        title: translated.title,
        excerpt: translated.excerpt,
        description: translated.description,
        images: image ? [image] : [],
        sourceUrl: c.url,
        publishedAt: c.publishedAt,
        translated: ok,
      });

      imported++;
      updateBlogSourceSync(username, { progress: base + imported });
      if (imported >= limit) {
        // Többet nem töltünk ebben a futásban; a maradék a következő szinkronnal.
        const remaining = Math.max(0, creations.length - (skipped + imported));
        updateBlogSourceSync(username, { status: "done", progress: base + imported });
        touchBlogSource(username);
        return { username, imported, skipped, remaining };
      }
      await sleep(batchDelay);
    }

    updateBlogSourceSync(username, { status: "done", progress: base + imported });
    touchBlogSource(username);
    return { username, imported, skipped, remaining: 0 };
  } catch (err) {
    updateBlogSourceSync(username, { status: "error", error: String(err) });
    throw err;
  }
}

/** Az összes regisztrált forrás szinkronja (napi cron). Háttérben fut. */
export async function syncAllSources(opts: SyncOptions = {}): Promise<SyncResult[]> {
  const sources = listBlogSources();
  const results: SyncResult[] = [];
  for (const s of sources) {
    try {
      results.push(await syncSource(s.username, opts));
    } catch {
      results.push({ username: s.username, imported: 0, skipped: 0, remaining: -1 });
    }
  }
  return results;
}

/**
 * A még angolul maradt (fordítási hiba miatt) bejegyzések újrafordítása.
 * Háttérben fut, állapotot a DB-ben nem jelez (rövid műveletnek szánva).
 */
export async function translateUntranslated(
  opts: { geminiKey?: string; batchDelayMs?: number } = {}
): Promise<{ total: number; translated: number; failed: number }> {
  const geminiKey = opts.geminiKey ?? process.env.GEMINI_API_KEY;
  const batchDelay = opts.batchDelayMs && opts.batchDelayMs > 0 ? opts.batchDelayMs : 400;
  const posts = listUntranslatedPosts();
  let translated = 0;
  let failed = 0;

  for (const p of posts) {
    const { translated: t, ok } = await translateWithRetry(
      { title: p.title, description: p.description, keywords: [] },
      geminiKey
    );
    if (ok) {
      updateBlogPostTranslation(p.id, {
        title: t.title,
        excerpt: t.excerpt,
        description: t.description,
      });
      translated++;
    } else {
      failed++;
    }
    await sleep(batchDelay);
  }
  return { total: posts.length, translated, failed };
}
