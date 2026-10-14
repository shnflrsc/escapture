import type { Metadata } from "next";

export const metadata: Metadata = { title: "Contact the team · SafeTrail" };

// Every detail here comes from the team's Privacy Policy and Terms of Service. Keep the three pages in step.
const CONTACT = "hezekiahchristaldionisio@gmail.com";
const GUIDANCE = "bulsuguidancecenter@bulsu.edu.ph";

const h2 = "mt-6 text-[24px] leading-8";
const details = "flex flex-col gap-3";
const label = "text-[13px] leading-[18px] font-semibold text-muted";

export default function ContactPage() {
  return (
    <article className="mk-wrap flex flex-col gap-4 py-16 [&>*]:max-w-[72ch]">
      <h1>Contact the team</h1>

      <h2 className={h2}>Team Echelon</h2>
      <p>
        SafeTrail is built and operated by Team Echelon (SafeTrail hackathon project). Write to us with questions,
        requests or complaints, including about your personal data or removing your account.
      </p>
      <dl className={details}>
        <div>
          <dt className={label}>Email</dt>
          <dd>
            <a href={`mailto:${CONTACT}`} className="link break-all">
              {CONTACT}
            </a>
          </dd>
        </div>
        <div>
          <dt className={label}>Data Protection Officer</dt>
          <dd>Hezekiah Christal Dionisio</dd>
          <dd>
            <a href={`mailto:${CONTACT}`} className="link break-all">
              {CONTACT}
            </a>
          </dd>
        </div>
      </dl>
      <p>
        You can also file a complaint about personal data with the National Privacy Commission at{" "}
        <a href="https://privacy.gov.ph" className="link" rel="noopener">
          privacy.gov.ph
        </a>
        .
      </p>

      <h2 className={h2}>If you need help now</h2>
      <p>
        SafeTrail is not an emergency or counselling service, and nobody watches reports in real time. If you are in
        danger, call 911.
      </p>
      <p>
        For support, you can contact the BulSU Guidance and Counseling Services Center, Main Campus. Contacting the
        center does not escalate a SafeTrail case.
      </p>
      <dl className={details}>
        <div>
          <dt className={label}>Email</dt>
          <dd>
            <a href={`mailto:${GUIDANCE}`} className="link break-all">
              {GUIDANCE}
            </a>
          </dd>
        </div>
        <div>
          <dt className={label}>Phone</dt>
          <dd className="tnum">(044) 919 7800</dd>
        </div>
        <div>
          <dt className={label}>Facebook</dt>
          <dd>
            <a href="https://www.facebook.com/BulSUGCSCMain/" className="link" rel="noopener">
              BulSU GCSC Main
            </a>
          </dd>
        </div>
        <div>
          <dt className={label}>Website</dt>
          <dd>
            <a href="https://sites.google.com/bulsu.edu.ph/gcscmain/" className="link" rel="noopener">
              GCSC Main site
            </a>
          </dd>
        </div>
      </dl>
    </article>
  );
}
