export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    /** Anything else the server sent with the error. */
    public data: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

/** JSON fetch for client components. Throws ApiError with a message safe to show. */
export async function api<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown } = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: opts.method ?? (opts.body === undefined ? "GET" : "POST"),
      headers: opts.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError(0, "network", "We couldn't reach Escapture. Check your connection and try again.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      res.status,
      data?.error?.code ?? data?.code ?? "error",
      data?.error?.message ?? data?.message ?? "Something went wrong. Please try again.",
      data?.error ?? {},
    );
  }
  return data as T;
}

export const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : "Something went wrong. Please try again.";
