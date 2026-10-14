"use client";

import { useLayoutEffect, useRef, useState } from "react";

// The frame may not run scripts and this page may not look inside it, so its
// content can't be measured here. The extension measures each new capture's
// height at a few frame widths and stores them with it; the height comes from
// those. Older captures only have the captured area's original size, or nothing.
const MIN_HEIGHT = 64;
const BORDER = 2; // the frame's own top and bottom border
const FRAME_PADDING = 32; // the capture document's own body padding
const MARGIN_AROUND = 160; // room left above and below, so the whole frame fits in the window

/** The capture's height at `width`, from heights measured at a few widths. */
function heightAt(fit: { w: number; h: number }[], width: number): number {
  const points = [...fit].sort((a, b) => a.w - b.w);
  const first = points[0];
  const last = points[points.length - 1];
  if (width <= first.w) return Math.ceil(first.h * (first.w / Math.max(width, 1))); // narrower still: taller
  if (width >= last.w) return last.h; // wider: never taller than this
  const i = points.findIndex((p) => p.w >= width);
  const a = points[i - 1];
  const b = points[i];
  return Math.ceil(a.h + ((b.h - a.h) * (width - a.w)) / (b.w - a.w));
}

/**
 * The sandboxed evidence viewer (I8): script-less, opaque origin. Sized to fit
 * its content, up to what fits in the window; taller captures scroll inside.
 */
export function EvidenceFrame({
  src,
  title,
  size,
}: {
  src: string;
  title: string;
  /** Size of the captured area on the original page, in CSS pixels. Missing on older captures. */
  size?: { width: number; height: number; fit?: { w: number; h: number }[] };
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    const frame = ref.current;
    if (!frame) return;
    const fit = () => {
      const limit = Math.max(MIN_HEIGHT, window.innerHeight - MARGIN_AROUND);
      if (!size) {
        // Nothing to go on: use all the room there is.
        setHeight(limit);
        return;
      }
      let wanted: number;
      if (size.fit?.length) {
        // Measured by the extension: the capture's real height at a few frame widths.
        wanted = heightAt(size.fit, frame.clientWidth) + BORDER;
      } else {
        // Not measured: shown narrower than it was captured, text wraps onto more lines and
        // the content grows taller by about the same proportion.
        const available = frame.clientWidth - FRAME_PADDING;
        const narrower = available > 0 && size.width > available ? size.width / available : 1;
        wanted = Math.ceil(size.height * narrower) + FRAME_PADDING + 8 + BORDER;
      }
      setHeight(Math.min(limit, Math.max(MIN_HEIGHT, wanted)));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(frame);
    window.addEventListener("resize", fit);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [size]);

  return (
    <iframe
      ref={ref}
      sandbox=""
      src={src}
      title={title}
      referrerPolicy="no-referrer"
      // Until measured (and without JavaScript): as tall as the window allows.
      style={{ height: height ?? `max(${MIN_HEIGHT}px, calc(100vh - ${MARGIN_AROUND}px))` }}
      className="block w-full rounded-md border border-border bg-white"
    />
  );
}
