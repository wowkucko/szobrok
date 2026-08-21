import { NextResponse } from "next/server";
import { auth } from "@/auth";

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

// Auth.js wrapper — a req.auth már tartalmazza a Google session-t (JWT)
export default auth((req) => {
  const pathname = req.nextUrl.pathname;

  // A login oldal és az Auth.js végpontok ne legyenek védve
  if (pathname.startsWith("/admin/login") || pathname.startsWith("/api/auth")) {
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
  // Az admin oldalak és az admin API útvonalak védve (a login kivételével — azt a middleware engedi)
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
