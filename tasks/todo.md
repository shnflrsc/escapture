# Tasks: Sign in and register redesign

Plan: [plan.md](plan.md). Design: [reference/](reference/).

**Standing checks after every task:**

- Run `pnpm typecheck && pnpm lint && pnpm test`.
- Open `/sign-in` and `/sign-up` at 1280px, 1024px and 375px, with no sideways scroll.
- Sign in with a seeded student, then a seeded reviewer, and land on the right home page.
- Check that `/s/[token]` and `/setup` still use the old centred layout.

---

### - [x] Task 1: Auth shell and route group

**Description:** Create `app/(auth)/layout.tsx` and `components/safetrail/auth-shell.tsx` (the split layout in plan.md). Move the sign-in and sign-up pages into `app/(auth)/` without changing their URLs.

**Acceptance criteria:**
- [x] The left panel shows the logo and a placeholder slot. The right side has the top line (Home link and the switch link), a centred 420px form area, and the footer links.
- [x] Below 1040px the panel becomes a logo strip. Below 560px it hides, and the logo moves into the top line.
- [x] `/s/[token]` and `/setup` are unchanged.

**Files:** `app/(auth)/layout.tsx`, `components/safetrail/auth-shell.tsx`, the moved `sign-in/page.tsx` and `sign-up/page.tsx`

### - [x] Task 2: Illustrations

**Description:** Convert `reference/illustrations/trail-sign-in.svg` and `trail-register.svg` into React components and put them in the shell's panel.

**Acceptance criteria:**
- [x] Sign in shows the finished trail with the vault. Register shows the trail starting, with the dashed vault outline.
- [x] Each has `aria-hidden` and `focusable="false"`, scales to the panel (max 520px wide and 560px tall), and isn't rendered below 1040px.
- [x] Only brand and tamper token colours are used.

**Dependencies:** Task 1

**Files:** `components/safetrail/illustrations/*`, `components/safetrail/auth-shell.tsx`

### - [x] Task 3: Password field with show/hide

**Description:** Add a password input with a show/hide toggle (a `PasswordInput` in `components/ui/field.tsx`, or an end slot on `Input`).

**Acceptance criteria:**
- [x] The toggle is a 36×36 `<button type="button">` inside the field, with the `Eye`/`EyeOff` icons, the labels "Show password" / "Hide password", and `aria-pressed`.
- [x] It keeps the existing label, hint, error and `aria-describedby` behaviour, and never submits the form.

**Files:** `components/ui/field.tsx`

### - [x] Task 4: Sign-in form

**Description:** Update `auth-form.tsx` (sign-in mode) to match plan.md.

**Acceptance criteria:**
- [x] H1 only. The email placeholder uses the domain. "Can't sign in?" sits in the password label row and links to `/contact`.
- [x] Empty fields on submit show "Enter the email you signed up with." and "Enter your password." Wrong credentials show the attention banner (existing copy).
- [x] "Keep me signed in on this device" is checked by default and sent as `rememberMe`.
- [x] `next`, `method="post"` and the error mapping are unchanged.

**Dependencies:** Tasks 1 and 3

**Files:** `components/safetrail/auth-form.tsx`, `app/(auth)/sign-in/page.tsx`

### - [x] Task 5: Register form

**Description:** Update `auth-form.tsx` (sign-up mode) to match plan.md.

**Acceptance criteria:**
- [x] The fields are Your name, BulSU email and Password, plus the Terms checkbox. H1 only.
- [x] The email input always renders. A live domain check swaps the helper "Must end in @{domain}" for the error. Empty on submit shows "Enter your BulSU email."
- [x] The live "At least 8 characters" rule turns green (`tamper-fg`, `CircleCheck`) when met, shows in `danger-fg` if unmet on submit, and is `aria-live="polite"`.
- [x] An unchecked Terms box blocks submit with "Please agree to the terms to create an account."
- [x] The email typed on the home page is still pre-filled. On success, redirect to `next`. There is no success banner.

**Dependencies:** Tasks 1 and 3

**Files:** `components/safetrail/auth-form.tsx`, `app/(auth)/sign-up/page.tsx`

### - [ ] Task 6: Email domain default (Ask first if `.env.local` differs)

**Description:** Make `ms.bulsu.edu.ph` the default allowed domain, and read it from `ALLOWED_EMAIL_DOMAIN` everywhere it's shown or checked.

**Acceptance criteria:**
- [ ] The defaults in `server/auth.ts`, the sign-up page and `.env.example` are `ms.bulsu.edu.ph`. The DESIGN.md §11 example says "ms.bulsu.edu.ph".
- [ ] No hard-coded domain is left in the auth UI (check with `grep -rn "bulsu.edu.ph" app components lib server`).
- [ ] `pnpm db:seed` accounts can still sign in. If the seed uses the old domain, note this for the user rather than changing their data.

**Files:** `server/auth.ts`, `app/(auth)/sign-up/page.tsx`, `.env.example`, `DESIGN.md`

### - [ ] Task 7: Verification

**Acceptance criteria:**
- [ ] Keyboard path: Home, the switch link, the fields, "Can't sign in?", the toggle, the checkbox, the submit button, then the footer. The focus ring is visible everywhere.
- [ ] Full sign-up with a new `@ms.bulsu.edu.ph` address, then sign out, then sign in, with "Keep me signed in" both on and off.
- [ ] A wrong domain, a short password, a missing consent and a wrong password each show the right message.
- [ ] Reduced motion is respected. DESIGN.md's pre-merge checklist holds.

**Dependencies:** Tasks 1–6
