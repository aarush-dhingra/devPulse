"use strict";

const fs = require("fs");
const path = require("path");
const { pool } = require("../src/config/db");
const logger = require("../src/utils/logger");

async function main() {
  const sqlPath = path.resolve(__dirname, "..", "sql", "schema.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");
  logger.info(`Applying schema from ${sqlPath}`);
  await pool.query(sql);
  logger.info("Schema applied successfully");
  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  logger.error("Migration failed", { error: err.message, stack: err.stack });
  process.exit(1);
});
