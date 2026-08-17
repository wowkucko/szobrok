import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LegalDisclaimer from "@/components/LegalDisclaimer";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Legal Disclaimer & Terms",
  description:
    "Legal disclaimer and copyright notice — terms of use, limitation of liability and information regarding 3D model copyrights for Festett Szobrok.",
  alternates: { canonical: "/aszf/en" },
  openGraph: {
    title: `Legal Disclaimer & Terms — ${SITE_NAME}`,
    description:
      "Legal disclaimer and copyright notice for Festett Szobrok.",
    url: `${SITE_URL}/aszf/en`,
    type: "website",
  },
};

export default function AszfEnPage() {
  return (
    <div className="flex min-h-full flex-col bg-zinc-950">
      <Navbar />
      <LegalDisclaimer lang="en" />
      <Footer />
    </div>
  );
}
