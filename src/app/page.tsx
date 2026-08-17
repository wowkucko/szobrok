import Navbar from "@/components/Navbar";
import ScrollToHash from "@/components/ScrollToHash";
import Hero from "@/components/Hero";
import TrustTiles from "@/components/TrustTiles";
import FeaturedWorks from "@/components/FeaturedWorks";
import CommissionProcess from "@/components/CommissionProcess";
import About from "@/components/About";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";

// A főoldal periodikusan újragenerálódik, így a kiemelt (featured) termékek
// változása az admin oldalról legfeljebb 60 másodpercen belül megjelenik.
export const revalidate = 60;

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
        <ContactForm />
      </main>
      <Footer />
    </div>
  );
}
