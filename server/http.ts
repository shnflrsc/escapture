import { ZodError } from "zod";
import { AppError } from "./errors";

export function errorResponse(err: unknown): Response {
  if (err instanceof AppError) {
    return Response.json({ error: { code: err.code, message: err.message } }, { status: err.status });
  }
  if (err instanceof ZodError) {
    const first = err.issues[0];
    const where = first?.path.length ? `${first.path.join(".")}: ` : "";
    return Response.json(
      { error: { code: "validation_error", message: `${where}${first?.message ?? "Invalid request."}` } },
      { status: 400 },
    );
  }
  if (err instanceof SyntaxError) {
    return Response.json(
      { error: { code: "bad_request", message: "The request body is not valid JSON." } },
      { status: 400 },
    );
  }
  // Never leak stack traces or SQL to the client.
  console.error(
    JSON.stringify({
      level: "error",
      msg: "unhandled_route_error",
      name: err instanceof Error ? err.name : "unknown",
      message: err instanceof Error ? err.message : String(err),
    }),
  );
  return Response.json(
    { error: { code: "internal_error", message: "Something went wrong on our side. Please try again." } },
    { status: 500 },
  );
}

type Ctx<P> = { params: Promise<P> };

/** Wraps a route handler so every error becomes the JSON error shape. */
export function handle<P = object>(
  fn: (req: Request, params: P) => Promise<Response>,
) {
  return async (req: Request, ctx: Ctx<P>): Promise<Response> => {
    try {
      return await fn(req, await ctx.params);
    } catch (err) {
      return errorResponse(err);
    }
  };
}

export const json = (data: unknown, status = 200) => Response.json(data, { status });
