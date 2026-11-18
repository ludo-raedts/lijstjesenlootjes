import Link from "next/link";
import { getServerI18n } from "@/i18n/server";
import type { MessageKey } from "@/i18n/messages";
import { getPagePath } from "@/lib/request-site";
import type { PageKey } from "@/lib/paths";

export type AudiencePrefix = "office" | "christmas" | "birthday";

const range = (count: number) => Array.from({ length: count }, (_, index) => index + 1);

/**
 * Landing page for one audience or occasion: what it is for, three steps, tips and questions, and a clear way into
 * the tool. Real HTML text that answers the search intent behind the page.
 */
export async function AudiencePage({ prefix, primary, secondary }: { prefix: AudiencePrefix; primary: PageKey; secondary: PageKey }) {
  const { t } = await getServerI18n();
  const k = (suffix: string) => `${prefix}.${suffix}` as MessageKey;
  return (
    <>
      <header className="shell tool-hero">
        <span className="eyebrow">{t(k("eyebrow"))}</span>
        <h1>{t(k("title"))}</h1>
        <p className="lead">{t(k("lead"))}</p>
        <div className="hero-actions tool-hero-actions">
          <Link className="button button-brick" href={await getPagePath(primary)}>{t(k("cta"))}</Link>
          <Link className="button" href={await getPagePath(secondary)}>{t(k("ctaOther"))}</Link>
        </div>
      </header>
      <div className="shell narrow page-section prose-page seo-content">
        <section>
          <h2>{t(k("stepsTitle"))}</h2>
          <ol>
            {range(3).map((step) => (
              <li key={step}><h3>{t(k(`step${step}Title`))}</h3><p>{t(k(`step${step}Body`))}</p></li>
            ))}
          </ol>
        </section>
        <section>
          <h2>{t(k("tipsTitle"))}</h2>
          <ul>{range(4).map((tip) => <li key={tip}>{t(k(`tip${tip}`))}</li>)}</ul>
        </section>
        <section>
          <h2>{t(k("faqTitle"))}</h2>
          {range(4).map((faq) => (
            <details key={faq}><summary>{t(k(`faq${faq}Question`))}</summary><p>{t(k(`faq${faq}Answer`))}</p></details>
          ))}
        </section>
      </div>
    </>
  );
}
