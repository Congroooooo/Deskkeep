import { useEffect, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { ChevronLeft, ChevronRight, Moon, Sun, X, ZoomIn, ZoomOut } from "lucide-react";

// Per-viewer convenience only (reading mode). Never used for vault data.
const NIGHT_KEY = "deskkeep-reader-night";
const readNight = () => {
  try {
    return window.localStorage.getItem(NIGHT_KEY) === "1";
  } catch {
    return false;
  }
};
const writeNight = (on: boolean) => {
  try {
    window.localStorage.setItem(NIGHT_KEY, on ? "1" : "0");
  } catch {
    /* storage unavailable: keep the choice for this session only */
  }
};

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

// In-app reader. The PDF is decrypted into memory by the main process and rendered
// here with pdf.js. Nothing is written to disk. Closing reports the page you stopped on.
export default function PdfReader({
  bookId,
  title,
  startPage,
  onClose,
}: {
  bookId: string;
  title: string;
  startPage: number;
  onClose: (page: number) => void;
}) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(Math.max(1, startPage || 1));
  const [pageCount, setPageCount] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [night, setNight] = useState(readNight);
  const toggleNight = () =>
    setNight((on) => {
      writeNight(!on);
      return !on;
    });
  const canvas = useRef<HTMLCanvasElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const task = useRef<{ cancel: () => void } | null>(null);

  // Load the document once.
  useEffect(() => {
    let alive = true;
    let loading_: pdfjs.PDFDocumentLoadingTask | null = null;
    (async () => {
      const bytes = await window.deskkeep.readBook(bookId);
      // Decoders and font data ship in public/pdfjs (JBIG2/JPEG2000 images, CJK and standard fonts).
      loading_ = pdfjs.getDocument({
        data: bytes,
        wasmUrl: new URL("pdfjs/wasm/", document.baseURI).href,
        cMapUrl: new URL("pdfjs/cmaps/", document.baseURI).href,
        cMapPacked: true,
        standardFontDataUrl: new URL("pdfjs/standard_fonts/", document.baseURI).href,
      });
      const loaded = await loading_.promise;
      if (!alive) return;
      setDoc(loaded);
      setPageCount(loaded.numPages);
      setPage((p) => Math.min(Math.max(1, p), loaded.numPages));
    })()
      .catch((e) => {
        if (alive) setError(String((e as Error).message || "The PDF could not be opened."));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
      // Destroying the loading task frees the document and its worker.
      loading_?.destroy();
    };
  }, [bookId]);

  // Fit the first page to the available width once the document is ready.
  useEffect(() => {
    if (!doc || !stage.current) return;
    doc.getPage(1).then((first) => {
      const width = first.getViewport({ scale: 1 }).width;
      const available = (stage.current?.clientWidth || 800) - 48;
      setScale(Math.min(2, Math.max(0.5, available / width)));
    });
  }, [doc]);

  // Render the current page at the current zoom.
  useEffect(() => {
    if (!doc || !canvas.current) return;
    let cancelled = false;
    (async () => {
      const current = await doc.getPage(page);
      if (cancelled || !canvas.current) return;
      const dpr = window.devicePixelRatio || 1;
      const viewport = current.getViewport({ scale: scale * dpr });
      const target = canvas.current;
      target.width = Math.floor(viewport.width);
      target.height = Math.floor(viewport.height);
      target.style.width = `${viewport.width / dpr}px`;
      target.style.height = `${viewport.height / dpr}px`;
      task.current?.cancel();
      const rendering = current.render({ canvasContext: target.getContext("2d")!, canvas: target, viewport });
      task.current = rendering;
      await rendering.promise.catch(() => {
        /* a newer render replaced this one */
      });
    })().catch((e) => {
      if (!cancelled) setError(String((e as Error).message));
    });
    return () => {
      cancelled = true;
    };
  }, [doc, page, scale]);

  const go = (next: number) => {
    if (!pageCount) return;
    setPage(Math.min(pageCount, Math.max(1, next)));
  };

  // Keyboard: arrows and page keys turn pages, Escape closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(page);
      if (e.key === "ArrowRight" || e.key === "PageDown") go(page + 1);
      if (e.key === "ArrowLeft" || e.key === "PageUp") go(page - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="reader" role="dialog" aria-modal="true" aria-label={`Reading ${title}`}>
      <header className="reader-bar">
        <strong className="reader-title" title={title}>
          {title}
        </strong>
        <div className="reader-controls">
          <button onClick={() => go(page - 1)} disabled={page <= 1} aria-label="Previous page">
            <ChevronLeft size={16} />
          </button>
          <span>
            Page{" "}
            <input
              type="number"
              min={1}
              max={pageCount || 1}
              value={page}
              aria-label="Current page"
              onChange={(e) => go(Number(e.target.value))}
            />{" "}
            of {pageCount || "…"}
          </span>
          <button onClick={() => go(page + 1)} disabled={!pageCount || page >= pageCount} aria-label="Next page">
            <ChevronRight size={16} />
          </button>
          <span className="reader-sep" />
          <button onClick={() => setScale((s) => Math.max(0.5, +(s - 0.2).toFixed(2)))} aria-label="Zoom out">
            <ZoomOut size={16} />
          </button>
          <span>{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale((s) => Math.min(3, +(s + 0.2).toFixed(2)))} aria-label="Zoom in">
            <ZoomIn size={16} />
          </button>
          <span className="reader-sep" />
          <button
            onClick={toggleNight}
            aria-label={night ? "Use light page" : "Use dark page"}
            aria-pressed={night}
            title={night ? "Light page" : "Dark page for night reading"}
          >
            {night ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <span className="reader-sep" />
          <button onClick={() => onClose(page)} aria-label="Close reader">
            <X size={16} />
          </button>
        </div>
      </header>
      <div className="reader-stage" ref={stage}>
        {loading && <p className="quiet">Decrypting and opening…</p>}
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        <canvas ref={canvas} className={`reader-page${night ? " is-night" : ""}`} aria-label={`Page ${page}`} />
      </div>
    </div>
  );
}
