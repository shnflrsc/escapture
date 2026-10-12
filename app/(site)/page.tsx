import { EyeOff, LifeBuoy, Lock, UserCheck } from "lucide-react";
import type { Metadata } from "next";
import { HeroExample } from "@/components/safetrail/hero-example";
import { AccountAction, siteContainer } from "@/components/safetrail/site-chrome";

export const metadata: Metadata = {
  title: "SafeTrail: keep the evidence, decide what to do later",
};

const steps = [
  {
    title: "Capture",
    text: "With the Escrow Capture extension for Chrome, choose the post or the messages you want to keep. SafeTrail saves a copy to your vault and records when it was captured.",
  },
  {
    title: "Build a case",
    text: "When you are ready, gather your evidence into a case and describe what happened in your own words. You can add people you trust. A case stays a private draft for as long as you like.",
  },
  {
    title: "Escalate, if you choose to",
    text: "You see exactly what reviewers will see before anything is sent. Once you escalate, the case is locked: it can't be edited or withdrawn.",
  },
];

const privacy = [
  {
    Icon: Lock,
    title: "Only you can see your vault.",
    text: "Nobody else, including reviewers, can open what you capture unless you share it.",
  },
  {
    Icon: EyeOff,
    title: "Nothing reaches reviewers until you escalate.",
    text: "A draft case is visible only to you and the people you add to it.",
  },
  {
    Icon: UserCheck,
    title: "You choose who you share with.",
    text: "Anything you share can be passed on, so share with people you trust.",
  },
];

const limits = [
  {
    title: "It does not decide who is right.",
    text: "SafeTrail keeps records and passes on cases. People at the university review them.",
  },
  {
    title: "It does not replace the university's process.",
    text: "It is a way to prepare and send a case. What happens next follows the university's own procedures, and SafeTrail can't promise an outcome.",
  },
  {
    title: "It does not show that a post was genuine or complete.",
    text: "Each capture is checked for signs that the page was changed in the browser, and the saved file is checked for changes afterwards. That shows the file is what was saved. It does not show that the page itself was real, or that nothing was left out.",
  },
  {
    title: "It covers Facebook and Messenger only, for now.",
    text: "Captures are made on a computer, in Chrome.",
  },
];

const section = `${siteContainer} flex flex-col gap-6 py-12 lg:py-16`;
const prose = "max-w-prose text-base leading-[26px] text-ink";

export default function HomePage() {
  return (
    <>
      <section className={`${siteContainer} grid items-center gap-8 py-12 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-12 lg:py-16`}>
        <div className="flex flex-col items-start gap-6">
          <div className="flex flex-col gap-3">
            <h1>Keep the evidence. Decide what to do later.</h1>
            <p className={`${prose} text-muted`}>
              SafeTrail saves a copy of a Facebook post or Messenger conversation to a private vault, so you still have
              it if it is later edited or deleted. What you do with it, and when, is up to you.
            </p>
          </div>
          <AccountAction place="hero" />
        </div>
        <HeroExample />
      </section>

      <div className="border-y border-border bg-card">
        <div className={`${siteContainer} grid gap-8 py-12 lg:grid-cols-2 lg:gap-12 lg:py-16`}>
          <section className="flex flex-col gap-3">
            <h2>What is SafeTrail?</h2>
            <p className={prose}>
              A place for students to keep evidence of hurtful posts and messages, put it together into a case, and
              send that case to university case reviewers when they choose to.
            </p>
            <p className={prose}>
              It is being piloted with Bulacan State University students and works alongside the university&apos;s
              own process for handling complaints. It is not an official university service.
            </p>
          </section>
          <section className="flex flex-col gap-3">
            <h2>Is this for me?</h2>
            <p className={prose}>
              It is, if someone is posting about you or messaging you on Facebook or Messenger in a way that hurts,
              and you want a record of it.
            </p>
            <p className={prose}>
              It is also for the people you trust. You can add a friend or classmate to a case so they can add what
              they saw. You don&apos;t need to have decided to report: keeping a copy is enough to start.
            </p>
          </section>
        </div>
      </div>

      <section id="how-it-works" className={`${section} scroll-mt-8`}>
        <h2>How it works</h2>
        <ol className="grid gap-8 lg:grid-cols-3">
          {steps.map((step, i) => (
            <li key={step.title} className="flex flex-col gap-3">
              <span
                aria-hidden
                className="tnum flex size-10 items-center justify-center rounded-full bg-brand-100 text-[15px] font-bold text-brand-800"
              >
                {i + 1}
              </span>
              <h3>
                <span className="sr-only">Step {i + 1}: </span>
                {step.title}
              </h3>
              <p className="text-sm leading-[22px] text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <div id="privacy" className="scroll-mt-8 bg-brand-50">
        <section className={section}>
          <h2>What stays private</h2>
          <ul className="grid gap-8 lg:grid-cols-3">
            {privacy.map(({ Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <Icon size={20} strokeWidth={1.75} aria-hidden className="mt-0.5 shrink-0 text-brand-800" />
                <div className="flex flex-col gap-1">
                  <p className="font-semibold text-ink">{title}</p>
                  <p className="text-sm leading-[22px] text-muted">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className={section}>
        <h2>What SafeTrail does not do</h2>
        <dl className="grid gap-x-12 gap-y-6 lg:grid-cols-2">
          {limits.map((limit) => (
            <div key={limit.title} className="flex flex-col gap-1">
              <dt className="font-semibold text-ink">{limit.title}</dt>
              <dd className="text-sm leading-[22px] text-muted">{limit.text}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={`${siteContainer} pb-12 lg:pb-16`}>
        <div className="flex gap-4 rounded-xl bg-brand-100 p-6">
          <LifeBuoy size={24} strokeWidth={1.75} aria-hidden className="mt-1 shrink-0 text-brand-800" />
          <div className="flex flex-col gap-2">
            <h2>If you need help now</h2>
            <p className={`${prose} text-brand-800`}>
              SafeTrail is not an emergency service, and nobody watches it around the clock. If you are in danger, or
              need to talk to someone today, please reach out to a person directly.
            </p>
            {/* Placeholder: replace with the real campus and helpline contacts before students use this. */}
            <p className="text-sm leading-[22px] text-brand-800">Contact details for campus support will be added here.</p>
          </div>
        </div>
      </section>
    </>
  );
}
