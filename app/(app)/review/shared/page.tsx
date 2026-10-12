import { Inbox } from "lucide-react";
import { EvidenceList, EvidenceRow } from "@/components/safetrail/evidence-row";
import { PageHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { pageUser } from "@/server/page-auth";
import { listEvidence } from "@/server/services/evidence";

// Per-user page: allowed to wait for the server on navigation.
export const instant = false;

export default async function SharedWithReviewerPage() {
  const user = await pageUser(["reviewer"]);
  const items = await listEvidence(user, "shared");

  return (
    <>
      <PageHeader
        title="Shared with me"
        description="Evidence people have shared with you by email, or through a password link you opened. Open an item to attach it to a case."
      />
      {items.length === 0 ? (
        <EmptyState icon={<Inbox size={24} strokeWidth={1.75} />} title="Nothing has been shared with you">
          When someone shares evidence with your email, or you open a password link they sent you, it appears here.
        </EmptyState>
      ) : (
        <EvidenceList>
          {items.map((item) => (
            <EvidenceRow key={item.id} item={item} reviewer note={`Shared by ${item.ownerName} (${item.ownerEmail})`} />
          ))}
        </EvidenceList>
      )}
    </>
  );
}
