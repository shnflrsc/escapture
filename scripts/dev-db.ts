// Local development database: a real Postgres started from the
// `embedded-postgres` package, so the app can run without Docker or a
// hosted database. Production uses Supabase Postgres via DATABASE_URL.
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import { connect } from "node:net";
import path from "node:path";

const dataDir = path.resolve(".data/pg");
const port = Number(process.env.LOCAL_DB_PORT ?? 54329);

const portOpen = () =>
  new Promise<boolean>((resolve) => {
    const s = connect(port, "127.0.0.1");
    s.once("connect", () => (s.destroy(), resolve(true)));
    s.once("error", () => resolve(false));
  });

async function main() {
  if (await portOpen()) {
    console.log(`Local Postgres is already running on port ${port}.`);
    return;
  }
  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: "postgres",
    password: "postgres",
    port,
    persistent: true,
    onLog: () => {},
    onError: (e) => console.error(e),
  });
  const fresh = !existsSync(path.join(dataDir, "PG_VERSION"));
  if (fresh) await pg.initialise();
  await pg.start();
  if (fresh) await pg.createDatabase("safetrail");
  console.log(
    `Local Postgres ready: postgres://postgres:postgres@localhost:${port}/safetrail`,
  );
  const stop = async () => {
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
