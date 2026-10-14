Escapture helps students who are being cyberbullied keep evidence of what happened, build a case from it, and escalate it to university case reviewers. The MVP covers Facebook posts and messages, pilots at Bulacan State University, and supplements the university's existing process.

This system has two contexts that share one set of tokens, fonts and voice:

- **App** (`data-context="app"`, the default): calm, minimal, one thing at a time. Students use `data-density="comfortable"`, reviewers `data-density="compact"`.
- **Marketing** (`data-context="marketing"`): the landing page and other public pages. It keeps the same calm and honesty, but is allowed more scale, rhythm and product imagery so the page feels complete. See [Marketing pages](#marketing-pages).

Inside the app, reviewer and admin screens may use the dashboard components (summary tiles, one chart, filters, data table, drawer). Student screens never do. See [Dashboards](#dashboards).

## Principles

1. **Calm first.** The student on screen may be having a bad day. Every screen should lower anxiety, not raise it.
2. **One thing at a time.** One primary action per app view, one clear next step.
3. **Friendly, not childish.** Soft shapes and warm language, serious about the subject. No mascots, confetti, emoji or puns.
4. **Honest about trust.** Say "Captured with tamper checks", never "tamper-proof" or "verified authentic". No visual treatment may promise more than the product does.
5. **User stays in control.** Make it obvious what is private, what is shared and what can't be undone. Irreversible steps get the weighty treatment.
6. **Soft, elegant, minimal.** Rounded corners, humanist type, a quiet blue palette, flat color. No gradients.

## Voice and copy

- Plain language, short sentences, everyday words. Say what happened, what it means and what to do next.
- Non-judgmental. Never "victim", "bully", "perpetrator", "guilty" or "offender". Use "you", "the student who reported", "the other person"; "the accused" only where reviewers need precision.
- No urgency: no exclamation marks, no "Warning!", "Oops!", "Failed!", no countdowns.
- Honest: don't promise outcomes or say reporting will "stop" anything.
- Sentence case everywhere, including buttons and headings. No ALL CAPS, no letter-spaced labels.
- Buttons are verbs: "Capture evidence", "Add to case", "Escalate to reviewers", "Go back".
- Never use "verified", "authentic", "proof", "tamper-proof" or "guaranteed" about evidence. Reviewer wording: "Passed tamper checks".

| Instead of | Write |
|---|---|
| "Error: capture failed!" | "We couldn't capture this page. Reload it and try again." |
| "Are you sure you want to delete?" | "Delete this evidence? You won't be able to get it back." |
| "Victim report submitted" | "Your case has been escalated to reviewers." |
| "Verified authentic" | "Captured with tamper checks" |
| "Invalid input" | "Please enter an email that ends in bulsu.edu.ph" |
| "Stop cyberbullying today!" (marketing) | "Keep a record of what happened." |

Privacy reassurance goes wherever a student is about to act: "Only you can see your vault." "Nothing reaches reviewers until you escalate."

## Color

Build everything from the tokens; never add hex values in components.

- Page background `canvas`; surfaces `card` with a 1px `border` and `shadow-soft`.
- Text `ink`; secondary text `muted`. Never a lighter gray for readable text.
- Links and interactive text `brand-700`, hover `brand-800` with underline.
- Selected and active states: `brand-100` background, `brand-800` text, never a saturated fill.
- **`brand-500` is the brand color, not a text color.** It is 2.78:1 on white: use it for the logo, large fills, illustrations and progress, never for text, links, input borders, focus rings or small meaningful icons. `brand-600` is for icons and large shapes only. Ink on `brand-500` is fine (5.27:1).
- Statuses use their soft background plus dark text plus an icon or dot: `escalated-*` (amber), `review-*` (blue), `closed-*` (gray), `tamper-*` (teal). Color is never the only signal.
- **Red is rare.** `danger-*` only for permanent deletion of the student's own evidence. Never for general errors, refused captures or escalation.
- On the dark marketing band (`brand-900`) use `on-dark` text, `on-dark-muted` secondary text and links, and `focus-on-dark` for focus rings. `brand-700` fails there (1.96:1).
- No gradients anywhere. Depth comes from borders and soft shadows.
- **Chart colors** are their own tokens, never badge colors: `chart-primary` for single-series bars and lines, `chart-fill` for area and hover bands, `chart-grid` and `chart-axis` for structure. Status charts use `chart-escalated`, `chart-review`, `chart-closed`, darker steps of the status hues that meet 3:1 on `card`. Heatmaps use `heat-1` … `heat-5` (one hue, light to dark; ink labels on 1–3, white on 4–5).
- Scrims for dialogs and drawers use `overlay`.

Verified contrast (WCAG 2.2 AA): ink on card / canvas / brand-50 14.66 / 13.98 / 13.56 · muted on card / canvas / brand-50 / brand-100 6.11 / 5.83 / 5.66 / 5.32 · brand-700 on card / canvas / brand-50 / brand-100 5.64 / 5.38 / 5.22 / 4.91 · white on brand-700 / 800 / 900 / weighty-hover 5.64 / 8.01 / 11.08 / 13.13 · brand-200 on brand-900 8.28 · border-strong on card / canvas / brand-50 3.35 / 3.19 / 3.10 · status text on its background 5.37–6.97 · white on danger-solid 6.09 · chart-primary / chart-escalated / chart-review / chart-closed on card 5.64 / 3.72 / 8.01 / 3.80 · chart-axis on card 3.35. The status chart set passes CVD separation (worst adjacent ΔE 16.9) and the normal-vision floor; Closed is intentionally low-chroma gray. Recompute any new pair before using it.

## Typography

- Headings and display: **Lora** 600. Everything else: **Nunito** 400 / 600 / 700. Hashes and timestamps only: the system mono stack. Load both through `next/font/google`; add no other family.
- App scale: `h1` 32/40, `h2` 24/32, `h3` 20/28, `h4` 17/24, `body` 16/26, `body-sm` 14/22, `label` 14/20 600, `caption` 13/18, `hash` 13/20 mono.
- Marketing adds `display-xl` 56/64 (hero, once per page), `display-lg` 44/52 (section titles), `display-md` 36/44 (feature titles), `lead` 20/32 (hero and section intros) and `eyebrow` 14/20 700 in `brand-700`. Display sizes take a slight negative tracking (−0.3 to −0.5px), which is not the banned letter-spacing.
- Minimum 13px. Prose max about 70 characters (`lead` 60). Tabular numbers for dates and counts. Italic Lora only for a short phrase.

## Spacing, layout and shape

- 4px base; use only `space-1` … `space-16`. `space-24` (96) and `space-32` (128) are for marketing section padding only.
- App shell: 248px `card` sidebar with a 1px right `border`, content on `canvas`, no top bar above 1024px. Student content max `maxw-student`; reviewers up to `maxw-reviewer`.
- App page: H1 and one sentence of context on the left, at most one primary button on the right, then content. Never more than one banner above the header.
- Reviewer and admin dashboards: `row-h` 44px table rows, `drawer-w` 480px case drawer, `topbar-h` 56px top bar below 1024px only.
- Density: `control-h` 44 / 36, `card-pad` 24 / 16, `page-pad` 40 / 32, `section-gap` 32 / 24 (comfortable / compact).
- Radius: `radius-md` 10 for inputs, buttons and menus; `radius-card` 12; `radius-modal` 16; `radius-pill` for badges; `radius-section` 24 for marketing containers and product frames. No square corners on interactive elements.
- Shadows: `shadow-soft` cards, `shadow-raised` menus and product frames, `shadow-modal` dialogs; overlay `rgba(30,42,50,0.40)` with no blur. Don't nest bordered cards; use `subtle`.
- Inputs use `border-strong`; `border` is for non-interactive edges.

## Iconography and imagery

- Lucide (`lucide-react`) only, 20px (16px inline), stroke 1.75, color from the surrounding text, always with a text label or accessible name. The bundle carries a few Lucide paths so previews run without the package.
- **No shield or fingerprint icons anywhere.** Those shapes belong to the logo. The tamper-check badge uses a file-check icon.
- Illustration: flat, rounded, built from `brand-100`–`brand-500`, white and `ink` lines; only in empty states and onboarding, about 200px tall at most. No people, faces, depictions of distress, 3D or stock art. If none fits, use an icon in a `brand-100` circle.
- Marketing imagery is **real Escapture UI** in a ProductFrame. The one decorative device is the TrailPattern.

## Logo

The logo is a fingerprint inside a shield in `brand-500`, used only on `canvas`, `card`, `brand-50` or `brand-100`, or in white on `brand-800` / `brand-900`. Clear space equals the height of the top ridge; minimum height 24px. Never recolor, stretch or add effects. The logo file is not in this system yet, so components set the name in Lora as a plain wordmark; replace it with the logo once the file is added under `assets/Logos/`.

## Motion

Transitions 150–200ms `ease-out` on color, background, opacity and small transforms. Dialogs fade and rise 8px over 200ms. The one signature moment: a new vault item fades in and its check icon scales in over 240ms. On marketing pages, sections may fade and rise 8px once as they enter (`st-reveal`). Nothing bounces, shakes or flashes. Respect `prefers-reduced-motion`.

## Accessibility

Meet the contrast list above. Every control is keyboard-reachable with a visible 2px focus ring (`brand-700`, offset 2px; `focus-on-dark` on `brand-900`). Targets at least 40px. One H1 per page, no skipped heading levels (on marketing pages the hero headline is the H1). Labels are visible; helper and error text are linked with `aria-describedby`; status changes and toasts use `aria-live="polite"`. Dialogs trap focus, close on Escape and restore focus.

## Marketing pages

A landing page needs more than the app's minimalism allows, or it looks unfinished. These allowances apply only in the marketing context:

- **Scale.** Use the display styles and `lead`. A 32px H1 on a landing page reads like an app screen.
- **Rhythm.** Full-width Sections with `space-24` vertical padding in `maxw-marketing` (1200px, 12 columns, 48px gutter). Alternate tones down the page: `canvas` → `card` → `canvas` → `dark` (once, inset with `radius-section`) → `tint` → `canvas` → CtaBand. The contrast between bands is what makes a flat-color page feel built.
- **Real product, not decoration.** Each hero and FeatureRow shows real components in a ProductFrame: the vault, a case page, the escalation preview, the extension popup, the Review Board.
- **Pattern.** TrailPattern behind the hero, the dark band and the CtaBand only. Open, flowing lines; never concentric loops that could read as a fingerprint.
- **Two actions in the hero and CTA.** One `primary` (or `on-dark`) plus one `secondary` or `ghost`. Everywhere else, the one-primary rule holds.
- **Top navigation.** SiteNav with the wordmark, three or four links, "Sign in" and one primary button.
- **Honest proof.** PilotStrip states real facts ("Piloting at Bulacan State University"). Never invented testimonials, ratings, user counts or logos used without permission.
- **Trust section.** TrustPanel explains what tamper checks do and don't mean, in the same words as the badge's popover.
- **Page skeleton:** SiteNav → Hero → PilotStrip → Steps → FeatureRows → TrustPanel (dark) → audience FeatureRow (reviewers) → Faq → CtaBand → SiteFooter. See the LandingPage card.
- Below 1024px, grids stack, display sizes step down one level and section padding drops to `space-16`.

Still banned in marketing: gradients, glassmorphism, glows, mesh or blob backgrounds, "sparkle" icons, stock hero photography, stat tiles and charts, emoji, exclamation marks and urgency language.

## Dashboards

Reviewers triage cases all day, so their screens may be dense; students never see these patterns. Build reviewer and admin views inside AppShell with `data-density="compact"`.

- **The table is the job.** The DataTable of escalated cases is the main content. Tiles and charts summarise it and never replace it. Columns stay to triage needs: case, status, reporter, collaborators, evidence count, escalated date.
- **Page order:** PageHeader (date range on the right) → up to four StatTiles → at most one BarChart and one StatusBreakdown, each in a Panel → status Tabs, SearchInput, FilterChips and a ghost "Clear filters" in one row → DataTable with Pagination → ActivityFeed. See the ReviewBoard card.
- **Summary tiles:** label, a count in Lora, and one plain line of context ("3 new this week"). No red or green arrows, no sparklines, no percentages without the count.
- **Charts:** one chart per view, one axis, `chart-primary` for a single series, a Panel title that names the series, a hover tooltip on every mark and a "View as table" link. Never red, even when numbers rise. Values and labels use `ink` and `muted`, never the series color. More than one series needs a legend; status charts always list each status with its count.
- **Filters** live in a single row above the table and apply immediately; show the result count and a ghost "Clear filters" once any filter is on. An empty result is an EmptyState, never a blank table.
- **Opening a case:** a row click (or Enter) opens the DetailDrawer; the full case page keeps the reporter's evidence and "Added by reviewers" in separate sections.
- **Loading:** Skeleton tiles and DataTable `loading` rows; no spinners over the page.
- **Admins** get the same shell with a plain table of reviewer accounts and no charts.

## Never do this

- Gradients, glassmorphism, glows, neon or decorative blobs.
- `brand-500` for text, links, borders or focus rings.
- Red for anything except permanent deletion of evidence.
- "Verified", "authentic", "tamper-proof" or "guaranteed" about evidence.
- Shield or fingerprint icons outside the logo.
- More than one primary button in an app view, or more than one banner above a page header.
- Dense dashboards, stat tiles or charts on student screens. On reviewer screens: more than four tiles, more than one chart per view, dual axes, pie charts, or red for rising numbers.
- The same card grid on every page; choose list, detail, form or timeline to fit the task.
- Separate mobile-only screens; narrow widths reuse the same page, rearranged.
- Left accent stripes on banners or cards.

## Product patterns

- **Tamper-check label:** exactly "Captured with tamper checks", teal pill, file-check icon, capture time beside it, hash on demand in a `subtle` mono block with Copy. Its popover: the capture passed the checks and the saved file hasn't changed since; it doesn't prove the capture is complete.
- **Refused capture:** amber `attention` banner, never red: "We couldn't capture this page because it looks like it was changed in the browser. Reload the page and try again."
- **Evidence viewer:** captured pages render in a script-free sandboxed frame inside a `card` with a `subtle` margin, with hash and time in a strip above.
- **Sharing:** a short acknowledgment dialog before any share, confirmed with "I understand, share". Password-protected links show a lock icon. Always list who has access with a "Remove access" ghost action.
- **Escalation:** a 720px dialog "Review what reviewers will see" listing everything as reviewers will see it, a `brand-50` panel ("Once you escalate, this case is locked. You can't edit or withdraw it, and attached evidence can't be deleted."), then ghost "Go back" and weighty "Escalate to reviewers". Afterwards: "Locked since [date]. Reviewers can see this case."
- **Reviewer separation:** the reporter's evidence and reviewer attachments ("Added by reviewers") sit in separate headed sections; reviewer attachments are never shown to the reporter.
- **Escrow Capture extension:** same tokens and voice; 360px popup, comfortable density, 16px padding; Lora and Nunito bundled as files. States: signed out, ready, capturing, saved (with the tamper badge and "Open in vault"), refused and error (amber banners).

## Implementation

Tailwind CSS v4 with shadcn/ui and Radix, restyled with these tokens. Reference tokens (`bg-brand-700`, `var(--tamper-bg)`), never raw hex. Status styles live in one shared StatusBadge. Install no other UI kit, icon set or font. Product components live in `components/safetrail`, marketing ones in `components/marketing`, dashboard ones in `components/dashboard`. Build tables on TanStack Table if sorting and paging grow complex, styled with these tokens; draw charts as plain SVG or a library restyled to the chart tokens.
