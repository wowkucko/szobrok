import { NextRequest, NextResponse } from "next/server";

// A hitelesítő adatok a .env.local fájlból jönnek (ADMIN_USERNAME / ADMIN_PASSWORD).
// Figyelem: a middleware build-kor beégeti ezeket — módosítás után újra kell buildelni.
const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";

export function middleware(request: NextRequest) {
  // Ha nincs beállítva jelszó, az admin felület zárt (fail-closed)
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    console.warn(
      "[admin] ADMIN_USERNAME / ADMIN_PASSWORD nincs beállítva — az admin felület elérhetetlen."
    );
    return new NextResponse("Admin hozzáférés nincs beállítva.", {
      status: 503,
    });
  }

  const header = request.headers.get("authorization") ?? "";
  const expected = "Basic " + btoa(`${ADMIN_USERNAME}:${ADMIN_PASSWORD}`);

  if (header === expected) {
    return NextResponse.next();
  }

  return new NextResponse("Belépés szükséges.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Festett Szobrok Admin", charset="UTF-8"',
    },
  });
}

export const config = {
  // Az admin oldalak és az admin API útvonalak védve
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
