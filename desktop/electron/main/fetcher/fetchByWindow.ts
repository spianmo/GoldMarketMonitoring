import { BrowserWindow, session } from 'electron';

const TARGET = 'https://perbank.czbank.com/PERBANK/pbIndex.jsp?menuFlag=1';
const PARTITION = 'persist:fetcher';

let win: BrowserWindow | null = null;
let inflight: Promise<{ price: number; raw: string }> | null = null;

function ensureWindow(): BrowserWindow {
  if (win && !win.isDestroyed()) return win;
  const fetcherSession = session.fromPartition(PARTITION);
  win = new BrowserWindow({
    show: false,
    width: 1024,
    height: 768,
    webPreferences: {
      session: fetcherSession,
      webSecurity: false,
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.on('closed', () => {
    win = null;
  });
  return win;
}

const READ_SCRIPT = `
(function(){
  function scan(doc){
    if (!doc) return null;
    var bs = doc.getElementsByTagName('b');
    for (var i=0; i<bs.length; i++) {
      var t = (bs[i].textContent || '').trim();
      if (t.indexOf('元/克') === -1) continue;
      var m = t.match(/([0-9]{1,3}(?:,[0-9]{3})*\\.[0-9]{1,4})/);
      if (m) return { raw: m[1], price: Number(m[1].replace(/,/g,'')) };
    }
    var body = (doc.body && doc.body.innerText) || '';
    var idx = body.indexOf('元/克');
    if (idx > -1) {
      var around = body.slice(Math.max(0, idx-40), idx);
      var mm = around.match(/([0-9]{1,3}(?:,[0-9]{3})*\\.[0-9]{1,4})/);
      if (mm) return { raw: mm[1], price: Number(mm[1].replace(/,/g,'')) };
    }
    return null;
  }
  var hit = scan(document);
  if (hit) return hit;
  var frs = document.getElementsByTagName('iframe');
  for (var i=0; i<frs.length; i++) {
    try {
      var d = frs[i].contentDocument;
      hit = scan(d);
      if (hit) return hit;
    } catch (_e) {}
  }
  return null;
})();
`;

async function readPriceFromWindow(w: BrowserWindow): Promise<{ price: number; raw: string }> {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    try {
      const got = (await w.webContents.executeJavaScript(READ_SCRIPT, true)) as
        | { price: number; raw: string }
        | null;
      if (got && Number.isFinite(got.price) && got.price > 0) {
        return got;
      }
    } catch {
      // ignore and retry
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error('window 抓取超时:未在 8 秒内提取到金价');
}

export function fetchPriceByWindow(): Promise<{ price: number; raw: string }> {
  if (inflight) return inflight;
  const w = ensureWindow();
  inflight = (async () => {
    try {
      if (w.webContents.getURL() !== TARGET) {
        await w.loadURL(TARGET).catch(() => undefined);
      } else {
        await w.webContents.reload();
      }
      return await readPriceFromWindow(w);
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export function destroyFetcherWindow() {
  if (win && !win.isDestroyed()) {
    win.destroy();
    win = null;
  }
}
