import Navbar from "@/components/Navbar";
import ScrollToHash from "@/components/ScrollToHash";
import Hero from "@/components/Hero";
import TrustTiles from "@/components/TrustTiles";
import FeaturedWorks from "@/components/FeaturedWorks";
import CommissionProcess from "@/components/CommissionProcess";
import About from "@/components/About";
import NewsletterForm from "@/components/NewsletterForm";
import ContactForm from "@/components/ContactForm";
import DiscountCta from "@/components/DiscountCta";
import Footer from "@/components/Footer";

// A főoldal minden kérésnél frissen renderelődik, mert a kedvezményes
// (DiscountCta) blokk értéke az adminban kezelt kuponoktól függ, és azonnal
// tükröznie kell a változást (ne fagyjon be a build idejére).
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-950 text-zinc-100">
      <ScrollToHash />
      <Navbar />
      <main className="flex-1">
        <Hero />
        <TrustTiles />
        <FeaturedWorks />
        <CommissionProcess />
        <About />
        {/* Hírlevél — a Rólam blokk után, a Kapcsolat előtt: aki már
            látta a munkákat és megismerte a műhelyt, itt iratkozhat fel
            az új darabokról szóló értesítésre. */}
        <section className="border-b border-zinc-800/60">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
                Ne maradj le az{" "}
                <span className="bg-gradient-to-r from-amber-500 to-amber-700 bg-clip-text text-transparent">
                  új darabokról
                </span>
              </h2>
              <p className="mt-4 leading-7 text-zinc-400">
                Iratkozz fel a hírlevélre, és elsőként értesülj az új kézzel
                festett szobrokról, valamint az egyedi megrendelési
                lehetőségekről.
              </p>
            </div>
            <div className="mx-auto mt-10 max-w-2xl">
              <NewsletterForm />
            </div>
          </div>
        </section>
        <ContactForm />
        <DiscountCta />
      </main>
      <Footer showNewsletter={false} />
    </div>
  );
}
