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

/** The owner's actions on one vault item, without opening it first. */
export function VaultRowMenu({ id, label, locked }: { id: string; label: string; locked: boolean }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"rename" | "email" | "link" | "delete" | null>(null);
  const close = () => setDialog(null);

  return (
    <>
      <Menu
        label={`Actions for ${label}`}
        note={locked ? LOCKED_NOTE : undefined}
        items={[
          {
            label: "Open",
            icon: <ExternalLink {...icon} />,
            href: `/vault/${id}`,
          },
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
      {/* Mounted only while in use, so a long list doesn't carry four dialogs per row. */}
      {dialog === "rename" && <RenameEvidenceDialog open onClose={close} evidenceId={id} label={label} />}
      {dialog === "email" && <EmailShareDialog open onClose={close} {...evidenceEmailShare(id)} />}
      {dialog === "link" && <LinkShareDialog open onClose={close} {...evidenceLinkShare(id)} />}
      {dialog === "delete" && (
        <DeleteEvidenceDialog open onClose={close} evidenceId={id} label={label} onDeleted={() => router.refresh()} />
      )}
    </>
  );
}
