// Served from another origin and added after the page has settled, like a
// userscript. The tamper guard must not treat its changes as the page's own.
document.querySelector('[data-testid="post-1"] .text').textContent = "rewritten by a foreign script";
