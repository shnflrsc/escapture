import type { Metadata } from "next";
import Link from "next/link";
import { TableBox } from "@/components/dashboard/data-table";

export const metadata: Metadata = { title: "Privacy Policy · SafeTrail" };

// The policy's text is the team's own document, copied as written. Change the wording there first.
const CONTACT = "hezekiahchristaldionisio@gmail.com";

const h2 = "mt-6 text-[24px] leading-8";
const h3 = "mt-2 text-[20px] leading-7";
const list = "flex list-disc flex-col gap-2 pl-6";
const th = "px-4 py-3 text-left align-top text-[13px] leading-[18px] font-semibold text-muted";
const td = "border-t border-border px-4 py-3 align-top text-sm leading-[22px]";

const Mail = () => (
  <a href={`mailto:${CONTACT}`} className="link break-all">
    {CONTACT}
  </a>
);

const WHO: [string, string, string][] = [
  ["You", "Your vault, your cases, status changes and closing notes", "Always"],
  ["People you share an evidence item with", "That evidence item", "Until you remove their access or revoke the link"],
  [
    "Collaborators on a case",
    "The case title, description and attached evidence, plus status changes and the closing note. They can edit the title and description and attach evidence from their own vaults",
    "Until you remove their access or revoke the link",
  ],
  [
    "Designated case reviewers",
    "After escalation: the title, description, attached evidence, every collaborator's identity and the status",
    "Evidence only while the case is open",
  ],
  [
    "Administrators",
    "The same as reviewers. They can also create and deactivate accounts and assign reviewers to cases",
    "Evidence only while the case is open",
  ],
  ["The accused", "Nothing about the case, unless a person shares it with them or it leaks", "Not applicable"],
];

export default function PrivacyPage() {
  return (
    <article className="mk-wrap flex flex-col gap-4 py-16 [&>*]:max-w-[72ch]">
      <h1>SafeTrail Privacy Policy</h1>
      <p className="text-muted">
        Last updated: <time dateTime="2026-10-14">14 October 2026</time>
      </p>
      <p className="rounded-xl bg-escalated-bg p-4 text-escalated-fg">
        SafeTrail is a prototype built for a hackathon. Please do not upload real evidence or personal data while it is
        in demonstration.
      </p>

      <h2 className={h2}>In plain terms</h2>
      <p>
        SafeTrail keeps your evidence private until you choose to share it, and only the person who created a case can
        escalate it to the university.
      </p>
      <ul className={list}>
        <li>You decide which evidence goes into a case. Reviewers see only what you attached.</li>
        <li>Evidence you capture stays in your private vault. Nobody else can see it unless you share it.</li>
        <li>
          Sharing can be undone: you can remove a person&apos;s access and revoke links at any time. We cannot take back
          a copy someone has already saved.
        </li>
        <li>
          Escalation cannot be undone. After you escalate, the case is locked, and designated reviewers and
          administrators can see it while it is open.
        </li>
        <li>
          We do not sell your data or use it for advertising, and the extension uploads only what you capture.
        </li>
        <li>We never delete your evidence automatically. After a case closes, you decide whether to keep it.</li>
      </ul>

      <h2 className={h2}>About this policy</h2>
      <p>
        This policy explains what personal data SafeTrail collects, why we collect it, and who can see it. SafeTrail is
        a case management and evidence safekeeping service for students and designated staff of Bulacan State
        University (BulSU), piloted with the College of Information and Communications Technology. It is operated by
        Team Echelon (SafeTrail hackathon project).
      </p>
      <p>
        SafeTrail supplements the university&apos;s own process for handling cyberbullying cases and does not replace
        it. We handle personal data in line with the Data Privacy Act of 2012 (Republic Act No. 10173) and its
        implementing rules. This policy covers the SafeTrail web application and the Escrow Capture browser extension.
        It does not cover Facebook, or the university&apos;s own investigation, hearing and sanction procedures, which
        follow their own rules.
      </p>

      <h2 className={h2}>What we collect</h2>
      <p>
        We collect the account details you give us, the evidence you capture, and the case information you and your
        collaborators write.
      </p>
      <ul className={list}>
        <li>
          <strong>Account information.</strong> Your BulSU email address (ending in @ms.bulsu.edu.ph), your name and a
          password. Reviewer and administrator accounts are created by an administrator through a one-time setup link.
        </li>
        <li>
          <strong>Evidence you capture.</strong> A frozen copy of the Facebook post or message conversation that was on
          your screen, which can include text, images, names and timestamps belonging to you and to other people. We
          also store a hash (a fingerprint of the file), the type of item, the capture time and the account that owns
          it. A capture includes only what was loaded on screen at that moment.
        </li>
        <li>
          <strong>Case information.</strong> The title and description, the evidence attached, the collaborators
          invited, status changes, and the reviewer&apos;s closing note. Reviewers can also attach evidence they receive
          from other people&apos;s vaults.
        </li>
        <li>
          <strong>Sharing information.</strong> The email addresses you enter to invite people, the password-protected
          links you create, and a record that you acknowledged the risks before sharing.
        </li>
        <li>
          <strong>Notifications.</strong> The in-app notifications we send you about shares, escalations and status
          changes.
        </li>
        <li>
          <strong>Sign-in information.</strong> What is needed to keep you signed in, such as a session in your browser
          and in the extension.
        </li>
      </ul>
      <p>The extension does not collect your Facebook password, and it uploads only what you capture.</p>

      <h3 className={h3}>Information about other people</h3>
      <p>
        Evidence often contains other people&apos;s personal data, such as a classmate&apos;s messages or an accused
        student&apos;s posts. It can also contain sensitive personal information, such as details about health,
        religion, sexual life or accusations of wrongdoing. Capture only content that concerns you or conversations you
        took part in. Capturing messages from conversations you did not take part in is not allowed and can break the
        law.
      </p>

      <h2 className={h2}>How we use it</h2>
      <p>We use your data to run SafeTrail and to keep evidence checkable, and for nothing else.</p>
      <ul className={list}>
        <li>Create your account and keep you signed in.</li>
        <li>Store your evidence in your vault and show it back to you.</li>
        <li>
          Refuse a capture when the page has been edited by hand, and record a hash so a later change to a stored file
          can be detected.
        </li>
        <li>Let you build cases, share them and escalate them.</li>
        <li>
          Let designated reviewers and administrators review escalated cases, update their status and record the
          outcome.
        </li>
        <li>Send you in-app notifications.</li>
        <li>Protect SafeTrail against misuse and meet legal obligations.</li>
      </ul>
      <p>
        We do not sell personal data or use it for advertising. SafeTrail does not decide whether a report is true:
        that stays with the university&apos;s process.
      </p>
      <p>
        We rely on your consent, which you give when you create an account, capture evidence, share it or escalate a
        case, and on legal obligations where they apply. You can stop future use of your data by deleting the evidence
        you control or by contacting us. We cannot undo an escalation or recall copies that others have already saved.
      </p>

      <h2 className={h2}>Who can see what</h2>
      <p>Nobody sees your evidence or cases until you share them or escalate them.</p>
      <div className="max-w-none!">
        <TableBox caption="Who can see what, and for how long" minWidth={640}>
          <thead>
            <tr className="bg-subtle">
              <th scope="col" className={`${th} w-[24%]`}>
                Who
              </th>
              <th scope="col" className={th}>
                What they can see
              </th>
              <th scope="col" className={`${th} w-[28%]`}>
                For how long
              </th>
            </tr>
          </thead>
          <tbody>
            {WHO.map(([who, what, long]) => (
              <tr key={who}>
                <th scope="row" className={`${td} text-left font-semibold`}>
                  {who}
                </th>
                <td className={td}>{what}</td>
                <td className={td}>{long}</td>
              </tr>
            ))}
          </tbody>
        </TableBox>
      </div>

      <h3 className={h3}>Escalation</h3>
      <p>
        Only the person who created a case can escalate it. Before it goes through, SafeTrail shows a preview of exactly
        what reviewers will see, including every collaborator and every attached item, and asks you to confirm. After
        escalation the case is locked: it cannot be edited or withdrawn, and attached evidence cannot be deleted while
        the case is open. You can still remove a person&apos;s access or revoke a link.
      </p>

      <h3 className={h3}>Reviewer attachments</h3>
      <p>
        Reviewers can attach evidence they receive from other people&apos;s vaults, by email sharing or a shared link.
        For example, if the accused says a message was taken out of context, they can capture the full conversation and
        share it with the reviewers, who attach it next to the original. These attachments are kept separate from your
        evidence, and you cannot see them. The accused never sees your case, and you never interact with the accused in
        SafeTrail.
      </p>

      <h3 className={h3}>When a case closes</h3>
      <p>
        Reviewers and administrators lose access to the evidence. The case stays in the Case Archives, where reviewers
        can look up previously processed cases. The archive shows a record of each item (title, type, capture time,
        owner and hash), not the evidence itself, and the record remains even if the owner later deletes the item.
      </p>

      <h2 className={h2}>Sharing, and what we cannot control</h2>
      <p>Once someone you share with has seen or saved evidence, SafeTrail cannot take that copy back.</p>
      <ul className={list}>
        <li>
          Before you share evidence or a case, SafeTrail asks you to confirm that you are choosing to share it and
          accept the risk that it could spread.
        </li>
        <li>
          You can remove a person&apos;s access and revoke password-protected links at any time. This stops further
          access through SafeTrail. It does not delete anything the person has already copied, screenshotted or
          forwarded.
        </li>
        <li>
          Anyone who has a password-protected link and its password can open what you shared. Send the password
          separately, and only to people you trust.
        </li>
        <li>
          A case or evidence item that reaches the accused or anyone else outside SafeTrail, whether you shared it or it
          leaked, is outside our control.
        </li>
      </ul>

      <h2 className={h2}>Service providers and the university</h2>
      <p>
        We share personal data only with the providers that run SafeTrail, with BulSU&apos;s designated reviewers after
        you escalate, and where the law requires it.
      </p>
      <ul className={list}>
        <li>
          <strong>Hosting and storage.</strong> Supabase provides the hosted Postgres database and the file storage for
          captured evidence. Only the SafeTrail server talks to Supabase. Our application is hosted by Vercel. Supabase
          stores the data in its Singapore region, so your data is processed outside the Philippines.
        </li>
        <li>
          <strong>Sign-in.</strong> SafeTrail uses Better Auth, software that runs inside our own application, to handle
          accounts and sign-in.
        </li>
        <li>
          <strong>Bulacan State University.</strong> After you escalate a case, designated reviewers and administrators
          at BulSU see it as described above. From then on, BulSU&apos;s own policies govern how the university handles
          the information in its investigation, hearing and sanction procedures.
        </li>
        <li>
          <strong>Legal requests.</strong> We may disclose data when a law or a lawful order requires it.
        </li>
      </ul>
      <p>We do not sell personal data, and we do not share it with advertisers.</p>

      <h2 className={h2}>Keeping and deleting data</h2>
      <p>SafeTrail never deletes your evidence automatically, and you decide when it goes.</p>
      <ul className={list}>
        <li>
          <strong>Evidence in your vault</strong> stays until you delete it. You can delete an item at any time, except
          while it is attached to a case that is escalated or under review. After the case closes, you can rename and
          delete it again.
        </li>
        <li>
          <strong>Staff access</strong> ends when a case closes. Reviewers and administrators can no longer open the
          evidence.
        </li>
        <li>
          <strong>Case records</strong> stay in the Case Archives as a history of processed cases. A record lists each
          item&apos;s title, type, capture time, owner and hash, and it remains even if the item is later deleted. We
          have not set a fixed retention period for these records during the pilot. If BulSU sets one, we will follow it
          and dispose of expired records through secure means.
        </li>
        <li>
          <strong>Account deletion</strong> is not available in this version. To have your account removed, contact us
          at <Mail /> and we will tell you what we can remove. What happens to evidence in an open case when its owner
          deletes their account has not been decided yet.
        </li>
      </ul>

      <h2 className={h2}>Your rights</h2>
      <p>
        Under the Data Privacy Act you have rights over your personal data, and you can use them by contacting us.
      </p>
      <ul className={list}>
        <li>Be informed about how your data is processed.</li>
        <li>Access the personal data we hold about you.</li>
        <li>Correct data that is wrong or incomplete.</li>
        <li>Object to the processing of your data, and withdraw consent you gave.</li>
        <li>
          Ask us to erase or block data that is incomplete, outdated, false, unlawfully obtained or no longer needed.
        </li>
        <li>Receive a copy of your data in a structured, commonly used format.</li>
        <li>Claim compensation for damages caused by inaccurate, unlawful or unauthorized use of your data.</li>
      </ul>
      <p>
        Some of these rights are limited once a case is escalated, because reviewers need the record to do their work,
        and we cannot recall copies that others have already saved. If you appear in evidence that someone else
        captured, you have the same rights and can contact us. We may ask you to confirm your identity first.
      </p>
      <p>
        You can also file a complaint with the National Privacy Commission at{" "}
        <a href="https://privacy.gov.ph" className="link" rel="noopener">
          privacy.gov.ph
        </a>
        .
      </p>

      <h2 className={h2}>Security</h2>
      <p>
        We protect your data by keeping the database and file storage behind the SafeTrail server, and no system is
        completely secure.
      </p>
      <ul className={list}>
        <li>
          Only the SafeTrail server talks to the database and file storage. Your browser and the extension never connect
          to them directly.
        </li>
        <li>
          Captured pages are treated as untrusted content. The evidence viewer shows them inside a sandboxed frame that
          cannot run scripts.
        </li>
        <li>The hash and capture time of each item let us detect a change to a stored file after capture.</li>
        <li>
          Reviewer accounts are created by an administrator through a one-time setup link, and administrators can
          deactivate accounts.
        </li>
      </ul>
      <p>
        If a breach affects your personal data, we will notify you and the National Privacy Commission as the law
        requires.
      </p>

      <h2 className={h2}>Eligibility and children</h2>
      <p>
        SafeTrail is for BulSU students and designated university staff. Creating a student account requires a BulSU
        email address ending in @ms.bulsu.edu.ph, and the service is not designed for children. If you believe an
        account belongs to someone who should not have one, tell us and we will review it.
      </p>

      <h2 className={h2}>Changes and contact</h2>
      <p>
        When we make a material change to this policy, we will tell you through an in-app notification and update the
        date at the top. This policy takes effect on October 14, 2026.
      </p>
      <p>
        For questions, requests or complaints about your personal data, contact Team Echelon at <Mail />. Our Data
        Protection Officer is Hezekiah Christal Dionisio, <Mail />.
      </p>

      <p className="mt-4">
        <Link href="/" className="link">
          Back to the home page
        </Link>
      </p>
    </article>
  );
}
