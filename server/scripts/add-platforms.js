"use strict";

const { pool } = require("../src/config/db");

async function main() {
  await pool.query(
    "ALTER TABLE platforms DROP CONSTRAINT IF EXISTS platforms_platform_name_check"
  );
  await pool.query(
    `ALTER TABLE platforms ADD CONSTRAINT platforms_platform_name_check
     CHECK (platform_name IN ('github','leetcode','gfg','codeforces','codechef','atcoder','wakatime','devto'))`
  );
  console.log("platforms CHECK constraint updated — codechef + atcoder added");
  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
