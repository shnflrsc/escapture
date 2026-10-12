import { FileText, FolderOpen, Lock, MessagesSquare } from "lucide-react";
import Link from "next/link";
import { Badge, TamperBadge } from "@/components/ui/badge";
import { formatDateTime, kindLabel } from "@/lib/format";
import { VaultRowMenu } from "./vault-row-menu";

export type VaultItem = {
  id: string;
  label: string;
  kind: "facebook_post" | "facebook_message";
  capturedAt: Date | string;
  ownerName: string;
  /** Only on the owner's own list. */
  caseCount?: number;
  locked?: boolean;
};

const th = "px-4 py-3 text-left text-[13px] leading-[18px] font-semibold text-muted";
const cell = "md:px-4 md:py-3 md:align-middle";

/**
 * The vault as a table: one line per item, compared by name, kind and date.
 * Below 768px each row stacks into a short block instead of squeezing columns.
 */
export function VaultTable({ items, shared }: { items: VaultItem[]; shared: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-soft">
      <table className="block w-full md:table md:table-fixed">
        <caption className="sr-only">{shared ? "Evidence shared with you" : "Your evidence"}</caption>
        <thead className="hidden border-b border-border md:table-header-group">
          <tr>
            <th scope="col" className={th}>
              Name
            </th>
            <th scope="col" className={`${th} hidden w-[160px] xl:table-cell`}>
              Kind
            </th>
            <th scope="col" className={`${th} w-[160px]`}>
              Captured
            </th>
            {shared && (
              <th scope="col" className={`${th} hidden w-[170px] lg:table-cell`}>
                Shared by
              </th>
            )}
            <th scope="col" className={`${th} w-[250px]`}>
              Status
            </th>
            {!shared && (
              <th scope="col" className="w-14">
                <span className="sr-only">Actions</span>
              </th>
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
                      <p className="text-[13px] leading-[18px] text-muted md:truncate xl:hidden">
                        {kindLabel(item.kind)}
                        <span className="tnum md:hidden"> · {captured}</span>
                        {shared && <span className="lg:hidden"> · Shared by {item.ownerName}</span>}
                      </p>
                    </div>
                  </div>
                </td>
                <td className={`${cell} hidden text-sm whitespace-nowrap text-muted xl:table-cell`}>
                  {kindLabel(item.kind)}
                </td>
                <td className={`${cell} tnum hidden text-sm whitespace-nowrap text-muted md:table-cell`}>{captured}</td>
                {shared && (
                  <td className={`${cell} hidden max-w-[180px] truncate text-sm text-muted lg:table-cell`}>
                    {item.ownerName}
                  </td>
                )}
                <td className={`${cell} order-3 basis-full`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <TamperBadge />
                    {item.locked ? (
                      <Badge icon={<Lock size={14} strokeWidth={1.75} aria-hidden />}>Locked in a case</Badge>
                    ) : item.caseCount ? (
                      <Badge icon={<FolderOpen size={14} strokeWidth={1.75} aria-hidden />}>
                        {item.caseCount === 1 ? "In a case" : `In ${item.caseCount} cases`}
                      </Badge>
                    ) : null}
                  </div>
                </td>
                {!shared && (
                  <td className="relative z-10 order-2 has-[[role=menu]]:z-20 md:px-2 md:py-1 md:align-middle">
                    <VaultRowMenu id={item.id} label={item.label} locked={Boolean(item.locked)} />
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
