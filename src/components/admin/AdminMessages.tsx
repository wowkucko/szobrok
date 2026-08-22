"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCheck,
  HandCoins,
  Inbox,
  Mail,
  MessageSquare,
  Paperclip,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import type { Message, MessageType } from "@/lib/db";

type TypeFilter = MessageType | "all";

const TYPE_META: Record<
  MessageType,
  { label: string; Icon: typeof Mail; badge: string }
> = {
  purchase: {
    label: "Vásárlás",
    Icon: ShoppingBag,
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  offer: {
    label: "Ajánlat",
    Icon: HandCoins,
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  contact: {
    label: "Kapcsolat",
    Icon: MessageSquare,
    badge: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  },
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("hu-HU", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatPrice(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "";
  return `${n.toLocaleString("hu-HU")} Ft`;
}

export default function AdminMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [unread, setUnread] = useState(0);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<TypeFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/messages");
      if (!res.ok) throw new Error("Hiba");
      const json = await res.json();
      setMessages(json.messages ?? []);
      setUnread(json.unread ?? 0);
      setTotal(json.total ?? 0);
    } catch {
      setError("Nem sikerült betölteni az üzeneteket.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // A betöltést microtask-ben indítjuk, hogy a setState ne az effect
    // szinkron törzsében fusson (react-hooks/set-state-in-effect).
    const id = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A szűrő kliensoldalon történik (a fül-számlálók így mindig pontosak).
  const visible = filter === "all" ? messages : messages.filter((m) => m.type === filter);

  const setRead = async (m: Message, read: boolean) => {
    setBusyId(m.id);
    try {
      const res = await fetch("/api/admin/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: m.id, read }),
      });
      if (!res.ok) throw new Error("Hiba");
      const json = await res.json();
      setMessages((prev) =>
        prev.map((x) => (x.id === m.id ? { ...x, isRead: read } : x))
      );
      if (typeof json.unread === "number") setUnread(json.unread);
    } catch {
      // marad a régi állapot
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Biztosan törlöd ezt az üzenetet?")) return;
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/messages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Hiba");
      const json = await res.json();
      setMessages((prev) => prev.filter((x) => x.id !== id));
      setOpenId((prev) => (prev === id ? null : prev));
      if (typeof json.unread === "number") setUnread(json.unread);
    } catch {
      // hiba esetén marad a lista
    } finally {
      setBusyId(null);
    }
  };

  const FILTERS: Array<{ value: TypeFilter; label: string }> = [
    { value: "all", label: "Mind" },
    { value: "purchase", label: "Vásárlás" },
    { value: "offer", label: "Ajánlat" },
    { value: "contact", label: "Kapcsolat" },
  ];

  return (
    <div>
      {/* Szűrők */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const FilterIcon = f.value !== "all" ? TYPE_META[f.value].Icon : null;
          return (
          <button
            key={f.value}
            type="button"
            onClick={() => {
              setFilter(f.value);
              setOpenId(null);
            }}
            className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-xs font-medium transition-colors ${
              filter === f.value
                ? "border-amber-600/60 bg-amber-600/10 text-amber-500"
                : "border-zinc-700 bg-zinc-900/60 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
            }`}
          >
            {FilterIcon && <FilterIcon className="h-3.5 w-3.5" />}
            {f.label}
            {f.value === "all"
              ? total > 0 && <span className="text-zinc-500">({total})</span>
              : messages.length > 0 && (
                  <span className="text-zinc-500">
                    ({messages.filter((m) => m.type === f.value).length})
                  </span>
                )}
          </button>
          );
        })}
        {unread > 0 && (
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-amber-600/40 bg-amber-600/10 px-3 py-1 text-xs font-medium text-amber-500">
            <Mail className="h-3.5 w-3.5" />
            {unread} olvasatlan
          </span>
        )}
      </div>

      {/* Tartalom */}
      <div className="mt-6">
        {loading ? (
          <div className="flex flex-col items-center rounded-2xl border border-zinc-800 bg-zinc-900/40 py-16 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500" />
            <p className="mt-4 text-sm text-zinc-500">Betöltés…</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-900/60 bg-red-950/40 px-6 py-10 text-center text-sm text-red-400">
            {error}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-zinc-800 bg-zinc-900/40 py-16 text-center">
            <Inbox className="h-10 w-10 text-zinc-600" />
            <p className="mt-4 text-sm text-zinc-500">
              {filter === "all"
                ? "Még nincs beérkezett üzenet."
                : `Nincs ${TYPE_META[filter as MessageType].label.toLowerCase()} típusú üzenet.`}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {visible.map((m) => {
              const meta = TYPE_META[m.type];
              const open = openId === m.id;
              return (
                <li
                  key={m.id}
                  className={`overflow-hidden rounded-2xl border transition-colors ${
                    m.isRead
                      ? "border-zinc-800 bg-zinc-900/40"
                      : "border-amber-600/25 bg-amber-600/5"
                  }`}
                >
                  {/* Sor */}
                  <div className="flex items-start gap-3 px-5 py-4">
                    <span
                      className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${meta.badge}`}
                    >
                      <meta.Icon className="h-4 w-4" />
                    </span>
                    <button
                      type="button"
                      onClick={() => setOpenId(open ? null : m.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-sm font-semibold text-zinc-100">
                          {m.name}
                        </span>
                        <span className="text-xs text-zinc-500">{m.email}</span>
                        {!m.isRead && (
                          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                        <span className="font-medium text-zinc-400">
                          {meta.label}
                        </span>
                        {m.productTitle && (
                          <span className="truncate text-zinc-500">
                            {m.productTitle}
                          </span>
                        )}
                        <span className="ml-auto shrink-0 text-zinc-600">
                          {formatDate(m.createdAt)}
                        </span>
                      </div>
                    </button>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        title={m.isRead ? "Olvasatlannak jelölés" : "Olvasottnak jelölés"}
                        disabled={busyId === m.id}
                        onClick={() => setRead(m, !m.isRead)}
                        className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-amber-500 disabled:opacity-50"
                      >
                        <CheckCheck className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="Törlés"
                        disabled={busyId === m.id}
                        onClick={() => remove(m.id)}
                        className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-red-950 hover:text-red-400 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Részletek */}
                  {open && (
                    <div className="border-t border-zinc-800 px-5 py-5">
                      <dl className="grid gap-3 text-sm sm:grid-cols-2">
                        {m.phone && (
                          <div>
                            <dt className="text-xs text-zinc-500">Telefonszám</dt>
                            <dd className="mt-0.5 text-zinc-300">{m.phone}</dd>
                          </div>
                        )}
                        {m.offer !== null && (
                          <div>
                            <dt className="text-xs text-zinc-500">Ajánlott ár</dt>
                            <dd className="mt-0.5 font-medium text-amber-500">
                              {formatPrice(m.offer)}
                            </dd>
                          </div>
                        )}
                        {m.productTitle && (
                          <div>
                            <dt className="text-xs text-zinc-500">Termék</dt>
                            <dd className="mt-0.5 text-zinc-300">
                              {m.productTitle}
                            </dd>
                          </div>
                        )}
                        {m.coupon && (
                          <div>
                            <dt className="text-xs text-zinc-500">Kuponkód</dt>
                            <dd className="mt-0.5 inline-flex items-center gap-1.5 rounded-full border border-amber-600/30 bg-amber-600/10 px-2.5 py-0.5 font-mono text-xs font-semibold text-amber-400">
                              {m.coupon}
                            </dd>
                          </div>
                        )}
                        {m.attachmentUrl && (
                          <div>
                            <dt className="text-xs text-zinc-500">Melléklet</dt>
                            <dd className="mt-0.5">
                              <a
                                href={m.attachmentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 font-medium text-amber-500 hover:text-amber-400"
                              >
                                <Paperclip className="h-3.5 w-3.5" />
                                {m.attachmentName}
                              </a>
                            </dd>
                          </div>
                        )}
                      </dl>
                      {(m.message || m.offer !== null) && (
                        <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
                          <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                            {m.message || formatPrice(m.offer)}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
