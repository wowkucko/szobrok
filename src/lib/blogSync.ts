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
  listBlogPosts,
  updateBlogPostTranslation,
  updateBlogPostImages,
  countPostsMissingImages,
} from "@/lib/db";
import { getCultsUserCreations } from "@/lib/cults";
import { translateBlogPosts, type TranslatedPost } from "@/lib/gemini";
import { optimizeImage } from "@/lib/optimizeImage";
import { logBlog } from "@/lib/blogLog";

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

/** Egyszerre csak egy újrafordítás futhat (a retry-szünetek órákig is tarthatnak). */
let translateRunning = false;

/** Egyszerre csak egy képjavítás futhat. */
let imageFixRunning = false;

type Creation = NonNullable<Awaited<ReturnType<typeof getCultsUserCreations>>[number]>;

/** Gemini hibából kinyerhető emberi olvasmányú leírás (kvóta/retryDelay). */
function describeGeminiError(e: unknown): string {
  const msg = String(e);
  const m = msg.match(/Gemini válasz (\d+):\s*([\s\S]+)$/);
  if (m) {
    try {
      const body = JSON.parse(m[2]) as {
        error?: {
          status?: string;
          message?: string;
          details?: Array<Record<string, unknown>>;
        };
      };
      const er = body.error ?? {};
      const details = Array.isArray(er.details) ? er.details : [];
      const quota =
        details.find((d) => d.quotaValue !== undefined)?.quotaValue ??
        (er.message ? (er.message.match(/limit:\s*(\d+)/i)?.[1] ?? undefined) : undefined);
      const retry = details.find((d) => d.retryDelay !== undefined)?.retryDelay;
      let extra = "";
      if (quota !== undefined || retry !== undefined) {
        extra = ` (kvóta: ${quota ?? "?"}${retry ? `, várakozás: ${retry}` : ""})`;
      }
      return `${er.status ?? m[1]} – ${er.message ?? msg}${extra}`;
    } catch {
      return msg;
    }
  }
  return msg;
}

/** Újrapróbálási szünetek (exponenciálisan növekvő): 10p, 30p, 2ó, 4ó, 6ó, 8ó,
 *  majd újra elölről (ciklusonként ismétlődik). */
const RETRY_SCHEDULE_MS = [
  10 * 60_000,
  30 * 60_000,
  2 * 3600_000,
  4 * 3600_000,
  6 * 3600_000,
  8 * 3600_000,
];

function formatDuration(ms: number): string {
  if (ms < 3600_000) return `${Math.max(1, Math.round(ms / 60_000))} perc`;
  return `${Math.round(ms / 3600_000)} óra`;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function downloadImage(imageUrl: string): Promise<string | null> {
  if (!imageUrl) return null;
  // Átmeneti hibák (pl. Cults CDN 429/5xx, hálózati szakadás) ellen újrapróbálunk.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(imageUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
          Referer: "https://cults3d.com/",
        },
      });
      if (res.status === 429 || res.status >= 500) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
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
      if (attempt < 2) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      return null;
    }
  }
  return null;
}

/** Kötegelő Gemini fordítás (batch) — egy hívás több bejegyzésre.
 *  Újrapróbálás 429 / hálózati hiba esetén backoffal. */
async function translateBatchWithRetry(
  inputs: { title: string; description: string; keywords: string[] }[],
  geminiKey: string | undefined
): Promise<{ items: { translated: TranslatedPost; ok: boolean }[] }> {
  if (!geminiKey || inputs.length === 0) {
    if (!geminiKey) logBlog("warn", "Kötegelő fordítás kihagyva: hiányzik a GEMINI_API_KEY.");
    return {
      items: inputs.map((i) => ({
        translated: { title: i.title, excerpt: "", description: i.description },
        ok: false,
      })),
    };
  }
  const failedItems = (): { items: { translated: TranslatedPost; ok: boolean }[] } => ({
    items: inputs.map((i) => ({
      translated: { title: i.title, excerpt: "", description: i.description },
      ok: false,
    })),
  });

  let attempt = 0;
  for (;;) {
    try {
      const translated = await translateBlogPosts(inputs, geminiKey);
      return { items: translated.map((t) => ({ translated: t, ok: true })) };
    } catch (e) {
      const msg = String(e);
      if (!/429|rate|ECONN|ETIMEDOUT|fetch failed/i.test(msg)) {
        logBlog(
          "error",
          `Kötegelő fordítás végleg sikertelen (nem újrapróbálható): ${describeGeminiError(e)}`
        );
        break;
      }
      const step = (attempt % RETRY_SCHEDULE_MS.length) + 1;
      const cycle = Math.floor(attempt / RETRY_SCHEDULE_MS.length) + 1;
      const delay = RETRY_SCHEDULE_MS[attempt % RETRY_SCHEDULE_MS.length];
      logBlog(
        "warn",
        `Gemini hiba (${step}. lépés / ${cycle}. ciklus), újrapróbálás ${formatDuration(delay)} múlva: ${describeGeminiError(e)}`
      );
      await sleep(delay);
      attempt++;
    }
  }
  return failedItems();
}

const BATCH_SIZE = 8; // bejegyzés / Gemini-hívás (kvóta-takarékos)

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
    logBlog("error", `${username}: hiányzik a CULTS3D_USERNAME vagy CULTS3D_API_KEY környezeti változó.`);
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
    logBlog("info", `${username}: ${creations.length} modell lekérve a Cults3D-ről, fordítás indul${geminiKey ? "" : " (figyelem: GEMINI_API_KEY hiányzik – angolul maradnak)"}…`);

    const keywords = listBlogKeywords().map((k) => k.keyword);
    const limit = opts.maxNew && opts.maxNew > 0 ? opts.maxNew : creations.length;
    const base = countBlogPostsBySource(username);
    let imported = 0;
    let skipped = 0;

    // Kötegelő fordítás: az új bejegyzéseket BATCH_SIZE-ként fordítjuk egy
    // Gemini-hívásban, hogy a napi ingyenes kvótát ne lépjük túl feleslegesen.
    const buffer: Creation[] = [];

    const flushBuffer = async (): Promise<boolean> => {
      if (buffer.length === 0) return false;
      const inputs = buffer.map((b) => ({
        title: b.title,
        description: b.description,
        keywords,
      }));
      const { items } = await translateBatchWithRetry(inputs, geminiKey);
      let justNow = 0;
      for (let i = 0; i < buffer.length; i++) {
        if (cancelled.has(username)) {
          cancelled.delete(username);
          logBlog("warn", `${username}: szinkron leállítva (Leállítás gomb).`);
          updateBlogSourceSync(username, { status: "cancelled", error: null });
          touchBlogSource(username);
          buffer.length = 0;
          return true;
        }
        const b = buffer[i];
        const t = items[i];
        const image = await downloadImage(b.image);
        insertBlogPost({
          source: username,
          cultsId: b.slug,
          slug: uniqueSlug(t.translated.title || b.title),
          title: t.translated.title,
          excerpt: t.translated.excerpt,
          description: t.translated.description,
          images: image ? [image] : [],
          sourceUrl: b.url,
          publishedAt: b.publishedAt,
          translated: t.ok,
        });
        if (t.ok) justNow++;
        imported++;
        updateBlogSourceSync(username, { progress: base + imported });
        if (imported >= limit) {
          updateBlogSourceSync(username, { status: "done", progress: base + imported });
          touchBlogSource(username);
          buffer.length = 0;
          return true;
        }
        await sleep(batchDelay);
      }
      logBlog("info", `${username}: köteg mentve — +${justNow} lefordítva, ${buffer.length} feldolgozva (össz.: ${base + imported}).`);
      buffer.length = 0;
      return false;
    };

    for (const c of creations) {
      if (cancelled.has(username)) {
        cancelled.delete(username);
        logBlog("warn", `${username}: szinkron leállítva (Leállítás gomb).`);
        updateBlogSourceSync(username, { status: "cancelled", error: null });
        touchBlogSource(username);
        return { username, imported, skipped, remaining: -1 };
      }
      if (getBlogPostByCultsId(c.slug)) {
        skipped++;
        continue;
      }
      buffer.push(c);
      // Maximális új bejegyzés: vágjuk meg a buffert, és fejezzük be a futást.
      if (limit > 0 && buffer.length >= limit - imported) {
        buffer.length = Math.max(0, limit - imported);
        await flushBuffer();
        updateBlogSourceSync(username, { status: "done", progress: base + imported });
        touchBlogSource(username);
        return { username, imported, skipped, remaining: 0 };
      }
      if (buffer.length >= BATCH_SIZE) {
        await flushBuffer();
      }
    }
    await flushBuffer();

    updateBlogSourceSync(username, { status: "done", progress: base + imported });
    touchBlogSource(username);
    logBlog("success", `${username}: szinkron kész — ${imported} új bejegyzés, ${skipped} már meglévő kihagyva.`);
    return { username, imported, skipped, remaining: 0 };
  } catch (err) {
    logBlog("error", `${username}: szinkron hiba: ${String(err)}`);
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
 * Kötegelten, háttérben fut — a Gemini-kvótát kímélve.
 */
export async function translateUntranslated(
  opts: { geminiKey?: string; batchDelayMs?: number; force?: boolean } = {}
): Promise<{ total: number; translated: number; failed: number }> {
  if (translateRunning) {
    logBlog("warn", "Újrafordítás már fut – az új kérés figyelmen kívül hagyva.");
    return { total: 0, translated: 0, failed: 0 };
  }
  translateRunning = true;
  try {
    const geminiKey = opts.geminiKey ?? process.env.GEMINI_API_KEY;
    const batchDelay = opts.batchDelayMs && opts.batchDelayMs > 0 ? opts.batchDelayMs : 400;
    // force esetén a már lefordított (pl. elrontott című) bejegyzéseket is újrafordítjuk.
    const posts = opts.force
      ? listBlogPosts(1_000_000, 0, false).posts
      : listUntranslatedPosts();
    let translated = 0;
    let failed = 0;

    const total = posts.length;
    const batches = Math.ceil(total / BATCH_SIZE);
    if (total === 0) {
      logBlog("info", "Újrafordítás: nincs újrafordítandó bejegyzés.");
      return { total: 0, translated: 0, failed: 0 };
    }
    if (!geminiKey) {
      logBlog("warn", "Újrafordítás: GEMINI_API_KEY hiányzik – minden bejegyzés angolul marad.");
      return { total, translated: 0, failed: total };
    }
    logBlog(
      "info",
      `${opts.force ? "Összes bejegyzés újrafordítása" : "Újrafordítás"} indítása: ${total} bejegyzés, ${batches} köteg (${BATCH_SIZE}/Gemini-hívás).`
    );

  for (let i = 0; i < posts.length; i += BATCH_SIZE) {
    const slice = posts.slice(i, i + BATCH_SIZE);
    const inputs = slice.map((p) => ({
      title: p.title,
      description: p.description,
      keywords: [],
    }));
    const { items } = await translateBatchWithRetry(inputs, geminiKey);
    let bt = 0;
    let bf = 0;
    for (let j = 0; j < slice.length; j++) {
      if (items[j].ok) {
        updateBlogPostTranslation(slice[j].id, items[j].translated);
        translated++;
        bt++;
      } else {
        failed++;
        bf++;
      }
    }
    logBlog(
      "info",
      `Újrafordítás köteg ${Math.floor(i / BATCH_SIZE) + 1}/${batches}: +${bt} siker, ${bf} sikertelen (össz.: ${translated}/${total}).`
    );
    await sleep(batchDelay);
  }
  logBlog(
    "success",
    `Újrafordítás befejezve: ${translated} lefordítva, ${failed} sikertelen (${total} összesen).`
  );
  return { total, translated, failed };
  } finally {
    translateRunning = false;
  }
}

/**
 * Hiányzó képek pótlása meglévő bejegyzéseknél. A Cults3D-ről újra lekéri az
 * adott forrás összes modelljét, és ahol a bejegyzésnek nincs képe, megpróbálja
 * letölteni a (most már illustrations-ből is pótolt) képet. Háttérben fut.
 */
export async function fixBlogImages(
  opts: { apiUser?: string; apiKey?: string } = {}
): Promise<{ fixed: number; failed: number }> {
  if (imageFixRunning) {
    logBlog("warn", "Képjavítás már fut – az új kérés figyelmen kívül hagyva.");
    return { fixed: 0, failed: 0 };
  }
  imageFixRunning = true;
  try {
    const apiUser = opts.apiUser ?? process.env.CULTS3D_USERNAME;
    const apiKey = opts.apiKey ?? process.env.CULTS3D_API_KEY;
    if (!apiUser || !apiKey) {
      logBlog("error", "Képjavítás: hiányzik a CULTS3D_USERNAME vagy CULTS3D_API_KEY.");
      return { fixed: 0, failed: 0 };
    }
    const sources = listBlogSources();
    let fixed = 0;
    let failed = 0;
    const before = countPostsMissingImages();
    for (const src of sources) {
      let creations;
      try {
        creations = await getCultsUserCreations(src.username, { apiUser, apiKey, maxPages: 1000 });
      } catch (e) {
        logBlog("error", `${src.username}: képjavítás – Cults3D lekérés sikertelen: ${String(e)}`);
        continue;
      }
      const imageBySlug = new Map<string, string>();
      for (const c of creations) if (c.image) imageBySlug.set(c.slug, c.image);
      const posts = listBlogPosts(1_000_000, 0, false).posts.filter(
        (p) => p.source === src.username && (!p.images || p.images.length === 0)
      );
      let srcFixed = 0;
      for (const p of posts) {
        const imgUrl = imageBySlug.get(p.cultsId);
        if (!imgUrl) {
          failed++;
          continue;
        }
        const img = await downloadImage(imgUrl);
        if (img) {
          updateBlogPostImages(p.id, [img]);
          fixed++;
          srcFixed++;
        } else {
          failed++;
        }
      }
      if (posts.length > 0) {
        logBlog("info", `${src.username}: képjavítás — ${srcFixed} kép pótolva, ${posts.length - srcFixed} sikertelen.`);
      }
    }
    const after = countPostsMissingImages();
    logBlog(
      "success",
      `Képjavítás befejezve: ${fixed} kép pótolva, ${failed} sikertelen. Hiányzó képek: ${before} → ${after}.`
    );
    return { fixed, failed };
  } finally {
    imageFixRunning = false;
  }
}
