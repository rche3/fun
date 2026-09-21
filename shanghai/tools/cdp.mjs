// Minimal CDP driver for headless Chrome. import { open } from './cdp.mjs'
import { spawn } from 'node:child_process';
import os from 'node:os';
import { mkdtempSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export async function open() {
  const dir = mkdtempSync(os.tmpdir() + '/cdp-');
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars', '--window-size=1400,1000',
    '--remote-debugging-port=0', `--user-data-dir=${dir}`, 'about:blank'], { stdio: 'ignore' });
  let port;
  for (let i = 0; i < 80 && !port; i++) { await sleep(150); if (existsSync(dir + '/DevToolsActivePort')) port = readFileSync(dir + '/DevToolsActivePort', 'utf8').split('\n')[0]; }
  const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 0; const pending = {};
  ws.onmessage = e => { const m = JSON.parse(e.data); if (pending[m.id]) { pending[m.id](m); delete pending[m.id]; } };
  const send = (method, params = {}) => new Promise((r, j) => { pending[++id] = m => m.error ? j(new Error(method + ': ' + m.error.message)) : r(m.result); ws.send(JSON.stringify({ id, method, params })); });
  const js = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'js error'); return r.result.value; };
  const page = {
    send, js,
    async size(w, h, mobile, dpr) {
      await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: dpr || 2, mobile, screenOrientation: w > h ? { type: 'landscapePrimary', angle: 90 } : { type: 'portraitPrimary', angle: 0 } });
      await send('Emulation.setTouchEmulationEnabled', { enabled: mobile, maxTouchPoints: 5 });
      await sleep(400);
    },
    async go(url) { await send('Page.enable'); await send('Page.navigate', { url }); await this.mapReady(); },
    async mapReady() {
      const q = `(() => { let g; if (!window.__map) return false; __map.eachLayer(l => { if (l.getMaplibreMap) g = l.getMaplibreMap(); }); return !!g && g.loaded() && g.areTilesLoaded(); })()`;
      for (let i = 0; i < 60; i++) { await sleep(400); try { if (await js(q)) break; } catch {} }
      await sleep(600);
    },
    async rect(sel) { const r = await js(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const b = e.getBoundingClientRect(); return {x: b.x + b.width/2, y: b.y + b.height/2, w: b.width, h: b.height, vis: b.width > 0 && b.height > 0}; })()`); if (!r) throw new Error('no element ' + sel); return r; },
    async tap(sel) { await js(`document.querySelector(${JSON.stringify(sel)}).scrollIntoView({block: 'nearest', inline: 'nearest'})`); await sleep(250); const r = await this.rect(sel); try { await send('Input.synthesizeTapGesture', { x: r.x, y: r.y, gestureSourceType: 'touch' }); } catch (e) { const vp = await js('JSON.stringify([innerWidth, innerHeight, visualViewport.offsetLeft, visualViewport.offsetTop, visualViewport.scale])'); throw new Error(`tap ${sel} at ${Math.round(r.x)},${Math.round(r.y)} viewport ${vp}: ${e.message}`); } await sleep(700); return r; },
    async swipe(sel, dy) {
      const r = await this.rect(sel); const pts = y => [{ x: r.x, y }];
      await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(r.y) });
      for (let i = 1; i <= 5; i++) { await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts(r.y + dy * i / 5) }); await sleep(20); }
      await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(700);
    },
    async shot(path) { await sleep(300); const { data } = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(path, Buffer.from(data, 'base64')); },
    close() { try { ws.close(); } catch {} chrome.kill('SIGKILL'); },
  };
  return page;
}
