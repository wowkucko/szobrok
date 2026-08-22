"use client";

import { useEffect } from "react";

/**
 * Globális nyomkövető: ha a látogató egy ?ref=KÓD paraméterrel érkezik
 * (bármelyik oldalra), rögzít egy kattintást a referral rendszerben.
 * A saját kódjára mutató linket nem számoljuk (így a létrehozó nem tudja
 * saját magát "kattintgatni" a kuponért).
 */
export default function ReferralTracker() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("ref")?.trim();
    if (!code) return;

    const owner = document.cookie
      .split("; ")
      .find((c) => c.startsWith("ref_owner_code="));
    if (owner) {
      const ownerCode = decodeURIComponent(owner.split("=")[1] ?? "");
      if (ownerCode === code) return;
    }

    fetch(`/api/referral/track?code=${encodeURIComponent(code)}`, {
      method: "GET",
      cache: "no-store",
    }).catch(() => {});
  }, []);

  return null;
}
