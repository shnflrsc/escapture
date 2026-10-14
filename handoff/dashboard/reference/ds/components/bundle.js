/* @ds-bundle: {"format":4,"namespace":"Escapture","components":[{"name":"Button"},{"name":"Input"},{"name":"StatusBadge"},{"name":"TamperCheck"},{"name":"Banner"},{"name":"Card"},{"name":"EmptyState"},{"name":"Dialog"},{"name":"Toast"},{"name":"Icon"},{"name":"SiteNav"},{"name":"Hero"},{"name":"ProductFrame"},{"name":"TrailPattern"},{"name":"Section"},{"name":"Steps"},{"name":"FeatureRow"},{"name":"TrustPanel"},{"name":"PilotStrip"},{"name":"Faq"},{"name":"CtaBand"},{"name":"SiteFooter"},{"name":"AppShell"},{"name":"Sidebar"},{"name":"PageHeader"},{"name":"StatTile"},{"name":"SearchInput"},{"name":"Select"},{"name":"FilterChip"},{"name":"Tabs"},{"name":"DataTable"},{"name":"Pagination"},{"name":"Panel"},{"name":"BarChart"},{"name":"StatusBreakdown"},{"name":"ActivityFeed"},{"name":"DetailDrawer"},{"name":"Skeleton"}]} */
(function () {
  var React = window.React, h = React.createElement;
  function cx() { return Array.prototype.filter.call(arguments, Boolean).join(" "); }

  /* A small subset of Lucide icon paths (ISC). Production code uses lucide-react. */
  var P = {
    "check": ["M20 6 9 17l-5-5"],
    "file-check-2": ["M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4", "M14 2v4a2 2 0 0 0 2 2h4", "m3 15 2 2 4-4"],
    "lock": ["M7 11V7a5 5 0 0 1 10 0v4", "M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z"],
    "info": ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M12 16v-4", "M12 8h.01"],
    "circle-alert": ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M12 8v4", "M12 16h.01"],
    "circle-check": ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "m9 12 2 2 4-4"],
    "chevron-down": ["m6 9 6 6 6-6"],
    "arrow-right": ["M5 12h14", "m12 5 7 7-7 7"],
    "copy": ["M10 8h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z", "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"],
    "inbox": ["M22 12h-6l-2 3h-4l-2-3H2", "M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"],
    "eye-off": ["M10.73 5.08A10.4 10.4 0 0 1 12 5c7 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.68", "M6.61 6.61A13.5 13.5 0 0 0 2 12s3 7 10 7a9.7 9.7 0 0 0 5.39-1.61", "M14.08 14.16a3 3 0 0 1-4.18-4.24", "m2 2 20 20"],
    "x": ["M18 6 6 18", "m6 6 12 12"],
    "minus": ["M5 12h14"],
    "search": ["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z", "m21 21-4.3-4.3"],
    "archive": ["M3 3h18a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z", "M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8", "M10 12h4"],
    "bell": ["M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9", "M10.3 21a1.94 1.94 0 0 0 3.4 0"],
    "users": ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M22 21v-2a4 4 0 0 0-3-3.87", "M16 3.13a4 4 0 0 1 0 7.75"],
    "menu": ["M4 6h16", "M4 12h16", "M4 18h16"],
    "arrow-up-down": ["m21 16-4 4-4-4", "M17 20V4", "m3 8 4-4 4 4", "M7 4v16"],
    "arrow-down": ["M12 5v14", "m19 12-7 7-7-7"],
    "arrow-up": ["m5 12 7-7 7 7", "M12 19V5"],
    "chevron-left": ["m15 18-6-6 6-6"],
    "chevron-right": ["m9 18 6-6-6-6"],
    "clipboard-list": ["M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z", "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2", "M12 11h4", "M12 16h4", "M8 11h.01", "M8 16h.01"],
    "message-square": ["M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"],
    "paperclip": ["m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"],
    "calendar": ["M8 2v4", "M16 2v4", "M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z", "M3 10h18"]
  };
  function Icon(props) {
    var paths = P[props.name] || P.info;
    return h("svg", { className: cx("st-icon", props.size === "sm" && "st-icon-sm", props.className), viewBox: "0 0 24 24", "aria-hidden": props.label ? undefined : "true", role: props.label ? "img" : undefined, "aria-label": props.label },
      paths.map(function (d, i) { return h("path", { key: i, d: d }); }));
  }

  /* ---------- App components ---------- */
  function Button(p) {
    var v = p.variant || "primary";
    var rest = Object.assign({}, p); ["variant", "size", "loading", "icon", "iconAfter", "href", "className", "children"].forEach(function (k) { delete rest[k]; });
    var kids = [p.loading ? h("span", { key: "s", className: "st-spin", "aria-hidden": "true" }) : p.icon ? h(Icon, { key: "i", name: p.icon }) : null,
      h("span", { key: "l" }, p.children), p.iconAfter ? h(Icon, { key: "a", name: p.iconAfter }) : null];
    var cls = cx("st-btn", "st-btn-" + v, p.size === "lg" && "st-btn-lg", p.className);
    if (p.href) return h("a", Object.assign({ className: cls, href: p.href }, rest), kids);
    return h("button", Object.assign({ type: "button", className: cls, "aria-busy": p.loading ? "true" : undefined }, rest), kids);
  }

  function Input(p) {
    var id = p.id || ("st-in-" + (p.label || "f").toLowerCase().replace(/[^a-z0-9]+/g, "-"));
    var hid = id + "-help", eid = id + "-err";
    var rest = Object.assign({}, p); ["label", "helper", "error", "id"].forEach(function (k) { delete rest[k]; });
    return h("div", { className: "st-field" },
      h("label", { className: "st-label", htmlFor: id }, p.label),
      h("input", Object.assign({ id: id, className: "st-input", "aria-invalid": p.error ? "true" : undefined, "aria-describedby": [p.helper && hid, p.error && eid].filter(Boolean).join(" ") || undefined }, rest)),
      p.error ? h("p", { id: eid, className: "st-error", role: "alert" }, h(Icon, { name: "circle-alert", size: "sm" }), p.error) : null,
      p.helper ? h("p", { id: hid, className: "st-helper" }, p.helper) : null);
  }

  var STATUS = { escalated: "Escalated", review: "Under Review", closed: "Closed" };
  function StatusBadge(p) {
    var s = p.status || "review";
    return h("span", { className: "st-badge st-badge-" + s }, h("span", { className: "st-dot", "aria-hidden": "true" }), STATUS[s]);
  }

  function TamperCheck(p) {
    var label = p.reviewer ? "Passed tamper checks" : "Captured with tamper checks";
    return h("div", { className: "st-tamper" },
      h("span", { className: "st-badge st-badge-tamper", title: "The capture passed our checks and the saved file hasn't changed since. It doesn't prove the capture is complete." },
        h(Icon, { name: "file-check-2", size: "sm" }), label),
      p.time ? h("span", { className: "st-tamper-time st-num" }, p.time) : null,
      p.hash ? h("div", { className: "st-hash" }, h("code", null, p.hash), h(Button, { variant: "ghost", icon: "copy", "aria-label": "Copy hash" }, "Copy")) : null);
  }

  var BANNER_ICON = { info: "info", attention: "info", success: "circle-check" };
  function Banner(p) {
    var t = p.tone || "info";
    return h("div", { className: "st-banner st-banner-" + t, role: "status" }, h(Icon, { name: BANNER_ICON[t] }),
      h("p", null, p.children, p.link ? [" ", h("a", { key: "l", className: "st-link", href: p.link.href || "#" }, p.link.label)] : null));
  }

  function Card(p) {
    var Tag = p.href ? "a" : "div";
    return h(Tag, { className: cx("st-card", p.className), href: p.href },
      p.title ? h("h3", { className: "st-h h3" }, p.title) : null,
      p.meta ? h("p", { className: "st-card-meta st-num" }, p.meta) : null,
      p.children ? h("div", { className: "st-card-body" }, p.children) : null);
  }

  function EmptyState(p) {
    return h("div", { className: "st-empty" },
      h("div", { className: "st-icon-circle" }, h(Icon, { name: p.icon || "inbox" })),
      h("h3", { className: "st-h h3" }, p.title), h("p", null, p.children), p.action || null);
  }

  function Dialog(p) {
    var box = h("div", { className: cx("st-dialog", p.wide && "st-dialog-wide"), role: "dialog", "aria-modal": "true", "aria-labelledby": "st-dlg-t" },
      h("h3", { id: "st-dlg-t", className: "st-h h3" }, p.title),
      p.description ? h("p", null, p.description) : null, p.children,
      p.actions ? h("div", { className: "st-dialog-actions" }, p.actions) : null);
    return p.overlay === false ? box : h("div", { className: "st-overlay" }, box);
  }

  function Toast(p) { return h("div", { className: "st-toast", role: "status", "aria-live": "polite" }, h(Icon, { name: p.icon || "circle-check" }), p.children); }

  /* ---------- Marketing components ---------- */
  function TrailPattern(p) {
    var lines = [], n = p.lines || 7, w = 1200, hgt = p.height || 600, y0 = p.offset == null ? 0.45 : p.offset;
    for (var i = 0; i < n; i++) {
      var y = hgt * y0 + i * 26, a = 60 + i * 9;
      lines.push(h("path", { key: i, d: "M-40 " + (y + a) + " C 220 " + (y - a) + ", 420 " + (y + a * 1.3) + ", 660 " + y + " S 1040 " + (y - a * 0.9) + ", " + (w + 40) + " " + (y + a * 0.4) }));
    }
    return h("svg", { className: cx("st-trail", p.tone === "dark" && "st-trail-dark"), viewBox: "0 0 " + w + " " + hgt, preserveAspectRatio: "xMidYMid slice", "aria-hidden": "true" }, lines);
  }

  function SiteNav(p) {
    var links = p.links || [{ label: "How it works", href: "#how" }, { label: "For reviewers", href: "#reviewers" }, { label: "Privacy", href: "#privacy" }, { label: "FAQ", href: "#faq" }];
    return h("header", { className: "st-nav" }, h("nav", { className: "st-wrap", "aria-label": "Main" },
      h("a", { className: "st-wordmark", href: "#" }, p.name || "Escapture"),
      h("ul", { className: "st-nav-links" }, links.map(function (l) { return h("li", { key: l.label }, h("a", { href: l.href }, l.label)); })),
      h("div", { className: "st-nav-actions" }, h(Button, { variant: "ghost" }, "Sign in"), h(Button, { variant: "primary" }, p.cta || "Get started"))));
  }

  function Hero(p) {
    return h("section", { className: "st-hero" }, p.pattern === false ? null : h(TrailPattern, { offset: 0.55 }),
      h("div", { className: "st-wrap st-hero-grid" },
        h("div", null,
          p.eyebrow ? h("span", { className: "st-eyebrow" }, p.eyebrow) : null,
          h("h1", { className: "st-h st-display-xl" }, p.title),
          p.lead ? h("p", { className: "st-lead" }, p.lead) : null,
          h("div", { className: "st-hero-actions" }, p.primary, p.secondary),
          p.note ? h("p", { className: "st-hero-note" }, h(Icon, { name: "eye-off", size: "sm" }), p.note) : null),
        p.visual ? h("div", null, p.visual) : null));
  }

  function ProductFrame(p) {
    return h("figure", { className: "st-frame", style: { margin: 0 }, "aria-label": p.label },
      h("div", { className: "st-frame-bar", "aria-hidden": "true" }, h("i"), h("i"), h("i"), h("span", { className: "st-frame-url" }, p.url || "escapture.app/vault")),
      h("div", { className: "st-frame-body" }, p.children));
  }

  function Section(p) {
    var tone = p.tone || "canvas", dark = tone === "dark";
    var inner = h("div", { className: "st-wrap", style: { position: "relative" } },
      (p.title || p.eyebrow) ? h("div", { className: cx("st-section-head", p.align === "center" && "st-center") },
        p.eyebrow ? h("span", { className: "st-eyebrow" }, p.eyebrow) : null,
        p.title ? h("h2", { className: "st-h st-display-lg" }, p.title) : null,
        p.lead ? h("p", { className: "st-lead" }, p.lead) : null) : null,
      p.children);
    return h("section", { id: p.id, className: cx("st-section", dark ? "st-dark" : "st-tone-" + tone, p.inset && "st-inset") },
      p.pattern ? h(TrailPattern, { tone: dark ? "dark" : "light", offset: 0.15 }) : null, inner);
  }

  function Steps(p) {
    return h("ol", { className: "st-steps" }, (p.items || []).map(function (s, i) {
      return h("li", { key: i, className: "st-step" }, h("span", { className: "st-step-num", "aria-hidden": "true" }, i + 1),
        h("h3", { className: "st-h h3" }, s.title), h("p", null, s.body));
    }));
  }

  function FeatureRow(p) {
    return h("div", { className: cx("st-feature", p.reverse && "st-feature-rev") },
      h("div", { className: "st-feature-text" },
        p.eyebrow ? h("span", { className: "st-eyebrow" }, p.eyebrow) : null,
        h("h3", { className: "st-h st-display-md" }, p.title), p.body ? h("p", null, p.body) : null,
        p.points ? h("ul", { className: "st-points" }, p.points.map(function (t, i) { return h("li", { key: i }, h(Icon, { name: "check", size: "sm" }), t); })) : null),
      h("div", null, p.visual));
  }

  function TrustPanel(p) {
    function col(title, items, icon) {
      return h("div", { className: "st-trust-col" }, h("h3", null, title),
        h("ul", null, items.map(function (t, i) { return h("li", { key: i }, h(Icon, { name: icon, size: "sm" }), t); })));
    }
    return h("div", { className: "st-trust" }, col(p.doesTitle || "What tamper checks tell you", p.does || [], "check"), col(p.doesNotTitle || "What they don't claim", p.doesNot || [], "minus"));
  }

  function PilotStrip(p) {
    return h("div", { className: "st-pilot" }, h("div", { className: "st-wrap" }, (p.items || []).map(function (t, i) { return h("span", { key: i }, i === 0 ? h("strong", null, t) : t); })));
  }

  function Faq(p) {
    return h("div", { className: "st-faq" }, (p.items || []).map(function (q, i) {
      return h("details", { key: i, open: i === 0 && p.openFirst ? true : undefined },
        h("summary", null, q.q, h(Icon, { name: "chevron-down" })), h("p", null, q.a));
    }));
  }

  function CtaBand(p) {
    return h("section", { className: "st-section", style: { padding: "var(--space-8) 0 var(--space-24)", background: "var(--canvas)" } },
      h("div", { className: "st-wrap" }, h("div", { className: "st-cta st-dark", style: { borderRadius: "var(--radius-section)" } },
        h(TrailPattern, { tone: "dark", offset: 0.2, height: 420 }),
        h("h2", { className: "st-h st-display-lg" }, p.title),
        p.lead ? h("p", { className: "st-lead" }, p.lead) : null,
        h("div", { className: "st-hero-actions" }, p.primary || h(Button, { variant: "on-dark", size: "lg" }, "Get started")))));
  }

  function SiteFooter(p) {
    var cols = p.columns || [
      { title: "Product", links: ["How it works", "Escrow Capture extension", "For reviewers"] },
      { title: "Help", links: ["FAQ", "Contact the team"] },
      { title: "Legal", links: ["Privacy", "Terms"] }];
    return h("footer", { className: "st-footer" }, h("div", { className: "st-wrap" },
      h("div", { className: "st-footer-grid" },
        h("div", null, h("a", { className: "st-wordmark", href: "#" }, "Escapture"), h("p", { className: "st-helper", style: { marginTop: "12px", maxWidth: "36ch", fontSize: "15px", lineHeight: "24px" } }, p.blurb || "Keep evidence of what happened online and share it with your university when you're ready.")),
        cols.map(function (c) { return h("div", { key: c.title }, h("h4", null, c.title), h("ul", null, c.links.map(function (l) { return h("li", { key: l }, h("a", { href: "#" }, l)); }))); })),
      h("p", { className: "st-footer-note" }, p.note || "Escapture supplements Bulacan State University's existing process. It does not replace it.")));
  }


  /* ---------- App shell and reviewer dashboard ---------- */
  var NAV = {
    student: [{ label: "Vault", icon: "inbox" }, { label: "Cases", icon: "clipboard-list" }, { label: "Notifications", icon: "bell" }],
    reviewer: [{ label: "Review Board", icon: "clipboard-list" }, { label: "Case Archives", icon: "archive" }, { label: "Notifications", icon: "bell" }],
    admin: [{ label: "Reviewer accounts", icon: "users" }]
  };
  function Sidebar(p) {
    var items = p.items || NAV[p.role || "reviewer"];
    var active = p.active || items[0].label;
    return h("aside", { className: "st-sidebar" },
      h("a", { className: "st-wordmark", href: "#" }, "Escapture"),
      h("nav", { "aria-label": "Main" }, h("ul", { className: "st-sidenav" }, items.map(function (it) {
        return h("li", { key: it.label }, h("a", { href: "#", "aria-current": it.label === active ? "page" : undefined }, h(Icon, { name: it.icon }), it.label,
          (p.unread || []).indexOf(it.label) > -1 ? h("span", { className: "st-unread", role: "img", "aria-label": "Unread" }) : null));
      }))),
      h("div", { className: "st-account" }, h("span", { className: "st-avatar", "aria-hidden": "true" }, p.initials || "MR"),
        h("div", null, h("b", null, p.user || "M. Reyes"), h("span", null, p.userRole || "Case reviewer"))));
  }
  function AppShell(p) {
    var role = p.role || "reviewer";
    return h("div", { className: "st-shell st-root", "data-density": p.density || (role === "student" ? "comfortable" : "compact") },
      h(Sidebar, { role: role, active: p.active, unread: p.unread, user: p.user, userRole: p.userRole, initials: p.initials }),
      h("div", null,
        h("div", { className: "st-topbar" }, h("button", { className: "st-iconbtn", type: "button", "aria-label": "Open menu" }, h(Icon, { name: "menu" })), h("span", { className: "st-wordmark", style: { fontSize: "18px" } }, "Escapture")),
        h("main", { className: "st-main" }, h("div", { className: "st-main-inner", style: role === "student" ? { maxWidth: "var(--maxw-student)" } : null }, p.children))));
  }
  function PageHeader(p) {
    return h("header", { className: "st-pagehead" },
      h("div", null, h("h1", { className: "st-h h1" }, p.title), p.description ? h("p", null, p.description) : null),
      p.action || null);
  }
  function StatTile(p) {
    return h("div", { className: "st-tile" },
      h("span", { className: "st-tile-label" }, p.icon ? h(Icon, { name: p.icon, size: "sm" }) : null, p.label),
      h("span", { className: "st-tile-value" }, p.value),
      p.note ? h("span", { className: "st-tile-note" }, p.note) : null);
  }
  function SearchInput(p) {
    return h("div", { className: "st-search" }, h(Icon, { name: "search", size: "sm" }),
      h("input", { className: "st-input", type: "search", "aria-label": p.label || "Search", placeholder: p.placeholder || "Search cases", defaultValue: p.defaultValue }));
  }
  function Select(p) {
    return h("select", { className: "st-select", "aria-label": p.label, defaultValue: p.value },
      (p.options || []).map(function (o) { return h("option", { key: o, value: o }, (p.prefix ? p.prefix + ": " : "") + o); }));
  }
  function FilterChip(p) {
    return h("button", { type: "button", className: "st-chip", "aria-pressed": p.pressed ? "true" : "false" },
      p.icon ? h(Icon, { name: p.icon }) : null, p.children, p.pressed && p.removable ? h(Icon, { name: "x", label: "Remove filter" }) : null);
  }
  function Tabs(p) {
    var sel = p.selected == null ? 0 : p.selected;
    return h("div", { className: "st-tabs", role: "tablist", "aria-label": p.label || "Views" }, (p.items || []).map(function (t, i) {
      return h("button", { key: t.label, type: "button", role: "tab", className: "st-tab", "aria-selected": i === sel ? "true" : "false", tabIndex: i === sel ? 0 : -1 },
        t.label, t.count != null ? h("span", { className: "st-count" }, t.count) : null);
    }));
  }
  function Pagination(p) {
    var from = (p.page - 1) * p.pageSize + 1, to = Math.min(p.total, p.page * p.pageSize);
    return h("div", { className: "st-table-foot" }, h("span", { className: "st-num" }, "Showing " + from + "–" + to + " of " + p.total),
      h("div", { className: "st-pager" }, h(Button, { variant: "secondary", icon: "chevron-left", disabled: p.page <= 1 }, "Previous"),
        h(Button, { variant: "secondary", iconAfter: "chevron-right", disabled: to >= p.total }, "Next")));
  }
  function DataTable(p) {
    var cols = p.columns || [], sort = p.sort || {};
    return h("div", { className: "st-tablewrap" },
      h("table", { className: "st-table" },
        p.caption ? h("caption", { style: { position: "absolute", left: "-9999px" } }, p.caption) : null,
        h("thead", null, h("tr", null, cols.map(function (c) {
          var on = sort.key === c.key, label = c.sortable ? h("button", { type: "button" }, c.label, h(Icon, { name: on ? (sort.dir === "asc" ? "arrow-up" : "arrow-down") : "arrow-up-down", size: "sm" })) : c.label;
          return h("th", { key: c.key, scope: "col", className: c.align === "right" ? "st-num" : undefined, "aria-sort": on ? (sort.dir === "asc" ? "ascending" : "descending") : undefined }, label);
        }))),
        h("tbody", null, p.loading ? [0, 1, 2, 3].map(function (i) {
          return h("tr", { key: i }, cols.map(function (c) { return h("td", { key: c.key }, h(Skeleton, { width: c.key === "title" ? "70%" : "60%" })); }));
        }) : (p.rows || []).map(function (r, i) {
          return h("tr", { key: r.id || i, "aria-selected": r.id != null && r.id === p.selected ? "true" : undefined, tabIndex: 0 }, cols.map(function (c) {
            var v = c.render ? c.render(r) : r[c.key];
            return h("td", { key: c.key, className: cx(c.key === "title" && "st-title", c.align === "right" && "st-num", c.muted && "st-muted") }, v);
          }));
        }))),
      !p.loading && (!p.rows || !p.rows.length) ? h(EmptyState, { title: p.emptyTitle || "No cases match these filters", icon: "search", action: h(Button, { variant: "ghost" }, "Clear filters") }, p.emptyText || "Try a different status or date range.") : null,
      p.footer || null);
  }
  function Panel(p) {
    return h("section", { className: "st-panel", "aria-labelledby": p.id },
      h("div", { className: "st-panel-head" }, h("h2", { id: p.id, className: "st-h h4" }, p.title), p.meta ? h("p", null, p.meta) : null),
      p.children);
  }
  function BarChart(p) {
    var st = React.useState(null), hover = st[0], setHover = st[1];
    var data = p.data || [], W = 640, H = p.height || 200, pl = 32, pb = 24, pt = 8;
    var max = Math.max.apply(null, data.map(function (d) { return d.value; }).concat([1]));
    var step = Math.ceil(max / 4) || 1, top = step * 4;
    var bw = (W - pl) / data.length, barW = Math.min(28, bw * 0.55);
    function y(v) { return pt + (H - pt - pb) * (1 - v / top); }
    return h("div", { className: "st-chart" },
      h("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": p.label },
        [0, 1, 2, 3, 4].map(function (i) { var v = step * i; return h("g", { key: i }, i ? h("line", { className: "st-grid-line", x1: pl, x2: W, y1: y(v), y2: y(v) }) : null, h("text", { x: pl - 8, y: y(v) + 4, textAnchor: "end" }, v)); }),
        data.map(function (d, i) {
          var cx0 = pl + bw * i + bw / 2, yy = y(d.value), hgt = H - pb - yy, r = Math.min(4, hgt / 2);
          var path = "M" + (cx0 - barW / 2) + " " + (H - pb) + " V" + (yy + r) + " Q" + (cx0 - barW / 2) + " " + yy + " " + (cx0 - barW / 2 + r) + " " + yy + " H" + (cx0 + barW / 2 - r) + " Q" + (cx0 + barW / 2) + " " + yy + " " + (cx0 + barW / 2) + " " + (yy + r) + " V" + (H - pb) + " Z";
          return h("g", { key: d.label, onMouseEnter: function () { setHover(i); }, onMouseLeave: function () { setHover(null); } },
            h("rect", { className: "st-band", x: pl + bw * i + 2, y: pt, width: bw - 4, height: H - pt - pb, rx: 6 }),
            d.value > 0 ? h("path", { className: "st-bar", d: path }) : null,
            h("text", { x: cx0, y: H - 4, textAnchor: "middle" }, d.label));
        }),
        h("line", { className: "st-axis-line", x1: pl, x2: W, y1: H - pb, y2: H - pb })),
      hover != null ? h("div", { className: "st-tip", style: { left: ((pl + bw * hover + bw / 2) / W * 100) + "%", top: (y(data[hover].value) / H * 100) + "%", marginTop: "-8px" } },
        data[hover].value + " " + (p.unit || "cases") + " ", h("span", null, data[hover].label)) : null);
  }
  var SEG = [["escalated", "Escalated"], ["review", "Under Review"], ["closed", "Closed"]];
  function StatusBreakdown(p) {
    var c = p.counts || {}, total = SEG.reduce(function (s, k) { return s + (c[k[0]] || 0); }, 0) || 1;
    return h("div", { className: "st-stack" },
      h("div", { className: "st-stackbar", role: "img", "aria-label": SEG.map(function (k) { return k[1] + " " + (c[k[0]] || 0); }).join(", ") },
        SEG.map(function (k) { return c[k[0]] ? h("i", { key: k[0], className: "st-seg-" + k[0], style: { width: (c[k[0]] / total * 100) + "%" }, title: k[1] + ": " + c[k[0]] }) : null; })),
      h("ul", { className: "st-legend", style: { marginTop: "16px" } }, SEG.map(function (k) {
        return h("li", { key: k[0] }, h("span", { className: "st-key st-seg-" + k[0], "aria-hidden": "true" }), k[1], h("b", null, c[k[0]] || 0));
      })));
  }
  var FEED_ICON = { escalated: "arrow-up", note: "message-square", attachment: "paperclip", closed: "circle-check", review: "clipboard-list" };
  function ActivityFeed(p) {
    return h("ul", { className: "st-feed", "aria-live": "polite" }, (p.items || []).map(function (it, i) {
      return h("li", { key: i, className: "st-feed-" + it.kind },
        h("span", { className: "st-feed-icon", "aria-hidden": "true" }, h(Icon, { name: FEED_ICON[it.kind] || "info" })),
        h("div", null, h("p", null, it.text), h("time", null, it.time)));
    }));
  }
  function DetailDrawer(p) {
    var box = h("aside", { className: "st-drawer", role: "dialog", "aria-modal": "true", "aria-labelledby": "st-drw-t" },
      h("div", { className: "st-drawer-head" }, h("div", null, h("h2", { id: "st-drw-t", className: "st-h h3" }, p.title), p.meta ? h("p", null, p.meta) : null),
        h("button", { type: "button", className: "st-iconbtn", "aria-label": "Close" }, h(Icon, { name: "x" }))),
      h("div", { className: "st-drawer-body" }, p.children),
      p.actions ? h("div", { className: "st-drawer-foot" }, p.actions) : null);
    return p.overlay === false ? box : h("div", { className: "st-drawer-wrap" }, box);
  }
  function Skeleton(p) {
    if (p.variant === "tile") return h("div", { className: "st-tile", "aria-hidden": "true" }, h("div", { className: "st-skel", style: { width: "50%", height: "14px" } }), h("div", { className: "st-skel", style: { width: "30%", height: "32px", marginTop: "8px" } }), h("div", { className: "st-skel", style: { width: "70%", height: "12px", marginTop: "8px" } }));
    return h("div", { className: "st-skel", "aria-hidden": "true", style: { width: p.width || "100%", height: p.height || "14px" } });
  }

  window.Escapture = Object.assign(window.Escapture || {}, {
    Icon: Icon, Button: Button, Input: Input, StatusBadge: StatusBadge, TamperCheck: TamperCheck, Banner: Banner, Card: Card,
    EmptyState: EmptyState, Dialog: Dialog, Toast: Toast, TrailPattern: TrailPattern, SiteNav: SiteNav, Hero: Hero,
    ProductFrame: ProductFrame, Section: Section, Steps: Steps, FeatureRow: FeatureRow, TrustPanel: TrustPanel,
    PilotStrip: PilotStrip, Faq: Faq, CtaBand: CtaBand, SiteFooter: SiteFooter,
    Sidebar: Sidebar, AppShell: AppShell, PageHeader: PageHeader, StatTile: StatTile, SearchInput: SearchInput, Select: Select,
    FilterChip: FilterChip, Tabs: Tabs, Pagination: Pagination, DataTable: DataTable, Panel: Panel, BarChart: BarChart,
    StatusBreakdown: StatusBreakdown, ActivityFeed: ActivityFeed, DetailDrawer: DetailDrawer, Skeleton: Skeleton
  });
})();
