// pnpm admin:create-user --email a@b.c --name "Name" --password "..." --role reviewer|admin
import { parseArgs } from "node:util";
import { pg } from "@/server/db";
import { ensureUser } from "./lib/users";

async function main() {
  const { values } = parseArgs({
    options: {
      email: { type: "string" },
      name: { type: "string" },
      password: { type: "string" },
      role: { type: "string" },
    },
  });
  const { email, name, password, role } = values;
  if (!email || !name || !password || (role !== "reviewer" && role !== "admin")) {
    console.error('Usage: pnpm admin:create-user --email <email> --name "<name>" --password <password> --role reviewer|admin');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("The password needs at least 8 characters.");
    process.exit(1);
  }
  const u = await ensureUser({ email, name, password, role });
  console.log(`${u.created ? "Created" : "Updated"} ${u.role} account: ${u.email}`);
  await pg.end();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
