import Database from "better-sqlite3";
import path from "node:path";
import crypto from "node:crypto";
import { config } from "./config.js";

const db = new Database(path.join(config.ROOT, "data", "loyalty.db"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS cards (
    serial        TEXT PRIMARY KEY,
    auth_token    TEXT NOT NULL,
    shop_id       TEXT NOT NULL,
    stamps        INTEGER NOT NULL DEFAULT 0,
    max_stamps    INTEGER NOT NULL,
    created_at    INTEGER NOT NULL,
    updated_at    INTEGER NOT NULL,
    last_stamp_at INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS registrations (
    device_id  TEXT NOT NULL,
    serial     TEXT NOT NULL,
    push_token TEXT NOT NULL,
    PRIMARY KEY (device_id, serial)
  );
`);

const now = () => Math.floor(Date.now() / 1000);

export function createCard(shopId) {
  const serial = crypto.randomUUID();
  const authToken = crypto.randomBytes(20).toString("hex");
  const t = now();
  db.prepare(
    `INSERT INTO cards (serial, auth_token, shop_id, stamps, max_stamps, created_at, updated_at)
     VALUES (?, ?, ?, 0, ?, ?, ?)`
  ).run(serial, authToken, shopId, config.maxStamps, t, t);
  return getCard(serial);
}

export function getCard(serial) {
  return db.prepare(`SELECT * FROM cards WHERE serial = ?`).get(serial);
}

export function listCards() {
  return db.prepare(`SELECT * FROM cards ORDER BY created_at DESC`).all();
}

// Adds one stamp, capped at max. Returns { card, added, reason }.
export function addStamp(serial) {
  const card = getCard(serial);
  if (!card) return { card: null, added: false, reason: "not_found" };

  const t = now();
  if (t - card.last_stamp_at < config.stampCooldownSeconds) {
    return { card, added: false, reason: "cooldown" };
  }
  if (card.stamps >= card.max_stamps) {
    return { card, added: false, reason: "full" };
  }

  db.prepare(
    `UPDATE cards SET stamps = stamps + 1, updated_at = ?, last_stamp_at = ? WHERE serial = ?`
  ).run(t, t, serial);
  return { card: getCard(serial), added: true, reason: "ok" };
}

// Manual admin adjustment. delta can be negative; result is clamped to [0, max].
export function adjustStamps(serial, delta) {
  const card = getCard(serial);
  if (!card) return null;
  const next = Math.max(0, Math.min(card.max_stamps, card.stamps + delta));
  db.prepare(`UPDATE cards SET stamps = ?, updated_at = ? WHERE serial = ?`).run(next, now(), serial);
  return getCard(serial);
}

export function resetCard(serial) {
  const card = getCard(serial);
  if (!card) return null;
  db.prepare(`UPDATE cards SET stamps = 0, updated_at = ? WHERE serial = ?`).run(now(), serial);
  return getCard(serial);
}

export function registerDevice(deviceId, serial, pushToken) {
  db.prepare(
    `INSERT INTO registrations (device_id, serial, push_token)
     VALUES (?, ?, ?)
     ON CONFLICT(device_id, serial) DO UPDATE SET push_token = excluded.push_token`
  ).run(deviceId, serial, pushToken);
}

export function unregisterDevice(deviceId, serial) {
  db.prepare(`DELETE FROM registrations WHERE device_id = ? AND serial = ?`).run(deviceId, serial);
}

export function pushTokensForSerial(serial) {
  return db
    .prepare(`SELECT push_token FROM registrations WHERE serial = ?`)
    .all(serial)
    .map((r) => r.push_token);
}

// Serials registered to a device that changed after `since` (unix seconds).
export function updatedSerialsForDevice(deviceId, since) {
  const rows = db
    .prepare(
      `SELECT c.serial AS serial, c.updated_at AS updated_at
       FROM registrations r JOIN cards c ON c.serial = r.serial
       WHERE r.device_id = ? AND (? IS NULL OR c.updated_at > ?)`
    )
    .all(deviceId, since, since);
  return rows;
}

export default db;
