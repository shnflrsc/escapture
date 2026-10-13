# SafeTrail Design Guidelines

Rules for AI agents and developers building the SafeTrail frontend (Next.js). Follow this file over personal taste and over generic UI defaults. If a rule here conflicts with a library default, this file wins.

## 1. Product context

SafeTrail helps students who are being cyberbullied keep evidence of what happened, build a case from it, and escalate it to university case reviewers. The MVP covers Facebook posts and messages, pilots at Bulacan State University, and supplements the university's existing process.

Three kinds of people use it:

- **Students (reporters and collaborators).** Often stressed, embarrassed or scared. They need calm, clarity and a sense of control.
- **Case reviewers.** Work through cases on a shared Review Board. They need density, scannability and trust signals.
- **Administrators.** Create reviewer accounts. Low-frequency, simple screens.

Target: **desktop browsers first.** The layout is designed at 1280px. Below 1024px the sidebar becomes a drawer opened from a menu button in the header, and the Vault is laid out for tablets and phones. Other pages only need to stay usable there; do not build separate mobile variants of them.

## 2. Design principles

1. **Calm first.** The student on screen may be having a bad day. Every screen should lower anxiety, not raise it.
2. **One thing at a time.** One primary action per view. One clear next step. Never fill space just because it exists.
3. **Friendly, not childish.** Soft shapes and warm language, but serious about the subject. No mascots, confetti, emoji or playful puns.
4. **Honest about trust.** The product says "tamper-checked", never "tamper-proof" or "verified authentic". Visual treatment of trust signals must never promise more than the product delivers.
5. **User stays in control.** Make it obvious what is private, what is shared, and what cannot be undone. Irreversible steps get a deliberate, weightier treatment.
6. **Soft, elegant, minimal.** Rounded corners, humanist type, a quiet blue palette, generous white space, flat color. No gradients.

## 3. Brand and logo

- The logo is a **fingerprint inside a shield**, in a single color: `#66A3BF` (brand-500).
- Use the logo only in brand-500 on light surfaces (`canvas`, `card`, `brand-50`, `brand-100`), or in white on `brand-800` / `brand-900`. Never recolor it, add effects, stretch it or place it on a busy background.
- Keep clear space equal to the height of the fingerprint's top ridge on all sides. Minimum rendered height: 24px.
- **Reserve the shield and fingerprint motifs for the logo.** Do not use shield or fingerprint icons elsewhere in the UI (including the tamper-check badge), so the trust claim is never visually confused with the brand mark.
- Brand-500 is a **fill and brand color**, not a text, border or focus color. See section 4.

## 4. Color

### 4.1 Tokens

Build everything from these tokens. Do not introduce new hex values in components.

**Brand ramp (hue anchored on #66A3BF)**

| Token | Hex | Primary use |
|---|---|---|
| `brand-50` | `#F1F7FA` | Subtle tinted sections |
| `brand-100` | `#E6F1F6` | Selected rows, soft button background, info banners |
| `brand-200` | `#CDE2EC` | Soft hover on tinted surfaces, illustration fills |
| `brand-300` | `#AACADB` | Illustration fills, decorative strokes |
| `brand-400` | `#85B8CE` | Progress fills, illustration fills |
| `brand-500` | `#66A3BF` | **Brand.** Logo, large fills, illustrations, decorative accents |
| `brand-600` | `#4B87A5` | Icons and large UI shapes only (see 4.3) |
| `brand-700` | `#3A6D88` | **Interactive.** Primary button, links, focus ring, active nav |
| `brand-800` | `#2D556B` | Hover/pressed for brand-700, text on brand-100 |
| `brand-900` | `#223F50` | Escalation button, dark surfaces |

**Neutrals (cool, lightly tinted toward the brand hue)**

| Token | Hex | Use |
|---|---|---|
| `canvas` | `#F7FAFB` | Page background |
| `card` | `#FFFFFF` | Cards, modals, popovers, inputs |
| `subtle` | `#EFF4F7` | Table headers, code/hash blocks, secondary panels |
| `border` | `#DCE6EB` | Card edges, dividers, table rules (decorative only) |
| `border-strong` | `#7690A0` | Input, checkbox and radio borders (must be visible) |
| `ink` | `#1E2A32` | Headings and body text |
| `muted` | `#55646E` | Secondary text, labels, captions, placeholders |
| `disabled-bg` | `#E6EDF1` | Disabled control background |
| `disabled-fg` | `#7D8B94` | Disabled control text |

**Semantic colors (each is a soft background with a dark text/icon color)**

| Meaning | Background | Text / icon | Solid |
|---|---|---|---|
| Escalated (attention) | `#FDF3E1` | `#8A5A12` | `#E9B350` (status dot only) |
| Under Review (in progress) | `brand-100` `#E6F1F6` | `brand-800` `#2D556B` | `brand-500` |
| Closed (done) | `#EDF2F5` | `#47565F` | `#9AA9B3` |
| Tamper checks passed | `#E2F3F0` | `#1D6359` | `#4FB3A3` |
| Danger (deletion only) | `#FCEDED` | `#9A3B3B` | `#A83F3F` |

### 4.2 Usage rules

- **Page background** is `canvas`. **Surfaces** are `card` with a 1px `border`.
- **Text:** body and headings use `ink`. Secondary text uses `muted`. Never use a lighter gray for readable text.
- **Links and interactive text** use `brand-700`, underlined on hover; hover color `brand-800`.
- **Primary button:** background `brand-700`, white text; hover `brand-800`.
- **Selected / active** states use `brand-100` background with `brand-800` text, never a saturated fill.
- **Focus ring:** 2px `brand-700`, 2px offset, on every focusable element. Never remove it.
- **Disabled:** `disabled-bg` and `disabled-fg`, `cursor-not-allowed`, plus a visible reason in nearby text when the cause is not obvious.
- **Color is never the only signal.** Every status uses color, an icon and a text label.
- **Red is rare.** Use the danger color only for permanent deletion of the user's own evidence. Never use red for errors in general, for refused captures, for escalation, or for anything that makes a distressed student feel scolded.
- **No gradients, anywhere.** Flat fills only. Depth comes from borders and soft shadows.

### 4.3 Where #66A3BF is not allowed

Brand-500 on white is only 2.78:1, which fails even the 3:1 threshold for UI components. Therefore brand-500 and brand-600 must **not** be used for body text, link text, input borders, focus rings, or small icons that carry meaning. Use them for logo, illustrations, large decorative shapes, progress fills and tinted backgrounds. Dark text (`ink`) on a brand-500 fill is fine (5.27:1).

### 4.4 Verified contrast (WCAG 2.2 AA)

Computed with the WCAG relative-luminance formula. Text needs 4.5:1; UI components and large text need 3:1.

| Pair | Ratio |
|---|---|
| `ink` on `card` / `canvas` / `subtle` | 14.66 / 13.98 / 13.23 |
| `muted` on `card` / `canvas` / `subtle` / `brand-100` | 6.11 / 5.83 / 5.52 / 5.32 |
| `brand-700` on `card` / `canvas` / `brand-100` | 5.64 / 5.38 / 4.91 |
| `brand-800` on `card` / `brand-100` | 8.01 / 6.97 |
| White on `brand-700` / `brand-800` / `brand-900` | 5.64 / 8.01 / 11.08 |
| `ink` on `brand-500` / `brand-400` | 5.27 / 6.80 |
| `border-strong` on `card` / `canvas` | 3.35 / 3.19 |
| Status text on its background: amber / blue / gray / teal / danger | 5.37 / 6.97 / 6.74 / 6.14 / 6.03 |
| White on solid danger `#A83F3F` | 6.09 |
| `brand-600` on `card` (icons and large shapes only) | 3.96 |
| `brand-500` on `card` (**fails**, fill only) | 2.78 |
| `border` on `card` (decorative, not for controls) | 1.27 |
| `disabled-fg` on `disabled-bg` (disabled controls are exempt) | 2.96 |

If you add or change a color pair, recompute it and update this table.

## 5. Typography

### 5.1 Fonts

- **Headings (H1 to H4): Lora**, weight 600. Elegant, calligraphic and warm.
- **Everything else: Nunito.** Body, buttons, navigation, forms, labels, tables, captions, helper text. Weights 400, 600, 700.
- **Mono (hashes and timestamps only): system mono stack** (`ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`).

Why Nunito and not Quicksand: Quicksand is more geometric than humanist and has thin strokes and a small x-height, which hurts readability in long text and dense reviewer tables. Nunito keeps the rounded, friendly terminals but has sturdier strokes and better small-size legibility. The body font is a single token (`--font-sans`), so switching back to Quicksand is a one-line change, but if you do, never use Quicksand below weight 500 or below 14px.

Load both through `next/font/google` (self-hosted at build time). Do not add any other font family.

### 5.2 Scale (desktop)

| Role | Font | Size / line height | Weight |
|---|---|---|---|
| H1 (page title) | Lora | 32 / 40 | 600 |
| H2 (section) | Lora | 24 / 32 | 600 |
| H3 (card/modal title) | Lora | 20 / 28 | 600 |
| H4 (subsection) | Lora | 17 / 24 | 600 |
| Body | Nunito | 16 / 26 | 400 |
| Body small | Nunito | 14 / 22 | 400 |
| Label / button / nav | Nunito | 14-15 / 20 | 600 |
| Caption / helper | Nunito | 13 / 18 | 400 |
| Hash / timestamp | Mono | 13 / 20 | 400 |

### 5.3 Rules

- Minimum text size is 13px. Never go smaller.
- Limit prose to about 70 characters per line (`max-w-prose`).
- Sentence case everywhere, including buttons and headings. No ALL CAPS, no letter-spaced labels.
- Do not use italic Lora for more than a short phrase. Do not use Lora for body text, buttons or table cells.
- Use `font-variant-numeric: tabular-nums` for dates, counts and table numbers.

## 6. Layout, spacing and density

- **Spacing scale (4px base):** 4, 8, 12, 16, 24, 32, 48, 64. Use only these values.
- **App shell:** a left sidebar (248px, `card` background, 1px right `border`) and a content column on `canvas`. The content column starts with a **header** (64px, `card`, 1px bottom `border`, sticky). The account menu sits at the right of the header, not in the sidebar.
- **Sidebar**
  - Logo, then the role label in 13px `muted` ("Student", "Case reviewer", "Administrator").
  - A sentence-case group label above the nav ("Your space", "Reviews", "Administration"), 13px 600 `muted`.
  - Students: Vault, Cases, Notifications.
  - Reviewers: Review Board, Shared with me, Case Archives, Notifications.
  - Administrators: Reviewer accounts, Notifications.
  - Active item: `brand-100` background, `brand-800` text, 10px radius, 44px tall. Unread notifications show a small `brand-700` dot, not a red count badge.
  - A small `brand-50` help card at the bottom (one heading, one sentence, at most one link), then Help, Privacy and Terms links.
- **Header**
  - Left: breadcrumbs. A top-level page shows its name. A detail page shows `Section › Title`, with the section as a `brand-700` link.
  - Middle: one search field (320px, 40px tall) that searches the role's main list.
  - Right: Help, the notification bell, a divider, then the account button (avatar initials, name, role) that opens the account menu with Sign out.
  - Below 1024px the menu button that opens the sidebar drawer joins the header at the far left and the search wraps to its own row. There is never a second bar.
- **Page structure:** H1 and one short sentence of context on the left, at most one primary button on the right, then content. Do not stack banners above the header. The page H1 is the page's own title; the header breadcrumb doesn't replace it.
- **Content width:** students max 1040px, centered. Reviewers use the full width up to 1440px.
- **Designed for 1024px and wider.** Below 1024px the sidebar collapses into a drawer opened from the header's menu button, page padding tightens, and the Vault table stacks into a list. Other pages need not look designed there, but must not break, overlap or scroll sideways.

### Two density modes, one system

Set `data-density="comfortable"` (students) or `data-density="compact"` (reviewers) on the app shell. Components read these through CSS variables.

| | Comfortable (students) | Compact (reviewers) |
|---|---|---|
| Page padding | 40px | 32px |
| Card padding | 24px | 16px |
| Control height | 44px | 36px |
| Table row height | n/a | 44px |
| Section gap | 32px | 24px |

Same tokens, fonts and colors in both. Only spacing and sizing change.

## 7. Shape, depth and borders

- **Radius:** inputs, buttons, menus 10px. Cards and panels 12px. Modals 16px. Badges, chips and avatars fully rounded (pill). Never square corners on interactive elements.
- **Cards:** `card` background, 1px `border`, and the `shadow-soft` below. Do not nest a bordered card inside a bordered card; use `subtle` background instead.
- **Shadows** (tinted with ink, low opacity):
  - `shadow-soft`: `0 1px 2px rgba(30,42,50,0.04), 0 4px 12px rgba(30,42,50,0.05)`
  - `shadow-raised` (menus, popovers): `0 8px 24px rgba(30,42,50,0.10)`
  - `shadow-modal`: `0 16px 40px rgba(30,42,50,0.14)`
  - Modal overlay: `rgba(30,42,50,0.40)`, no blur.
- **Input borders** use `border-strong` (1px) so fields are clearly visible. `border` is for non-interactive edges only.

## 8. Icons and illustration

- **Icons:** Lucide React only. 20px default, 16px inline with text, stroke width 1.75. Icon color follows the text color of its context. Always pair icons with a text label unless the control has an accessible name and a tooltip.
- **Illustration:** flat, minimal, rounded shapes, used sparingly: empty states and onboarding only. Build from `brand-100` to `brand-400`, `brand-500`, white and `ink` linework. No gradients, no 3D, no photography, no stock clip-art, no human faces, no depictions of bullying or distress. Keep each illustration small (max about 200px tall) and secondary to the text beside it.
- If no suitable illustration exists, use a plain icon in a `brand-100` circle. Do not generate decorative filler.

## 9. Components

Build on shadcn/ui and Radix primitives, restyled with the tokens above. Keep components in `components/ui`, and product-specific ones in `components/safetrail`.

### Buttons
- **Primary:** `brand-700` bg, white text, hover `brand-800`. One per view.
- **Secondary:** `card` bg, 1px `border-strong`, `ink` text, hover `brand-50`.
- **Soft:** `brand-100` bg, `brand-800` text, hover `brand-200`.
- **Ghost:** transparent, `brand-700` text, hover `brand-100`.
- **Weighty (escalation only):** `brand-900` bg, white text, hover `#1B3342`. Same shape as primary; the darker tone signals seriousness without alarm.
- **Danger (deleting evidence only):** `card` bg, 1px `#A83F3F` border and text; hover `#FCEDED`. Becomes solid `#A83F3F` with white text only inside the final confirmation dialog.
- Height by density (44 / 36), horizontal padding 20px, radius 10px, Nunito 600. Loading state keeps the label and shows a small spinner.

### Inputs
- `card` bg, 1px `border-strong`, radius 10px, 16px text. Placeholder in `muted`.
- Label above the field (14px, 600, `ink`). Helper text below (13px, `muted`). Never use placeholder as the label.
- Focus: `brand-700` 2px ring. Error: `#9A3B3B` border plus an icon and a plain sentence under the field. Never red-fill the whole field.

### Cards
- Use for evidence items, cases and summaries. Title in H3 or H4, one line of muted metadata, then content. Entire card is clickable only if it has a single destination.

### Badges
- Pill, 13px, 600, soft background with dark text and a leading icon or dot. Use the semantic table in 4.1.

### Tables (reviewer views)
- Header row on `subtle`, 13px 600 `muted` text. Rows 44px, 1px `border` rules, hover `brand-50`, selected `brand-100`. No zebra striping. Sortable columns show an arrow icon. Keep columns to what a reviewer needs to triage: title, status, reporter, collaborators, escalated date.

### Notification bell and popover
- Bell: a 44×44 icon button in the header, `aria-label="Notifications, N unread"`, with a `brand-700` dot ringed in `card` when anything is unread. Never a number bubble or red badge.
- Popover:
  - Layout: 400px wide, `card`, `shadow-raised`, 12px radius, anchored under the bell.
  - Head: "Notifications" (Lora 17px) and a ghost "Mark all as read".
  - Rows: a 32px icon circle, title (14px), relative time (13px `muted`) and an unread dot. Unread rows are tinted `brand-50`.
  - Footer: "View all notifications".
  - Icon circle by type: escalation uses amber attention tokens, closing uses closed tokens, a saved capture uses tamper tokens, and anything else uses `brand-100`.
  - Behaviour: Escape and an outside click close it, and focus returns to the bell.
- Notifications never show evidence contents, only titles and short excerpts.

### Reviewer dashboard (Review Board only)
- Order:
  1. Page header.
  2. At most 4 summary tiles: label, count in Lora 32px, one plain line of context. No arrows, sparklines or percentages without the count.
  3. At most one chart and one status breakdown, each in a panel.
  4. One toolbar row: status tabs, search, filter chips, and a ghost "Clear filters" that shows only when a filter is on.
  5. The table with pagination.
  6. Recent activity.
- The table is the job. Tiles and the chart summarise it and never replace it.
- Chart colors come from the chart tokens (`chart-primary`, `chart-escalated`, `chart-review`, `chart-closed`), never badge colors. Never red, even when numbers rise.
- Administrators get the same shell with a plain table and no tiles or charts.

### Account menu
- Opens from the header's account button. It shows the name and email, then "Sign out". It uses the same menu component as row menus.

### Dialogs
- 16px radius, `shadow-modal`, max width 560px (720px for the escalation preview). Title in H3, one-sentence explanation, actions bottom-right with the safe choice (Cancel, "Go back") on the left of the confirm action. Focus is trapped and returns to the trigger on close.

### Banners and toasts
- Banner: `brand-100` (info), `#FDF3E1` (needs attention), `#E2F3F0` (success), with icon, one or two sentences, and an optional text link. Left accent stripe is not allowed; use the tinted background and icon.
- Toast: bottom-left, `ink` background, white text, auto-dismiss in 5s, pauses on hover, never used for anything the user must act on.

### Empty states
- A small illustration or icon, an H3, one sentence of reassurance and what to do next, and at most one button. Example: "Your vault is empty. Capture a Facebook post or conversation with the Escrow Capture extension and it will appear here."

### Skeletons and loading
- Use `subtle` skeleton blocks with a slow, subtle pulse. No full-page spinners.

## 10. SafeTrail-specific patterns

### 10.1 Tamper-check label
- Text must be exactly **"Captured with tamper checks"**. Pill badge, teal tokens (`#E2F3F0` / `#1D6359`), leading check-style file icon (for example Lucide `FileCheck2`). Not a shield.
- Next to it show the capture time and, on demand, the hash in a `subtle` mono block with a copy button.
- Info popover on the badge explains in plain words what it does and does not mean: the capture passed the checks and the saved file has not changed since; it does not prove the capture is complete.
- **Never** use the words "verified", "authentic", "proof", "tamper-proof" or "guaranteed" in the UI. Reviewer-facing wording: "Passed tamper checks".

### 10.2 Refused or failed capture
- Use the amber attention tokens with an info-style icon, never red. State what happened and what to try, in plain language. Example: "We couldn't capture this page because it looks like it was changed in the browser. Reload the page and try again."

### 10.3 Evidence viewer
- Captured pages render in a sandboxed frame that cannot run scripts, inside a `card` with a 1px `border` and a neutral `subtle` margin so it is visually clear that this is captured content, not part of SafeTrail's UI. Hash and capture time sit in a header strip above the frame.

### 10.4 Sharing
- Before any share (email or link), show a short acknowledgment dialog: the student confirms they are choosing to share and that shared evidence can be passed on. Use a checkbox-free confirm button labelled "I understand, share". Links protected by a password show a small lock icon (Lucide `Lock`).
- Always show who currently has access, in a simple list with a clear "Remove access" ghost action (except where the case is locked).

### 10.5 Case statuses
- Escalated: amber badge. Under Review: brand-blue badge. Closed: gray badge. Same badge component everywhere (Review Board, case page, notifications). Students see status changes as a simple vertical timeline with the closing note at the end.

### 10.6 Escalation
- This is the one irreversible, weighty step. Treat it differently from every other flow:
  1. Show a preview dialog (720px) titled "Review what reviewers will see". List the title, description, every collaborator and every attached evidence item exactly as they will appear.
  2. A `brand-50` panel states plainly: "Once you escalate, this case is locked. You can't edit or withdraw it, and attached evidence can't be deleted."
  3. Actions: ghost "Go back" and the **weighty** button "Escalate to reviewers". No red, no countdown, no urgency.
- After escalating, show the case as locked with a lock icon and the line "Locked since [date]. Reviewers can see this case."

### 10.7 Reviewer separation
- On the case page for reviewers, the reporter's evidence and the reviewer's own attachments are in two visibly separate sections with their own headings. Reviewer attachments are labelled "Added by reviewers" and are never shown to the reporter.
- The "Added by reviewers" section uses a dashed 1px `border-strong` edge on `brand-50` and starts with an eye-off icon and the line "Only reviewers can see this section. The student who reported and collaborators can't."

### 10.8 Privacy reassurance
- Wherever a student is about to act, make clear what is private. Use short reassurance text, for example "Only you can see your vault." and "Nothing reaches reviewers until you escalate."

## 11. Voice and microcopy

The student may be distressed. Write like a calm, kind, competent person.

- **Plain language.** Short sentences. Everyday words. Say what happened, what it means, and what they can do next.
- **Non-judgmental.** No blame, no assumptions, no guilt. Do not use "victim", "bully", "perpetrator", "guilty" or "offender". Use "you", "the student who reported", and "the other person" (students) or "the accused" only where reviewers need precision.
- **No urgency or alarm.** No exclamation marks, no "Warning!", "Oops!", "Failed!" or countdowns.
- **Honest.** Do not promise outcomes. Do not say reporting will "stop" anything. Describe only what the product does.
- **Actionable.** Every error and empty state says what to do next.
- Buttons are verbs: "Capture evidence", "Add to case", "Escalate to reviewers", "Go back".

| Instead of | Write |
|---|---|
| "Error: capture failed!" | "We couldn't capture this page. Reload it and try again." |
| "Are you sure you want to delete?" | "Delete this evidence? You won't be able to get it back." |
| "Victim report submitted" | "Your case has been escalated to reviewers." |
| "Verified authentic" | "Captured with tamper checks" |
| "Invalid input" | "Please enter an email that ends in bulsu.edu.ph" (use the real domain) |

## 12. Motion

- Transitions 150 to 200ms, `ease-out`, on color, background, opacity and small transforms. Dialogs fade and rise 8px over 200ms.
- One signature moment: when a capture is saved to the vault, the new item fades in and its check icon scales in gently over 240ms. Nothing bounces, shakes or flashes.
- Respect `prefers-reduced-motion`: replace movement with an instant or opacity-only change.

## 13. Accessibility (WCAG 2.2 AA)

- Meet the contrast numbers in 4.4. Check any new pair.
- Every interactive element is reachable and operable by keyboard, has a visible focus ring, and a logical tab order.
- Minimum target size 40px on controls (never below 24px).
- Use semantic HTML and Radix primitives. One H1 per page; headings do not skip levels.
- Form fields have visible labels, linked helper and error text (`aria-describedby`), and errors are announced.
- Status changes and toasts use `aria-live="polite"`.
- Icons that carry meaning have text alternatives; decorative icons are `aria-hidden`.
- Never rely on color alone. Never auto-play motion or sound.
- Dialogs trap focus, close on Escape, and restore focus.

## 14. Escrow Capture (Chrome extension)

The extension must feel like the same product.

- Same tokens, radii, fonts and voice. **Bundle Lora and Nunito as packaged files**; Manifest V3 extension pages cannot rely on remote font loading.
- Popup width 360px. One column, comfortable density, 16px padding.
- States, each with one primary action: signed out ("Sign in to SafeTrail"), ready ("Capture this page"), capturing (calm progress, no percentages needed), saved ("Saved to your vault" with the tamper-check badge and a "Open in vault" link), refused (amber banner, plain explanation), and error (amber banner with a retry).
- Remind the student when capturing messages that this is meant for conversations they took part in, in one short line, not a modal.
- Show a note that Messenger captures include only the messages loaded on screen. Keep it as helper text, not a warning.

## 15. Implementation notes

Written for Tailwind CSS v4 and shadcn/ui. If the repo uses Tailwind v3, map the same tokens in `tailwind.config` instead.

```css
/* app/globals.css */
@import "tailwindcss";

:root {
  /* brand */
  --brand-50: #F1F7FA;  --brand-100: #E6F1F6; --brand-200: #CDE2EC;
  --brand-300: #AACADB; --brand-400: #85B8CE; --brand-500: #66A3BF;
  --brand-600: #4B87A5; --brand-700: #3A6D88; --brand-800: #2D556B;
  --brand-900: #223F50;

  /* neutrals */
  --canvas: #F7FAFB; --card: #FFFFFF; --subtle: #EFF4F7;
  --border: #DCE6EB; --border-strong: #7690A0;
  --ink: #1E2A32; --muted: #55646E;
  --disabled-bg: #E6EDF1; --disabled-fg: #7D8B94;

  /* semantic */
  --escalated-bg: #FDF3E1; --escalated-fg: #8A5A12; --escalated-solid: #E9B350;
  --review-bg: #E6F1F6;    --review-fg: #2D556B;
  --closed-bg: #EDF2F5;    --closed-fg: #47565F;   --closed-solid: #9AA9B3;
  --tamper-bg: #E2F3F0;    --tamper-fg: #1D6359;   --tamper-solid: #4FB3A3;
  --danger-bg: #FCEDED;    --danger-fg: #9A3B3B;   --danger-solid: #A83F3F;

  /* shadcn/ui mapping */
  --background: var(--canvas);
  --foreground: var(--ink);
  --card-foreground: var(--ink);
  --popover: var(--card);
  --popover-foreground: var(--ink);
  --primary: var(--brand-700);
  --primary-foreground: #FFFFFF;
  --secondary: var(--brand-100);
  --secondary-foreground: var(--brand-800);
  --muted-foreground: var(--muted);
  --accent: var(--brand-100);
  --accent-foreground: var(--brand-800);
  --destructive: var(--danger-solid);
  --input: var(--border-strong);
  --ring: var(--brand-700);

  /* shape and depth */
  --radius: 10px;
  --radius-card: 12px;
  --radius-modal: 16px;
  --shadow-soft: 0 1px 2px rgba(30,42,50,0.04), 0 4px 12px rgba(30,42,50,0.05);
  --shadow-raised: 0 8px 24px rgba(30,42,50,0.10);
  --shadow-modal: 0 16px 40px rgba(30,42,50,0.14);

  /* density (comfortable default) */
  --control-h: 44px; --card-pad: 24px; --page-pad: 40px; --section-gap: 32px;
}

[data-density="compact"] {
  --control-h: 36px; --card-pad: 16px; --page-pad: 32px; --section-gap: 24px;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-muted: var(--subtle);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-brand-50: var(--brand-50);   --color-brand-100: var(--brand-100);
  --color-brand-200: var(--brand-200); --color-brand-300: var(--brand-300);
  --color-brand-400: var(--brand-400); --color-brand-500: var(--brand-500);
  --color-brand-600: var(--brand-600); --color-brand-700: var(--brand-700);
  --color-brand-800: var(--brand-800); --color-brand-900: var(--brand-900);
  --radius-md: var(--radius);
  --radius-xl: var(--radius-card);
  --radius-2xl: var(--radius-modal);
  --font-sans: var(--font-nunito), system-ui, sans-serif;
  --font-heading: var(--font-lora), Georgia, serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

h1, h2, h3, h4 { font-family: var(--font-heading); font-weight: 600; color: var(--ink); }
body { font-family: var(--font-sans); background: var(--canvas); color: var(--ink); }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
```

```ts
// app/layout.tsx
import { Lora, Nunito } from "next/font/google";

const lora = Lora({ subsets: ["latin"], variable: "--font-lora", display: "swap" });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", display: "swap" });
// <html className={`${lora.variable} ${nunito.variable}`}>
```

Rules for code:
- Reference tokens (`bg-brand-700`, `text-muted-foreground`, `var(--tamper-bg)`), never raw hex, in components.
- Status styles live in one shared `StatusBadge` component. Do not restyle statuses per page.
- Do not install another UI kit, icon set or font.

## 16. Never do this

- Gradients, glassmorphism, glows, neon, or decorative blobs.
- Using #66A3BF for text, links, borders or focus rings.
- Red for anything except permanent deletion of evidence.
- The words "verified", "authentic", "tamper-proof" or "guaranteed" about evidence.
- Shield or fingerprint icons outside the logo.
- More than one primary button in a view, or more than one banner above a page header.
- Emoji, exclamation marks, countdowns, or urgency language.
- Dense dashboards for students: no widget grids, stat tiles or charts on student screens. On reviewer screens: no more than four tiles, more than one chart per view, dual axes or pie charts.
- A red count badge on the notification bell, or a second top bar under 1024px.
- Repeating the same card grid on every page. Choose the layout that fits the task (list, detail, form, timeline).
- Separate mobile-only screens or components. Narrow widths reuse the same page, rearranged.
- Generic AI aesthetics: purple-blue gradients, floating cards on mesh backgrounds, "sparkle" icons, stock hero sections, or filler illustrations.

## 17. Pre-merge checklist

- [ ] Uses only tokens from this file; no new hex values.
- [ ] One primary action per view; the next step is obvious.
- [ ] Focus ring visible; keyboard path works end to end.
- [ ] Every status has color, icon and text.
- [ ] Contrast checked for any new color pair.
- [ ] Copy is plain, calm, non-judgmental, and honest about what tamper checks mean.
- [ ] Private versus shared, and anything irreversible, is clearly stated before the user acts.
- [ ] Looks right at 1280px and does not break at 1024px.
- [ ] Reduced motion respected.
- [ ] Header breadcrumb and search work on the page; the bell popover opens, closes on Escape and returns focus.