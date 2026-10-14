# Task: Implement the SafeTrail student landing page

Build the public landing page at `app/(marketing)/page.tsx` in our Next.js app. It must match the approved design exactly. All styling comes from SafeTrail design tokens: no raw hex in components, no gradients, no other UI kit, icon set or font.

References (read them if you can open claude.ai links):
- Design canvas: https://claude.ai/artifact/3EipGYwmt3kzYaFvXReXic
- Design system: https://claude.ai/artifact/Nq2UY9HhiLQCfSJkBZpzvF (README = rules, tokens.json = values)

## Stack rules
- Tailwind CSS v4 + shadcn/ui + Radix, restyled with the tokens below. Icons: `lucide-react` only, 20px (16px inline), stroke 1.75.
- Fonts via `next/font/google`: Lora 600 (headings and display), Nunito 400/600/700 (everything else). Mono = system stack, only for hashes and times.
- Product components go in `components/safetrail/`, marketing components in `components/marketing/`.
- Before writing new tokens or components, check what already exists and reuse it.

## Tokens (globals.css)
```css
@theme {
  --color-brand-50:#F1F7FA; --color-brand-100:#E6F1F6; --color-brand-200:#CDE2EC; --color-brand-300:#AACADB;
  --color-brand-400:#85B8CE; --color-brand-500:#66A3BF; --color-brand-600:#4B87A5; --color-brand-700:#3A6D88;
  --color-brand-800:#2D556B; --color-brand-900:#223F50; --color-weighty-hover:#1B3342;
  --color-canvas:#F7FAFB; --color-card:#FFFFFF; --color-subtle:#EFF4F7; --color-border:#DCE6EB; --color-border-strong:#7690A0;
  --color-ink:#1E2A32; --color-muted:#55646E; --color-disabled-bg:#E6EDF1; --color-disabled-fg:#7D8B94;
  --color-on-dark:#FFFFFF; --color-on-dark-muted:#CDE2EC; --color-focus-on-dark:#CDE2EC;
  --color-trail-line:#CDE2EC; --color-trail-line-dark:#2D556B;
  --color-escalated-bg:#FDF3E1; --color-escalated-fg:#8A5A12; --color-escalated-solid:#E9B350;
  --color-review-bg:#E6F1F6; --color-review-fg:#2D556B;
  --color-closed-bg:#EDF2F5; --color-closed-fg:#47565F; --color-closed-solid:#9AA9B3;
  --color-tamper-bg:#E2F3F0; --color-tamper-fg:#1D6359; --color-tamper-solid:#4FB3A3;
  --color-danger-bg:#FCEDED; --color-danger-fg:#9A3B3B; --color-danger-solid:#A83F3F;
  --radius-md:10px; --radius-card:12px; --radius-modal:16px; --radius-section:24px;
  --shadow-soft:0 1px 2px rgba(30,42,50,.04),0 4px 12px rgba(30,42,50,.05);
  --shadow-raised:0 8px 24px rgba(30,42,50,.10); --shadow-modal:0 16px 40px rgba(30,42,50,.14);
}
```
Spacing: 4px base (4, 8, 12, 16, 24, 32, 48, 64). Only marketing section padding uses 96 and 128. Content max width is 1200px with 32px side padding (16px below 1024px). Nav height is 72px. Controls are 44px tall.

Type: display-xl 56/64 (hero H1, once, −0.5px) · display-lg 44/52 (section titles, −0.4px) · display-md 36/44 (feature titles, −0.3px) · h3 20/28 · lead 20/32 Nunito, color muted, max 60ch · eyebrow 14/20 Nunito 700, brand-700 · body 16/26. Sentence case everywhere, no letter-spaced caps.

Color rules: text uses ink or muted. Links and ghost buttons use brand-700, with brand-800 and an underline on hover. brand-500 is never used for text, borders or focus rings. Focus ring: 2px brand-700 with a 2px offset; on dark bands, focus-on-dark. Selected states use a brand-100 background with brand-800 text. Red only for deleting evidence (not used on this page).

## Components to build
App (`components/safetrail/`):
- **Button** variants: primary (brand-700 bg, white text, hover brand-800) · secondary (card bg, ink text, border-strong border, hover brand-50) · soft (brand-100 bg, brand-800 text) · ghost (transparent, brand-700 text, hover brand-100) · weighty (brand-900 bg, hover weighty-hover) · on-dark (white bg, brand-900 text) · ghost-on-dark. Height 44, lg size 52, radius-md, Nunito 600 15px. Supports an icon before or after the label, and an `href` (renders a link).
- **Input**: visible label, helper text linked with aria-describedby, border-strong border, radius-md.
- **StatusBadge** (a pill with a dot): escalated (amber), review "Under Review" (blue), closed (gray).
- **TamperCheck**: teal pill with a FileCheck2 icon and the exact text "Captured with tamper checks" (reviewer variant: "Passed tamper checks"). Optional mono time beside it. Optional hash in a `subtle` mono block with a ghost Copy button. Tooltip/popover text: "The capture passed our checks and the saved file hasn't changed since. It doesn't prove the capture is complete."
- **Banner** tones: info (brand-100/brand-800), attention (escalated), success (tamper). Has an icon and an optional link. No left accent stripe.
- **Card** (card bg, 1px border, shadow-soft, radius-card, 24px padding), **EmptyState** (64px brand-100 icon circle, title, text, action), **Dialog** (radius-modal, shadow-modal; overlay rgba(30,42,50,.4) with no blur), **Toast** (ink bg, white text, shadow-raised, aria-live polite).

Marketing (`components/marketing/`):
- **SiteNav**: sticky, canvas bg with a bottom border. Wordmark "SafeTrail" in Lora 22px. Links: How it works (#how), Privacy (#privacy), For reviewers (#reviewers), FAQ (#faq). On the right: ghost "Sign in" and primary "Start your vault". Below 1024px the links hide; below 640px "Sign in" hides too.
- **TrailPattern**: absolutely positioned decorative SVG, aria-hidden. 7 open, flowing cubic curves across a 1200-wide viewBox (each `M-40 y+a C 220 y-a, 420 y+a*1.3, 660 y S 1040 y-a*.9, 1240 y+a*.4`, where y steps by 26 and a = 60 + i*9). Stroke 1.5: trail-line on light backgrounds, trail-line-dark on dark. Never concentric loops. Use it only behind the hero, the dark band and the CTA band.
- **Hero**: 128px top padding, 96px bottom, canvas bg, TrailPattern behind. Grid 5fr/6fr with 48px gap. Left column: eyebrow, H1, lead, two lg buttons, a privacy note with an EyeOff icon. Right column: a product visual.
- **ProductFrame**: card with radius-section and shadow-raised. Top bar 40px, subtle bg, three 10px dots, a URL pill. Body has canvas bg and 24px padding.
- **Section**: tone canvas | card | tint (brand-50) | dark (brand-900). 96px vertical padding (64px below 1024px). Optional eyebrow, display-lg title, lead (optionally centered), 64px gap below the header. `inset` = 32px side margins plus radius-section. Optional `pattern`.
- **PilotStrip**: card bg, top and bottom borders, centered items in muted text; the first item bold in ink.
- **Steps**: 3 columns (stacked below 1024px). Each step has a 44px brand-100 circle with a Lora numeral in brand-800, an h3 and muted body text.
- **FeatureRow**: 2 columns with a 64px gap and a `reverse` option. Text side: eyebrow, display-md title, muted body (max 52ch), a check list with brand-700 icons. 96px between consecutive rows.
- **TrustPanel**: 2 brand-800 columns, radius-card, 32px padding, white text. Check icons in the left column, Minus icons in the right.
- **Faq**: native `<details>`, max width 760px, row dividers, Lora 17px questions, a ChevronDown that rotates when open, the first item open.
- **CtaBand**: dark brand-900 block with radius-section and a TrailPattern, centered display-lg title, lead and buttons.
- **SiteFooter**: card bg with a top border. Grid 2fr plus 3 columns: wordmark and blurb, then Product, Help and Legal. A note row below.

## Page, in order (use this copy exactly)
1. **SiteNav**
2. **Hero**
   - Eyebrow: "For students at Bulacan State University"
   - H1: "Keep a record of what happened."
   - Lead: "Save Facebook posts and messages with tamper checks, build a case in your own time, and share it with university reviewers only when you're ready."
   - Buttons: primary "Start your vault" (#start), secondary "See how it works" (#how)
   - Note: "Only you can see your vault. Nothing reaches reviewers until you escalate."
   - Visual: a ProductFrame (url `safetrail.app/vault`) showing a "Your vault" h3 with a primary "Capture evidence" button, then 3 rows, each with a TamperCheck: "Group chat, 3 Oct · Messenger · 42 messages", "Comments on my post · Facebook post · 18 comments", "Shared photo thread · Facebook post · 6 comments".
3. **PilotStrip**: "Piloting at Bulacan State University" · "Supplements the university's existing process" · "Facebook posts and Messenger"
4. **Section** (card tone, id `how`)
   - Eyebrow "How it works", title "Three steps, at your pace", lead "You decide when, and whether, anything goes further."
   - Steps:
     - Capture: "Use the Escrow Capture extension to save a Facebook post or conversation. Each capture is saved with tamper checks."
     - Build a case: "Choose the evidence that matters, describe what happened in your own words, and invite someone you trust to help."
     - Escalate when you're ready: "Review exactly what reviewers will see. Once you escalate, the case is locked and reviewers can see it."
5. **Section** (canvas tone) with 3 FeatureRows:
   - a. Eyebrow "Escrow Capture extension", title "Save it the moment you see it".
     - Body: "Open the post or conversation on Facebook and click Capture. SafeTrail saves a copy of the page, its time and a hash, then checks it hasn't been changed in the browser."
     - Points: "Works on Facebook posts and Messenger conversations" / "Each capture is saved with tamper checks" / "Goes straight to your private vault"
     - Visual: a ProductFrame (url "Escrow Capture extension") holding a 360px extension popup (16px padding, radius-card, shadow-raised). The popup contains: "SafeTrail" in Lora with "Signed in as you" in muted text, the item "Comments on my post / Facebook post · 18 comments loaded", a TamperCheck with "13 Oct 2026, 7:42 PM", a success Banner "Saved to your vault." with an "Open in vault" link, and a full-width secondary button "Capture another page". Below the popup, a Toast "Saved to your vault".
   - b. (reverse) Eyebrow "Your vault", title "Private until you choose".
     - Body: "Everything you capture stays in your vault. You can ask a friend, counselor or family member to help, and you can take their access away at any time."
     - Points: "Only you can see your vault" / "Share with a password-protected link" / "See who has access, and remove it anytime"
     - Visual: a ProductFrame (url `safetrail.app/cases/comments-on-my-post`) with an info Banner "Only you can see your vault. Nothing reaches reviewers until you escalate." Below it, a Card titled "Comments on my post" with meta "3 captures · Shared with 1 person". The Card holds a TamperCheck (time "3 Oct 2026, 8:12 PM" plus a sample hash) and a `subtle` access row: Lock icon, "Ana R. · password-protected link", ghost "Remove access" with an X icon.
   - c. Eyebrow "Escalating a case", title "See everything before you send it".
     - Body: "When you're ready, SafeTrail shows you exactly what reviewers will see. Nothing is sent until you confirm, and you can go back as many times as you need."
     - Points: "A full preview of your case, as reviewers will see it" / "A clear note about what locking means" / "A simple status afterwards: Escalated, Under Review, Closed"
     - Visual: the Dialog rendered inline, open, with no overlay. Title "Review what reviewers will see", description "This is everything reviewers will receive when you escalate." Then 2 evidence rows with FileCheck2 icons, a brand-50 panel "Once you escalate, this case is locked. You can't edit or withdraw it, and attached evidence can't be deleted.", then ghost "Go back" and weighty "Escalate to reviewers".
6. **Section** (dark tone, inset, pattern, id `privacy`)
   - Eyebrow "Honest about trust", title "What tamper checks mean", lead: We say "captured with tamper checks", never more than that. Here is exactly what it covers.
   - TrustPanel:
     - "What tamper checks tell you": "A capture passed our checks when it was taken" / "The saved file hasn't changed since" / "Each capture keeps its time and a hash you can copy"
     - "What they don't claim": "That a capture shows the whole conversation" / "What a reviewer will decide" / "That reporting will stop what's happening"
7. **Section** (card tone, id `students`)
   - Eyebrow "Made for students", title "Built for hard days", lead "Going through this is tiring enough. SafeTrail keeps every step calm, clear and in your hands."
   - 4-column grid (2 columns below 1024px, 1 below 640px). Each item has a 64px brand-100 icon circle, an h3 and muted text:
     - Lock, "Private by default": "Your vault is yours alone. No one else sees it unless you share it."
     - EyeOff, "No pressure to act": "Capture now and decide later. Nothing moves forward until you choose."
     - Info, "Plain language": "Every screen says what happens next, in everyday words."
     - CircleCheck, "You stay in control": "See who has access, remove it anytime, and preview everything before you escalate."
8. **Section** (tint tone, id `reviewers`), a reversed FeatureRow
   - Eyebrow "For case reviewers", title "One shared Review Board".
   - Body: "Reviewers see escalated cases in a clear board, with the student's evidence kept apart from their own notes."
   - Points: "Triage by status, reporter and escalated date" / "Passed tamper checks shown on every item" / "Reviewer attachments are never shown to the student"
   - Visual: a ProductFrame (url `safetrail.app/review`) with a "Review Board" h3 and "3 cases" in muted text, then 3 rows with StatusBadges: "Comments on my post · Escalated 8 Oct 2026" escalated / "Group chat, 3 Oct · Escalated 5 Oct 2026" review / "Edited photo caption · Escalated 22 Sep 2026" closed. Below them, a reviewer TamperCheck "Passed tamper checks" with "3 Oct 2026, 8:12 PM".
9. **Section** (card tone, id `start`)
   - Eyebrow "Get started", title "Set up your vault", lead "Sign in with your university email, add the Escrow Capture extension, and you're set."
   - 2 columns.
   - Left: a canvas-bg panel (radius 16, 32px padding) with an Input labelled "University email", placeholder "yourname@bulsu.edu.ph", helper "Use the email that ends in bulsu.edu.ph." Then primary "Create your vault" (ArrowRight after the label) and soft "Get the extension", then an EyeOff note "Only you can see your vault." Under the panel, an info Banner: "SafeTrail isn't an emergency service. If you feel unsafe right now, reach out to your university's guidance office or local emergency services."
   - Right: a ProductFrame (url `safetrail.app/vault`) holding an EmptyState with an Inbox icon, "Your vault is ready", "When you capture a post or conversation, it appears here with its tamper checks and capture time.", and a soft "Install Escrow Capture" button.
10. **Section** (canvas tone, id `faq`), centered
    - Eyebrow "Questions", title "Common questions". Faq items:
      - Who can see my vault? → Only you. Nothing reaches reviewers until you escalate a case, and you choose who else can see it.
      - Do I have to report anything? → No. You can keep captures in your vault and never escalate. It's your decision, on your timeline.
      - Can I withdraw a case? → Before you escalate, you can edit or delete anything. Once you escalate, the case is locked and can't be withdrawn.
      - What does "captured with tamper checks" mean? → The capture passed our checks when it was taken and the saved file hasn't changed since. It doesn't prove the capture shows the whole conversation.
      - Does SafeTrail replace the university's process? → No. It supplements Bulacan State University's existing process.
      - Which platforms are supported? → Facebook posts and Messenger conversations for now. Messenger captures include only the messages loaded on screen.
11. **CtaBand** (inside a canvas section, 32px top and 96px bottom padding)
    - Title "Start your vault today", lead "Capture what happened now, and decide what to do with it later. It's private until you choose to share."
    - Buttons: on-dark "Start your vault" (#start) plus ghost-on-dark "See how it works" (#how). The design-system component only supported one button; add the second.
12. **SiteFooter**
    - Blurb: "Keep evidence of what happened online and share it with your university when you're ready."
    - Columns: Product (How it works, Escrow Capture extension, For reviewers) · Help (FAQ, Contact the team) · Legal (Privacy, Terms)
    - Note: "SafeTrail supplements Bulacan State University's existing process. It does not replace it."

## Responsive (below 1024px)
- All grids stack. display-xl becomes 36/44 and display-lg 32/40.
- Section padding drops to 64px; the inset band's side margins drop to 16px.
- In a reversed FeatureRow, the text comes first when stacked.
- At phone width there must be no horizontal scroll: mock rows and button groups wrap.

## Motion and accessibility
- Transitions 150–200ms ease-out. Sections may fade and rise 8px once as they enter. Respect prefers-reduced-motion.
- One H1 (the hero) and no skipped heading levels. All controls are real buttons, links or inputs, keyboard-reachable, with at least 40px targets and visible focus rings.
- Decorative SVGs are aria-hidden. The Toast uses aria-live="polite".

## Do not
Gradients, glassmorphism, glows, blobs, emoji, exclamation marks or urgency copy. Shield or fingerprint icons (they belong to the logo). Invented stats, testimonials or user counts. The words "verified", "authentic", "proof", "tamper-proof", "guaranteed", "victim" or "bully". Left accent stripes. Raw hex values in components.

## Open item
The logo (fingerprint in a shield, #66A3BF) isn't in the design system yet, so use the Lora text wordmark for now. If the logo file is already in the repo, use it in the nav and footer instead (minimum 24px tall).

## Done when
- [ ] The page renders all 12 sections in order with the exact copy.
- [ ] No hex values outside the token file.
- [ ] Lighthouse accessibility is 100 and there is no horizontal scroll at 360px.
- [ ] The production build passes.