/**
 * URL-kulcs (slug) segédfüggvények — a termék webcíme ebből képződik.
 * Ez a modul szándékosan csak tiszta string-műveleteket tartalmaz, így a
 * kliens oldali admin űrlap és a szerveroldali adatbázis-réteg is ugyanazt
 * a szabályt használja (nincs eltérés az előnézet és a mentés között).
 */

/** A webcím maximális hossza (a régi címek is ennyivel készültek). */
export const SLUG_MAX_LENGTH = 60;

/** Címből generált URL-kulcs (pl. "Sárkány Úr" -> "sarkany-ur"). */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_LENGTH);
}

/**
 * Érvényes-e a webcím. Hiba esetén a magyar nyelvű hibaüzenetet adja vissza,
 * különben null-t. A szabály szándékosan szigorú: csak kisbetű, szám és
 * kötőjel — így a cím minden böngészőben és keresőben ugyanaz marad.
 */
export function slugValidationError(slug: string): string | null {
  if (!slug) return "A webcím nem lehet üres.";
  if (slug.length > SLUG_MAX_LENGTH) {
    return `A webcím legfeljebb ${SLUG_MAX_LENGTH} karakter lehet.`;
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return "A webcím csak kisbetűt, számot és kötőjelet tartalmazhat (szóköz helyett kötőjel).";
  }
  return null;
}
