import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { readMaintenance } from "@/lib/maintenance";

// Fallback Basic Auth — a .env.local-ból jön (ADMIN_USERNAME / ADMIN_PASSWORD)
const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";

function hasBasicConfig(): boolean {
  return Boolean(ADMIN_USERNAME && ADMIN_PASSWORD);
}

function hasGoogleConfig(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function getAllowedEmails(): Set<string> {
  const raw =
    process.env.ADMIN_EMAILS ??
    process.env.ADMIN_EMAIL ??
    "festettszobrokmuhelye@gmail.com";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

function isBasicAuthValid(request: Request): boolean {
  if (!hasBasicConfig()) return false;
  const header = request.headers.get("authorization") ?? "";
  const expected = "Basic " + btoa(`${ADMIN_USERNAME}:${ADMIN_PASSWORD}`);
  return header === expected;
}

function isGoogleSessionValid(req: { auth?: { user?: { email?: string | null } } | null }): boolean {
  const email = req.auth?.user?.email?.toLowerCase();
  if (!email) return false;
  return getAllowedEmails().has(email);
}

// Auth.js wrapper — a req.auth már tartalmazza a Google session-t (JWT).
// Fontos: az auth() önmagában NEM zár ki semmit — a védelem az alábbi
// explicit ellenőrzésekből áll, és CSAK az /admin* útvonalakra vonatkozik.
export default auth((req) => {
  const pathname = req.nextUrl.pathname;
  const isAdminRoute =
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/api/admin" ||
    pathname.startsWith("/api/admin/");

  // 1) KARBANTARTÁS MÓD — csak a NEM admin kérésekre.
  //    Ha be van kapcsolva, a nyilvános oldalak helyett a tájékoztató oldal
  //    jelenik meg (rewrite — a böngészőben marad az eredeti URL). A
  //    bejelentkezett admin előnézetben továbbra is a valódi oldalt látja.
  if (
    !isAdminRoute &&
    readMaintenance().enabled &&
    !isGoogleSessionValid(req) &&
    !isBasicAuthValid(req)
  ) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          error:
            "Az oldal karbantartás módban van — a kérések átmenetileg nem engedélyezettek.",
        },
        { status: 503 }
      );
    }
    return NextResponse.rewrite(new URL("/karbantartas", req.url));
  }

  // 2) Nem admin kérés (nyilvános oldal): tovább a normál renderelésre.
  if (!isAdminRoute) {
    return NextResponse.next();
  }

  // --- Innentől kizárólag /admin* és /api/admin* kérések ---

  // A login oldal és az Auth.js végpontok ne legyenek védve
  if (pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  // 1) Google session (elsődleges)
  if (isGoogleSessionValid(req)) {
    return NextResponse.next();
  }

  // 2) Fallback: Basic Auth (megmarad, ahogy kérted)
  if (isBasicAuthValid(req)) {
    return NextResponse.next();
  }

  // Explicit Basic Auth kérés (?auth=basic): akkor is 401 + Basic challenge,
  // ha Google be van állítva — így a böngésző felugró ablaka működik oldalaknál is.
  const forceBasic = req.nextUrl.searchParams.get("auth") === "basic";

  // Egyik hitelesítés sem sikerült
  const hasAnyConfig = hasGoogleConfig() || hasBasicConfig();
  if (!hasAnyConfig) {
    console.warn(
      "[admin] Nincs beállítva GOOGLE_CLIENT_ID/SECRET és ADMIN_USERNAME/PASSWORD sem — az admin felület elérhetetlen."
    );
    return new NextResponse("Admin hozzáférés nincs beállítva.", { status: 503 });
  }

  // API esetén 401 + Basic challenge (hogy a fallback böngésző prompt is működjön)
  if (pathname.startsWith("/api/") || forceBasic) {
    return new NextResponse("Belépés szükséges.", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Festett Szobrok Admin", charset="UTF-8"',
      },
    });
  }

  // Oldal esetén: ha van Google config, irány a login oldal (ott a Google gomb + fallback infó)
  // Ha nincs Google config, marad a klasszikus Basic prompt
  if (hasGoogleConfig()) {
    const loginUrl = new URL("/admin/login", req.url);
    // Visszairányítás bejelentkezés után az eredeti oldalra
    loginUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return new NextResponse("Belépés szükséges.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Festett Szobrok Admin", charset="UTF-8"',
    },
  });
});

export const config = {
  // Minden útvonal, KIVÉVE: statikus eszközök, maga a /karbantartas oldal,
  // az Auth.js végpontok, a nyilvános űrlap-/referral-/fájl-API-k, a cron
  // végpont, az IndexNow kulcs-fájl, a SEO-fájlok és a termék XML feed.
  // (Az admin útvonalak bent maradnak: karbantartás közben is védettek, és az
  // admin előnézetet kap.)
  matcher: [
    "/((?!_next/static|_next/image|karbantartas|api/auth|api/contact|api/offers|api/purchase|api/newsletter|api/referral|api/files|api/indexnow|api/cron|favicon.ico|robots.txt|sitemap.xml|feed/products.xml|icon.svg|images/).*)",
  ],
};
