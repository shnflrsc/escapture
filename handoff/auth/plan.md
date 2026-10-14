# Implementation Plan: Sign in and register redesign

Status: **ready to implement.** Tasks: [todo.md](todo.md). Design source: [reference/](reference/).

## Problem

Today `/sign-in` and `/sign-up` are a logo above a single card in a 480px column. They work, but they feel unfinished next to the rest of the product. How might we make them feel calm and complete without repeating the home page's marketing?

## Overview

- **Split layout:** a `brand-50` illustration panel on the left and the form on white on the right.
- **Left panel:** holds the logo and one illustration only, with no marketing copy. Register shows a trail starting. Sign in shows the same trail reaching a closed vault.
- **Form side:** a small top line (Home link on the left, the switch between sign-in and register on the right), the form centred at max 420px, and legal links at the bottom.
- **New form details:** a show/hide password toggle on both pages. Sign in adds "Keep me signed in" and a "Can't sign in?" link. Register adds a live domain check, a live password rule and a Terms checkbox.

## Decisions already made

- **No marketing copy on the left.** The user removed the headline, bullet points, vault preview and pilot line on purpose, so don't add them back.
- **Minimal copy on the form side.** Only the H1 sits above the fields. No subtitle, no reviewer note and no privacy note. Field helper text is limited to what's listed below.
- **Illustrations are decorative.** They are inline SVG with `aria-hidden="true"` and `focusable="false"`, use only `brand-*` and tamper token colours, and contain no people. They hide when the layout is narrower than 1040px. DESIGN.md §8 already has this exception, so don't edit it again.
- **Email domain:** the design uses **`ms.bulsu.edu.ph`** (placeholders `you@ms.bulsu.edu.ph` and `2025000001@ms.bulsu.edu.ph`). The code currently defaults to `bulsu.edu.ph`.
  - Every place that shows or checks the domain must read `ALLOWED_EMAIL_DOMAIN`: the placeholder, the helper, the error and the client-side check. Never hard-code the domain.
  - Change the defaults to `ms.bulsu.edu.ph` in `server/auth.ts`, `app/(public)/sign-up/page.tsx` and `.env.example`, and update the example in DESIGN.md §11.
  - **Ask first** if the user's `.env.local` sets a different value. Don't edit `.env.local` yourself.
- **The red border on an invalid field** is the existing `Input` error style (`danger-fg` border plus an icon and a sentence). That is allowed by DESIGN.md. Never red-fill a field.
- **Refused sign-in** uses the amber `Banner tone="attention"`, never red.

## Decisions with defaults

- **"Can't sign in?"** links to `/contact`. There is no email sending, so there's no reset flow.
- **"Keep me signed in"** is checked by default and passed as `rememberMe` in the body of `/api/auth/sign-in/email`. Better Auth supports this, so no server change is needed. Unchecked means a session cookie that ends when the browser closes.
- **The Terms checkbox** is required on the client only, and the server is unchanged. *Recording consent (a timestamp on `user`) is a schema change. Ask first.*
- **Home link** goes to `/`. The legal links go to `/privacy`, `/terms` and `/contact`, which already exist.

## Layout

Rebuild `reference/auth.css` with Tailwind tokens.

- **Structure:** a new `components/safetrail/auth-shell.tsx` with props `illustration: "sign-in" | "register"` and `children` (the form). It's used by `app/(public)/sign-in/page.tsx` and `app/(public)/sign-up/page.tsx`. Because `(public)/layout.tsx` wraps every public page in a 480px column, move sign-in and sign-up into a new route group `app/(auth)/` with its own minimal layout. URLs don't change. Don't touch the layout `/s/[token]` and `/setup` use.
- **Container:** `min-h-screen`, a flex row that wraps, background `card`. Use a container query (`@container`) on the shell, because the canvas relies on the shell's width rather than the viewport's.
- **Left panel** (`flex: 1 1 520px`):
  - `brand-50` background, 1px right `border`, padding 48px 64px, a column with a 48px gap.
  - The logo (existing `<Logo size={36} />`) top-left, links to `/`.
  - The illustration fills the remaining height, centred, max 520px wide, `max-height: 560px`, `height: auto`.
- **Right side** (`flex: 1 1 520px`):
  - `card` background, padding 32px 48px, a column with a 32px gap.
  - Top line: space-between, 15px `muted`.
    - Left: a "Home" link with a `ChevronLeft` icon, in `brand-700` 600.
    - Right: "New to SafeTrail? **Create an account**" on sign in, or "Already have an account? **Sign in**" on register. The question text is `muted`, the link `brand-700`.
  - The form is centred vertically and horizontally, max 420px, with a 24px gap between groups.
  - Footer: "Privacy Policy · Terms of Service · Contact the team", 13px `muted`, centred.
- **Below 1040px:** the left panel becomes a full-width strip (24px padding, bottom border) with the logo only, and the illustration hides. The right side's padding drops to 24px.
- **Below 560px:** the left panel hides. The logo moves into the top line (left, size 28), the top line's question text hides (keep only the link), padding is 16px, the H1 is 28/36, and the form is top-aligned.

## Sign in (`reference/SignIn.dc.html`)

- H1 "Sign in" (Lora 32/40). Nothing under it.
- When sign-in is refused: an attention banner above the fields, "That email or password isn't right. Check them and try again." (existing copy).
- **Email:** label "Email", `type="email"`, `autocomplete="email"`, placeholder `you@{domain}`. If empty on submit: "Enter the email you signed up with."
- **Password:**
  - Label "Password", with the link "Can't sign in?" (14px) on the right of the label row.
  - Input `autocomplete="current-password"`.
  - A 36×36 show/hide button inside the field on the right: `Eye` or `EyeOff`, `aria-label` "Show password" / "Hide password", `aria-pressed`.
  - If empty on submit: "Enter your password."
- **Checkbox:** "Keep me signed in on this device", checked by default. 20px box with `accent-color: brand-700`.
- **Primary button** "Sign in": full width, 48px tall, with the existing loading state.

## Register (`reference/Register.dc.html`)

- H1 "Create your account". Nothing under it.
- **Your name:** `autocomplete="name"`, `maxLength={80}`. If empty on submit: "Enter your name." No helper text.
- **BulSU email:**
  - `type="email"`, placeholder `2025000001@{domain}`, helper "Must end in @{domain}".
  - Live check: once the text has an `@` and a dot after it (or on submit), a wrong domain replaces the helper with the error "Please enter an email that ends in @{domain}." Empty on submit: "Enter your BulSU email."
  - **Fix from the mockup:** in the canvas the email input sits inside the helper's conditional, so it disappears when the error shows. That's a canvas editing slip. The input always renders, and only the helper or error line under it swaps.
- **Password:**
  - Same show/hide button as sign in, `autocomplete="new-password"`.
  - Under it, a live rule row "At least 8 characters" with a hollow circle icon, which turns into `CircleCheck` in `tamper-fg` when met. It shows in `danger-fg` if unmet on submit.
  - The rule row is `aria-live="polite"`. No other tip.
- **Checkbox:** "I agree to the Terms of Service and Privacy Policy." with both as links (they open in the same tab). Unchecked on submit: "Please agree to the terms to create an account." (indented 32px under the label).
- **Primary button** "Create account": full width, 48px, with the loading state.
- **Server errors** keep the existing mapping: domain refused and existing account go on the email field, everything else in the attention banner.
- The canvas's blue "Everything looks right…" banner is a prototype-only stand-in for "submit succeeded". **Don't build it.** On success, redirect to `next` as today.

## Accessibility

- One H1 per page. Inputs have visible labels. Errors are linked with `aria-describedby` and announced, which the existing `Input` already does.
- The show/hide button is a real `<button type="button">` with a focus ring and doesn't submit the form.
- Tab order: Home, the switch link, the fields (the "Can't sign in?" link comes after the password label), the checkbox, the submit button, then the footer links.
- Targets are at least 40px. The checkbox's label is clickable.
- The illustration is hidden from assistive technology.

## Files likely touched

- New: `app/(auth)/layout.tsx` and `components/safetrail/auth-shell.tsx`.
- New: `components/safetrail/illustrations/trail-sign-in.tsx` and `trail-register.tsx`, converted from the SVGs. Keep the hex values as given; they are the brand tokens, so add a comment saying so, or swap them for `var(--brand-…)`.
- Moved: `app/(public)/sign-in/page.tsx` and `app/(public)/sign-up/page.tsx` to `app/(auth)/…`.
- Changed: `components/safetrail/auth-form.tsx`, `components/ui/field.tsx` (add a `PasswordInput` with the toggle, or an `endAdornment` slot), `server/auth.ts`, `.env.example`, `DESIGN.md` (§11 example only).
