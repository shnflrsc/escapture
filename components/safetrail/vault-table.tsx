import { EyeOff, FileText, Lock, MessagesSquare, Users } from "lucide-react";
import Link from "next/link";
import { TamperBadge } from "@/components/ui/badge";
import { formatDateTime, kindLabel } from "@/lib/format";
import { VaultRowMenu } from "./vault-row-menu";

export type VaultItem = {
  id: string;
  label: string;
  kind: "facebook_post" | "facebook_message";
  capturedAt: Date | string;
  ownerName: string;
  /** The rest are only on the owner's own list. */
  caseCount?: number;
  caseTitle?: string | null;
  locked?: boolean;
  shareCount?: number;
  linkCount?: number;
};

const th = "px-4 py-3 text-left text-[13px] leading-[18px] font-semibold text-muted";
const cell = "md:px-4 md:py-3 md:align-middle";
const quiet = "inline-flex items-center gap-1.5 text-sm leading-5 text-muted";

/** Which cases an item is in: the first one's name, how many more, and whether it is locked there. */
function InCases({ item }: { item: VaultItem }) {
  if (!item.caseCount) return <span className={quiet}>Not in a case</span>;
  const more = item.caseCount - 1;
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 text-sm leading-5" title={item.caseTitle ?? undefined}>
      {item.locked && (
        <>
          <Lock size={14} strokeWidth={1.75} aria-hidden className="shrink-0 text-muted" />
          <span className="sr-only">Locked in an escalated case: </span>
        </>
      )}
      <span className="truncate">{item.caseTitle}</span>
      {more > 0 && <span className="shrink-0 text-muted">+{more}</span>}
    </span>
  );
}

/** Who else can see an item. Never colour alone: an icon and words. */
function Sharing({ item }: { item: VaultItem }) {
  const people = item.shareCount ?? 0;
  const links = item.linkCount ?? 0;
  if (people === 0 && links === 0) {
    return (
      <span className={quiet}>
        <EyeOff size={14} strokeWidth={1.75} aria-hidden />
        Private
      </span>
    );
  }
  return (
    <span className="flex flex-col items-start gap-0.5 text-sm leading-5">
      {people > 0 && (
        <span className="inline-flex items-center gap-1.5">
          <Users size={14} strokeWidth={1.75} aria-hidden className="text-muted" />
          Shared with {people} {people === 1 ? "person" : "people"}
        </span>
      )}
      {links > 0 && (
        <span className="inline-flex items-center gap-1.5">
          <Lock size={14} strokeWidth={1.75} aria-hidden className="text-muted" />
          {links === 1 ? "Password link" : `${links} password links`}
        </span>
      )}
    </span>
  );
}

/**
 * The vault as a table: one line per item. Below 768px each row stacks into a
 * short block instead of squeezing columns.
 */
export function VaultTable({ items, shared }: { items: VaultItem[]; shared: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-soft">
      <table className="block w-full md:table md:table-fixed">
        <caption className="sr-only">{shared ? "Evidence shared with you" : "Your evidence"}</caption>
        <thead className="hidden border-b border-border md:table-header-group">
          <tr>
            <th scope="col" className={th}>
              Evidence
            </th>
            <th scope="col" className={`${th} w-[150px]`}>
              Captured
            </th>
            <th scope="col" className={`${th} w-[228px]`}>
              Tamper checks
            </th>
            {shared ? (
              <th scope="col" className={`${th} w-[190px]`}>
                Shared by
              </th>
            ) : (
              <>
                <th scope="col" className={`${th} hidden w-[150px] lg:table-cell`}>
                  In cases
                </th>
                <th scope="col" className={`${th} hidden w-[150px] xl:table-cell`}>
                  Sharing
                </th>
                <th scope="col" className="w-12">
                  <span className="sr-only">Actions</span>
                </th>
              </>
            )}
          </tr>
        </thead>
        <tbody className="block md:table-row-group">
          {items.map((item) => {
            const KindIcon = item.kind === "facebook_post" ? FileText : MessagesSquare;
            const captured = formatDateTime(item.capturedAt);
            return (
              <tr
                key={item.id}
                className="relative flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-4 py-3 transition-colors duration-150 last:border-b-0 focus-within:bg-brand-50 hover:bg-brand-50 md:table-row md:p-0"
              >
                <td className={`${cell} order-1 min-w-0 flex-1`}>
                  <div className="flex min-w-0 items-center gap-3">
                    <KindIcon size={20} strokeWidth={1.75} aria-hidden className="shrink-0 text-brand-700" />
                    <div className="min-w-0">
                      {/* The link's ::after covers the row, so the whole row opens the item. */}
                      <Link
                        href={`/vault/${item.id}`}
                        title={item.label}
                        className="block truncate text-[15px] leading-[22px] font-semibold text-ink after:absolute after:inset-0 after:content-[''] hover:underline"
                      >
                        {item.label}
                      </Link>
                      <p className="text-[13px] leading-[18px] text-muted md:truncate">
                        {kindLabel(item.kind)}
                        <span className="tnum md:hidden"> · {captured}</span>
                      </p>
                    </div>
                  </div>
                </td>
                <td className={`${cell} mono tnum hidden whitespace-nowrap text-muted md:table-cell`}>{captured}</td>
                <td className={`${cell} order-3 basis-full md:whitespace-nowrap`}>
                  <TamperBadge />
                </td>
                {shared ? (
                  <td className={`${cell} order-4 basis-full truncate text-sm text-muted md:basis-auto`}>
                    <span className="md:hidden">Shared by </span>
                    {item.ownerName}
                  </td>
                ) : (
                  <>
                    <td className={`${cell} order-4 min-w-0 lg:table-cell md:hidden`}>
                      <InCases item={item} />
                    </td>
                    <td className={`${cell} order-5 xl:table-cell md:hidden`}>
                      <Sharing item={item} />
                    </td>
                    <td className="relative z-10 order-2 has-[[role=menu]]:z-20 md:px-1 md:py-1 md:align-middle">
                      <VaultRowMenu id={item.id} label={item.label} locked={Boolean(item.locked)} />
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
