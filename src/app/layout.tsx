import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  SITE_KEYWORDS_CSV,
  absoluteUrl,
} from "@/lib/seo";
import { SOCIAL_LINKS } from "@/components/SocialBrand";
import ReferralTracker from "@/components/ReferralTracker";

// Google Search Console verifikáció. Ha a NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
// env változó be van állítva (a Google „Meta tag" módszeréhez adott token),
// minden oldal <head>-jébe bekerül a google-site-verification meta tag.
// Build után lép életbe (NEXT_PUBLIC_* build időben kerül be a HTML-be).
const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

// A mono csak dekoratív index-számokhoz kell (pl. „01."), ezért nem preloadoljuk:
// így a főoldal kritikus útvonalán két woff2 (~30 KB) lemarad, a mono pedig
// font-display: swap-pel utólag, csak akkor töltődik be, ha tényleg használt.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Kézzel festett figurák és 3D nyomtatott szobrok`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [...SITE_KEYWORDS_CSV.split(", ")],
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "hu_HU",
    url: "/",
    title: `${SITE_NAME} — Kézzel festett figurák és 3D nyomtatott szobrok`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/images/og-default.png",
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — kézzel festett figurák és gyűjtői szobrok`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Kézzel festett figurák és 3D nyomtatott szobrok`,
    description: SITE_DESCRIPTION,
    images: ["/images/og-default.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: "/icon.svg",
  },
  ...(googleVerification
    ? { verification: { google: googleVerification } }
    : {}),
  category: "art",
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
};

const orgJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: absoluteUrl("/icon.svg"),
      image: absoluteUrl("/images/og-default.png"),
      description:
        "Kézzel festett figurák és 3D nyomtatott gyűjtői szobrok — egyedi megrendelés, prémium műgyanta nyomtatás és kézi akril festés.",
      sameAs: SOCIAL_LINKS.map((s) => s.href),
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      alternateName: "festettszobrok.com",
      inLanguage: "hu-HU",
      publisher: { "@id": `${SITE_URL}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${SITE_URL}/portfolio?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="hu"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <ReferralTracker />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        {/* Umami Cloud analitika — sütimentes (cookieless), így a látogatók
            hozzájárulása nélkül is használható. A betöltés az oldal interaktívvá
            válása után történik (afterInteractive), így nem lassítja az LCP-t. */}
        <Script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="45d98797-27da-454a-8da5-48f83fde1e64"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
