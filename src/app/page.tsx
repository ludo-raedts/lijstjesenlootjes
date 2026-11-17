import { getImageProps } from "next/image";
import Link from "next/link";
import { getServerI18n } from "@/i18n/server";

export default async function HomePage() {
  const { t } = await getServerI18n();
  const tools = [
    {
      number: "01",
      title: t("home.wishlist.title"),
      text: t("home.wishlist.body"),
      href: "/verlanglijstje-maken",
      cta: t("home.wishlist.action"),
      tone: "green",
      tool: "list",
    },
    {
      number: "02",
      title: t("home.draw.title"),
      text: t("home.draw.body"),
      href: "/lootjes-trekken",
      cta: t("home.draw.action"),
      tone: "red",
      tool: "draw",
    },
  ];
  const steps = [
    { title: t("home.how.step1.title"), body: t("home.how.step1.body") },
    { title: t("home.how.step2.title"), body: t("home.how.step2.body") },
    { title: t("home.how.step3.title"), body: t("home.how.step3.body") },
  ];

  const common = { alt: t("home.hero.imageAlt"), sizes: "(min-width: 1200px) 1120px, 100vw", quality: 80 };
  const { props: { srcSet: desktopSrcSet } } = getImageProps({ ...common, src: "/images/hero-neutral-desktop.png", width: 1536, height: 1024 });
  const { props: heroImage } = getImageProps({ ...common, src: "/images/hero-neutral-mobile.png", width: 1122, height: 1402, fetchPriority: "high" });

  return (
    <>
      <section className="editorial-hero shell">
        <div className="hero-copy">
          <span className="eyebrow">{t("home.hero.eyebrow")}</span>
          <h1>{t("home.hero.title")}</h1>
        </div>
        <div className="hero-aside">
          <p className="hero-intro">{t("home.hero.supporting")}</p>
          <div className="hero-actions">
            <Link className="button" href="/verlanglijstje-maken">{t("home.actions.createWishlist")}</Link>
            <Link className="button button-secondary" href="/lootjes-trekken">{t("home.actions.createDraw")}</Link>
          </div>
        </div>
        <span className="hero-pencil" aria-hidden="true" />
      </section>

      <figure className="shell hero-figure">
        <picture>
          <source media="(min-width: 861px)" srcSet={desktopSrcSet} />
          <img {...heroImage} alt={common.alt} />
        </picture>
      </figure>

      <section className="shell tool-index" aria-labelledby="home-products-title">
        <header className="index-header">
          <span className="eyebrow">{t("home.products.eyebrow")}</span>
          <p id="home-products-title">{t("home.products.title")}</p>
        </header>
        {tools.map((tool) => (
          <article className={`tool-row tone-${tool.tone}`} key={tool.href}>
            <span className="tool-row-number" aria-hidden="true">{tool.number}</span>
            <div className="tool-row-title">
              <h2>{tool.title}</h2>
            </div>
            <div className={`tool-mark mark-${tool.tool}`} aria-hidden="true">
              <span /><span /><span />
            </div>
            <p className="tool-row-copy">{tool.text}</p>
            <Link className="tool-row-link" href={tool.href}>
              <span>{tool.cta}</span><b aria-hidden="true">↗</b>
            </Link>
          </article>
        ))}
      </section>

      <section className="how-section">
        <div className="shell how-grid">
          <div>
            <span className="eyebrow">{t("home.how.eyebrow")}</span>
            <h2>{t("home.how.title")}</h2>
          </div>
          <ol className="step-list">
            {steps.map((step, index) => (
              <li key={step.title}><span aria-hidden="true">{index + 1}</span><div><strong>{step.title}</strong><p>{step.body}</p></div></li>
            ))}
          </ol>
        </div>
      </section>

      <section className="shell trust-band">
        <div className="trust-copy">
          <h2>{t("home.trust.line")}</h2>
          <p>{t("home.trust.detail")}</p>
          <Link className="text-link" href="/privacy">{t("footer.privacy")} <span aria-hidden="true">→</span></Link>
        </div>
      </section>
    </>
  );
}
