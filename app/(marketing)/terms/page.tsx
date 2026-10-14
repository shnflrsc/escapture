import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms of Service · Escapture" };

// The team's own document, with two passages corrected to what the app does: removing people
// after sharing, and how a change to the Terms is announced.
const CONTACT = "hezekiahchristaldionisio@gmail.com";
const GUIDANCE = "bulsuguidancecenter@bulsu.edu.ph";

const h2 = "mt-6 text-[24px] leading-8";
const h3 = "mt-2 text-[20px] leading-7";
const list = "flex list-disc flex-col gap-2 pl-6";

export default function TermsPage() {
  return (
    <article className="mk-wrap flex flex-col gap-4 py-16 [&>*]:max-w-[72ch]">
      <h1>Escapture Terms of Service</h1>
      <p className="text-muted">
        Last updated: <time dateTime="2026-10-14">14 October 2026</time>
      </p>

      <h2 className={h2}>In plain terms</h2>
      <p>
        Escapture is a hackathon prototype that helps students keep evidence of cyberbullying and bring it to the
        university, and these Terms set the rules for using it.
      </p>
      <ul className={list}>
        <li>You need an @ms.bulsu.edu.ph email to create a student account.</li>
        <li>Capture only content that concerns you and conversations you took part in.</li>
        <li>You control what you share and when you escalate. Escalation cannot be undone.</li>
        <li>
          Escapture does not investigate, decide or judge reports. BulSU&apos;s own process does that.
        </li>
        <li>
          The label Captured with tamper checks is not a guarantee that evidence is complete, genuine or accepted by
          BulSU or a court.
        </li>
        <li>Team Echelon runs Escapture independently. BulSU does not.</li>
        <li>Please do not upload real evidence or personal data while Escapture is a demonstration.</li>
      </ul>

      <h2 className={h2}>About these Terms</h2>
      <p>
        By creating an account or using Escapture or its browser extension, you agree to these Terms and to our{" "}
        <Link href="/privacy" className="link">
          Privacy Policy
        </Link>
        . If you do not agree, do not use Escapture.
      </p>
      <p>
        Escapture is built and operated by Team Echelon (Escapture hackathon project). Team Echelon takes part in the
        hackathon on behalf of the BulSU College of Information and Communications Technology (CICT), which supports
        the team. Escapture uses BulSU as an example institution for its workflow. Unless BulSU states otherwise in
        writing, this support does not mean that BulSU operates, endorses or is responsible for Escapture.
      </p>
      <p>
        In these Terms, we means Team Echelon, you means anyone using Escapture, and reviewers and administrators means
        the staff accounts that an administrator creates.
      </p>

      <h2 className={h2}>Accounts and eligibility</h2>
      <p>
        Student accounts require a BulSU email address ending in @ms.bulsu.edu.ph, and Escapture is not designed for
        children. Reviewer and administrator accounts are created by an administrator through a one-time setup link.
      </p>
      <ul className={list}>
        <li>
          Give accurate information and keep your sign-in details to yourself. You are responsible for what happens
          under your account.
        </li>
        <li>Tell us at once if you think someone else has used your account.</li>
        <li>
          Administrators can deactivate accounts, and we may do so when these Terms are broken or an account is misused.
        </li>
        <li>
          Account deletion is not available in this version. Contact us if you want your account removed. Your evidence
          and cases are handled as the Privacy Policy describes.
        </li>
      </ul>

      <h2 className={h2}>What Escapture does and does not do</h2>
      <p>
        Escapture stores evidence, organizes cases and shares them with reviewers. It supplements BulSU&apos;s own
        process and does not replace it.
      </p>
      <ul className={list}>
        <li>
          Escapture does not investigate reports, decide whether a report is true, or impose any outcome. Those
          decisions belong to BulSU&apos;s process.
        </li>
        <li>
          The Escapture extension checks whether a page was changed by hand through browser developer tools or common
          userscripts, and it refuses to capture if it finds that. These checks do not catch every way of altering a
          page, such as modified Facebook app code or rewriting of content in transit.
        </li>
        <li>
          The label Captured with tamper checks means the capture passed those checks and the stored file has not
          changed since it was saved. It does not mean the capture is complete or that the page was genuine when it was
          captured.
        </li>
        <li>
          Escapture is not legal advice, and we do not promise that BulSU or a court will accept any evidence.
        </li>
      </ul>

      <h2 className={h2}>Capturing evidence properly</h2>
      <p>
        You keep whatever rights you have in what you capture. You give us permission to store it, hash it and show it
        to the people you choose and to reviewers after you escalate. That permission is limited to running Escapture
        and lasts only while the evidence is in Escapture.
      </p>
      <h3 className={h3}>What you may capture</h3>
      <p>
        Capture only content that concerns you and conversations you took part in. One party to a conversation can
        consent to sharing it. Capturing messages from conversations you did not take part in is not allowed and can
        break Philippine laws on data privacy and the privacy of communications.
      </p>
      <h3 className={h3}>What you must not do</h3>
      <ul className={list}>
        <li>Knowingly submit a false or fabricated report.</li>
        <li>Try to bypass, disable or interfere with the tamper checks or the capture process.</li>
        <li>Use Escapture to harass, threaten, expose or target another person.</li>
        <li>
          Access another person&apos;s account, vault or case without permission, or attack, probe or overload the
          service.
        </li>
      </ul>
      <p>
        Escapture does not check whether a report is true. The consequences of a false report are decided through
        BulSU&apos;s process.
      </p>

      <h2 className={h2}>Sharing and escalation</h2>
      <p>You decide what you share and when you escalate, and you are responsible for those choices.</p>
      <ul className={list}>
        <li>
          Before sharing evidence or a case, you confirm that you are choosing to share it and accept the risk that the
          recipient could pass it on. We cannot recall copies that people have already saved.
        </li>
        <li>
          You can remove a person&apos;s access to an evidence item and revoke password-protected links at any time.
          Revoking a link stops it opening; people who already used it keep their access until you remove them too.
          People you add to a case can be removed only while the case is a draft.
        </li>
        <li>
          Collaborators can edit a case&apos;s title and description and attach evidence from their own vaults. Invite
          only people you trust with that access.
        </li>
        <li>
          Only the person who created a case can escalate it. Escapture shows a preview of what reviewers will see,
          including every collaborator and every attached item, and asks for confirmation.
        </li>
        <li>
          Escalation cannot be undone. The case is locked and cannot be edited or withdrawn, its collaborators cannot
          be removed, and attached evidence cannot be deleted while the case is open. Reviewers can see the identity of
          every collaborator.
        </li>
      </ul>
      <p>The Privacy Policy explains who can see what and how long data is kept.</p>

      <h2 className={h2}>For reviewers and administrators</h2>
      <p>
        Reviewers and administrators handle sensitive information. By using a reviewer or administrator account, you
        agree to these rules.
      </p>
      <ul className={list}>
        <li>
          Use case information only to handle that case under BulSU&apos;s process, and keep it confidential.
        </li>
        <li>Do not copy, share or keep evidence outside Escapture except as BulSU&apos;s process requires.</li>
        <li>
          Students can still submit false or fabricated reports. The label on a piece of evidence does not show that a
          report is true, so weigh evidence together with the rest of your process, including the accused&apos;s side.
          The accused can add context by capturing their own evidence and sharing it with you.
        </li>
        <li>
          Attachments you add from other people&apos;s vaults are kept separate from the reporter&apos;s evidence, and
          the reporter cannot see them.
        </li>
        <li>
          Administrators can create and deactivate accounts, review cases like a reviewer and assign reviewers to cases.
          Assignment does not limit who can review.
        </li>
        <li>Your access to a case&apos;s evidence ends when the case closes.</li>
      </ul>

      <h2 className={h2}>Facebook and other third parties</h2>
      <p>
        Escapture is not affiliated with, endorsed by or sponsored by Meta or Facebook. Facebook&apos;s own terms may
        restrict capturing its content, and you capture at your own responsibility. Changes on Facebook&apos;s side can
        stop capture from working, and we may not be able to fix that quickly.
      </p>
      <p>
        Escapture relies on providers such as Vercel and Supabase. If they have an outage, Escapture may be unavailable.
      </p>

      <h2 className={h2}>Prototype status and disclaimers</h2>
      <p>
        Escapture is a hackathon prototype provided as is and as available, without warranties of any kind. Please do
        not upload real evidence or personal data while it is in demonstration.
      </p>
      <ul className={list}>
        <li>
          We may change, suspend or shut down Escapture at any time, and data may be lost. Keep your own copy of
          anything you need.
        </li>
        <li>We do not promise that Escapture will be available, accurate, error-free or secure at all times.</li>
        <li>
          To the extent the law allows, Team Echelon and its members are not liable for indirect or consequential
          losses, for evidence that is rejected, lost or passed on by a recipient, or for decisions that BulSU or anyone
          else makes using information from Escapture.
        </li>
        <li>Nothing in these Terms removes rights you have under the law that cannot be waived.</li>
      </ul>

      <h2 className={h2}>If you need help now</h2>
      <p>
        Escapture is not an emergency or counselling service, and nobody watches reports in real time. If you are in
        danger, call 911.
      </p>
      <p>
        For support, you can contact the BulSU Guidance and Counseling Services Center, Main Campus. Contacting the
        center does not escalate a Escapture case.
      </p>
      <ul className={list}>
        <li>
          Email:{" "}
          <a href={`mailto:${GUIDANCE}`} className="link break-all">
            {GUIDANCE}
          </a>
        </li>
        <li>
          Phone: <span className="tnum">(044) 919 7800</span>
        </li>
        <li>
          Facebook:{" "}
          <a href="https://www.facebook.com/BulSUGCSCMain/" className="link" rel="noopener">
            BulSU GCSC Main
          </a>
        </li>
        <li>
          Website:{" "}
          <a href="https://sites.google.com/bulsu.edu.ph/gcscmain/" className="link" rel="noopener">
            GCSC Main site
          </a>
        </li>
      </ul>

      <h2 className={h2}>Changes, governing law and contact</h2>
      <p>
        We may update these Terms. When we make a material change, we will update the date at the top of this page.
        Escapture cannot yet send a notice to every account, so check this page from time to time. If you keep using
        Escapture after a change takes effect, you accept it. These Terms take effect on October 14, 2026.
      </p>
      <p>
        Philippine law governs these Terms. If a dispute arises, please contact us first so that we can try to resolve
        it informally. If any part of these Terms cannot be enforced, the rest stays in effect.
      </p>
      <p>
        Contact Team Echelon at{" "}
        <a href={`mailto:${CONTACT}`} className="link break-all">
          {CONTACT}
        </a>
        .
      </p>
    </article>
  );
}
