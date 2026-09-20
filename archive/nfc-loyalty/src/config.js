import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const certPath = (f) => path.join(ROOT, "certs", f);

function readIfExists(p) {
  try {
    return fs.readFileSync(p);
  } catch {
    return null;
  }
}

// The three certificate files you produce from your Apple Developer account.
// See README.md "Apple certificate setup" for how to create these.
const signerCert = readIfExists(certPath("signerCert.pem"));
const signerKey = readIfExists(certPath("signerKey.pem"));
const wwdr = readIfExists(certPath("wwdr.pem"));

// If any cert is missing we boot in DEMO mode: the web flow works in a browser,
// but real .pkpass files can't be signed and pushes are disabled.
const certsPresent = Boolean(signerCert && signerKey && wwdr);

export const config = {
  ROOT,
  baseUrl: (process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, ""),
  passTypeId: process.env.PASS_TYPE_ID || "pass.com.example.loyalty",
  teamId: process.env.TEAM_ID || "TEAMID0000",
  orgName: process.env.ORG_NAME || "Demo Cafe",
  cardTitle: process.env.CARD_TITLE || "Loyalty Card",
  rewardText: process.env.REWARD_TEXT || "Free reward at goal",
  certPassphrase: process.env.CERT_PASSPHRASE || undefined,
  maxStamps: parseInt(process.env.MAX_STAMPS || "10", 10),
  stampCooldownSeconds: parseInt(process.env.STAMP_COOLDOWN_SECONDS || "3", 10),
  adminPassword: process.env.ADMIN_PASSWORD || "changeme",
  defaultShopId: process.env.DEFAULT_SHOP_ID || "shop1",
  port: parseInt(process.env.PORT || "3000", 10),
  certs: { signerCert, signerKey, wwdr },
  certsPresent,
};

export const DEMO_MODE = !certsPresent;
