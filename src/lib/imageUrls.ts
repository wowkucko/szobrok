/**
 * Kép-URL segédfüggvények — TISZTA függvények, bármilyen (kliens és szerver)
 * oldalról importálhatók (nincs node/fs/sqlite függőségük).
 */

/** A kártya-bélyegkép fájlneve egy feltöltött kép URL-jéből (card-<base>.jpg). */
export function cardThumbFileName(imageUrl: string): string | null {
  if (!imageUrl.startsWith("/api/files/")) return null;
  const base = imageUrl
    .replace(/^\/api\/files\//, "")
    .replace(/\.(jpe?g|png|webp|gif|svg)$/i, "");
  return `card-${base}.jpg`;
}

/**
 * A kártyán használandó URL: feltöltött képnél a 4:5 arányú, figyelem-alapú
 * vágású JPEG változat (card-<base>.jpg), egyébként az eredeti URL. A hiányzó
 * card-<base>.jpg fájlt a /api/files route menet közben előállítja.
 */
export function cardThumbUrlFor(imageUrl: string): string {
  const name = cardThumbFileName(imageUrl);
  return name ? `/api/files/${name}` : imageUrl;
}

/** A galéria-főkép fájlneve (gallery-<base>.jpg). */
export function galleryThumbFileName(imageUrl: string): string | null {
  if (!imageUrl.startsWith("/api/files/")) return null;
  const base = imageUrl
    .replace(/^\/api\/files\//, "")
    .replace(/\.(jpe?g|png|webp|gif|svg)$/i, "");
  return `gallery-${base}.jpg`;
}

/**
 * A részletek-oldali galéria fő képéhez használandó URL: a 4:5 arányú,
 * figyelem-alapú vágású JPEG (gallery-<base>.jpg), egyébként az eredeti.
 */
export function galleryThumbUrlFor(imageUrl: string): string {
  const name = galleryThumbFileName(imageUrl);
  return name ? `/api/files/${name}` : imageUrl;
}
