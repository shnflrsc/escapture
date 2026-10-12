export type VaultView = {
  tab: "mine" | "shared";
  q: string;
  kind: "" | "facebook_post" | "facebook_message";
  sort: "" | "newest" | "oldest" | "name";
};

/** The vault's address for a view. Defaults are left out, so a plain /vault stays plain. */
export function vaultHref(view: Partial<VaultView>) {
  const params = new URLSearchParams();
  if (view.tab === "shared") params.set("tab", "shared");
  if (view.q) params.set("q", view.q);
  if (view.kind) params.set("kind", view.kind);
  if (view.sort) params.set("sort", view.sort);
  const query = params.toString();
  return query ? `/vault?${query}` : "/vault";
}
