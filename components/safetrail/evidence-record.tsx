import Link from "next/link";
import { bodyRow, headRow, rowLink, TableBox, td, th } from "@/components/dashboard/data-table";
import { formatDateTime, kindLabel } from "@/lib/format";

export type RecordItem = {
  key: string;
  evidenceId: string | null;
  label: string;
  kind: "facebook_post" | "facebook_message";
  capturedAt: Date | string;
  sha256: string;
  ownerName: string;
};

/**
 * What a closed case held: each item's name, who added it, when it was captured
 * and the hash of its file, as they were when the case closed. The items
 * themselves may since have been renamed or deleted. `hrefFor` links a row to
 * the item for people who may still open it; reviewers get plain rows.
 */
export function EvidenceRecord({
  caption,
  items,
  hrefFor,
}: {
  caption: string;
  items: RecordItem[];
  hrefFor?: (item: RecordItem & { evidenceId: string }) => string;
}) {
  return (
    <TableBox caption={caption} minWidth={720}>
      <thead>
        <tr className={headRow}>
          <th scope="col" className={th}>
            Evidence
          </th>
          <th scope="col" className={th}>
            Added by
          </th>
          <th scope="col" className={th}>
            Captured
          </th>
          <th scope="col" className={th}>
            SHA-256
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((e) => (
          <tr key={e.key} className={bodyRow}>
            <td className={`${td} max-w-[260px]`}>
              {hrefFor && e.evidenceId ? (
                <Link href={hrefFor({ ...e, evidenceId: e.evidenceId })} className={`${rowLink} block truncate`} title={e.label}>
                  {e.label}
                </Link>
              ) : (
                <span className="block truncate font-semibold" title={e.label}>
                  {e.label}
                </span>
              )}
              <span className="block text-[13px] leading-[18px] text-muted">
                {kindLabel(e.kind)}
                {!e.evidenceId && " · Deleted by its owner"}
              </span>
            </td>
            <td className={`${td} whitespace-nowrap`}>{e.ownerName}</td>
            <td className={`${td} mono tnum whitespace-nowrap text-muted`}>{formatDateTime(e.capturedAt)}</td>
            <td className={`${td} max-w-[240px]`}>
              <code className="mono block text-[12px] leading-[16px] break-all text-muted">{e.sha256}</code>
            </td>
          </tr>
        ))}
      </tbody>
    </TableBox>
  );
}
