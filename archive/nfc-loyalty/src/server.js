import express from "express";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { config, DEMO_MODE } from "./config.js";
import * as dbq from "./db.js";
import { buildPass } from "./pass.js";
import { pushPassUpdate } from "./apns.js";
import { stripPreviewPng } from "./images.js";

const app = express();
app.use(morgan("dev"));
app.use(cookieParser());
// Apple's PassKit web service sends JSON bodies (e.g. the pushToken on register).
app.use(express.json({ type: ["application/json", "text/plain"] }));

const COOKIE = "card";
const COOKIE_OPTS = { maxAge: 1000 * 60 * 60 * 24 * 365, sameSite: "lax", path: "/" };

// ----------------------------------------------------------------------------
// Tiny HTML helper
// ----------------------------------------------------------------------------
function page(title, body) {
  return `<!doctype html><html><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    :root { color-scheme: light dark; }
    body { font-family: -apple-system, system-ui, sans-serif; max-width: 540px;
      margin: 0 auto; padding: 24px; line-height: 1.5; }
    .card { background: #2b2018; color: #fff; border-radius: 16px; padding: 20px;
      margin: 16px 0; }
    .big { font-size: 28px; font-weight: 700; }
    .muted { opacity: .7; font-size: 14px; }
    a.btn, button.btn { display: inline-block; background: #f0a830; color: #2b2018;
      text-decoration: none; padding: 12px 20px; border-radius: 12px; font-weight: 700;
      border: 0; font-size: 16px; cursor: pointer; margin: 6px 6px 6px 0; }
    a.ghost { color: inherit; }
    img.strip { width: 100%; border-radius: 12px; display: block; margin: 8px 0; }
    .demo { background: #ffe9a8; color: #5a4a00; padding: 10px 14px; border-radius: 10px;
      font-size: 14px; margin: 12px 0; }
    table { width: 100%; border-collapse: collapse; }
    td, th { text-align: left; padding: 8px; border-bottom: 1px solid #8884; font-size: 14px; }
    code { background: #8882; padding: 1px 5px; border-radius: 4px; }
  </style></head><body>
  ${DEMO_MODE ? `<div class="demo">⚠️ <b>Demo mode</b> — no Apple certificates loaded, so passes can't be signed yet. The web flow works; add certs to <code>certs/</code> to issue real passes.</div>` : ""}
  ${body}
  </body></html>`;
}

const stampRow = (n, max) => "●".repeat(n) + "○".repeat(Math.max(0, max - n));

// ----------------------------------------------------------------------------
// Home
// ----------------------------------------------------------------------------
app.get("/", (_req, res) => {
  res.send(
    page(
      config.cardTitle,
      `<h1>${config.orgName}</h1>
       <p>${config.cardTitle}</p>
       <p><a class="btn" href="/join/${config.defaultShopId}">Get your loyalty card</a></p>
       <p class="muted">NFC tag URL (write this to your chip):<br>
       <code>${config.baseUrl}/tap/${config.defaultShopId}</code></p>
       <p class="muted"><a class="ghost" href="/admin">Staff / admin →</a></p>`
    )
  );
});

// ----------------------------------------------------------------------------
// JOIN — customer adds the card (Model A: link this browser to a serial)
// ----------------------------------------------------------------------------
app.get(["/join", "/join/:shopId"], (req, res) => {
  const shopId = req.params.shopId || config.defaultShopId;
  let serial = req.cookies[COOKIE];
  let card = serial ? dbq.getCard(serial) : null;
  if (!card) {
    card = dbq.createCard(shopId);
    serial = card.serial;
  }
  res.cookie(COOKIE, serial, COOKIE_OPTS);

  res.send(
    page(
      "Add your card",
      `<h1>${config.orgName}</h1>
       <div class="card">
         <div class="muted">YOUR CARD</div>
         <div class="big">${card.stamps}/${card.max_stamps} stamps</div>
         <img class="strip" src="/strip/${serial}.png" alt="stamps">
         <div class="muted">${config.rewardText}</div>
       </div>
       <a class="btn" href="/pass/${serial}.pkpass">＋ Add to Apple Wallet</a>
       <p class="muted">After adding, tap the in-store NFC chip to collect stamps.
       This browser is now linked to your card.</p>`
    )
  );
});

// ----------------------------------------------------------------------------
// Serve the signed .pkpass
// ----------------------------------------------------------------------------
app.get("/pass/:serial.pkpass", async (req, res) => {
  const card = dbq.getCard(req.params.serial);
  if (!card) return res.status(404).send("Unknown card");
  try {
    const buf = await buildPass(card);
    res.set({
      "Content-Type": "application/vnd.apple.pkpass",
      "Content-Disposition": `attachment; filename="loyalty.pkpass"`,
      "Last-Modified": new Date(card.updated_at * 1000).toUTCString(),
    });
    res.send(buf);
  } catch (err) {
    res.status(503).send(
      page("Not available yet", `<h1>Can't issue the pass yet</h1><p>${err.message}</p>`)
    );
  }
});

// ----------------------------------------------------------------------------
// TAP — the NFC chip points here. +1 stamp for the card linked to this browser.
// ----------------------------------------------------------------------------
app.get(["/tap", "/tap/:shopId"], async (req, res) => {
  const shopId = req.params.shopId || config.defaultShopId;
  const serial = req.cookies[COOKIE];
  const card = serial ? dbq.getCard(serial) : null;

  if (!card) {
    return res.send(
      page(
        "Add your card first",
        `<h1>Welcome!</h1>
         <p>You don't have a loyalty card on this phone yet.</p>
         <a class="btn" href="/join/${shopId}">Get your card</a>
         <p class="muted">Then tap the chip again to collect your first stamp.</p>`
      )
    );
  }

  const { card: updated, added, reason } = dbq.addStamp(serial);

  let push = { sent: 0 };
  if (added) {
    try {
      push = await pushPassUpdate(serial);
    } catch (e) {
      push = { error: e.message };
    }
  }

  const headline =
    reason === "ok"
      ? `Stamp added! ⭐️`
      : reason === "cooldown"
      ? "Just a sec…"
      : reason === "full"
      ? "Card complete! 🎉"
      : "Hmm";
  const sub =
    reason === "ok"
      ? `${updated.stamps}/${updated.max_stamps} collected`
      : reason === "cooldown"
      ? "That stamp was already counted. Try again in a moment."
      : reason === "full"
      ? "Show this to staff to claim your reward."
      : "";

  res.send(
    page(
      headline,
      `<div class="card">
         <div class="big">${headline}</div>
         <div class="muted">${sub}</div>
         <img class="strip" src="/strip/${serial}.png?t=${Date.now()}" alt="stamps">
       </div>
       <p class="muted">${stampRow(updated.stamps, updated.max_stamps)}</p>
       ${
         DEMO_MODE
           ? `<p class="muted">In demo mode the count updates in this database, but a real iPhone Wallet update needs certs + the push step (push result: ${JSON.stringify(
               push
             )}).</p>`
           : `<p class="muted">Your Wallet card is updating now…</p>`
       }`
    )
  );
});

// ----------------------------------------------------------------------------
// Strip image preview (used by the web pages)
// ----------------------------------------------------------------------------
app.get("/strip/:serial.png", async (req, res) => {
  const card = dbq.getCard(req.params.serial);
  if (!card) return res.status(404).end();
  const png = await stripPreviewPng(card.stamps, card.max_stamps);
  res.set("Content-Type", "image/png").send(png);
});

// ----------------------------------------------------------------------------
// PassKit Web Service — iOS Wallet calls these automatically. See README.
// Base path matches webServiceURL ("/wallet/") + Apple's "/v1/..." suffix.
// ----------------------------------------------------------------------------
function checkAuth(req, card) {
  const header = req.get("Authorization") || "";
  const token = header.replace(/^ApplePass\s+/i, "");
  return card && token && token === card.auth_token;
}

// Register a device to receive updates for a pass
app.post("/wallet/v1/devices/:deviceId/registrations/:passTypeId/:serial", (req, res) => {
  const card = dbq.getCard(req.params.serial);
  if (!checkAuth(req, card)) return res.status(401).end();
  const pushToken = req.body?.pushToken;
  if (!pushToken) return res.status(400).end();
  dbq.registerDevice(req.params.deviceId, req.params.serial, pushToken);
  res.status(201).end();
});

// Unregister a device
app.delete("/wallet/v1/devices/:deviceId/registrations/:passTypeId/:serial", (req, res) => {
  const card = dbq.getCard(req.params.serial);
  if (!checkAuth(req, card)) return res.status(401).end();
  dbq.unregisterDevice(req.params.deviceId, req.params.serial);
  res.status(200).end();
});

// Which passes changed for this device?
app.get("/wallet/v1/devices/:deviceId/registrations/:passTypeId", (req, res) => {
  const since = req.query.passesUpdatedSince ? parseInt(req.query.passesUpdatedSince, 10) : null;
  const rows = dbq.updatedSerialsForDevice(req.params.deviceId, since);
  if (rows.length === 0) return res.status(204).end();
  const lastUpdated = Math.max(...rows.map((r) => r.updated_at));
  res.json({ lastUpdated: String(lastUpdated), serialNumbers: rows.map((r) => r.serial) });
});

// Download the latest version of a pass
app.get("/wallet/v1/passes/:passTypeId/:serial", async (req, res) => {
  const card = dbq.getCard(req.params.serial);
  if (!checkAuth(req, card)) return res.status(401).end();

  const ims = req.get("If-Modified-Since");
  if (ims && new Date(ims).getTime() >= card.updated_at * 1000) {
    return res.status(304).end();
  }
  try {
    const buf = await buildPass(card);
    res.set({
      "Content-Type": "application/vnd.apple.pkpass",
      "Last-Modified": new Date(card.updated_at * 1000).toUTCString(),
    });
    res.send(buf);
  } catch (e) {
    res.status(503).end();
  }
});

// Apple posts logs here
app.post("/wallet/v1/log", (req, res) => {
  console.log("[wallet log]", typeof req.body === "string" ? req.body : JSON.stringify(req.body));
  res.status(200).end();
});

// ----------------------------------------------------------------------------
// ADMIN — staff page to reset / adjust stamps (Basic Auth)
// ----------------------------------------------------------------------------
function adminAuth(req, res, next) {
  const header = req.get("Authorization") || "";
  const [scheme, encoded] = header.split(" ");
  if (scheme === "Basic" && encoded) {
    const pass = Buffer.from(encoded, "base64").toString().split(":")[1];
    if (pass === config.adminPassword) return next();
  }
  res.set("WWW-Authenticate", 'Basic realm="admin"').status(401).send("Auth required");
}

app.get("/admin", adminAuth, (_req, res) => {
  const cards = dbq.listCards();
  const rows = cards
    .map(
      (c) => `<tr>
        <td><code>${c.serial.slice(0, 8)}</code></td>
        <td>${c.shop_id}</td>
        <td>${stampRow(c.stamps, c.max_stamps)} ${c.stamps}/${c.max_stamps}</td>
        <td>
          <form method="post" action="/admin/adjust/${c.serial}" style="display:inline">
            <input type="hidden" name="delta" value="1"><button class="btn">+1</button></form>
          <form method="post" action="/admin/adjust/${c.serial}" style="display:inline">
            <input type="hidden" name="delta" value="-1"><button class="btn">−1</button></form>
          <form method="post" action="/admin/reset/${c.serial}" style="display:inline">
            <button class="btn">Reset</button></form>
        </td></tr>`
    )
    .join("");
  res.send(
    page(
      "Admin",
      `<h1>Cards</h1>
       <p class="muted">${cards.length} card(s). Reset/adjust pushes an update to the customer's Wallet.</p>
       <table><tr><th>Card</th><th>Shop</th><th>Stamps</th><th>Actions</th></tr>${rows}</table>`
    )
  );
});

app.post("/admin/adjust/:serial", adminAuth, express.urlencoded({ extended: false }), async (req, res) => {
  const delta = parseInt(req.body.delta, 10) || 0;
  dbq.adjustStamps(req.params.serial, delta);
  await safePush(req.params.serial);
  res.redirect("/admin");
});

app.post("/admin/reset/:serial", adminAuth, async (req, res) => {
  dbq.resetCard(req.params.serial);
  await safePush(req.params.serial);
  res.redirect("/admin");
});

async function safePush(serial) {
  try {
    await pushPassUpdate(serial);
  } catch (e) {
    console.warn("push failed:", e.message);
  }
}

// ----------------------------------------------------------------------------
app.listen(config.port, () => {
  console.log(`\n  ${config.orgName} loyalty server`);
  console.log(`  Local:     http://localhost:${config.port}`);
  console.log(`  Public:    ${config.baseUrl}`);
  console.log(`  Mode:      ${DEMO_MODE ? "DEMO (no certs — web flow only)" : "LIVE (signing passes)"}`);
  console.log(`  Tag URL:   ${config.baseUrl}/tap/${config.defaultShopId}`);
  console.log(`  Admin:     ${config.baseUrl}/admin\n`);
});
