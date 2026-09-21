// Touch-driven usability test: iPhone 17 Pro Max portrait + landscape, iPhone SE, desktop.
// Serve the site first (PORT=8077 python3 server.py), then: node tools/ux-test.mjs [out-dir]
// Test the live site instead with SITE=https://shanghai.up.railway.app/
import { open, sleep } from './cdp.mjs';
const SITE = process.env.SITE || 'http://localhost:8077/', D = (process.argv[2] || '/tmp/shanghai-ux') + '/';
import('node:fs').then(fs => fs.mkdirSync(D, { recursive: true }));
const p = await open();
const log = (...a) => console.log(...a);
const state = () => p.js(`JSON.stringify({collapsed: document.getElementById('sheet').classList.contains('collapsed'), sheetH: Math.round(document.getElementById('sheet').getBoundingClientRect().height), mapH: Math.round(document.getElementById('map').getBoundingClientRect().height), popup: !!document.querySelector('.leaflet-popup'), cat: [...document.querySelectorAll('#cats .chip')].find(c => c.getAttribute('aria-pressed') === 'true')?.textContent, zone: [...document.querySelectorAll('#zones .chip')].find(c => c.getAttribute('aria-pressed') === 'true')?.textContent, pins: document.querySelectorAll('.pin').length})`);
try {
  // ---------- phone portrait ----------
  await p.size(440, 956, true, 3); await p.go(SITE);
  log('P1 load            ', await state()); await p.shot(D + 'p1-load.png');
  log('P1b cats fit?      ', await p.js(`(() => { const c = document.getElementById('cats'); return c.scrollWidth <= c.clientWidth + 1 ? 'all category chips visible' : 'cut off by ' + (c.scrollWidth - c.clientWidth) + 'px'; })()`));
  log('P1c zones rows     ', await p.js(`new Set([...document.querySelectorAll('#zones .chip')].map(c => Math.round(c.getBoundingClientRect().top))).size`));
  await p.tap('.card'); await sleep(600);
  log('P2 tap first card  ', await state()); await p.shot(D + 'p2-card.png');
  await p.tap('.leaflet-popup-close-button');
  log('P3 close popup     ', await state());
  await p.tap('#grab');
  log('P4 tap handle (show)', await state()); await p.shot(D + 'p4-reopen.png');
  await p.tap('#grab');
  log('P5 tap handle (hide)', await state());
  await p.swipe('#grab', -120);
  log('P6 swipe up handle ', await state());
  await p.swipe('#bar', 120);
  log('P7 swipe down bar  ', await state());
  await p.tap('#grab');
  log('P8 tap handle      ', await state());
  await p.tap('#grab');
  log('P9 tap handle again', await state());
  await p.tap('#cats .chip:nth-child(3)');
  log('P10 Shopping chip (from collapsed)', await state()); await p.shot(D + 'p10-shopping.png');
  await p.tap('#zones .chip:nth-child(4)');
  log('P11 Jing\'an zone   ', await state());
  await p.tap('#cats .chip:nth-child(1)'); await p.tap('#zones .chip:nth-child(1)');
  log('P12 reset filters  ', await state());
  await p.tap('.pin'); 
  log('P13 tap a map pin  ', await state()); await p.shot(D + 'p13-pin.png');
  // scroll the list to the bottom: is the last card reachable?
  await p.js(`document.getElementById('list').scrollTop = 1e6`); await sleep(300);
  const last = await p.js(`(() => { const l = document.getElementById('list'), c = [...l.querySelectorAll('.card')].pop(); const a = l.getBoundingClientRect(), b = c.getBoundingClientRect(); return b.bottom <= a.bottom + 1 ? 'last card fully visible' : 'last card cut off by ' + Math.round(b.bottom - a.bottom) + 'px'; })()`);
  log('P14 list end       ', last); await p.shot(D + 'p14-listend.png');
  // collapse a category section
  await p.js(`document.getElementById('list').scrollTop = 0`); await p.tap('summary');
  log('P15 fold Food      ', await p.js(`document.querySelector('details').open`));
  await p.tap('summary');
  // ---------- phone landscape ----------
  await p.size(956, 440, true, 3); await sleep(800); await p.mapReady();
  log('L1 landscape       ', await state()); await p.shot(D + 'l1-landscape.png');
  await p.tap('.card'); await sleep(600);
  log('L2 tap card        ', await state()); await p.shot(D + 'l2-card.png');
  // back to portrait: layout recovers?
  await p.size(440, 956, true, 3); await sleep(800);
  log('P16 back portrait  ', await state()); await p.shot(D + 'p16-back.png');
  // ---------- small phone ----------
  await p.size(375, 667, true, 2); await p.go(SITE);
  log('S1 iPhone SE       ', await state()); await p.shot(D + 's1-se.png');
  // ---------- desktop ----------
  await p.size(1300, 800, false); await p.go(SITE);
  log('D1 desktop         ', await state()); await p.shot(D + 'd1-desktop.png');
} catch (e) { log('ERROR', e.message); }
p.close();
