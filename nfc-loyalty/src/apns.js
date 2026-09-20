import apn from "@parse/node-apn";
import { config, DEMO_MODE } from "./config.js";
import { pushTokensForSerial } from "./db.js";

// Apple Wallet pass updates work like this: we send an (empty) push to every
// device that registered the pass. The push just nudges the phone; the phone then
// calls GET /wallet/v1/passes/... to pull the fresh pass. The push is sent using
// the SAME Pass Type ID certificate used to sign the pass.

let provider = null;

function getProvider() {
  if (DEMO_MODE) return null;
  if (!provider) {
    provider = new apn.Provider({
      cert: config.certs.signerCert,
      key: config.certs.signerKey,
      passphrase: config.certPassphrase,
      production: true, // Wallet pushes always go to the production APNs gateway
    });
  }
  return provider;
}

// Notify all devices holding `serial` that the pass changed.
export async function pushPassUpdate(serial) {
  const p = getProvider();
  const tokens = pushTokensForSerial(serial);
  if (!p || tokens.length === 0) {
    return { sent: 0, demo: DEMO_MODE, devices: tokens.length };
  }

  const note = new apn.Notification();
  note.topic = config.passTypeId; // for Wallet, the topic IS the pass type id
  note.pushType = "background";
  note.payload = {}; // payload content is irrelevant for pass updates

  const result = await p.send(note, tokens);
  return { sent: result.sent.length, failed: result.failed.length, devices: tokens.length };
}
