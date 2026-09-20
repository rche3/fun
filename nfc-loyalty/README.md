# NFC → Apple Wallet loyalty card (lightweight, from scratch)

Tap an NFC chip with an iPhone → a stamp is added to a loyalty card in Apple Wallet,
and the customer sees a lock-screen notification. Built from scratch — no SaaS.

- **Identity model:** Model A. A cookie links the customer's browser to their card,
  so tapping the shop's single chip credits the right person. No login, no app.
- **Removals:** manual, via a `/admin` page with **Reset** and **±1** buttons.
- **Scope:** deliberately minimal — meant for testing the real user flow.

```
  src/server.js   all routes (join, tap, pass download, PassKit web service, admin)
  src/pass.js     builds + signs the .pkpass
  src/apns.js     sends the push that tells iPhones to refresh a pass
  src/db.js       SQLite (cards + device registrations)
  src/images.js   generates the card art / stamp strip (SVG → PNG, no binary assets)
  certs/          ← you drop your 3 Apple cert files here
```

---

## What works right now vs. what needs you

| Part | Status |
|---|---|
| Web flow: join, cookie identity, tap = +1 stamp, cooldown, admin reset/±1 | ✅ Built & tested. Runs today in **demo mode** (no certs). |
| Card art + stamp strip image generation | ✅ Built & tested. |
| PassKit web service endpoints (register/update/download) | ✅ Built & tested. |
| Signing a real `.pkpass` so it enters Wallet | ⛔ Needs **your** Apple certs (below). |
| Push update to a real iPhone | ⛔ Needs the same certs. |

The two ⛔ items are an Apple hard wall — a card cannot enter Apple Wallet unless it's
signed by a certificate tied to **your** Apple Developer account. That's the only
manual work; it's ~15 minutes of clicking, described next.

---

## Quick start (demo mode — no Apple account needed)

```bash
cd nfc-loyalty
npm install
cp .env.example .env        # defaults are fine for a local demo
npm start
```

Open <http://localhost:3000>, click **Get your loyalty card**, then visit
<http://localhost:3000/tap/shop1> to watch the stamp count go up. Visit `/admin`
(user: anything, password: `changeme`) to reset. This proves the whole flow in a
browser. To put it on a real iPhone, do the cert setup below.

---

## Going live — Apple certificate setup (the one manual part)

You need an **Apple Developer Program** membership ($99/year).

### 1. Create a Pass Type ID
1. <https://developer.apple.com/account/resources/identifiers/list/passTypeId> → **+**
2. Register an identifier like `pass.com.yourdomain.loyalty`.
3. Note your **Team ID** (top-right of the developer account, 10 chars).

### 2. Create the Pass Type ID certificate
1. On your Mac, open **Keychain Access → Certificate Assistant → Request a
   Certificate From a Certificate Authority**. Save the `.certSigningRequest` to disk.
2. Back in the portal, on your Pass Type ID, **Create Certificate**, upload that CSR,
   download the resulting `pass.cer`.
3. Double-click `pass.cer` to add it to Keychain. In Keychain, find it, expand it,
   select **both** the certificate and its private key → right-click → **Export** →
   save as `pass.p12` (set a password if you like — that becomes `CERT_PASSPHRASE`).

### 3. Get Apple's WWDR intermediate certificate
Download **Worldwide Developer Relations — G4** from
<https://www.apple.com/certificateauthority/> and double-click to install.

### 4. Convert everything to PEM and drop into `certs/`
Run these in a scratch folder (adjust the `.p12` password after `-passin`; omit
`-passin` if you set none):

```bash
# Signing certificate (public)
openssl pkcs12 -in pass.p12 -clcerts -nokeys -legacy -passin pass:YOURP12PASS \
  -out signerCert.pem

# Signing private key
openssl pkcs12 -in pass.p12 -nocerts -nodes -legacy -passin pass:YOURP12PASS \
  -out signerKey.pem

# Apple WWDR cert (export from Keychain as AppleWWDRCAG4.cer first, then:)
openssl x509 -inform DER -in AppleWWDRCAG4.cer -out wwdr.pem
```

Copy the three PEM files into this project's `certs/` folder:
```
certs/signerCert.pem
certs/signerKey.pem
certs/wwdr.pem
```

### 5. Fill in `.env`
```
PASS_TYPE_ID=pass.com.yourdomain.loyalty
TEAM_ID=YOUR_TEAM_ID
CERT_PASSPHRASE=YOURP12PASS        # blank if you exported with no password
ORG_NAME=Your Cafe
```

### 6. Make the server reachable over HTTPS
Apple's servers **and** the iPhone must reach `webServiceURL`, so `localhost` won't
do. Easiest for testing — a free tunnel:

```bash
brew install cloudflared
cloudflared tunnel --url http://localhost:3000
```

Copy the `https://....trycloudflare.com` URL it prints into `BASE_URL` in `.env`,
then restart `npm start`. (For production, deploy to any host with real HTTPS.)

Restart the server; the banner should now say **LIVE (signing passes)**.

---

## Writing the NFC chip

Buy **NTAG213** stickers. Encode a single **URL record**:

```
https://<your BASE_URL>/tap/shop1
```

Easiest tool: the free **NFC Tools** app on your iPhone → *Write → Add a record →
URL* → type the URL → *Write* → hold the tag to the top of the phone. Then **lock**
the tag in the app so nobody can rewrite it. (For batches, an ACR122U USB writer +
`nfcpy` on this Mac works too.)

---

## The end-to-end test on a real iPhone

1. Server in **LIVE** mode behind HTTPS (`BASE_URL` = your tunnel/host).
2. On the iPhone, open `https://<BASE_URL>/join/shop1` in Safari → **Add to Apple
   Wallet**. (This sets the cookie linking Safari to this card.)
3. Tap the NFC sticker. The banner opens `…/tap/shop1` in Safari → stamp added →
   the server pushes an update → the Wallet card refreshes to the new count and a
   lock-screen notification appears.
4. To reset/redeem: open `/admin`, hit **Reset** — the card updates on the phone.

> **Identity caveat (Model A):** the link is a Safari cookie. If the customer clears
> cookies or taps from a different browser, they'll be sent to `/join` to re-link.
> Good enough for testing; see the plan's §2.6 for hardening (staff PIN, NTAG424
> secure tags, rate limits) before real-world use.

---

## Config reference (`.env`)

| Key | Meaning |
|---|---|
| `BASE_URL` | Public HTTPS URL of this server |
| `PASS_TYPE_ID` / `TEAM_ID` | From your Apple account |
| `CERT_PASSPHRASE` | Password on your exported `.p12`, if any |
| `MAX_STAMPS` | Stamps needed for the reward (default 10) |
| `STAMP_COOLDOWN_SECONDS` | Min gap between stamps on one card (anti double-tap) |
| `ADMIN_PASSWORD` | Password for `/admin` (Basic Auth) |
| `DEFAULT_SHOP_ID` | Shop id when a tag URL omits one |

## Notes / known limits
- One pass type / one brand per deployment (fine for a single business).
- Push uses the Pass Type certificate against the production APNs gateway. If pushes
  fail, the most common cause is a `BASE_URL` Apple can't reach, or a cert/passphrase
  mismatch — check the server logs (`[wallet log]` lines come from iOS itself).
- Android/Google Wallet is not included; it's the same architecture with different
  certs if you want it later.
