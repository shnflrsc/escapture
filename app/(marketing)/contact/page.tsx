import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Contact the team · SafeTrail" };

// Every detail here comes from the team's Privacy Policy and Terms of Service. Keep the three pages in step.
const CONTACT = "hezekiahchristaldionisio@gmail.com";
const GUIDANCE = "bulsuguidancecenter@bulsu.edu.ph";

const card = "flex flex-col gap-3 rounded-xl border border-border bg-card p-6 shadow-soft";
const h2 = "text-[20px] leading-7";
const label = "text-[13px] leading-[18px] font-semibold text-muted";

export default function ContactPage() {
  return (
    <div className="mk-wrap flex flex-col gap-6 py-16">
      <h1>Contact the team</h1>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <section className={card}>
          <h2 className={h2}>Team Echelon</h2>
          <p>
            SafeTrail is built and operated by Team Echelon (SafeTrail hackathon project). Write to us with questions,
            requests or complaints, including about your personal data or removing your account.
          </p>
          <dl className="flex flex-col gap-3">
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
          <p className="text-sm leading-[22px] text-muted">
            You can also file a complaint about personal data with the National Privacy Commission at{" "}
            <a href="https://privacy.gov.ph" className="link" rel="noopener">
              privacy.gov.ph
            </a>
            .
          </p>
        </section>

        <section className={card}>
          <h2 className={h2}>If you need help now</h2>
          <p>
            SafeTrail is not an emergency or counselling service, and nobody watches reports in real time. If you are
            in danger, call 911.
          </p>
          <p>
            For support, you can contact the BulSU Guidance and Counseling Services Center, Main Campus. Contacting the
            center does not escalate a SafeTrail case.
          </p>
          <dl className="flex flex-col gap-3">
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
        </section>
      </div>

      <p className="flex flex-wrap gap-x-6 gap-y-2">
        <Link href="/privacy" className="link">
          Privacy Policy
        </Link>
        <Link href="/terms" className="link">
          Terms of Service
        </Link>
        <Link href="/" className="link">
          Back to the home page
        </Link>
      </p>
    </div>
  );
}
