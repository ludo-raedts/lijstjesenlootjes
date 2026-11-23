import type { Metadata } from "next";
import { getImageProps } from "next/image";
import Link from "next/link";
import { BowlArt, ClipboardArt, CobaltDashes, GroupIcon, GiftMark, LinkIcon, PencilIcon } from "@/components/Art";
import { getServerI18n } from "@/i18n/server";
import { hasPath } from "@/lib/paths";
import { getPagePath } from "@/lib/request-site";
import { JsonLd } from "@/components/JsonLd";
import { pageAlternates, websiteStructuredData } from "@/lib/seo";
import { getActiveAppearance } from "@/lib/theme-store";

export async function generateMetadata(): Promise<Metadata> {
  return { alternates: await pageAlternates("home") };
}

export default async function HomePage() {
  const { locale, t } = await getServerI18n();
  const wishlistHref = await getPagePath("wishlistCreate");
  const drawHref = await getPagePath("drawCreate");
  const appearance = await getActiveAppearance(locale);
  const tools = [
    {
      title: t("home.wishlist.title"),
      text: t("home.wishlist.body"),
      href: wishlistHref,
      cta: t("home.wishlist.action"),
      tone: "powder",
      button: "button",
      art: <ClipboardArt className="product-art" />,
    },
    {
      title: t("home.draw.title"),
      text: t("home.draw.body"),
      href: drawHref,
      cta: t("home.draw.action"),
      tone: "peach",
      button: "button button-brick",
      art: <BowlArt className="product-art" />,
    },
  ];
  // Plain links in the page content (not only the footer) to the seasonal landing pages, the active season first.
  const seasonalPages = (appearance.theme === "christmas" ? (["christmasDraw", "sinterklaasDraw"] as const) : (["sinterklaasDraw", "christmasDraw"] as const)).filter((key) => hasPath(key, locale));
  const seasonalLinks = await Promise.all(
    seasonalPages.map(async (key) => ({ key, href: await getPagePath(key), label: t(key === "christmasDraw" ? "home.seasonal.christmas" : "home.seasonal.sinterklaas") })),
  );
  const steps = [
    { title: t("home.how.step1.title"), body: t("home.how.step1.body"), icon: <PencilIcon /> },
    { title: t("home.how.step2.title"), body: t("home.how.step2.body"), icon: <LinkIcon /> },
    { title: t("home.how.step3.title"), body: t("home.how.step3.body"), icon: <GiftMark /> },
  ];

  const common = { alt: t("home.hero.imageAlt"), sizes: "(min-width: 1200px) 1120px, 100vw", quality: 75 };
  const { props: { srcSet: desktopSrcSet } } = getImageProps({ ...common, src: appearance.definition.desktopImage, width: 1536, height: 1024 });
  const { props: heroImage } = getImageProps({ ...common, src: appearance.definition.mobileImage, width: 1122, height: 1402, fetchPriority: "high" });

  return (
    <>
      <JsonLd data={await websiteStructuredData()} />
      <div className="home-stage">
        <section className="editorial-hero shell">
          <div className="hero-art" aria-hidden="true">
            <span className="hero-art-season hero-art-season-primary" />
            <ClipboardArt className="hero-art-list" />
            <BowlArt className="hero-art-bowl" />
            <span className="hero-art-season hero-art-season-secondary" />
          </div>
          <div className="hero-copy">
            <span className="eyebrow">{t("home.hero.eyebrow")}</span>
            <h1>{t("home.hero.title")}</h1>
            <CobaltDashes className="hero-dashes" />
          </div>
          <div className="hero-aside">
            <p className="hero-intro">{t("home.hero.supporting")}</p>
            <div className="hero-actions">
              <Link className="button" href={wishlistHref}>{t("home.actions.createWishlist")}</Link>
              <Link className="button button-brick" href={drawHref}>{t("home.actions.createDraw")}</Link>
            </div>
          </div>
        </section>

        <figure className="shell hero-figure">
          <picture>
            <source media="(min-width: 861px)" srcSet={desktopSrcSet} />
            <img {...heroImage} alt={common.alt} />
          </picture>
          <img className="figure-corner figure-corner-left" src={appearance.definition.cornerMotif} alt="" aria-hidden="true" />
          <img className="figure-corner figure-corner-right" src={appearance.definition.cornerMotif} alt="" aria-hidden="true" />
        </figure>
      </div>

      <section className="shell tool-index" aria-labelledby="home-products-title">
        <header className="index-header">
          <span className="eyebrow">{t("home.products.eyebrow")}</span>
          <p id="home-products-title">{t("home.products.title")}</p>
        </header>
        <div className="product-grid">
          {tools.map((tool) => (
            <article className={`product-card tone-${tool.tone}`} key={tool.href}>
              {tool.art}
              <div className="product-body">
                <h2>{tool.title}</h2>
                <p>{tool.text}</p>
                <Link className={tool.button} href={tool.href}>{tool.cta}</Link>
              </div>
            </article>
          ))}
        </div>
        {seasonalLinks.length > 0 ? (
          <nav className="season-links" aria-label={t("home.seasonal.label")}>
            {seasonalLinks.map((link) => (
              <Link className="text-link" href={link.href} key={link.key}>{link.label} <span aria-hidden="true">→</span></Link>
            ))}
          </nav>
        ) : null}
      </section>

      <section className="how-section">
        <div className="shell how-grid">
          <div>
            <span className="eyebrow">{t("home.how.eyebrow")}</span>
            <h2>{t("home.how.title")}</h2>
          </div>
          <ol className="step-list">
            {steps.map((step, index) => (
              <li key={step.title}>
                <span className="step-badge" aria-hidden="true">{index + 1}</span>
                <div><h3>{step.title}</h3><p>{step.body}</p></div>
                <span className="step-icon" aria-hidden="true">{step.icon}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="shell trust-band">
        <img className="trust-sprig" src={appearance.definition.accentMotif} alt="" aria-hidden="true" />
        <div className="trust-copy">
          <GroupIcon className="trust-group" />
          <h2>{t("home.trust.line")}</h2>
          <p>{t("home.trust.detail")}</p>
          <Link className="text-link" href="/privacy">{t("footer.privacy")} <span aria-hidden="true">→</span></Link>
        </div>
        <img className="trust-sprig" src={appearance.definition.accentMotif} alt="" aria-hidden="true" />
      </section>
    </>
  );
}
