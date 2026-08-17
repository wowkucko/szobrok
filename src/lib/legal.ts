// A jogi nyilatkozat (ÁSZF) tartalma magyarul és angolul — a weboldal tulajdonosa
// által készített dokumentumok alapján. A szekciók struktúrája tükrözi az
// eredeti PDF-ek felépítését (jogi_nyilatkozat.pdf / legal_disclaimer.pdf).

export type LegalLang = "hu" | "en";

export interface LegalSection {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface LegalDoc {
  lang: LegalLang;
  title: string;
  subtitle: string;
  notice: string;
  sections: LegalSection[];
  footer: string;
}

export const LEGAL_DOCS: Record<LegalLang, LegalDoc> = {
  hu: {
    lang: "hu",
    title: "Jogi nyilatkozat és szerzői jogi tájékoztató",
    subtitle:
      "Magánjellegű hobbi tevékenységre, egyedi gyűjteményi darabokra és festési szolgáltatásra vonatkozó szabályzat",
    notice:
      "FONTOS JOGI FIGYELMEZTETÉS: A weboldalon található tartalom és szolgáltatások kizárólag magánszemély hobbi jellegű kézműves festési tevékenységéhez, illetve licencelt vagy megrendelő által biztosított modellek megmunkálásához kapcsolódnak.",
    sections: [
      {
        title: "1. A tevékenység jellege és a szobrok értékesítése",
        paragraphs: [
          "A weboldal üzemeltetője nem foglalkozik 3D nyomtatott termékek üzletszerű, sorozatban történő gyártásával vagy kereskedelmével. A weboldalon időszakosan megjelenő, készre festett szobrok kizárólag magáncélú, hobbi jellegű alkotótevékenység (kézi festés) eredményei.",
          "Ezekből a tárgyakból kivétel nélkül egyetlen egyedi darab (1 db) létezik. Az értékesítésre kínált darabok a saját gyűjtemény részét képezik, amelyek értékesítésére kizárólag helyhiány, illetve a gyűjtemény természetes forgása miatt kerül sor. Tömeges, kereskedelmi léptékű értékesítés vagy raktárkészletről történő eladás nem történik.",
        ],
      },
      {
        title: "2. Jogdíjas karakterek és védjegyek korlátozása",
        paragraphs: [
          "Harmadik fél által védjegyezett vagy szerzői jogi oltalom alatt álló karakterekről (pl. Marvel, DC, Disney és egyéb jogvédett szellemi tulajdonok):",
        ],
        bullets: [
          "Egyedi megrendelésre termékgyártást, nyomtatást vagy festést NEM vállalok.",
          "Jogdíjas karakterek sorozatgyártása vagy kereskedelmi célú újrahasznosítása nem képezi a tevékenység részét.",
          "A megrendelő nem kérheti harmadik fél szellemi tulajdonát képező figurák engedély nélküli legyártását vagy lefestését.",
        ],
      },
      {
        title: "3. Szolgáltatási modell és hozott modellek (Bérmunka)",
        paragraphs: [
          "A weboldalon elérhető szolgáltatás elsősorban egyedi kézi festésre és felületkezelésre vonatkozik. A munkamenet az alábbiak szerint alakulhat:",
        ],
        bullets: [
          "Hozott modell: A megrendelő maga biztosítja a kinyomtatott 3D modellt vagy az STL fájlt, és kizárólag a festési szolgáltatást rendeli meg. Ebben az esetben a megrendelő felelőssége a modell jogtisztaságának biztosítása.",
          "Kereskedelmi licenccel rendelkező modellek: A weboldalon kínált vagy felhasznált 3D modellek alapjai kizárólag olyan független 3D tervezőktől származnak, akik a modellek fizikai értékesítésére vonatkozóan érvényes üzleti licenccel (Commercial License / Patreon Merchant Tier) rendelkeznek.",
        ],
      },
      {
        title: "4. Felelősségkizárás a 3D modellek szerzői jogaiért",
        paragraphs: [
          "Az oldalon megjelenő modellek 3D tervezési joga és szellemi tulajdona a független digitális művészeket és tervezőket illeti meg. Az üzemeltető kizárólag a fizikai felületkezelési és festési munkát végzi el, illetve a törvényes kereskedelmi licencek határain belül jár el.",
          "A weboldal üzemeltetője kifejezetten kizárja a felelősséget a 3D modellek tervezőinek esetleges szerzői jogi vagy védjegybitorlási mulasztásaiért. A látogatók és vásárlók a weboldal használatával és a vásárlással kifejezetten tudomásul veszik és elfogadják ezen felelősségkorlátozást.",
        ],
      },
    ],
    footer:
      "Jogi nyilatkozat | Készült a weboldalon történő közzététel és tájékoztatás céljából.",
  },
  en: {
    lang: "en",
    title: "Legal Disclaimer and Copyright Notice",
    subtitle:
      "Policy regarding private hobby activities, single collection items, and miniature painting services",
    notice:
      "IMPORTANT LEGAL NOTICE: The content and services on this website relate strictly to private hobby-level artisan painting activities, as well as the processing of licensed models or items provided directly by the customer.",
    sections: [
      {
        title: "1. Nature of Business and Sale of Statues",
        paragraphs: [
          "The operator of this website is not engaged in the commercial or mass production and distribution of 3D printed products. The fully painted statues displayed on the website from time to time are exclusively the result of private, hobby-based artistic endeavors (hand painting).",
          "Without exception, only a single unique piece (1 unit) exists of each item. Items offered for sale are part of a private personal collection, offered solely due to limited space or personal collection rotation. Mass production, commercial distribution, or sales from warehouse inventory do not occur.",
        ],
      },
      {
        title: "2. Restrictions on Copyrighted Characters and Trademarks",
        paragraphs: [
          "Regarding characters protected by third-party trademarks or copyrights (e.g., Marvel, DC, Disney, and other intellectual properties):",
        ],
        bullets: [
          "Custom manufacturing, printing, or painting orders for copyrighted characters are NOT accepted.",
          "Mass production or commercial exploitation of copyrighted characters is strictly outside the scope of activities.",
          "Customers may not request the unauthorized production or painting of figures belonging to third-party intellectual property.",
        ],
      },
      {
        title: "3. Service Model and Customer-Provided Models (Commission Work)",
        paragraphs: [
          "The service available through this website focuses primarily on custom hand painting and surface finishing. The service model operates under the following conditions:",
        ],
        bullets: [
          "Customer-provided model: The customer supplies the printed 3D model or STL file and purchases only the painting service. In such cases, it is the customer's sole responsibility to ensure the model is legally acquired.",
          "Commercially licensed models: Any 3D model bases offered or utilized on this website originate exclusively from independent 3D designers who hold valid commercial distribution licenses (e.g., Commercial License / Patreon Merchant Tier).",
        ],
      },
      {
        title: "4. Disclaimer of Liability for 3D Model Copyrights",
        paragraphs: [
          "The 3D design rights and intellectual property of the models featured on this site belong to their respective independent digital artists and designers. The site operator performs physical surface treatment and hand-painting services only, acting strictly within the boundaries of lawful commercial licenses where applicable.",
          "The website operator expressly disclaims all liability for any copyright or trademark infringements committed by third-party 3D model designers. By using this website or purchasing services/items, visitors and buyers expressly acknowledge and agree to this limitation of liability.",
        ],
      },
    ],
    footer:
      "Legal Disclaimer | Created for publication and informational purposes on the website.",
  },
};

// Rövid címkék a checkbox-szövegekhez (a formokban).
export const LEGAL_ACCEPT_LABEL: Record<LegalLang, string> = {
  hu: "Elfogadom a jogi nyilatkozatot és az ÁSZF-et",
  en: "I accept the legal disclaimer and terms",
};
