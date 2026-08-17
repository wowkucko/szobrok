import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LegalDisclaimer from "@/components/LegalDisclaimer";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "ÁSZF és jogi nyilatkozat",
  description:
    "Jogi nyilatkozat és szerzői jogi tájékoztató — a Festett Szobrok weboldal használati feltételei, felelősségkizárás és a 3D modellek szerzői jogaival kapcsolatos tájékoztató.",
  alternates: { canonical: "/aszf" },
  openGraph: {
    title: `ÁSZF és jogi nyilatkozat — ${SITE_NAME}`,
    description:
      "A Festett Szobrok weboldal jogi nyilatkozata és szerzői jogi tájékoztatója.",
    url: `${SITE_URL}/aszf`,
    type: "website",
  },
};

export default function AszfPage() {
  return (
    <div className="flex min-h-full flex-col bg-zinc-950">
      <Navbar />
      <LegalDisclaimer lang="hu" />
      <Footer />
    </div>
  );
}
