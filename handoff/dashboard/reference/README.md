# Design reference

These are the source files of the "Escapture Dashboard" design canvas. Read them for **layout, copy, hierarchy and token use**. They are not meant to run here. They depend on the canvas runtime (`support.js`, `<x-dc>`, `<x-import>`, `<sc-for>`, `<sc-if>`, `<dc-import>`), which this repo doesn't have, so rebuild each screen with the repo's own components.

## How to read a `.dc.html` file

- The markup inside `<x-dc>` is the screen. `class="…"` names refer to `app.css` (dashboard patterns) and `ds/components/bundle.css` (`st-*` design-system classes).
- `<x-import component-from-global-scope="Escapture.X" …>` is a design-system component. Attributes are its props, as documented in `ds/components/index.d.ts`. Map them like this:
  - `Escapture.StatusBadge` becomes `StatusBadge` in `components/ui/badge.tsx`.
  - `Escapture.TamperCheck` becomes `components/safetrail/tamper-check.tsx`.
  - `Escapture.Button` becomes `components/ui/button.tsx`.
  - `Escapture.Banner` and `Escapture.EmptyState` become `components/ui/feedback.tsx`.
  - `Escapture.Icon name="x"` becomes the matching `lucide-react` icon.
  - `StatTile`, `Tabs`, `SearchInput`, `FilterChip`, `Select`, `Pagination`, `Panel`, `BarChart`, `StatusBreakdown` and `ActivityFeed` are new. Build them in `components/dashboard/` (or `components/ui/` for Tabs and Select), following `ds/components/bundle.js` and `bundle.css`.
- `<dc-import name="Sidebar" …>` and `<dc-import name="Topbar" …>` are the shared shell (`Sidebar.dc.html`, `Topbar.dc.html`).
- `{{…}}` values come from the `renderVals()` script at the bottom of each file. That's where the sample rows live. **Sample data is fictional.** Use it only to see which fields a row shows.

## Files

| File | Screen |
|---|---|
| `Sidebar.dc.html`, `Topbar.dc.html` | Shell: sidebar per role; header with breadcrumbs, search, bell popover and account menu |
| `Main.dc.html` | Student · Vault |
| `StudentEvidence.dc.html` | Student · Evidence page |
| `StudentCases.dc.html` | Student · Cases |
| `StudentCase.dc.html` | Student · Case page (draft). Skip its header sentence and its "What happens next" card; see plan.md |
| `EscalateDialog.dc.html` | Student · Escalation preview |
| `StudentCaseClosed.dc.html` | Student · Case page (closed, locked) |
| `StudentNotifications.dc.html` | Notifications page with the bell popover open |
| `ReviewBoard.dc.html` | Reviewer · Review Board |
| `ReviewCase.dc.html` | Reviewer · Case page |
| `SharedWithMe.dc.html` | Reviewer · Shared with me |
| `Archives.dc.html` | Reviewer · Case Archives |
| `AdminReviewers.dc.html` | Admin · Reviewer accounts. Adapt as plan.md says: temporary password instead of a setup link, and no Office or Deactivate in P0 |
| `app.css` | Tokens (same values as DESIGN.md) and the shell and page patterns used by the mockups |
| `ds/` | Copy of the Escapture design system: `README.md` (rules, including dashboards), `tokens.json`, component bundle and types |

## Where the mockups knowingly differ from the plan

The plan wins in each case:

- The draft pill: use the existing `StatusBadge` draft style.
- The admin setup link, Office and Deactivate: see the plan's defaults.
- Student header search says "Search your vault and cases" in the mockup. Use "Search your vault".
- The case-page header sentence and "What happens next" card: leave them out.
