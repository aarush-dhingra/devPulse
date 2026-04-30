"use strict";

const path = require("path");
const dotenv = require("dotenv");
const { z } = require("zod");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// Treat empty string env vars as absent so .optional() works as expected.
// NOTE: process.env values are always strings; assigning `undefined` converts
// to the string "undefined", so we must DELETE the key instead.
for (const k of Object.keys(process.env)) {
  if (process.env[k] === "") delete process.env[k];
}

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  CLIENT_URL: z.string().url().default("http://localhost:5173"),
  SERVER_URL: z.string().url().default("http://localhost:5000"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required").optional(),

  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 chars"),
  JWT_EXPIRES_IN: z.string().default("7d"),

  GITHUB_CLIENT_ID: z.string().min(1).optional(),
  GITHUB_CLIENT_SECRET: z.string().min(1).optional(),
  GITHUB_CALLBACK_URL: z
    .string()
    .url()
    .default("http://localhost:5000/api/auth/github/callback"),
  GITHUB_API_TOKEN: z.string().optional(),

  ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/u, "ENCRYPTION_KEY must be 32-byte hex (64 chars)")
    .optional(),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  COOKIE_DOMAIN: z.string().default("localhost"),
  COOKIE_SECURE: z
    .string()
    .transform((v) => v === "true")
    .default("false"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error(
    "❌ Invalid environment variables:\n",
    JSON.stringify(parsed.error.flatten().fieldErrors, null, 2)
  );
  process.exit(1);
}

const env = parsed.data;

env.isProd = env.NODE_ENV === "production";
env.isDev = env.NODE_ENV === "development";
env.isTest = env.NODE_ENV === "test";

module.exports = env;
