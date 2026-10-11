import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return routeFiles(full);
    return name === "route.ts" ? [full] : [];
  });
}

const api = path.resolve(__dirname, "../app/api");
const files = routeFiles(api);

describe("route guards (security checklist)", () => {
  it("finds the route handlers", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it.each(files.map((f) => [path.relative(api, f).replace(/\\/g, "/"), f]))(
    "%s checks the session in every handler, or is explicitly public",
    (_name, file) => {
      const src = readFileSync(file, "utf8");
      if (src.includes("// public-route")) return;
      const handlers = src.match(/export const (GET|POST|PATCH|PUT|DELETE) = handle/g) ?? [];
      const guards = src.match(/await requireUser\(/g) ?? [];
      expect(handlers.length).toBeGreaterThan(0);
      expect(guards.length).toBe(handlers.length);
    },
  );

  it("only auth and link metadata are public", () => {
    const publicRoutes = files
      .filter((f) => readFileSync(f, "utf8").includes("// public-route"))
      .map((f) => path.relative(api, f).replace(/\\/g, "/"))
      .sort();
    expect(publicRoutes).toEqual(["auth/[...all]/route.ts", "links/[token]/route.ts"]);
  });

  it("review routes are reviewer-only", () => {
    for (const f of files.filter((f) => f.includes(`${path.sep}review${path.sep}`))) {
      const src = readFileSync(f, "utf8");
      const handlers = src.match(/export const (GET|POST|PATCH|PUT|DELETE) = handle/g) ?? [];
      const reviewerGuards = src.match(/requireUser\(\{ roles: \["reviewer"\] \}\)/g) ?? [];
      expect(reviewerGuards.length).toBe(handlers.length);
    }
  });

  it("the evidence file route always sends the sandbox CSP and nosniff", () => {
    const headers = readFileSync(path.resolve(__dirname, "../lib/evidence-headers.ts"), "utf8");
    expect(headers).toContain("sandbox; default-src 'none'");
    expect(headers).toContain('"X-Content-Type-Options": "nosniff"');
    expect(headers).not.toContain("allow-scripts");
    const route = readFileSync(path.join(api, "evidence/[id]/file/route.ts"), "utf8");
    expect(route).toContain("headers: EVIDENCE_FILE_HEADERS");
  });
});
