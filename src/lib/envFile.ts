import fs from "node:fs";
import path from "node:path";

const ENV_PATH = path.join(process.cwd(), ".env.local");

type EnvLine =
  | { type: "blank" | "comment" | "other"; raw: string }
  | { type: "var"; key: string; value: string; raw: string };

const SECRET_RE = /(KEY|SECRET|TOKEN|PASSWORD|PASS)/i;

function parseEnvFile(content: string): EnvLine[] {
  return content.split(/\r?\n/).map((line): EnvLine => {
    const trimmed = line.trim();
    if (trimmed === "") return { type: "blank", raw: line };
    if (trimmed.startsWith("#")) return { type: "comment", raw: line };
    const eq = line.indexOf("=");
    if (eq > 0 && /^[A-Za-z_][A-Za-z0-9_]*$/.test(line.slice(0, eq).trim())) {
      const key = line.slice(0, eq).trim();
      const value = line.slice(eq + 1).trim();
      return { type: "var", key, value, raw: line };
    }
    return { type: "other", raw: line };
  });
}

function formatValue(value: string): string {
  if (/[\s#"]/.test(value)) {
    return `"${value.replace(/"/g, '\\"')}"`;
  }
  return value;
}

export interface EnvEntry {
  key: string;
  value: string;
  secret: boolean;
}

/** Az összes KEY=VALUE bejegyzés a .env.local-ból, a fájl sorrendjében. */
export function getEnvEntries(): EnvEntry[] {
  if (!fs.existsSync(ENV_PATH)) return [];
  const lines = parseEnvFile(fs.readFileSync(ENV_PATH, "utf8"));
  return lines
    .filter((l): l is Extract<EnvLine, { type: "var" }> => l.type === "var")
    .map((l) => ({ key: l.key, value: l.value, secret: SECRET_RE.test(l.key) }));
}

/**
 * Beállítja a megadott változókat a .env.local-ban: a meglévőket frissíti,
 * az újakat hozzáfűzi; a kommenteket és egyéb sorokat megőrzi. Emellett
 * azonnal beírja őket a futó folyamat process.env-jébe is, így a futás
 * közben olvasott értékek (pl. blog API-kulcsok) újraindítás nélkül érvényesülnek.
 */
export function saveEnvVars(vars: Record<string, string>): { changed: number; added: number } {
  const existing = fs.existsSync(ENV_PATH)
    ? parseEnvFile(fs.readFileSync(ENV_PATH, "utf8"))
    : [];

  const updates = { ...vars };
  let changed = 0;
  let added = 0;

  const out: string[] = [];
  for (const line of existing) {
    if (line.type === "var" && line.key in updates) {
      const value = updates[line.key];
      out.push(`${line.key}=${formatValue(value)}`);
      process.env[line.key] = value;
      delete updates[line.key];
      changed++;
    } else {
      out.push(line.raw);
    }
  }

  // Új kulcsok a fájl végére
  for (const [key, value] of Object.entries(updates)) {
    out.push(`${key}=${formatValue(value)}`);
    process.env[key] = value;
    added++;
  }

  fs.writeFileSync(ENV_PATH, out.join("\n") + "\n", "utf8");
  return { changed, added };
}

/** Eltávolítja a megadott kulcsokat a .env.local-ból (és a process.env-ből). */
export function deleteEnvKeys(keys: string[]): number {
  if (!fs.existsSync(ENV_PATH) || keys.length === 0) return 0;
  const lines = parseEnvFile(fs.readFileSync(ENV_PATH, "utf8"));
  let removed = 0;
  const out: string[] = [];
  for (const line of lines) {
    if (line.type === "var" && keys.includes(line.key)) {
      removed++;
      delete process.env[line.key];
      continue;
    }
    out.push(line.raw);
  }
  if (removed > 0) {
    fs.writeFileSync(ENV_PATH, out.join("\n") + "\n", "utf8");
  }
  return removed;
}
