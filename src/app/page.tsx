import Link from "next/link";

const tools = [
  {
    eyebrow: "Wensen",
    number: "01",
    title: "Verlanglijstje maken",
    text: "Verzamel je wensen en deel ze met familie en vrienden. Zij kunnen iets reserveren, zodat je geen dubbele cadeaus krijgt.",
    href: "/verlanglijstje-maken",
    cta: "Maak een verlanglijstje",
    tone: "green",
    tool: "list",
    detail: "beheerlink + gastenlink",
  },
  {
    eyebrow: "Geven",
    number: "02",
    title: "Lootjes trekken",
    text: "Organiseer een trekking en geef iedereen een persoonlijke link. Na het openen maakt iedere deelnemer meteen een eigen wensenlijstje.",
    href: "/lootjes-trekken",
    cta: "Trek lootjes",
    tone: "red",
    tool: "draw",
    detail: "persoonlijke links",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="editorial-hero shell">
        <div className="hero-edition" aria-hidden="true">
          <span>No. 01</span>
          <span>Het hele jaar bruikbaar</span>
        </div>
        <div className="hero-copy">
          <span className="eyebrow">Samen iets regelen</span>
          <h1><span>Samen wensen,</span><span><em>loten</em> &amp; geven.</span></h1>
        </div>
        <div className="hero-aside">
          <p className="hero-intro">
            Maak een verlanglijstje voor je verjaardag of trek lootjes voor de groep.
            Na de trekking maakt iedereen via de persoonlijke link een eigen lijstje.
          </p>
          <div className="hero-note">
            <strong>Twee manieren om goed te geven.</strong>
            <p>Begin met een los lijstje of regel alles vanuit één trekking. Zonder verplichte app of account.</p>
            <div className="note-checks" aria-hidden="true">
              <span>lijstje <b>✓</b></span>
              <span>lootje <b>✓</b></span>
              <span>persoonlijk <b>✓</b></span>
            </div>
          </div>
        </div>
        <span className="hero-pencil" aria-hidden="true" />
      </section>

      <section className="shell tool-index" aria-label="Kies wat je wilt regelen">
        <header className="index-header">
          <span className="eyebrow">Waar wil je beginnen?</span>
          <p>Een los lijstje of meteen lootjes trekken.</p>
        </header>
        {tools.map((tool) => (
          <article className={`tool-row tone-${tool.tone}`} key={tool.href}>
            <span className="tool-row-number" aria-hidden="true">{tool.number}</span>
            <div className="tool-row-title">
              <span className="eyebrow">{tool.eyebrow}</span>
              <h2>{tool.title}</h2>
            </div>
            <div className={`tool-mark mark-${tool.tool}`} aria-hidden="true">
              <span /><span /><span />
            </div>
            <p className="tool-row-copy">{tool.text}</p>
            <span className="tool-detail">{tool.detail}</span>
            <Link className="tool-row-link" href={tool.href} aria-label={tool.cta}>
              <span>Open</span><b aria-hidden="true">↗</b>
            </Link>
          </article>
        ))}
      </section>

      <section className="how-section">
        <div className="shell how-grid">
          <div>
            <span className="eyebrow">Zonder gedoe</span>
            <h2>Zo simpel mag het zijn.</h2>
            <p className="how-intro">Geen dashboard om te leren. Geen profiel om te onderhouden.</p>
          </div>
          <ol className="step-list">
            <li><span>1</span><div><strong>Maak iets aan</strong><p>Geen account of app nodig in deze testversie.</p></div></li>
            <li><span>2</span><div><strong>Bewaar je beheerlink</strong><p>Die link is je sleutel. Deel hem niet met anderen.</p></div></li>
            <li><span>3</span><div><strong>Deel persoonlijk</strong><p>Je kiest zelf met wie en via welke app je deelt.</p></div></li>
          </ol>
        </div>
      </section>

      <section className="shell trust-band">
        <div className="trust-heading">
          <span className="eyebrow">Goed om te weten</span>
          <h2>Privé waar het telt.</h2>
        </div>
        <div className="trust-copy">
          <p>
            Persoonlijke lijst- en lootjespagina’s staan niet in de sitemap. Geheime
            beheer- en deelnemerslinks worden niet gedeeld met advertentienetwerken.
          </p>
          <p className="test-note"><span>Proefversie</span> Bewaar persoonlijke links privé; ze geven toegang zonder account.</p>
          <Link className="text-link" href="/privacy">Lees hoe je gegevens worden beschermd <span aria-hidden="true">→</span></Link>
        </div>
        <div className="privacy-seal" aria-hidden="true"><span>privé</span><b>waar het telt</b></div>
      </section>
    </>
  );
}
