import sharp from "sharp";
import { config } from "./config.js";

// All Wallet images are generated on the fly from SVG -> PNG so there are no
// binary assets to manage. Swap these out for your real brand art later.

const BRAND_BG = "#2b2018";
const BRAND_FG = "#ffffff";
const STAMP_EMPTY = "#5a4a3a";
const STAMP_FILLED = "#f0a830";

function svgToPng(svg, width, height) {
  return sharp(Buffer.from(svg)).resize(width, height).png().toBuffer();
}

// icon.png is required by Apple. Simple rounded square with a coffee cup glyph.
function iconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="87" height="87" viewBox="0 0 87 87">
    <rect width="87" height="87" rx="18" fill="${BRAND_BG}"/>
    <text x="43.5" y="58" font-size="46" text-anchor="middle" fill="${STAMP_FILLED}">&#9749;</text>
  </svg>`;
}

function logoSvg() {
  const name = (config.orgName || "Loyalty").slice(0, 18);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="150" viewBox="0 0 480 150">
    <text x="0" y="100" font-size="64" font-family="Helvetica, Arial, sans-serif"
      font-weight="bold" fill="${BRAND_FG}">${escapeXml(name)}</text>
  </svg>`;
}

// The stamp strip: a row of `max` circles, the first `filled` of them coloured in.
function stripSvg(filled, max) {
  const W = 1125; // 3x of 375pt
  const H = 432;
  const pad = 60;
  const gap = (W - pad * 2) / max;
  const r = Math.min(gap * 0.32, 44);
  const cy = H / 2;
  let circles = "";
  for (let i = 0; i < max; i++) {
    const cx = pad + gap * i + gap / 2;
    const isFilled = i < filled;
    circles += `<circle cx="${cx.toFixed(1)}" cy="${cy}" r="${r.toFixed(1)}"
      fill="${isFilled ? STAMP_FILLED : "none"}"
      stroke="${isFilled ? STAMP_FILLED : STAMP_EMPTY}" stroke-width="6"/>`;
    if (isFilled) {
      circles += `<text x="${cx.toFixed(1)}" y="${(cy + r * 0.55).toFixed(1)}"
        font-size="${(r * 1.4).toFixed(0)}" text-anchor="middle" fill="${BRAND_BG}">&#9733;</text>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${BRAND_BG}"/>
    ${circles}
  </svg>`;
}

function escapeXml(s) {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]));
}

// Cache the static icon/logo (they never change).
let iconCache = null;
let logoCache = null;

export async function iconImages() {
  if (!iconCache) {
    const base = iconSvg();
    iconCache = {
      "icon.png": await svgToPng(base, 29, 29),
      "icon@2x.png": await svgToPng(base, 58, 58),
      "icon@3x.png": await svgToPng(base, 87, 87),
    };
  }
  return iconCache;
}

export async function logoImages() {
  if (!logoCache) {
    const base = logoSvg();
    logoCache = {
      "logo.png": await svgToPng(base, 160, 50),
      "logo@2x.png": await svgToPng(base, 320, 100),
      "logo@3x.png": await svgToPng(base, 480, 150),
    };
  }
  return logoCache;
}

export async function stripImages(filled, max) {
  const base = stripSvg(filled, max);
  return {
    "strip.png": await svgToPng(base, 375, 144),
    "strip@2x.png": await svgToPng(base, 750, 288),
    "strip@3x.png": await svgToPng(base, 1125, 432),
  };
}

// Returns a single PNG buffer of the strip — handy for previewing in the browser.
export async function stripPreviewPng(filled, max) {
  return svgToPng(stripSvg(filled, max), 750, 288);
}
