export class AppError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const unauthorized = () => new AppError("unauthorized", 401, "Please sign in to continue.");
export const forbidden = (message = "You don't have access to this.") =>
  new AppError("forbidden", 403, message);
// Used instead of 403 for resources the user shouldn't know exist.
export const notFound = (message = "We couldn't find that.") =>
  new AppError("not_found", 404, message);
export const conflict = (message: string, code = "conflict") => new AppError(code, 409, message);
export const badRequest = (message: string) => new AppError("bad_request", 400, message);
