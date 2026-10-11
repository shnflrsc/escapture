// Serves fixtures/ on http://localhost:4100 so the extension can be tested
// on fake Facebook-like pages without touching real Facebook.
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

const root = path.resolve("fixtures");
const port = Number(process.env.FIXTURES_PORT ?? 4100);

createServer(async (req, res) => {
  const name = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname).replace(/^\/+/, "") || "index.html";
  const file = path.resolve(root, name);
  try {
    // Never serve anything outside fixtures/.
    if (!file.startsWith(root + path.sep)) throw new Error("outside root");
    const body = await readFile(file);
    const type = file.endsWith(".css") ? "text/css" : file.endsWith(".svg") ? "image/svg+xml" : "text/html";
    res.writeHead(200, { "Content-Type": `${type}; charset=utf-8`, "Cache-Control": "no-store" });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  }
}).listen(port, () => {
  console.log(`Fixtures: http://localhost:${port}/fake-facebook-post.html`);
  console.log(`          http://localhost:${port}/fake-messenger.html`);
});
