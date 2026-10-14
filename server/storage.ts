// Evidence file storage. Supabase Storage (private bucket, service-role key,
// server only) when configured; otherwise a local-disk fallback for
// development so the app runs without a Supabase project.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "evidence";
const localRoot = path.resolve(".data/storage", bucket);

let client: SupabaseClient | null = null;
function supabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_LOCAL_STORAGE !== "true") {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in production");
    }
    return null;
  }
  client ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

// Paths are built from server-generated ids only; this guards the local driver.
function localPath(p: string) {
  const full = path.resolve(localRoot, p);
  if (!full.startsWith(localRoot + path.sep)) throw new Error("Invalid storage path");
  return full;
}

export const storageDriver = () => (supabase() ? "supabase" : "local");

export async function ensureBucket(): Promise<void> {
  const sb = supabase();
  if (!sb) {
    await mkdir(localRoot, { recursive: true });
    return;
  }
  const { data } = await sb.storage.getBucket(bucket);
  if (!data) {
    const { error } = await sb.storage.createBucket(bucket, { public: false });
    if (error && !/already exists/i.test(error.message)) throw new Error(error.message);
  }
}

export async function putObject(p: string, bytes: Uint8Array): Promise<void> {
  const sb = supabase();
  if (!sb) {
    const full = localPath(p);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, bytes, { flag: "wx" });
    return;
  }
  const { error } = await sb.storage
    .from(bucket)
    .upload(p, bytes, { contentType: "text/html; charset=utf-8", upsert: false });
  if (error) throw new Error(`storage upload failed: ${error.message}`);
}

export async function getObject(p: string): Promise<Uint8Array> {
  const sb = supabase();
  if (!sb) return new Uint8Array(await readFile(localPath(p)));
  const { data, error } = await sb.storage.from(bucket).download(p);
  if (error || !data) throw new Error(`storage download failed: ${error?.message ?? "no data"}`);
  return new Uint8Array(await data.arrayBuffer());
}

export async function removeObject(p: string): Promise<void> {
  const sb = supabase();
  if (!sb) {
    await rm(localPath(p), { force: true });
    return;
  }
  const { error } = await sb.storage.from(bucket).remove([p]);
  if (error) throw new Error(`storage remove failed: ${error.message}`);
}
