import { PKPass } from "passkit-generator";
import { config, DEMO_MODE } from "./config.js";
import { iconImages, logoImages, stripImages } from "./images.js";

// Builds and signs a .pkpass (Apple Wallet store card) for one customer card.
// Returns a Buffer. Throws in DEMO mode (no certs) so callers can show guidance.
export async function buildPass(card) {
  if (DEMO_MODE) {
    throw new Error(
      "DEMO_MODE: no Apple certificates found in certs/. Add signerCert.pem, " +
        "signerKey.pem and wwdr.pem to issue real passes. See README.md."
    );
  }

  const { stamps, max_stamps: max } = card;
  const reachedGoal = stamps >= max;

  const passJson = {
    formatVersion: 1,
    passTypeIdentifier: config.passTypeId,
    teamIdentifier: config.teamId,
    organizationName: config.orgName,
    description: config.cardTitle,
    serialNumber: card.serial,

    // These two fields are what let the pass update itself over the air.
    webServiceURL: `${config.baseUrl}/wallet/`,
    authenticationToken: card.auth_token,

    backgroundColor: "rgb(43,32,24)",
    foregroundColor: "rgb(255,255,255)",
    labelColor: "rgb(240,168,48)",

    storeCard: {
      headerFields: [
        { key: "count", label: "STAMPS", value: `${stamps}/${max}` },
      ],
      primaryFields: [
        {
          key: "status",
          label: reachedGoal ? "REWARD READY" : "PROGRESS",
          value: reachedGoal ? "🎉 Claim your reward!" : `${stamps} of ${max}`,
        },
      ],
      secondaryFields: [
        { key: "reward", label: "REWARD", value: config.rewardText },
      ],
      backFields: [
        {
          key: "how",
          label: "How it works",
          value:
            "Tap the NFC chip in store to collect a stamp. Collect " +
            `${max} to earn: ${config.rewardText}.`,
        },
      ],
    },

    // A QR fallback so staff can identify the card without NFC.
    barcodes: [
      {
        format: "PKBarcodeFormatQR",
        message: card.serial,
        messageEncoding: "iso-8859-1",
      },
    ],
  };

  const [icons, logos, strips] = await Promise.all([
    iconImages(),
    logoImages(),
    stripImages(stamps, max),
  ]);

  const pass = new PKPass(
    {
      "pass.json": Buffer.from(JSON.stringify(passJson)),
      ...icons,
      ...logos,
      ...strips,
    },
    {
      signerCert: config.certs.signerCert,
      signerKey: config.certs.signerKey,
      wwdr: config.certs.wwdr,
      signerKeyPassphrase: config.certPassphrase,
    }
  );

  return pass.getAsBuffer();
}
