// Prints a PDF (the electronic invoice) from the browser.
//
// A web page cannot print silently: print() always opens the OS dialog. On a
// counter PC running Chrome with --kiosk-printing the dialog is skipped and the
// job goes straight to the default printer, which is the "one tap" setup.
//
// The PDF lives in Firebase Storage (another origin), so it is fetched as a
// blob first (bucket CORS allows GET) and loaded in a hidden same-origin iframe
// whose window can be printed. Mobile browsers do not render PDFs inside an
// iframe (Android downloads them, iOS prints blank) and Safari/Firefox print a
// blank page from one without throwing, so the iframe path is taken only on
// desktop Chromium; everywhere else the PDF opens in a new tab and the user
// prints from the viewer.

const UA = navigator.userAgent;
// iPadOS reports itself as a Macintosh; touch points tell it apart.
const MOBILE = /Android|iPhone|iPad|iPod/i.test(UA) || (/Macintosh/.test(UA) && navigator.maxTouchPoints > 1);
// Chrome, Edge and Opera all carry "Chrome/" and share the PDF viewer.
const CHROMIUM = /Chrome\//.test(UA);
const INLINE_PRINT = !MOBILE && CHROMIUM;
let frame: HTMLIFrameElement | null = null;
let blobUrl = '';

function release() {
  if (blobUrl) URL.revokeObjectURL(blobUrl);
  blobUrl = '';
  frame?.remove();
  frame = null;
}

/** Opens the print dialog with the PDF loaded. Resolves once the dialog was requested. */
export async function printPdf(url: string): Promise<void> {
  if (!INLINE_PRINT) {
    // Must be synchronous inside the click handler or the popup blocker eats it.
    window.open(url, '_blank', 'noopener');
    return;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo descargar el PDF (${res.status})`);
  const blob = await res.blob();
  release();
  blobUrl = URL.createObjectURL(blob);
  const f = document.createElement('iframe');
  frame = f;
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  f.src = blobUrl;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('El PDF tardó demasiado en cargar')), 15000);
    f.onload = () => {
      clearTimeout(timer);
      try {
        f.contentWindow?.focus();
        f.contentWindow?.print();
        resolve();
      } catch (e) {
        reject(e);
      }
    };
    f.onerror = () => {
      clearTimeout(timer);
      reject(new Error('No se pudo cargar el PDF'));
    };
    document.body.appendChild(f);
  }).catch((e) => {
    release();
    // Last resort: let the browser's own viewer print it.
    window.open(url, '_blank', 'noopener');
    throw e;
  });
  // Keep the frame alive while the dialog is open; the blob is tiny to hold.
  setTimeout(release, 60000);
}
