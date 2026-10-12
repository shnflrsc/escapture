import { FileText, MessagesSquare } from "lucide-react";
import Link from "next/link";
import { formatDateTime, kindLabel } from "@/lib/format";
import { DetachButton } from "./case-actions";

export type CaseEvidenceItem = {
  id: string;
  label: string;
  kind: "facebook_post" | "facebook_message";
  capturedAt: Date | string;
  /** "you", or the name of the person whose evidence it is. */
  addedBy: string;
  canRemove: boolean;
};

const th = "px-4 py-3 text-left text-[13px] leading-[18px] font-semibold text-muted";
const cell = "md:px-4 md:py-3 md:align-middle";

/** A case's evidence, one line per item. Below 768px each row stacks. */
export function CaseEvidenceTable({ caseId, items }: { caseId: string; items: CaseEvidenceItem[] }) {
  const removable = items.some((e) => e.canRemove);
  return (
    <div className="rounded-xl border border-border bg-card shadow-soft">
      <table className="block w-full md:table md:table-fixed">
        <caption className="sr-only">Evidence in this case</caption>
        <thead className="hidden border-b border-border md:table-header-group">
          <tr>
            <th scope="col" className={th}>
              Name
            </th>
            <th scope="col" className={`${th} hidden w-[160px] lg:table-cell`}>
              Kind
            </th>
            <th scope="col" className={`${th} w-[160px]`}>
              Captured
            </th>
            <th scope="col" className={`${th} w-[160px]`}>
              Added by
            </th>
            {removable && (
              <th scope="col" className="w-[112px]">
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
                className="relative flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-4 py-3 transition-colors duration-150 last:border-b-0 focus-within:bg-brand-50 hover:bg-brand-50 md:table-row md:p-0"
              >
                <td className={`${cell} min-w-0 flex-1`}>
                  <div className="flex min-w-0 items-center gap-3">
                    <KindIcon size={20} strokeWidth={1.75} aria-hidden className="shrink-0 text-brand-700" />
                    <div className="min-w-0">
                      {/* The link's ::after covers the row. `from` lets the evidence page lead back here. */}
                      <Link
                        href={`/vault/${item.id}?from=${caseId}`}
                        title={item.label}
                        className="block truncate text-[15px] leading-[22px] font-semibold text-ink after:absolute after:inset-0 after:content-[''] hover:underline"
                      >
                        {item.label}
                      </Link>
                      <p className="text-[13px] leading-[18px] text-muted md:truncate lg:hidden">
                        {kindLabel(item.kind)}
                        <span className="md:hidden">
                          {" "}
                          · <span className="tnum">{captured}</span> · Added by {item.addedBy}
                        </span>
                      </p>
                    </div>
                  </div>
                </td>
                <td className={`${cell} hidden text-sm whitespace-nowrap text-muted lg:table-cell`}>
                  {kindLabel(item.kind)}
                </td>
                <td className={`${cell} tnum hidden text-sm whitespace-nowrap text-muted md:table-cell`}>{captured}</td>
                <td className={`${cell} hidden truncate text-sm text-muted md:table-cell`}>{item.addedBy}</td>
                {removable && (
                  <td className="relative z-10 md:px-2 md:py-1 md:text-right md:align-middle">
                    {item.canRemove && <DetachButton caseId={caseId} evidenceId={item.id} label={item.label} />}
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
