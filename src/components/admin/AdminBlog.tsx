"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FileText,
  Languages,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";

interface BlogSource {
  username: string;
  createdAt: string;
  lastSyncedAt: string | null;
  syncStatus: "idle" | "queued" | "syncing" | "done" | "error" | "cancelled";
  syncProgress: number;
  syncTotal: number;
  syncError: string | null;
}

interface BlogKeyword {
  keyword: string;
}

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  source: string;
  publishedAt: string;
  images: string[];
}

const STATUS_LABEL: Record<BlogSource["syncStatus"], string> = {
  idle: "Még nem szinkronizálva",
  queued: "Várakozik…",
  syncing: "Folyamatban",
  done: "Kész",
  error: "Hiba",
  cancelled: "Leállítva",
};

const LOG_COLOR: Record<string, string> = {
  info: "text-zinc-400",
  warn: "text-amber-400",
  error: "text-red-400",
  success: "text-emerald-400",
};

export default function AdminBlog() {
  const [sources, setSources] = useState<BlogSource[]>([]);
  const [keywords, setKeywords] = useState<BlogKeyword[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [postTotal, setPostTotal] = useState(0);
  const [untranslated, setUntranslated] = useState(0);
  const [retranslating, setRetranslating] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newKeyword, setNewKeyword] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [showLog, setShowLog] = useState(false);
  const [log, setLog] = useState<{ ts: string; level: string; msg: string }[]>([]);

  // Élő frissítés, amíg valamelyik forrás szinkronizálódik.
  const polling = sources.some(
    (s) => s.syncStatus === "syncing" || s.syncStatus === "queued"
  );

  const loadLog = useCallback(async () => {
    const d = await fetch("/api/admin/blog/log", { cache: "no-store" })
      .then((r) => r.json())
      .catch(() => ({ log: [] }));
    setLog(d.log ?? []);
  }, []);

  const logOpen = showLog || retranslating || polling;
  useEffect(() => {
    if (!logOpen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLog();
    const t = setInterval(loadLog, 2500);
    return () => clearInterval(t);
  }, [logOpen, loadLog, retranslating, polling]);

  const loadSources = useCallback(async () => {
    const s = await fetch("/api/admin/blog/sources").then((r) => r.json());
    setSources(s.sources ?? []);
    setPostTotal(s.postCount ?? 0);
  }, []);

  const loadAll = useCallback(async () => {
    const [s, k, p] = await Promise.all([
      fetch("/api/admin/blog/sources").then((r) => r.json()),
      fetch("/api/admin/blog/keywords").then((r) => r.json()),
      fetch("/api/admin/blog/posts?limit=100").then((r) => r.json()),
    ]);
    setSources(s.sources ?? []);
    setPostTotal(s.postCount ?? 0);
    setKeywords(k.keywords ?? []);
    setPosts(p.posts ?? []);
    setUntranslated(p.untranslated ?? 0);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!polling) return;
    const t = setInterval(loadSources, 2500);
    return () => clearInterval(t);
  }, [polling, loadSources]);

  function triggerSync(source: string | null) {
    setStatus("Szinkron elindítva – az állás a listában és a naplóban élőben frissül.");
    setError("");
    setShowLog(true);
    fetch(
      source
        ? `/api/admin/blog/sync?source=${encodeURIComponent(source)}`
        : "/api/admin/blog/sync",
      { method: "POST" }
    ).catch(() => {});
  }

  async function handleAddSource() {
    const username = newUsername.trim();
    if (!username) return;
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const res = await fetch("/api/admin/blog/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Hiba a forrás hozzáadásakor.");
        return;
      }
      setNewUsername("");
      setStatus(
        "Forrás hozzáadva. Az ősfeltöltés háttérben elindult – akár 1000+ modell is, szép lassan, a folyamatjelzőn követhetően."
      );
      await loadAll();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteSource(username: string) {
    if (!confirm(`Töröljük a(z) "${username}" forrást és az összes hozzá tartozó bejegyzést?`)) return;
    await fetch(`/api/admin/blog/sources?username=${encodeURIComponent(username)}`, {
      method: "DELETE",
    });
    await loadAll();
  }

  async function handleAddKeyword() {
    const keyword = newKeyword.trim();
    if (!keyword) return;
    const res = await fetch("/api/admin/blog/keywords", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword }),
    });
    if (res.ok) {
      setNewKeyword("");
      await loadAll();
    }
  }

  async function handleDeleteKeyword(keyword: string) {
    await fetch(`/api/admin/blog/keywords?keyword=${encodeURIComponent(keyword)}`, {
      method: "DELETE",
    });
    await loadAll();
  }

  async function handleDeletePost(id: string) {
    if (!confirm("Töröljük a bejegyzést?")) return;
    await fetch(`/api/admin/blog/posts?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await loadAll();
  }

  async function handleRetranslate() {
    if (retranslating) return;
    setRetranslating(true);
    setShowLog(true);
    setStatus("Újrafordítás elindítva…");
    await fetch("/api/admin/blog/translate", { method: "POST" }).catch(() => {});
    // Poll: amíg csökken a lefordítatlan bejegyzések száma, jelzünk állapotot.
    let prev = -1;
    let stable = 0;
    for (let i = 0; i < 720; i++) {
      await new Promise((r) => setTimeout(r, 2500));
      const cur = await fetch("/api/admin/blog/posts?limit=1", { cache: "no-store" })
        .then((r) => r.json())
        .then((d: { untranslated?: number }) => d.untranslated ?? 0)
        .catch(() => prev);
      await loadAll();
      if (cur === 0) {
        setStatus("Újrafordítás kész: minden bejegyzés lefordítva.");
        setRetranslating(false);
        return;
      }
      if (cur >= prev) {
        stable++;
        if (stable >= 3) {
          setStatus(
            cur > 0
              ? `Újrafordítás megállt: ${cur} bejegyzés maradt lefordítatlan (Gemini-kulcs hiányzik, kvóta túllépve/429, vagy egyéb fordítási hiba?).`
              : "Újrafordítás kész."
          );
          setRetranslating(false);
          return;
        }
      } else {
        stable = 0;
      }
      prev = cur;
      setStatus(`Újrafordítás folyamatban… még ${cur} lefordítatlan.`);
    }
    setRetranslating(false);
    setStatus("Újrafordítás: a maximális várakozási idő eltelt.");
  }

  function handleStopSource(username: string) {
    setStatus(`„${username}" szinkronjának leállítása…`);
    fetch(
      `/api/admin/blog/sync?cancel=1&source=${encodeURIComponent(username)}`,
      { method: "POST" }
    ).catch(() => {});
    setTimeout(loadSources, 800);
  }

  return (
    <div className="space-y-10">
      {status && (
        <div className="rounded-xl border border-emerald-700/50 bg-emerald-700/10 px-4 py-3 text-sm text-emerald-300">
          {status}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-700/50 bg-red-700/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Források */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h3 className="text-sm font-semibold text-zinc-200">Cults3D források</h3>
        <p className="mt-1 text-xs text-zinc-500">
          A követni kívánt tervezők felhasználónevei (nick). Hozzáadáskor a teljes
          ősfeltöltés háttérben indul: a Cults3D-t nem nyomjuk agyon (lapozás szünettel),
          a Gemini fordítás türelmesen, újrapróbálással megy. Akár 1000+ modell esetén is
          folyamatos a folyamatjelző, és megszakadás esetén folytatható.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <input
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="pl. demetrian_titus"
            className="h-9 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-amber-600"
          />
          <button
            onClick={handleAddSource}
            disabled={busy || !newUsername.trim()}
            className="inline-flex h-9 items-center gap-1 rounded-lg bg-amber-600 px-4 text-sm font-medium text-zinc-950 hover:bg-amber-500 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Hozzáadás + letöltés
          </button>
          <button
            onClick={() => triggerSync(null)}
            disabled={busy || sources.length === 0}
            className="inline-flex h-9 items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 text-sm text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${polling ? "animate-spin" : ""}`} />
            Összes szinkronizálása
          </button>
        </div>

        <ul className="mt-4 divide-y divide-zinc-800">
          {sources.length === 0 && (
            <li className="py-3 text-sm text-zinc-500">Még nincs forrás.</li>
          )}
          {sources.map((s) => {
            const syncing = s.syncStatus === "syncing" || s.syncStatus === "queued";
            const pct =
              s.syncTotal > 0 ? Math.min(100, Math.round((s.syncProgress / s.syncTotal) * 100)) : 0;
            return (
              <li key={s.username} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-100">{s.username}</p>
                    <p className="text-xs text-zinc-500">
                      Utoljára szinkronizálva:{" "}
                      {s.lastSyncedAt
                        ? new Date(s.lastSyncedAt).toLocaleString("hu-HU")
                        : "még sosem"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => triggerSync(s.username)}
                      disabled={syncing}
                      className="inline-flex h-8 items-center gap-1 rounded-md border border-zinc-700 px-3 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
                      Szinkronizálás
                    </button>
                    {syncing && (
                      <button
                        onClick={() => handleStopSource(s.username)}
                        className="inline-flex h-8 items-center gap-1 rounded-md border border-amber-700/50 px-3 text-xs text-amber-300 hover:bg-amber-700/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Leállítás
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteSource(s.username)}
                      className="inline-flex h-8 items-center gap-1 rounded-md border border-red-700/50 px-3 text-xs text-red-400 hover:bg-red-700/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Törlés
                    </button>
                  </div>
                </div>
                <div className="mt-2">
                  {syncing ? (
                    <div>
                      <div className="h-2 w-full overflow-hidden rounded bg-zinc-800">
                        <div
                          className="h-2 rounded bg-amber-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-amber-400">
                        {STATUS_LABEL[s.syncStatus]}
                        {s.syncTotal > 0
                          ? `: ${s.syncProgress} / ${s.syncTotal} (${pct}%)`
                          : "…"}
                      </p>
                    </div>
                  ) : s.syncStatus === "error" ? (
                    <p className="text-xs text-red-400">
                      Hiba: {s.syncError ?? "ismeretlen"}
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-500">{STATUS_LABEL[s.syncStatus]}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Kulcsszavak */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h3 className="text-sm font-semibold text-zinc-200">SEO kulcsszavak</h3>
        <p className="mt-1 text-xs text-zinc-500">
          Ezeket építi be a Gemini a magyar bejegyzésekbe (természetes módon).
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <input
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            placeholder="pl. festett 3D szobor"
            className="h-9 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-amber-600"
          />
          <button
            onClick={handleAddKeyword}
            disabled={!newKeyword.trim()}
            className="inline-flex h-9 items-center gap-1 rounded-lg bg-amber-600 px-4 text-sm font-medium text-zinc-950 hover:bg-amber-500 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Kulcsszó
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {keywords.length === 0 && (
            <span className="text-sm text-zinc-500">Még nincs kulcsszó.</span>
          )}
          {keywords.map((k) => (
            <span
              key={k.keyword}
              className="inline-flex items-center gap-2 rounded-full border border-amber-700/40 bg-amber-700/10 px-3 py-1 text-xs text-amber-300"
            >
              {k.keyword}
              <button
                onClick={() => handleDeleteKeyword(k.keyword)}
                className="text-amber-400/70 hover:text-amber-200"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      </section>

      {/* Bejegyzések */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-zinc-200">Bejegyzések ({postTotal})</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLog((v) => !v)}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-zinc-700 px-3 text-xs text-zinc-300 hover:bg-zinc-800"
            >
              <FileText className="h-3.5 w-3.5" />
              {showLog ? "Napló elrejtése" : "Napló"}
            </button>
            {untranslated > 0 && (
              <button
                onClick={handleRetranslate}
                disabled={retranslating}
                className="inline-flex h-8 items-center gap-1 rounded-md border border-amber-700/50 px-3 text-xs text-amber-300 hover:bg-amber-700/10 disabled:opacity-50"
              >
                <Languages className="h-3.5 w-3.5" />
                {retranslating ? "Újrafordítás…" : `${untranslated} nem fordított — újrafordítás`}
              </button>
            )}
          </div>
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          A publikált blogbejegyzések. Ha a Gemini épp nem bírta (pl. rate limit), a
          bejegyzés angolul maradt – a fenti gombbal később újrafordítható. A törlés végleges.
        </p>
        <ul className="mt-4 divide-y divide-zinc-800">
          {posts.length === 0 && (
            <li className="py-3 text-sm text-zinc-500">Még nincs bejegyzés.</li>
          )}
          {posts.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-3">
                {p.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.images[0]}
                    alt=""
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-800 text-zinc-600">
                    <FileText className="h-5 w-5" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-zinc-100">{p.title}</p>
                  <p className="text-xs text-zinc-500">
                    {p.source} · {new Date(p.publishedAt).toLocaleDateString("hu-HU")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/blog/${p.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 items-center rounded-md border border-zinc-700 px-3 text-xs text-zinc-300 hover:bg-zinc-800"
                >
                  Megnyitás
                </a>
                <button
                  onClick={() => handleDeletePost(p.id)}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-red-700/50 px-3 text-xs text-red-400 hover:bg-red-700/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Törlés
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Napló */}
      {showLog && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-zinc-200">Blog napló (élő)</h3>
            <span className="text-xs text-zinc-500">
              A háttérben futó szinkron/fordítás állapota és hibái (pl. Gemini 429/kvóta).
            </span>
          </div>
          <div className="mt-3 max-h-80 overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs">
            {log.length === 0 ? (
              <p className="text-zinc-600">Nincs naplóbejegyzés.</p>
            ) : (
              log.map((e, i) => (
                <div key={i} className="flex gap-2 py-0.5">
                  <span className="shrink-0 text-zinc-600">
                    {new Date(e.ts).toLocaleTimeString("hu-HU")}
                  </span>
                  <span className={`shrink-0 uppercase ${LOG_COLOR[e.level] ?? "text-zinc-400"}`}>
                    {e.level}
                  </span>
                  <span className="whitespace-pre-wrap text-zinc-300">{e.msg}</span>
                </div>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}
