"use client";

import { useEffect, useRef } from "react";
import {
  Bold,
  Eraser,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pilcrow,
  Quote,
  Underline,
  Unlink,
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
}

const BTN =
  "flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100";

/** A blokk-szintű elemek, amikre a formázás vonatkozik. */
const BLOCK_TAGS = new Set(["P", "H1", "H2", "H3", "H4", "BLOCKQUOTE", "LI", "PRE"]);

/**
 * Beépített HTML szerkesztő (contentEditable) az admin űrlaphoz.
 *
 * A formázó műveletek megőrzik a kijelölést és nem görgetik el a nézetet
 * (focus preventScroll), a blokk-formázás (bekezdés / cím / idézet) pedig
 * manuális DOM-művelettel történik az elavult execCommand helyett.
 * Az onChange hívások requestAnimationFrame-mentén összevontan mennek ki,
 * így hosszú szövegek gépelése sem rendereli újra a teljes űrlapot minden
 * billentyűnél.
 */
export default function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const ready = useRef(false);
  const pendingHtml = useRef<string | null>(null);
  const rafId = useRef<number | null>(null);

  // Az értéket csak egyszer, mount-kor írjuk be — a felhasználó gépelése
  // közben sosem írjuk felül a kurzort/állapotot.
  useEffect(() => {
    if (ref.current && !ready.current) {
      ready.current = true;
      ref.current.innerHTML = value;
    }
  }, [value]);

  /** onChange kiküldése — legfeljebb képkockánként egyszer (RAF összevonás),
   *  így a gépelés nem rendereli újra az egész űrlapot minden karakterre. */
  const flushChange = () => {
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
    if (pendingHtml.current !== null) {
      const html = pendingHtml.current;
      pendingHtml.current = null;
      onChange(html);
    }
  };

  const scheduleChange = (html: string) => {
    pendingHtml.current = html;
    if (rafId.current === null) {
      rafId.current = requestAnimationFrame(() => {
        rafId.current = null;
        flushChange();
      });
    }
  };

  useEffect(() => {
    return () => {
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
      // A legutolsó gépelt tartalom se vesszen el komponens-törlésnél.
      if (pendingHtml.current !== null) {
        const html = pendingHtml.current;
        pendingHtml.current = null;
        onChange(html);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** A szerkesztőben lévő aktuális kijelölés elmentése (ha az a szerkesztőn belül van). */
  const saveRange = (editor: HTMLElement): Range | null => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return null;
    return range.cloneRange();
  };

  /** Elmentett kijelölés visszaállítása aktív kijelölésként. */
  const restoreRange = (range: Range) => {
    const sel = window.getSelection();
    if (!sel) return;
    sel.removeAllRanges();
    sel.addRange(range);
  };

  /** Fókusz a szerkesztőre görgetés NÉLKÜL (nem ugrik a szöveg tetejére). */
  const focusEditor = (editor: HTMLElement) => {
    editor.focus({ preventScroll: true });
  };

  /** Inline / lista / link parancsok — a kijelölés mentésével és visszaállításával. */
  const run = (command: string, arg?: string) => {
    const editor = ref.current;
    if (!editor) return;
    const saved = saveRange(editor);
    focusEditor(editor);
    if (saved) restoreRange(saved);
    document.execCommand(command, false, arg);
    flushChange();
  };

  /** Blokk-formázás manuálisan (a flakon execCommand 'formatBlock' helyett):
   *  a kijelölt blokkokat átalakítja p / h2 / blockquote típusúra.
   *  Ha a blokk már azonos típusú, visszaváltja bekezdésre (toggle). */
  const formatBlock = (tag: "p" | "h2" | "blockquote") => {
    const editor = ref.current;
    if (!editor) return;
    const saved = saveRange(editor);
    if (!saved) return;
    focusEditor(editor);
    restoreRange(saved);

    const range = window.getSelection()?.getRangeAt(0);
    if (!range) return;

    // A kijelölést metsző blokk-elemek összegyűjtése (a szerkesztőn belül).
    const blocks: HTMLElement[] = [];
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_ELEMENT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const el = node as HTMLElement;
      if (el === editor || el === editor.parentElement) continue;
      if (!BLOCK_TAGS.has(el.tagName)) continue;
      if (range.intersectsNode(el)) blocks.push(el);
    }

    for (const block of blocks) {
      const current = block.tagName.toLowerCase();
      const target = current === tag ? "p" : tag;
      const newEl = document.createElement(target);
      while (block.firstChild) newEl.appendChild(block.firstChild);
      block.replaceWith(newEl);
    }

    // Kurzor a (cím)blokk elejére, hogy a következő formázás is jól működjön.
    const firstNew = editor.querySelector("h2, blockquote") ?? editor;
    const sel = window.getSelection();
    if (sel) {
      const r = document.createRange();
      r.selectNodeContents(firstNew);
      r.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r);
    }

    flushChange();
  };

  const insertLink = () => {
    const editor = ref.current;
    if (!editor) return;
    // A prompt megnyitása előtt elmentjük a kijelölést — különben elvész.
    const saved = saveRange(editor);
    const url = window.prompt("Link URL-je:", "https://");
    if (!url) return;
    focusEditor(editor);
    if (saved) restoreRange(saved);
    document.execCommand("createLink", false, url);
    flushChange();
  };

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/60 focus-within:border-amber-600/60">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-zinc-800 bg-zinc-900/60 px-2 py-1.5">
        <button
          type="button"
          title="Félkövér"
          className={BTN}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => run("bold")}
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Dőlt"
          className={BTN}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => run("italic")}
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Aláhúzott"
          className={BTN}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => run("underline")}
        >
          <Underline className="h-4 w-4" />
        </button>
        <span className="mx-1 h-5 w-px bg-zinc-800" />
        <button
          type="button"
          title="Bekezdés"
          className={BTN}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => formatBlock("p")}
        >
          <Pilcrow className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Cím (H2)"
          className={BTN}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => formatBlock("h2")}
        >
          <Heading2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Idézet"
          className={BTN}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => formatBlock("blockquote")}
        >
          <Quote className="h-4 w-4" />
        </button>
        <span className="mx-1 h-5 w-px bg-zinc-800" />
        <button
          type="button"
          title="Felsorolás"
          className={BTN}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => run("insertUnorderedList")}
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Számozott lista"
          className={BTN}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => run("insertOrderedList")}
        >
          <ListOrdered className="h-4 w-4" />
        </button>
        <span className="mx-1 h-5 w-px bg-zinc-800" />
        <button
          type="button"
          title="Link beszúrása"
          className={BTN}
          onMouseDown={(e) => e.preventDefault()}
          onClick={insertLink}
        >
          <Link2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Link eltávolítása"
          className={BTN}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => run("unlink")}
        >
          <Unlink className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Formázás törlése"
          className={BTN}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => run("removeFormat")}
        >
          <Eraser className="h-4 w-4" />
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        onInput={() => {
          if (ref.current) scheduleChange(ref.current.innerHTML);
        }}
        className="min-h-[240px] px-4 py-3 text-sm leading-7 text-zinc-200 outline-none [&_a]:text-amber-500 [&_a]:underline [&_blockquote]:mt-3 [&_blockquote]:border-l-2 [&_blockquote]:border-amber-600 [&_blockquote]:pl-3 [&_blockquote]:text-zinc-400 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-zinc-100 [&_li]:ml-5 [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:pl-1 [&_p]:mt-3 [&_p]:first:mt-0 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-1"
      />
      <p className="border-t border-zinc-800/60 px-4 py-2 text-[11px] text-zinc-600">
        Formázott szöveg — a „Részletes leírás” blokkban HTML-ként jelenik meg a
        termékoldalon.
      </p>
    </div>
  );
}
