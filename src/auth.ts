import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// Engedélyezett e-mailek — vesszővel elválasztva. Fallback a kért címre.
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

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  callbacks: {
    // Csak a whitelist-en lévő Google fiók léphet be
    async signIn({ user }) {
      if (!user.email) return false;
      const allowed = getAllowedEmails();
      // Ha nincs beállítva OAuth (pl. dev fallback), ne blokkoljuk a middleware Basic Auth-ot
      // Viszont ha OAuth be van állítva, szigorúan ellenőrizzük
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        return true;
      }
      return allowed.has(user.email.toLowerCase());
    },
  },
});
