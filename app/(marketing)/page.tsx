import { CircleCheck, EyeOff, Info, Lock } from "lucide-react";
import type { Metadata } from "next";
import {
  ButtonLink,
  CtaBand,
  Faq,
  FeatureRow,
  PilotStrip,
  Section,
  Steps,
  TrailPattern,
  TrustPanel,
} from "@/components/marketing/blocks";
import { RevealOnScroll } from "@/components/marketing/reveal";
import { emailDomain } from "@/components/marketing/site-chrome";
import { StartForm } from "@/components/marketing/start-form";
import {
  EmptyVaultVisual,
  EscalateVisual,
  ExtensionVisual,
  ReviewBoardVisual,
  SharingVisual,
  VaultVisual,
} from "@/components/marketing/visuals";
import { Banner } from "@/components/ui/feedback";

export const metadata: Metadata = {
  title: "SafeTrail: keep a record of what happened",
};

const steps = [
  {
    title: "Capture",
    body: "Use the Escrow Capture extension to save a Facebook post or conversation. Each capture is saved with tamper checks.",
  },
  {
    title: "Build a case",
    body: "Choose the evidence that matters, describe what happened in your own words, and invite someone you trust to help.",
  },
  {
    title: "Escalate when you're ready",
    body: "Review exactly what reviewers will see. Once you escalate, the case is locked and reviewers can see it.",
  },
];

const hardDays = [
  {
    Icon: Lock,
    title: "Private by default",
    text: "Your vault is yours alone. No one else sees it unless you share it.",
  },
  {
    Icon: EyeOff,
    title: "No pressure to act",
    text: "Capture now and decide later. Nothing moves forward until you choose.",
  },
  { Icon: Info, title: "Plain language", text: "Every screen says what happens next, in everyday words." },
  {
    Icon: CircleCheck,
    title: "You stay in control",
    text: "See who has access, remove it anytime, and preview everything before you escalate.",
  },
];

const faq = [
  {
    q: "Who can see my vault?",
    a: "Only you. Nothing reaches reviewers until you escalate a case, and you choose who else can see it.",
  },
  {
    q: "Do I have to report anything?",
    a: "No. You can keep captures in your vault and never escalate. It's your decision, on your timeline.",
  },
  {
    q: "Can I withdraw a case?",
    a: "Before you escalate, you can edit or delete anything. Once you escalate, the case is locked and can't be withdrawn.",
  },
  {
    q: "What does “captured with tamper checks” mean?",
    a: "The capture passed our checks when it was taken and the saved file hasn't changed since. It doesn't prove the capture shows the whole conversation.",
  },
  {
    q: "Does SafeTrail replace the university's process?",
    a: "No. It supplements Bulacan State University's existing process.",
  },
  {
    q: "Which platforms are supported?",
    a: "Facebook posts and Messenger conversations for now. Messenger captures include only the messages loaded on screen.",
  },
];

export default function LandingPage() {
  return (
    <>
      <RevealOnScroll />
      <section className="mk-hero">
        <TrailPattern />
        <div className="mk-wrap">
          <div className="mk-hero-grid">
            <div>
              <span className="mk-eyebrow">For students at Bulacan State University</span>
              <h1 className="mk-display-xl">Keep a record of what happened.</h1>
              <p className="mk-lead">
                Save Facebook posts and messages with tamper checks, build a case in your own time, and share it with
                university reviewers only when you&apos;re ready.
              </p>
              <div className="mk-actions">
                <ButtonLink href="/sign-up" lg>
                  Start your vault
                </ButtonLink>
                <ButtonLink href="#how" variant="secondary" lg>
                  See how it works
                </ButtonLink>
              </div>
            </div>
            <VaultVisual />
          </div>
        </div>
      </section>

      <PilotStrip
        items={[
          "Piloting at Bulacan State University",
          "Supplements the university's existing process",
          "Facebook posts and Messenger",
        ]}
      />

      <Section
        id="how"
        tone="card"
        eyebrow="How it works"
        title="Three steps, at your pace"
        lead="You decide when, and whether, anything goes further."
      >
        <Steps items={steps} />
      </Section>

      <Section tone="canvas">
        <FeatureRow
          eyebrow="Escrow Capture extension"
          title="Save it the moment you see it"
          body="Open the post or conversation on Facebook and click Capture. SafeTrail saves a copy of the page, its time and a hash, then checks it hasn't been changed in the browser."
          points={[
            "Works on Facebook posts and Messenger conversations",
            "Each capture is saved with tamper checks",
            "Goes straight to your private vault",
          ]}
        >
          <ExtensionVisual />
        </FeatureRow>
        <FeatureRow
          reverse
          eyebrow="Your vault"
          title="Private until you choose"
          body="Everything you capture stays in your vault. You can ask a friend, counselor or family member to help, and you can take their access away at any time."
          points={[
            "Only you can see your vault",
            "Share with a password-protected link",
            "See who has access, and remove it anytime",
          ]}
        >
          <SharingVisual />
        </FeatureRow>
        <FeatureRow
          eyebrow="Escalating a case"
          title="See everything before you send it"
          body="When you're ready, SafeTrail shows you exactly what reviewers will see. Nothing is sent until you confirm, and you can go back as many times as you need."
          points={[
            "A full preview of your case, as reviewers will see it",
            "A clear note about what locking means",
            "A simple status afterwards: Escalated, Under Review, Closed",
          ]}
        >
          <EscalateVisual />
        </FeatureRow>
      </Section>

      <Section
        id="privacy"
        tone="dark"
        inset
        pattern
        eyebrow="Honest about trust"
        title="What tamper checks mean"
        lead="We say “captured with tamper checks”, never more than that. Here is exactly what it covers."
      >
        <TrustPanel
          does={{
            title: "What tamper checks tell you",
            items: [
              "A capture passed our checks when it was taken",
              "The saved file hasn't changed since",
              "Each capture keeps its time and a hash you can copy",
            ],
          }}
          doesNot={{
            title: "What they don't claim",
            items: [
              "That a capture shows the whole conversation",
              "What a reviewer will decide",
              "That reporting will stop what's happening",
            ],
          }}
        />
      </Section>

      <Section
        id="students"
        tone="card"
        eyebrow="Made for students"
        title="Built for hard days"
        lead="Going through this is tiring enough. SafeTrail keeps every step calm, clear and in your hands."
      >
        <ul className="mk-grid-4">
          {hardDays.map(({ Icon, title, text }) => (
            <li key={title} className="flex flex-col gap-3">
              <div className="mk-icon-circle" aria-hidden>
                <Icon size={28} strokeWidth={1.75} />
              </div>
              <h3 className="mk-h3">{title}</h3>
              <p className="mk-muted">{text}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="reviewers" tone="tint">
        <FeatureRow
          reverse
          eyebrow="For case reviewers"
          title="One shared Review Board"
          body="Reviewers see escalated cases in a clear board, with the student's evidence kept apart from their own notes."
          points={[
            "Triage by status, reporter and escalated date",
            "Passed tamper checks shown on every item",
            "Reviewer attachments are never shown to the student",
          ]}
        >
          <ReviewBoardVisual />
        </FeatureRow>
      </Section>

      <Section
        id="start"
        tone="card"
        eyebrow="Get started"
        title="Set up your vault"
        lead="Sign in with your university email, add the Escrow Capture extension, and you're set."
      >
        <div className="mk-split">
          <div className="flex flex-col gap-6">
            <StartForm domain={emailDomain()} />
            <Banner tone="info">
              SafeTrail isn&apos;t an emergency service. If you feel unsafe right now, reach out to your
              university&apos;s guidance office or local emergency services.
            </Banner>
          </div>
          <EmptyVaultVisual />
        </div>
      </Section>

      <Section id="faq" tone="canvas" eyebrow="Questions" title="Common questions" center>
        <Faq items={faq} />
      </Section>

      <CtaBand
        title="Start your vault today"
        lead="Capture what happened now, and decide what to do with it later. It's private until you choose to share."
      >
        <ButtonLink href="/sign-up" variant="on-dark" lg>
          Start your vault
        </ButtonLink>
        <ButtonLink href="#how" variant="ghost-on-dark" lg>
          See how it works
        </ButtonLink>
      </CtaBand>
    </>
  );
}
