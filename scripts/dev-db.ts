// Local development database: a real Postgres started from the
// `embedded-postgres` package, so the app can run without Docker or a
// hosted database. It is a normal background process, not a container.
// Production uses Supabase Postgres via DATABASE_URL.
//   pnpm db:local   start it (keep the terminal open)
//   pnpm db:stop    stop it, including one left behind by a closed terminal
import EmbeddedPostgres from "embedded-postgres";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { connect } from "node:net";
import path from "node:path";
import postgres from "postgres";

const dataDir = path.resolve(".data/pg");
const pidFile = path.join(dataDir, "postmaster.pid");
const port = Number(process.env.LOCAL_DB_PORT ?? 54329);
const url = `postgres://postgres:postgres@localhost:${port}/safetrail`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const portOpen = () =>
  new Promise<boolean>((resolve) => {
    const s = connect(port, "127.0.0.1");
    s.once("connect", () => (s.destroy(), resolve(true)));
    s.once("error", () => resolve(false));
  });

/**
 * A listening port is not enough: a server whose terminal was closed can keep
 * the port open and never answer. Only a real query counts as running.
 */
async function answersQueries(): Promise<boolean> {
  const sql = postgres(url, { max: 1, connect_timeout: 4, onnotice: () => {} });
  try {
    await sql`select 1`;
    return true;
  } catch {
    return false;
  } finally {
    await sql.end({ timeout: 1 }).catch(() => {});
  }
}

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Processes of THIS project's embedded Postgres. On Windows, workers outlive a
 * killed parent, so they are found by executable path, never by name alone.
 */
function ourPostgresPids(): number[] {
  const pids = new Set<number>();
  try {
    // First line of postmaster.pid is the server's process id.
    const recorded = Number(readFileSync(pidFile, "utf8").split(/\r?\n/)[0]);
    if (Number.isInteger(recorded) && recorded > 0 && alive(recorded)) pids.add(recorded);
  } catch {}
  if (process.platform === "win32") {
    try {
      const out = execFileSync(
        "powershell.exe",
        [
          "-NoProfile",
          "-Command",
          "Get-CimInstance Win32_Process -Filter \"Name='postgres.exe'\" | ForEach-Object { \"$($_.ProcessId)|$($_.ParentProcessId)|$($_.ExecutablePath)\" }; " +
            `Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | ForEach-Object { "PORT|$($_.OwningProcess)" }`,
        ],
        { encoding: "utf8" },
      );
      const lines = out.split(/\r?\n/).map((l) => l.split("|"));
      // The listening socket can still be registered to a server process that
      // has already died, while a worker it started keeps the port open.
      const portOwners = new Set(lines.filter((l) => l[0] === "PORT").map((l) => Number(l[1])));
      const mine = path.resolve("node_modules").toLowerCase();
      for (const [pid, parent, exe] of lines) {
        if (pid === "PORT" || !parent) continue;
        const ours = exe?.toLowerCase().startsWith(mine);
        if (ours || portOwners.has(Number(pid)) || portOwners.has(Number(parent))) pids.add(Number(pid));
      }
    } catch {}
  }
  return [...pids];
}

/** Postgres recovers from its write-ahead log on the next start. */
async function stopOurs(): Promise<number> {
  const pids = ourPostgresPids();
  for (const pid of pids) {
    try {
      if (process.platform === "win32") execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
      else process.kill(pid, "SIGTERM");
    } catch {}
  }
  for (let i = 0; i < 50 && (pids.some(alive) || (await portOpen())); i++) await sleep(100);
  rmSync(pidFile, { force: true });
  return pids.length;
}

async function main() {
  if (process.argv.includes("stop")) {
    const stopped = await stopOurs();
    console.log(stopped ? "Stopped local Postgres." : "Local Postgres is not running.");
    return;
  }

  if (await answersQueries()) {
    console.log(`Local Postgres is already running and answering on port ${port}.`);
    console.log("You can use it as is. To stop it, run: pnpm db:stop");
    return;
  }

  if (ourPostgresPids().length) {
    console.log("Found a local Postgres left over from an earlier session that no longer answers. Replacing it.");
    await stopOurs();
  }
  if (await portOpen()) {
    throw new Error(
      `Port ${port} is in use by another program. Free it, or set LOCAL_DB_PORT (and the port in DATABASE_URL) to another port.`,
    );
  }
  rmSync(pidFile, { force: true });

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
  console.log(`Local Postgres ready: ${url}`);
  console.log("Keep this terminal open. Press Ctrl+C to stop the database.");
  const shutdown = async () => {
    await pg.stop().catch(() => {});
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  process.on("SIGHUP", shutdown);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
