"use client";

import { useEffect } from "react";

// The home page's blocks that fade and rise into place the first time they scroll into view.
const BLOCKS = ".mk-section-head, .mk-step, .mk-feature > *, .mk-trust-col, .mk-faq, .mk-start-panel, .mk-cta";
// Blocks that sit side by side arrive one after another.
const STAGGER_MS = 80;

/**
 * Put once on the home page. Everything is visible without it: only blocks still
 * below the screen when the page loads are hidden, then shown as they arrive.
 * Does nothing when the visitor has asked for reduced motion.
 */
export function RevealOnScroll() {
  useEffect(() => {
    if (!window.matchMedia("(prefers-reduced-motion: no-preference)").matches) return;
    const below = [...document.querySelectorAll<HTMLElement>(BLOCKS)].filter(
      (el) => el.getBoundingClientRect().top > window.innerHeight * 0.9,
    );
    for (const el of below) {
      const index = el.parentElement ? [...el.parentElement.children].indexOf(el) : 0;
      el.style.transitionDelay = el.matches(".mk-step, .mk-trust-col") ? `${index * STAGGER_MS}ms` : "";
      el.dataset.reveal = "hidden";
    }
    const seen = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.reveal = "shown";
          seen.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.1 },
    );
    below.forEach((el) => seen.observe(el));
    return () => {
      seen.disconnect();
      // Leave nothing hidden behind if the page is torn down mid-scroll.
      for (const el of below) {
        delete el.dataset.reveal;
        el.style.transitionDelay = "";
      }
    };
  }, []);
  return null;
}
