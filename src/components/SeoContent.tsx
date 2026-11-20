import { getServerI18n } from "@/i18n/server";
import type { MessageKey } from "@/i18n/messages";

interface SeoContentProps {
  /** Catalog prefix, e.g. "draw.seo" or "wishlist.seo". */
  prefix: "draw.seo" | "wishlist.seo" | "together.seo";
  stepCount: number;
  tipCount: number;
  faqCount: number;
  /** Optional extra section between the steps and the tips, e.g. exclusions. */
  extraSection?: boolean;
}

/** Explanatory content below a tool: real HTML text that answers the search intent behind the page. */
export async function SeoContent({ prefix, stepCount, tipCount, faqCount, extraSection }: SeoContentProps) {
  const { t } = await getServerI18n();
  const key = (suffix: string) => `${prefix}.${suffix}` as MessageKey;
  const range = (count: number) => Array.from({ length: count }, (_, index) => index + 1);
  return (
    <div className="shell narrow page-section prose-page seo-content">
      <section>
        <h2>{t(key("howTitle"))}</h2>
        <ol>
          {range(stepCount).map((step) => (
            <li key={step}><h3>{t(key(`step${step}Title`))}</h3><p>{t(key(`step${step}Body`))}</p></li>
          ))}
        </ol>
      </section>
      {extraSection ? (
        <section>
          <h2>{t(key("exclusionsTitle"))}</h2>
          <p>{t(key("exclusionsBody"))}</p>
        </section>
      ) : null}
      <section>
        <h2>{t(key("tipsTitle"))}</h2>
        <ul>{range(tipCount).map((tip) => <li key={tip}>{t(key(`tip${tip}`))}</li>)}</ul>
      </section>
      <section>
        <h2>{t(key("faqTitle"))}</h2>
        {range(faqCount).map((faq) => (
          <details key={faq}><summary>{t(key(`faq${faq}Question`))}</summary><p>{t(key(`faq${faq}Answer`))}</p></details>
        ))}
      </section>
    </div>
  );
}
