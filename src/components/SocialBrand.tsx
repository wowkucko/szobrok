// Közös social media márkaikonok és linkek.
// Minden komponens (csempe, lábjegyzet, kapcsolat) ezt a modult használja,
// így a platformok és a linkek mindenhol egységesek.

export function InstagramIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="ig-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F09433" />
          <stop offset="0.25" stopColor="#E6683C" />
          <stop offset="0.5" stopColor="#DC2743" />
          <stop offset="0.75" stopColor="#CC2366" />
          <stop offset="1" stopColor="#BC1888" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5.5" fill="none" stroke="url(#ig-grad)" strokeWidth="2.2" />
      <circle cx="12" cy="12" r="4.4" fill="none" stroke="url(#ig-grad)" strokeWidth="2.2" />
      <circle cx="17.3" cy="6.7" r="1.4" fill="url(#ig-grad)" />
    </svg>
  );
}

export function FacebookIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#1877F2"
        d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
      />
    </svg>
  );
}

export function TikTokIcon({ className = "h-6 w-6" }: { className?: string }) {
  const path =
    "M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z";
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#25F4EE" d={path} transform="translate(-0.8 -0.8)" />
      <path fill="#FE2C55" d={path} transform="translate(0.8 0.8)" />
      <path fill="#ffffff" d={path} />
    </svg>
  );
}

// Mindenhol ugyanaz a három platform, ugyanazokkal a (placeholder) linkekkel.
// A valódi profil URL-eket itt, egy helyen cserélheted le.
export const SOCIAL_LINKS = [
  { name: "Instagram", href: "https://www.instagram.com/", Icon: InstagramIcon },
  { name: "Facebook", href: "https://www.facebook.com/", Icon: FacebookIcon },
  { name: "TikTok", href: "https://www.tiktok.com/", Icon: TikTokIcon },
];
