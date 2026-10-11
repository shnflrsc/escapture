// Serves fixtures/ on http://localhost:4100 so the extension can be tested
// on fake Facebook-like pages without touching real Facebook.
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

const root = path.resolve("fixtures");
const port = Number(process.env.FIXTURES_PORT ?? 4100);

createServer(async (req, res) => {
  const name = path.basename(new URL(req.url ?? "/", "http://x").pathname) || "index.html";
  try {
    const body = await readFile(path.join(root, name));
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  }
}).listen(port, () => {
  console.log(`Fixtures: http://localhost:${port}/fake-facebook-post.html`);
  console.log(`          http://localhost:${port}/fake-messenger.html`);
});
