import type { Metadata } from "next";
import Link from "next/link";
import { FileText, ShieldCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Adatvédelmi tájékoztató",
  description:
    "A Festett Szobrok adatvédelmi tájékoztatója: milyen személyes adatokat kezelünk (hírlevél, üzenetek, analitika), milyen jogok illetik meg, és hogyan lehet panaszt tenni a NAIH-nál.",
  alternates: { canonical: "/adatvedelem" },
  openGraph: {
    title: `Adatvédelmi tájékoztató — ${SITE_NAME}`,
    description:
      "A Festett Szobrok adatkezelési és adatvédelmi tájékoztatója a GDPR alapján.",
    url: `${SITE_URL}/adatvedelem`,
    type: "website",
  },
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-base font-semibold text-zinc-200">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-zinc-400">
        {children}
      </div>
    </section>
  );
}

export default function AdatvedelemPage() {
  return (
    <div className="flex min-h-full flex-col bg-zinc-950">
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
          <article className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 sm:p-10">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-600/30 bg-amber-600/10">
                <ShieldCheck className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold leading-tight text-zinc-100 sm:text-3xl">
                  Adatvédelmi tájékoztató
                </h1>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  A {SITE_NAME} weboldal adatkezelési tájékoztatója az Európai
                  Parlament és Tanács (EU) 2016/679 rendelete (GDPR) és a
                  magyar adatvédelmi jogszabályok alapján.
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-8">
              <Section title="1. Adatkezelő">
                <p>
                  A weboldalt a {SITE_NAME} működteti. Adatkezeléssel
                  kapcsolatos kérdéseidet, kéréseidet a{" "}
                  <a
                    href="mailto:festettszobrokmuhelye@gmail.com"
                    className="text-amber-500 underline-offset-2 hover:underline"
                  >
                    festettszobrokmuhelye@gmail.com
                  </a>{" "}
                  e-mail címen jelezheted.
                </p>
              </Section>

              <Section title="2. Hírlevél">
                <p>
                  A hírlevélre való feliratkozáshoz az e-mail címed (és
                  opcionálisan a neved) megadása szükséges. A feliratkozás
                  kizárólag kifejezett, önkéntes hozzájárulás alapján történik
                  (aktív jelölőnégyzet), és a hozzájárulást bármikor, egy
                  kattintással visszavonhatod a hírlevelek alján található
                  leiratkozási linkkel.
                </p>
                <p>
                  A hírlevél-küldéshez kettős megerősítést (double opt-in)
                  alkalmazunk: a feliratkozás csak akkor válik érvényessé, ha a
                  megerősítő e-mailben lévő linkre kattintasz. A hírleveleket a
                  MailerLite nevű adatfeldolgozó szolgáltatón keresztül
                  küldjük, amely a hozzájárulás visszavonásáig kezeli az
                  e-mail címedet.
                </p>
              </Section>

              <Section title="3. Üzenetek és ajánlatkérések">
                <p>
                  A kapcsolatfelvételi, ajánlatkérési és vásárlási
                  űrlapokon megadott adatokat (név, e-mail cím, üzenet,
                  szükség esetén melléklet) kizárólag a megkeresés
                  megválaszolásához, az ajánlat elkészítéséhez és a vásárlás
                  lebonyolításához használjuk. Az adatokhoz kizárólag a
                  weboldal adminisztrátora fér hozzá, jelszóval védett
                  felületen keresztül.
                </p>
              </Section>

              <Section title="4. Látogatottság-mérés (analitika)">
                <p>
                  A weboldal forgalmát a saját üzemeltetésű (ön-hostolt) Umami
                  rendszerrel mérjük. A mérés anonim, személyazonosításra
                  alkalmatlan, cookie-kat nem használ, és a látogatók
                  beleegyezése nélkül is jogszerű (GDPR 6. cikk (1) bekezdés f)
                  pont — jogos érdek).
                </p>
              </Section>

              <Section title="5. Érintetti jogok">
                <p>
                  A GDPR alapján jogod van:
                </p>
                <ul className="space-y-2">
                  {[
                    "hozzáféréshez — tájékoztatást kérni a kezelt adataidról,",
                    "a helyesbítéshez — a pontatlan adataid javíttatásához,",
                    "a törléshez (elfeledtetés) — adataid törléséhez,",
                    "a kezelés korlátozásához és a hordozhatósághoz,",
                    "a hozzájáruláson alapuló kezelés visszavonásához (pl. hírlevél-leiratkozás),",
                    "tiltakozáshoz az adataid kezelése ellen.",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 text-sm leading-6 text-zinc-400"
                    >
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                      {item}
                    </li>
                  ))}
                </ul>
                <p>
                  Kéréseidet a fenti e-mail címen jelezheted; azokra a jogszabály
                  szerinti határidőn belül (főszabály szerint 1 hónap) válaszolunk.
                </p>
              </Section>

              <Section title="6. Panasztételi jog">
                <p>
                  Ha úgy érzed, hogy az adataid kezelése jogsértő, panasszal
                  fordulhatsz a Nemzeti Adatvédelmi és Információszabadság
                  Hatósághoz (NAIH): 1055 Budapest, Falk Miksa utca 9–11.,
                  ugyfelszolgalat@naih.hu, www.naih.hu. Bírósághoz is fordulhatsz
                  az adatkezeléssel kapcsolatos jogvitában.
                </p>
              </Section>

              <Section title="7. Adatmegőrzési idő">
                <p>
                  A hírlevél-feliratkozási adatokat a hozzájárulás
                  visszavonásáig (leiratkozásig), az üzeneteket és
                  ajánlatkéréseket pedig az ügy lezárását követően legfeljebb a
                  jogszabályban előírt ideig őrizzük meg. A weboldal
                  jogosulatlan hozzáféréstől való védelmét technikai
                  intézkedésekkel biztosítjuk.
                </p>
              </Section>
            </div>

            <div className="mt-10 flex items-center gap-2 border-t border-zinc-800 pt-5 text-xs text-zinc-600">
              <FileText className="h-3.5 w-3.5" />
              Ez a tájékoztató tájékoztató jellegű; a végleges jogi szöveg
              elkészítéséhez fordulj jogászhoz.
            </div>
          </article>

          <p className="mt-8 text-center text-xs text-zinc-600">
            Utolsó frissítés: 2026 ·{" "}
            <Link href="/" className="underline-offset-2 hover:underline">
              Vissza a főoldalra
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
