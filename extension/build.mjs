// Bundles the Escrow Capture extension into extension/dist (load unpacked
// from there). APP_URL is injected at build time:
//   pnpm ext:build                       -> NEXT_PUBLIC_APP_URL from .env.local, or http://localhost:3000
//   APP_URL=https://example.com pnpm ext:build
import { build, context } from "esbuild";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const dist = path.join(here, "dist");
const watch = process.argv.includes("--watch");

function envFromFile(name) {
  const file = path.join(root, ".env.local");
  if (!existsSync(file)) return undefined;
  const line = readFileSync(file, "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${name}=`));
  return line?.slice(name.length + 1).trim() || undefined;
}

const appUrl = (process.env.APP_URL ?? envFromFile("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000").replace(/\/+$/, "");
const appOrigin = new URL(appUrl).origin;
const isLocal = ["localhost", "127.0.0.1"].includes(new URL(appUrl).hostname);
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
const { key, id } = JSON.parse(readFileSync(path.join(here, "key.json"), "utf8"));

rmSync(dist, { recursive: true, force: true });
mkdirSync(path.join(dist, "fonts"), { recursive: true });

const manifest = JSON.parse(readFileSync(path.join(here, "manifest.json"), "utf8"));
manifest.version = pkg.version;
// A fixed key pins the extension ID, so EXTENSION_ORIGIN never changes.
manifest.key = key;
manifest.host_permissions.push(`${appOrigin}/*`);
if (isLocal) {
  // Local fixture pages (pnpm fixtures:serve), for testing without real Facebook.
  manifest.host_permissions.push("http://localhost:4100/*", "http://127.0.0.1:4100/*");
  for (const entry of manifest.content_scripts) entry.matches.push("http://localhost:4100/*");
}
writeFileSync(path.join(dist, "manifest.json"), JSON.stringify(manifest, null, 2));

for (const f of ["popup.html", "popup.css"]) cpSync(path.join(here, "src/popup", f), path.join(dist, f));
cpSync(path.join(here, "src/offscreen/offscreen.html"), path.join(dist, "offscreen.html"));
const fonts = [
  ["lora", "lora-latin-600-normal.woff2"],
  ["nunito", "nunito-latin-400-normal.woff2"],
  ["nunito", "nunito-latin-600-normal.woff2"],
  ["nunito", "nunito-latin-700-normal.woff2"],
];
// Fonts are packaged: MV3 extension pages can't rely on remote font loading.
for (const [family, file] of fonts) {
  cpSync(path.join(root, "node_modules/@fontsource", family, "files", file), path.join(dist, "fonts", file));
}

const options = {
  entryPoints: {
    background: path.join(here, "src/background/index.ts"),
    content: path.join(here, "src/content/index.ts"),
    "page-guard": path.join(here, "src/content/page-guard.js"),
    "guard-bridge": path.join(here, "src/content/guard-bridge.ts"),
    popup: path.join(here, "src/popup/popup.ts"),
    offscreen: path.join(here, "src/offscreen/offscreen.ts"),
  },
  outdir: dist,
  bundle: true,
  format: "iife",
  target: "chrome120",
  minify: false,
  define: {
    __APP_URL__: JSON.stringify(appUrl),
    __EXT_VERSION__: JSON.stringify(pkg.version),
  },
  logLevel: "info",
};

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
  console.log("Watching extension sources...");
} else {
  await build(options);
}
console.log(`Extension built for ${appUrl}`);
console.log(`Extension ID: ${id}  ->  EXTENSION_ORIGIN=chrome-extension://${id}`);
