import { Tags } from "lucide-react";
import { bodyRow, headRow, TableBox, td, th } from "@/components/dashboard/data-table";
import { AddWordForm, RemoveWordButton } from "@/components/safetrail/word-bank";
import { Card, PageHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { formatDate } from "@/lib/format";
import { pageUser } from "@/server/page-auth";
import { listWords } from "@/server/services/flags";

// Per-user page: allowed to wait for the server on navigation.
export const instant = false;

export default async function WordBankPage() {
  const user = await pageUser(["admin"]);
  const words = await listWords(user);

  return (
    <>
      <PageHeader title="Word bank" />
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <section aria-label="Words" className="flex min-w-0 flex-col gap-4 [&>*]:min-w-0">
          <p className="tnum text-sm leading-5 text-muted">
            {words.length} {words.length === 1 ? "word" : "words"}
          </p>
          {words.length === 0 ? (
            <EmptyState icon={<Tags size={24} strokeWidth={1.75} />} title="The word bank is empty" />
          ) : (
            <TableBox caption="Words that flag a case" minWidth={560}>
              <thead>
                <tr className={headRow}>
                  <th scope="col" className={th}>
                    Word or phrase
                  </th>
                  <th scope="col" className={`${th} text-right`}>
                    Cases
                  </th>
                  <th scope="col" className={th}>
                    Added
                  </th>
                  <th scope="col" className={th}>
                    <span className="sr-only">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {words.map((w) => (
                  <tr key={w.id} className={bodyRow}>
                    <td className={`${td} font-semibold`}>{w.word}</td>
                    <td className={`${td} tnum text-right`}>{w.cases}</td>
                    <td className={`${td} whitespace-nowrap text-muted`}>
                      <span className="tnum">{formatDate(w.createdAt)}</span>
                      {w.addedBy ? ` · ${w.addedBy}` : " · Starting list"}
                    </td>
                    <td className={`${td} w-12 text-right`}>
                      <RemoveWordButton id={w.id} word={w.word} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableBox>
          )}
        </section>
        <Card className="flex flex-col gap-4">
          <h2 className="text-[20px] leading-7">Add a word</h2>
          <AddWordForm />
        </Card>
      </div>
    </>
  );
}
