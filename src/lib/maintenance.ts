import { DatabaseSync } from "node:sqlite";
import path from "node:path";

/**
 * Karbantartás mód — minimális, csak-olvasó hozzáférés az állapothoz.
 *
 * A middleware MINDEN kérésnél lefut, ezért szándékosan NEM importálja a
 * teljes db.ts-t: csak egyetlen sort olvas a site_settings táblából. Az írás
 * (admin API) a db.ts setMaintenance() függvényén keresztül történik.
 */

/** Ha az admin nem ad meg szöveget, ez jelenik meg a látogatóknak. */
export const DEFAULT_MAINTENANCE_MESSAGE =
  "Karbantartás miatt az oldal átmenetileg nem elérhető. Hamarosan visszatérünk!";

/** A karbantartás mód állapota és a látogatóknak megjelenő szöveg. */
export interface MaintenanceSettings {
  enabled: boolean;
  message: string;
}

const DB_PATH = path.join(process.cwd(), "data", "artisanprints.db");

// Rövid cache, hogy ne nyíljon új adatbázis-kapcsolat minden egyes kérésnél.
// Az admin bekapcsolása legfeljebb ennyi késéssel él a nyilvános oldalon.
const CACHE_TTL_MS = 3000;
let cache: { at: number; value: MaintenanceSettings } | null = null;

function readFromDb(): MaintenanceSettings {
  const db = new DatabaseSync(DB_PATH);
  try {
    const row = db
      .prepare(
        "SELECT maintenance_enabled, maintenance_message FROM site_settings WHERE id = 1"
      )
      .get() as
      | { maintenance_enabled: number; maintenance_message: string }
      | undefined;
    return {
      enabled: row?.maintenance_enabled === 1,
      message:
        row?.maintenance_message && row.maintenance_message.trim() !== ""
          ? row.maintenance_message
          : DEFAULT_MAINTENANCE_MESSAGE,
    };
  } finally {
    db.close();
  }
}

/**
 * Karbantartás-állapot olvasása. Hiba esetén (pl. még nincs tábla, pillanatnyi
 * zárolás) kikapcsolt állapotot ad vissza — az oldal sosem dőljön el miatta.
 */
export function readMaintenance(): MaintenanceSettings {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value;
  try {
    const value = readFromDb();
    cache = { at: Date.now(), value };
    return value;
  } catch {
    const value: MaintenanceSettings = {
      enabled: false,
      message: DEFAULT_MAINTENANCE_MESSAGE,
    };
    cache = { at: Date.now(), value };
    return value;
  }
}
