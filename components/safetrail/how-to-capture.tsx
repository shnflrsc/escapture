"use client";

import { CircleHelp } from "lucide-react";
import { useState } from "react";
import { Button, type ButtonVariant } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

/** The capture steps, on request rather than taking up the page on every visit. */
export function HowToCapture({
  variant = "soft",
  asLink = false,
  label = "How to capture",
}: {
  variant?: ButtonVariant;
  asLink?: boolean;
  /** The button's words. The dialog is always the capture steps. */
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <>
      {asLink ? (
        <button type="button" className="link self-start rounded-sm text-sm leading-5" onClick={() => setOpen(true)}>
          How to capture
        </button>
      ) : (
        <Button variant={variant} onClick={() => setOpen(true)}>
          <CircleHelp size={18} strokeWidth={1.75} aria-hidden />
          {label}
        </Button>
      )}
      <Dialog
        open={open}
        onClose={close}
        title="How to capture"
        footer={
          <Button variant="secondary" onClick={close}>
            Done
          </Button>
        }
      >
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm leading-[22px] text-ink">
          <li>
            Get the Escapture extension from the{" "}
            <a
              href="https://github.com/shnflrsc/escapture#3-build-and-load-the-extension"
              target="_blank"
              rel="noopener noreferrer"
              className="link"
            >
              Escapture repository on GitHub
            </a>{" "}
            and follow its steps to build it and load it in Chrome.
          </li>
          <li>Open the Facebook post or Messenger conversation, then open the extension and sign in.</li>
          <li>Choose Capture this page and click the post or conversation you want to keep.</li>
        </ol>
        <p className="text-[13px] leading-[18px] text-muted">
          Only messages currently loaded on screen are captured. Scroll up to load more before capturing.
        </p>
      </Dialog>
    </>
  );
}
