// src/batch/run-signal-generators.js
import pg from "pg";

const { Client } = pg;

async function main() {
  console.log("[BATCH] Signal generation started");

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  // 🔽 임시: 실행 확인용 (나중에 signal 로직으로 교체)
  await client.query("select 1");

  await client.end();

  console.log("[BATCH] Signal generation finished");
}

main().catch(err => {
  console.error("[BATCH][FATAL]", err);
  process.exit(1);
});
