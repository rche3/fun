# NFC → Apple Wallet Loyalty Stamp System — Technical Plan

> **Goal:** Tap an NFC chip with an iPhone → the iPhone recognises it → a stamp is
> added to a loyalty card already sitting in Apple Wallet → the user sees the card
> update (a new stamp / a lock-screen notification).
>
> This document is the build plan, split into the two parts you asked for:
> 1. The **physical / NFC side** (chips, how to program them, what hardware you need).
> 2. The **software side** (how the pass gets into Wallet from a URL, and how it
>    updates when the chip is tapped).

---

## 0. Reality check & mental model (read this first)

Before the two parts, it's worth being honest about where the difficulty actually
lives, because it's the opposite of where most people assume.

- **The NFC chip is the easy, cheap part.** A chip is just a tiny sticker that
  stores a short piece of text — in our case, a URL. You can program it at home in
  about 30 seconds with a free phone app. There is **no bespoke hardware required.**
- **The hard part is the server (the "backend").** Apple Wallet passes can only be
  updated through Apple's official push pipeline, which requires an Apple Developer
  account, code-signing certificates, and a small web service you host. ~90% of the
  engineering effort is here.
- **There is no native "stamp animation" in Apple Wallet.** What you actually get is:
  (a) the card's image is re-rendered to show one more stamp filled in, and
  (b) iOS shows a **lock-screen notification banner** ("You earned a stamp! 4/10")
  when the pass data changes. That banner *is* the satisfying moment. We design the
  card art so the "stamps" are part of the image we redraw.

### The end-to-end flow (the whole system on one page)

```
                         ┌──────────────────────────────────────────┐
   1. Customer adds       │  CUSTOMER'S iPHONE                         │
   the loyalty card  ───► │  • Taps "Add to Apple Wallet" from a URL   │
   once (onboarding)      │  • Pass now lives in Wallet with a unique  │
                          │    serial number, e.g. serial=abc123       │
                          └───────────────┬──────────────────────────┘
                                          │ device registers the pass
                                          ▼  with YOUR web service
                          ┌──────────────────────────────────────────┐
                          │  YOUR BACKEND (web service + database)     │
                          │  • Knows which serial = which customer     │
                          │  • Stores stamp count per card             │
                          └───────────────▲──────────────────────────┘
                                          │
   2. Later, in the shop, │              │  4. Backend increments the
   customer taps the      │              │     stamp count, regenerates the
   NFC chip ──────────────┘              │     pass, and sends an Apple Push
                                         │     Notification (APNs)
                          ┌──────────────┴───────────────────────────┐
   3. iPhone reads chip → │  Chip holds a URL like                    │
      opens the URL       │  https://yourapp.com/stamp?shop=42        │
                          │  → backend figures out who tapped (see    │
                          │    the "identity problem" below) → +1      │
                          └───────────────┬──────────────────────────┘
                                          ▼
                          ┌──────────────────────────────────────────┐
                          │  iPHONE receives the push, quietly pulls   │
                          │  the updated pass, shows "Stamp added 4/10"│
                          │  on the lock screen. Card art now shows    │
                          │  4 filled stamps.                          │
                          └──────────────────────────────────────────┘
```

### ⚠️ The single most important design decision: "who just tapped?"

A shop's NFC chip is **the same chip for every customer.** When someone taps it,
the URL that opens is identical for everyone — so the chip *alone* cannot tell your
backend *which customer* should get the stamp. This is the "identity / attribution
problem" and you must pick one of these models up front:

| Model | How it works | Pros | Cons |
|---|---|---|---|
| **A. Customer-side identity (recommended for v1)** | The tap opens a web page; the page knows the customer because their browser carries a stored token (cookie) OR the page deep-links them via their already-installed pass. | No staff action needed; feels magical. | Browser cookies can be cleared; first tap needs a one-time link between browser & pass. Open to abuse (see security). |
| **B. Staff-mediated** | Customer shows their Wallet card to staff; staff taps a button / scans the customer's pass barcode on a shop device, which adds the stamp. The NFC chip is on the *staff* device or not used at all. | Hard to cheat; reliable identity. | Requires staff interaction — defeats some of the "automation" goal. |
| **C. Per-customer chip** | Each customer carries their own chip (e.g. a keyring) encoding their unique ID; a single shop reader reads it. | Rock-solid identity. | You're now distributing hardware to customers; closer to a fob system than "tap the shop's sticker." |

> **Recommendation:** Build **Model A** for the consumer-magic experience, but bake
> in the security mitigations in §2.6 (rate-limiting, staff PIN, or geofencing),
> because "tap a public sticker to get free stuff" is trivially farmable otherwise.

---

# PART 1 — The Physical / NFC Side

### 1.1 What an NFC chip actually is

For this project an "NFC chip" is an **NFC tag** — a passive sticker/disc with no
battery. It stores a small **NDEF** record (NFC Data Exchange Format). We store a
single **URI record** (a URL). When an iPhone comes near it, iOS reads that URL.

### 1.2 Which chip to buy

- **Chip type:** NTAG213, NTAG215, or NTAG216 (made by NXP). These are the
  iPhone-compatible standard.
  - **NTAG213** (~144 bytes) — plenty for a URL. Cheapest. **Good default.**
  - **NTAG215** (~504 bytes) — buy these if you want headroom; same price-ish.
  - **NTAG216** (~888 bytes) — overkill for a URL.
- **Form factor:** Stickers, discs, cards, keyrings, or "on-metal" tags if you'll
  stick them to a metal counter (metal kills NFC unless the tag is shielded).
- **Cost:** Roughly **$0.30–$1.00 per tag** in packs of 10–50. A pack of 10 NTAG213
  stickers is a few dollars on Amazon/AliExpress.

### 1.3 Hardware to program the chips — do you need anything special?

**No bespoke hardware. You can do this at home today.** Two routes:

#### Route 1 — Use your iPhone itself (zero extra hardware) ✅ easiest
- iPhones from the **iPhone 7 onward can *write* NFC tags** using a free app.
- Install **"NFC Tools"** (by wakdev) from the App Store. Also good: "NFC TagWriter
  by NXP."
- In the app: **Write → Add a record → URL/URI →** type your URL → **Write**, then
  hold the tag to the top of your phone. Done.
- This is genuinely all you need for Part 1.

#### Route 2 — USB NFC reader/writer on your Mac/PC (better for batches & scripting)
- Buy an **ACR122U** USB reader (~$35–45). It plugs into your computer over USB.
- Use it when you want to **program 50 tags in a loop**, lock them, or script the
  process (e.g. write a different URL to each tag).
- Software/libraries:
  - **`nfcpy`** (Python) — script reading/writing on macOS/Linux/Windows.
  - **`libnfc`** + **`nfc-tools`** (CLI) — `nfc-mfclassic`, `ndeftool`, etc.
  - **NFC Tools desktop** (paid PC version) for a GUI.
- On macOS, the ACR122U sometimes needs you to **disable the built-in PCSC driver**
  conflict; `nfcpy` documents the workaround. (A Raspberry Pi is a fuss-free
  alternative host if the Mac driver fight annoys you.)

> **Verdict on hardware:** For building the product and even running a single shop,
> your iPhone + the NFC Tools app is enough. Buy an ACR122U (~$40) only when you
> start mass-producing tags for multiple shops.

### 1.4 What to actually write to the chip

A single **URI / URL record**. For example:

```
https://app.yourdomain.com/t/SHOP_ID
        e.g.  https://app.yourdomain.com/t/cafe-amber-42
```

Notes:
- Keep it short — NTAG213 has limited space, and short URLs read faster.
- The `SHOP_ID` (or a per-location token) is the only thing the chip needs to carry.
  Everything else (who the customer is, how many stamps they have) is resolved by
  your backend. **Do not** try to store stamp counts on the chip itself.
- **iOS "background tag reading":** Modern iPhones, when *unlocked* and not in an app,
  automatically detect an NFC URL tag and show a **notification banner**; tapping it
  opens the URL. The user does **not** need to open any app first. This is what makes
  the "just tap it" experience work. (On some setups the user taps the banner once.)

### 1.5 Locking the tag (do this before deployment)

- After writing, **lock / make the tag read-only** (the NFC Tools app and `libnfc`
  both support this) so a passer-by can't rewrite your sticker to a malicious URL.
- Optionally set a **password (PWD/PACK)** on NTAG21x if you want to allow your own
  future rewrites but block others. Note: locking is **permanent** on some
  configurations — write & test the URL first, then lock.

### Part 1 deliverables checklist
- [ ] Buy NTAG213 stickers (pack of 10).
- [ ] Install NFC Tools on your iPhone (or buy an ACR122U for batches).
- [ ] Decide your URL scheme: `https://app.yourdomain.com/t/{shopId}`.
- [ ] Write a test tag, scan it with a few iPhones, confirm the banner appears.
- [ ] Lock the production tags.

---

# PART 2 — The Software Side

This is the real build. It has three sub-systems:

- **2.A** The **Apple Wallet pass** itself (the `.pkpass` file + certificates).
- **2.B** The **"Add to Apple Wallet" onboarding** (the URL the customer clicks).
- **2.C** The **backend web service** that updates passes when the chip is tapped.

### 2.0 Prerequisites & accounts

- **Apple Developer Program membership — $99/year.** Required to create the
  certificates that sign passes. There is no free path to issuing real Wallet passes.
- A **domain name** + **HTTPS hosting** for your web service (passes *require* TLS).
- A server you control: any of Node.js, Python, Ruby, Go, etc. Hosting can be a small
  VPS, or serverless (Vercel/Cloudflare/AWS Lambda) + a database.
- A **database** (Postgres/MySQL/SQLite/Firestore) to store cards, serials, push
  tokens, and stamp counts.

> **Build vs. buy shortcut:** Services like **PassKit, Passcreator, Loopy Loyalty,
> PassNinja, or Walletmania** already implement §2.A–§2.C and give you an API. If
> your goal is to ship a business fast, you can use one of these for the Wallet
> plumbing and only build the NFC + thin glue layer yourself. The plan below is the
> **from-scratch** version so you understand every moving part; swap in a SaaS for
> any box you don't want to own.

---

## 2.A — The Apple Wallet pass (`.pkpass`)

### 2.A.1 What a pass is

A `.pkpass` is just a **ZIP archive** with a specific structure:

```
MyLoyalty.pkpass  (a zip)
├── pass.json        ← all the data & layout (the important file)
├── icon.png         ← required (+@2x, @3x retina variants)
├── logo.png         ← your brand logo
├── strip.png        ← the wide image we use to DRAW THE STAMPS (+@2x/@3x)
├── manifest.json    ← SHA-1 hash of every file above
└── signature        ← a cryptographic signature of manifest.json
```

For a loyalty/stamp card, use pass **style `storeCard`** (it has a prominent `strip`
image area — perfect for a row of stamp circles).

### 2.A.2 Certificates you need (one-time setup in the Apple Developer portal)

1. Create a **Pass Type ID** (e.g. `pass.com.yourdomain.loyalty`).
2. Generate a **Pass Type ID Certificate** for it → download `.cer`, convert to a
   `.pem`/`.p12` with your private key (via Keychain Access on macOS or `openssl`).
3. Download the **Apple WWDR (Worldwide Developer Relations) intermediate
   certificate** — needed in the signature chain.
4. Note your **Team Identifier** (10-char string in your Apple account).

These four things let your backend sign passes.

### 2.A.3 Example `pass.json` (annotated)

```jsonc
{
  "formatVersion": 1,
  "passTypeIdentifier": "pass.com.yourdomain.loyalty",
  "teamIdentifier": "ABCDE12345",
  "organizationName": "Cafe Amber",
  "description": "Cafe Amber Loyalty Card",
  "serialNumber": "abc123",          // UNIQUE per customer card — this is the key
  "serialNumber_comment": "you generate this when a customer first adds the card",

  // ---- This block is what makes remote updates possible ----
  "webServiceURL": "https://app.yourdomain.com/wallet/",  // your backend (TLS)
  "authenticationToken": "long-random-secret-per-pass",   // 16+ chars, per pass

  "storeCard": {
    "primaryFields": [
      { "key": "stamps", "label": "STAMPS", "value": "4 / 10" }
    ],
    "secondaryFields": [
      { "key": "reward", "label": "REWARD", "value": "Free coffee at 10" }
    ],
    "backFields": [
      { "key": "terms", "label": "How it works", "value": "Tap the chip in store..." }
    ]
  },

  "barcodes": [                       // optional: a fallback the staff can scan
    { "format": "PKBarcodeFormatQR", "message": "abc123", "messageEncoding": "iso-8859-1" }
  ],

  "backgroundColor": "rgb(40,30,20)",
  "foregroundColor": "rgb(255,255,255)"
}
```

The two fields that unlock everything are **`webServiceURL`** and
**`authenticationToken`** — they tell the iPhone *where* to phone home for updates and
*how* to authenticate. Without them the pass is static.

### 2.A.4 How the "stamps" actually appear (the visual)

Two complementary techniques — use both:

1. **Field text** — the `primaryFields` value `"4 / 10"`. Simple, always works, and
   the value change is what triggers the lock-screen notification.
2. **The `strip.png` image** — generate a wide image showing 10 circles, 4 of them
   filled (a coffee bean / stamp icon). **Every time the count changes, your backend
   redraws this image** and ships it in the updated pass. This is the "stamp card"
   look. Generate it server-side with an image library (e.g. `sharp`/`canvas` in
   Node, `Pillow` in Python, or pre-rendered PNGs `strip_0.png`…`strip_10.png`).

> **About the "animation":** Apple doesn't expose a stamp-by-stamp animation API.
> The perceived animation is (a) the notification banner sliding in, and (b) the card
> face flipping/refreshing to the new strip image when the user opens Wallet. Design
> the strip art so the newly-filled stamp pops (color/size) for maximum effect.

### 2.A.5 Signing & zipping (what your code does to build a pass)

1. Assemble `pass.json` + images in a folder.
2. Compute SHA-1 of each file → write `manifest.json`.
3. Sign `manifest.json` with your Pass Type certificate + WWDR cert → `signature`
   (PKCS#7 detached signature; `openssl smime -sign` or a library does this).
4. Zip the folder → rename to `Whatever.pkpass`, serve with MIME type
   `application/vnd.apple.pkpass`.

**Don't hand-roll this if you can avoid it** — use a battle-tested library:
- **Node.js:** `passkit-generator`, `@walletpass/pass-js`
- **Python:** `wallet-py3k` / `edutiek-passkit` / `flask-passbook`
- **Ruby:** `passbook` gem
- **Go:** `pkpass`

---

## 2.B — Getting the card into Wallet from a URL ("Add to Apple Wallet")

This is your Part-2 requirement: *"a simple URL that I can click 'Add to my
Wallet'."*

### 2.B.1 The onboarding flow

1. The customer visits an onboarding URL — e.g. a QR code on the counter, a link, or
   the **first NFC tap** of a "join" tag:
   `https://app.yourdomain.com/join/cafe-amber-42`
2. Your backend:
   - Creates a new card record in the DB: generates a unique **`serialNumber`** and a
     random **`authenticationToken`**, sets `stamps = 0`.
   - Builds & signs a fresh `.pkpass` for that serial.
   - Returns it with header `Content-Type: application/vnd.apple.pkpass`.
3. On iOS/Safari, downloading a `.pkpass` automatically shows the native **"Add to
   Apple Wallet"** sheet. The user taps **Add.** The card is now in Wallet.

> A literal **"Add to Apple Wallet" button image** (Apple provides the official
> badge artwork in their Human Interface guidelines) just links to that endpoint.

### 2.B.2 What happens automatically after "Add" (no app needed)

When the pass is added, **iOS itself registers the pass with your `webServiceURL`** —
you don't write iPhone code for this; it's built into Wallet. iOS calls these
endpoints on your server (the **PassKit Web Service** spec):

| iOS calls… | Method & path | You do… |
|---|---|---|
| Register a device for a pass | `POST /v1/devices/{deviceId}/registrations/{passTypeId}/{serial}` | Store the device's **push token** against the serial. |
| Get list of updated passes | `GET /v1/devices/{deviceId}/registrations/{passTypeId}?passesUpdatedSince=…` | Return serials that changed. |
| Download the latest pass | `GET /v1/passes/{passTypeId}/{serial}` | Return the freshly-built `.pkpass`. |
| Unregister | `DELETE /v1/devices/{deviceId}/registrations/{passTypeId}/{serial}` | Remove the device token. |
| Log errors | `POST /v1/log` | (Optional) log for debugging. |

Each request carries `Authorization: ApplePass {authenticationToken}` — you verify it
matches the token you stored for that serial. **This is the whole reason you don't
need a custom iOS app: Apple Wallet is the client.**

> **Do you ever need a custom iOS app?** Only if you want *silent* tap handling
> (read the tag inside your own app via Core NFC) or an App Clip. For v1, the
> URL-tag-opens-Safari approach needs **no app on the customer's phone** beyond
> Wallet itself.

---

## 2.C — Updating the pass when the chip is tapped (the core loop)

### 2.C.1 The stamp endpoint

The shop's NFC chip holds `https://app.yourdomain.com/t/cafe-amber-42`. When tapped:

1. iPhone opens that URL.
2. Your backend must answer **"which customer is this?"** (the §0 identity problem).
   For **Model A**, the page:
   - reads a **cookie** that links this browser to a `serialNumber` (set during a
     one-time linking step — e.g. the first time they tapped, you asked them to open
     their Wallet card and confirm), **or**
   - shows a lightweight confirm page where the already-added pass deep-links the
     serial back.
3. Backend increments `stamps` for that serial in the DB (with the abuse checks below).
4. Backend **rebuilds the `.pkpass`** with the new count + new strip image.
5. Backend **sends an APNs push** to every device token registered for that serial.
   - The push is **empty/silent** — it just nudges the phone. The phone then calls
     `GET /v1/passes/{passTypeId}/{serial}` to pull the new pass.
   - Send via Apple Push Notification service over HTTP/2, authenticated with your
     Pass Type certificate (or a `.p8` APNs key). Topic = your `passTypeIdentifier`.
6. iPhone shows the lock-screen banner ("Stamp added — 4/10") and the card updates.

```
   tap chip → /t/cafe-amber-42
        │
        ▼
   identify customer (cookie/serial)  ──►  DB: stamps 3 → 4
        │
        ▼
   rebuild & store new .pkpass for serial=abc123
        │
        ▼
   APNs push to that pass's device token(s)
        │
        ▼
   iPhone pulls GET /v1/passes/...  →  banner + updated card 🎉
```

### 2.C.2 The "reward redeemed" case

When `stamps` hits 10: set the card to a "Reward ready!" state (change the primary
field text + strip art), push it, and after the customer redeems, reset to 0 (a fresh
loop). Track redemptions in the DB for the business's analytics.

### 2.C.3 ⚠️ Security & anti-abuse (don't skip — this is "tap a sticker for free stuff")

Because Model A lets anyone tap a public sticker, add at least:
- **Rate limiting:** max 1 stamp per card per shop per N hours.
- **Staff confirmation option:** the tap opens a page that needs a rotating shop PIN
  or a staff tap to confirm — kills remote/repeat farming.
- **Geofencing / signed tags:** use NTAG **"SUN" (Secure Unique NFC) / tag
  authentication** — NTAG424 DNA chips generate a **changing, cryptographically
  signed code on every tap (SDM)**, so your backend can verify the tap is *physically
  real and recent* and not a copied URL. (Upgrade from NTAG213 → **NTAG424 DNA** when
  you're ready to harden; these cost more, ~$1–2 each.)
- **Bind serial ↔ device** so a leaked `authenticationToken` can't be reused.
- Always serve over **HTTPS**, store tokens hashed, and treat the
  `authenticationToken` as a secret.

---

## 3. Recommended tech stack (concrete starting point)

| Layer | Recommendation | Why |
|---|---|---|
| Tags (v1) | NTAG213 stickers, written with iPhone NFC Tools app | Cheapest, zero hardware |
| Tags (hardened) | NTAG424 DNA (SUN/SDM) | Anti-clone, per-tap signature |
| Tag batch writer | ACR122U + `nfcpy` (only when scaling) | Script many tags |
| Backend | **Node.js** + `passkit-generator` + `node-apn` (or Python + `wallet-py3k` + `apns2`) | Mature pass + push libraries |
| Pass image gen | `sharp`/`canvas` (Node) or `Pillow` (Python) | Redraw the stamp strip |
| Database | Postgres (or SQLite to start) | Store cards, serials, tokens, counts |
| Hosting | A small VPS or Vercel/Render + managed Postgres | Needs stable HTTPS + DB |
| Apple account | Apple Developer Program ($99/yr) | Mandatory for certs |

---

## 4. Suggested build order (milestones)

1. **M0 – Accounts & certs.** Join Apple Developer, create Pass Type ID, export the
   pass-signing certificate, download WWDR cert. *(Blocker for everything else.)*
2. **M1 – Generate one static pass.** Locally build & sign a `.pkpass`, AirDrop it to
   your phone, confirm it appears in Wallet and looks right (stamps in strip image).
3. **M2 – "Add to Wallet" URL.** Stand up the `/join/{shop}` endpoint that mints a
   unique serial and serves the signed pass. Add it from Safari.
4. **M3 – PassKit web service.** Implement the register/get/download/unregister
   endpoints; confirm your phone registers and you capture its push token.
5. **M4 – Push update.** Manually bump a stamp count in the DB, send an APNs push,
   watch the card update + the banner appear. *(This is the magic moment — get here.)*
6. **M5 – NFC tap loop.** Write the `/t/{shop}` endpoint, solve identity (Model A),
   program a tag, tap it, confirm a stamp lands end-to-end.
7. **M6 – Hardening.** Rate limits, staff PIN / NTAG424, reward-at-10 + reset,
   per-shop config, basic admin dashboard.
8. **M7 – Multi-shop.** Make `shopId` data-driven so you can onboard more businesses.

---

## 5. Open questions to decide before coding

- **Identity model:** A, B, or C from §0? (Recommend A + hardening.)
- **Build vs. buy** the Wallet plumbing (from-scratch vs. PassKit/Passcreator SaaS)?
- **Android too?** Google Wallet has an equivalent (Google Wallet API / JWT "save"
  links). Same architecture, different certs — scope as a fast-follow if needed.
- **Do you want a customer app at all,** or is "Wallet + Safari" enough? (v1: enough.)
- **One pass per shop, or one combined card** across shops? (Start: one per shop.)

---

### TL;DR
- **Part 1 (hardware):** Trivial. Buy NTAG213 stickers, write a URL to them with the
  free **NFC Tools** iPhone app. No special hardware; an **ACR122U (~$40)** only if
  you batch-program. Lock the tags.
- **Part 2 (software):** The real work. Get an **Apple Developer account ($99/yr)**,
  create a signed **`.pkpass` store card**, host a small **web service** that (a)
  serves the pass from an "Add to Apple Wallet" URL, (b) implements Apple's PassKit
  web-service endpoints, and (c) on each NFC tap increments the stamp count and sends
  an **APNs push** so the card updates with a notification. The trickiest design call
  is **"who just tapped?"** — solve identity + anti-abuse early.
