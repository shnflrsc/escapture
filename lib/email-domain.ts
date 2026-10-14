// The one place the default lives. Everything that shows or checks the domain reads it from here.
export const DEFAULT_EMAIL_DOMAIN = "ms.bulsu.edu.ph";

/** The domain student sign-ups must use (server-side: reads ALLOWED_EMAIL_DOMAIN). */
export const allowedEmailDomain = () => process.env.ALLOWED_EMAIL_DOMAIN ?? DEFAULT_EMAIL_DOMAIN;
