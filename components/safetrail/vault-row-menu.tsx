"use client";

import { ExternalLink, Link2, Mail, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Menu } from "@/components/ui/menu";
import {
  DeleteEvidenceDialog,
  evidenceEmailShare,
  evidenceLinkShare,
  LOCKED_NOTE,
  RenameEvidenceDialog,
} from "./evidence-actions";
import { EmailShareDialog, LinkShareDialog } from "./share-dialogs";

const icon = { size: 18, strokeWidth: 1.75, "aria-hidden": true } as const;

/**
 * The owner's actions on one piece of evidence. In the vault it is a row's
 * "More" button; on the evidence page it is a labelled button, without Open.
 */
export function VaultRowMenu({
  id,
  label,
  locked,
  onPage = false,
}: {
  id: string;
  label: string;
  locked: boolean;
  /** On the item's own page. */
  onPage?: boolean;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"rename" | "email" | "link" | "delete" | null>(null);
  const close = () => setDialog(null);

  return (
    <>
      <Menu
        label={`Actions for ${label}`}
        text={onPage ? "Share, rename or delete" : undefined}
        note={locked ? LOCKED_NOTE : undefined}
        items={[
          ...(onPage ? [] : [{ label: "Open", icon: <ExternalLink {...icon} />, href: `/vault/${id}` }]),
          {
            label: "Rename",
            icon: <Pencil {...icon} />,
            disabled: locked,
            onSelect: () => setDialog("rename"),
          },
          {
            label: "Share by email",
            icon: <Mail {...icon} />,
            onSelect: () => setDialog("email"),
          },
          {
            label: "Create a password link",
            icon: <Link2 {...icon} />,
            onSelect: () => setDialog("link"),
          },
          {
            label: "Delete",
            icon: <Trash2 {...icon} />,
            danger: true,
            disabled: locked,
            onSelect: () => setDialog("delete"),
          },
        ]}
      />
      {onPage && locked && <p className="text-[13px] leading-[18px] text-muted">{LOCKED_NOTE}</p>}
      {/* Mounted only while in use, so a long list doesn't carry four dialogs per row. */}
      {dialog === "rename" && <RenameEvidenceDialog open onClose={close} evidenceId={id} label={label} />}
      {dialog === "email" && <EmailShareDialog open onClose={close} {...evidenceEmailShare(id)} />}
      {dialog === "link" && <LinkShareDialog open onClose={close} {...evidenceLinkShare(id)} />}
      {dialog === "delete" && (
        <DeleteEvidenceDialog
          open
          onClose={close}
          evidenceId={id}
          label={label}
          onDeleted={() => {
            // The item's own page no longer exists.
            if (onPage) router.push("/vault");
            router.refresh();
          }}
        />
      )}
    </>
  );
}
