"use strict";

const crypto = require("crypto");
const env = require("../config/env");

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey() {
  if (!env.ENCRYPTION_KEY) {
    throw new Error("ENCRYPTION_KEY is not configured");
  }
  return Buffer.from(env.ENCRYPTION_KEY, "hex");
}

function encrypt(plaintext) {
  if (plaintext == null) return null;
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([
    cipher.update(String(plaintext), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

function decrypt(ciphertext) {
  if (ciphertext == null) return null;
  const key = getKey();
  const buf = Buffer.from(ciphertext, "base64");
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const enc = buf.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString("utf8");
}

module.exports = { encrypt, decrypt };
