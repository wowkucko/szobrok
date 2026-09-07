import { test, expect } from "@playwright/test";

const SLUG = "/blog/test-atreus-portrait-bust";

test.describe("Blog terméksáv (mobil)", () => {
  test("sáv megjelenik a Cults-gomb felett, nyilakkal görgethető", async ({
    page,
  }) => {
    await page.goto(SLUG, { waitUntil: "networkidle" });

    const strip = page.getByRole("region", {
      name: "Megvásárolható alkotásaim",
    });
    await expect(strip).toBeVisible();

    // Termékkártyák a portfólióból
    const cards = strip.locator('a[href^="/portfolio/"]');
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThanOrEqual(3);

    // Nincs látható scrollbar — csak a léptető nyilak
    const scrollbarWidth = await strip
      .locator("div.overflow-x-auto")
      .evaluate(
        (el) => getComputedStyle(el).scrollbarWidth
      );
    expect(scrollbarWidth).toBe("none");

    // A sáv görgethető (több tartalom, mint ami kifér)
    const scrollable = await strip
      .locator("div.overflow-x-auto")
      .evaluate((el) => el.scrollWidth > el.clientWidth + 1);
    expect(scrollable).toBe(true);

    // Nyilak látszanak és a jobbra nyíl tényleg görget
    const next = strip.getByRole("button", { name: "Következő alkotások" });
    const prev = strip.getByRole("button", { name: "Előző alkotások" });
    await expect(next).toBeVisible();
    await expect(prev).toBeVisible();

    const track = strip.locator("div.overflow-x-auto");
    const before = await track.evaluate((el) => el.scrollLeft);
    // Valódi érintés a nyíl közepére (nincs Playwright-féle
    // automatikus visszagörgetés): a sávot középre görgetjük, ahogy
    // a felhasználó is látná, megvárjuk a lusta képek beálltát,
    // és ujjal koppintunk — ez a koppinthatóságot is ellenőrzi.
    await strip.evaluate((el) =>
      el.scrollIntoView({ block: "center", inline: "nearest" })
    );
    await page.waitForTimeout(800);
    const hit = await next.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return t === el || (t instanceof Element && el.contains(t));
    });
    expect(hit).toBe(true);
    const box = await next.boundingBox();
    await page.touchscreen.tap(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.waitForFunction(
      (b) =>
        (document.querySelector("section[aria-label='Megvásárolható alkotásaim'] div.overflow-x-auto") as HTMLElement).scrollLeft > b,
      before
    );
    const after = await track.evaluate((el) => el.scrollLeft);
    expect(after).toBeGreaterThan(before);

    // Sorrend: a sáv a Cults-gomb FELETT van
    const stripBox = await strip.boundingBox();
    const cults = page.getByRole("link", { name: /Megtekintem a Cults3D-on/ });
    await expect(cults).toBeVisible();
    const cultsBox = await cults.boundingBox();
    expect(stripBox!.y + stripBox!.height).toBeLessThan(cultsBox!.y);

    // Kártya koppintás a portfólió termékoldalra visz: vissza az
    // elejére, majd ujjal a látható első kártya közepére.
    await track.evaluate((el) => el.scrollTo({ left: 0 }));
    await page.waitForFunction(
      () =>
        (document.querySelector("section[aria-label='Megvásárolható alkotásaim'] div.overflow-x-auto") as HTMLElement).scrollLeft < 1
    );
    await strip.evaluate((el) =>
      el.scrollIntoView({ block: "center", inline: "nearest" })
    );
    await page.waitForTimeout(800);
    const cardBox = await cards.first().boundingBox();
    await page.touchscreen.tap(
      cardBox!.x + cardBox!.width / 2,
      cardBox!.y + cardBox!.height / 2
    );
    await expect(page).toHaveURL(/\/portfolio\/.+/);

    await page.goto(SLUG, { waitUntil: "networkidle" });
    await page
      .getByRole("region", { name: "Megvásárolható alkotásaim" })
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: "C:/Users/Tomi/AppData/Local/Temp/opencode/blog-sav-mobil.png",
    });
  });
});
