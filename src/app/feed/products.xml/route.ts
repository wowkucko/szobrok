import { getAllFeedEntries, getProductById } from "@/lib/db";
import { buildFeedXml, resolveProductFields } from "@/lib/feed";

// A feed mindig a jelenlegi állapotot mutassa — a Meta frissen húzza le.
export const dynamic = "force-dynamic";

/** A nyilvános XML feed a Facebook / Meta dinamikus hirdetésekhez. */
export async function GET() {
  // A termékből származó mezőket (cím, ár, elérhetőség, képek, anyagok…)
  // mindig a termék aktuális adataiból oldjuk fel, így a feed sosem lehet
  // elavult — függetlenül attól, hogy a bejegyzést mikor töltötték fel.
  const entries = getAllFeedEntries().map((entry) => {
    const product = getProductById(entry.productId);
    return product ? resolveProductFields(entry, product) : entry;
  });

  const xml = buildFeedXml(entries);

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
