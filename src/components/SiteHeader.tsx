import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link className="wordmark" href="/" aria-label="Lijstjes en lootjes, home">
          <span className="wordmark-mark" aria-hidden="true">✓</span>
          <span>Lijstjes <i>en</i> lootjes</span>
        </Link>
        <nav className="main-nav" aria-label="Hoofdnavigatie">
          <Link href="/verlanglijstje-maken"><span>01</span>Verlanglijstje</Link>
          <Link href="/lootjes-trekken"><span>02</span>Lootjes trekken</Link>
          <Link href="/help"><span>03</span>Help</Link>
        </nav>
      </div>
    </header>
  );
}
