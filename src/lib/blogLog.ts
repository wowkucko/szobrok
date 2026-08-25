// Blog-modul működési naplója (admin számára).
// Memóriában tartott gyűrűs buffer: a szerver élettartamára szól, a háttérben
// futó szinkron/fordítás állapotát és a hibákat (pl. Gemini 429/kvóta) jeleníti
// meg az admin felületen, ahol a konzol nem látszik.

export type BlogLogLevel = "info" | "warn" | "error" | "success";

export interface BlogLogEntry {
  ts: string; // ISO időbélyeg
  level: BlogLogLevel;
  msg: string;
}

const MAX_ENTRIES = 500;
const buffer: BlogLogEntry[] = [];

export function logBlog(level: BlogLogLevel, msg: string): void {
  const entry: BlogLogEntry = { ts: new Date().toISOString(), level, msg };
  buffer.push(entry);
  if (buffer.length > MAX_ENTRIES) buffer.splice(0, buffer.length - MAX_ENTRIES);

  const tag = `[blog:${level}]`;
  if (level === "error") console.error(tag, msg);
  else if (level === "warn") console.warn(tag, msg);
  else if (level === "success") console.log(tag, msg);
  else console.log(tag, msg);
}

/** A napló a legfrissebb bejegyzéssel elöl. */
export function getBlogLog(): BlogLogEntry[] {
  return buffer.slice().reverse();
}
