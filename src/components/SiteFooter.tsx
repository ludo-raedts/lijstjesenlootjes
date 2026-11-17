import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div>
          <p className="footer-brand">Lijstjes en lootjes</p>
          <p className="muted">Een rustige plek om iets samen te regelen.</p>
        </div>
        <nav aria-label="Voettekst">
          <Link href="/rad-draaien">Namenrad</Link>
          <Link href="/help">Help</Link>
          <Link href="/privacy">Privacy</Link>
        </nav>
        <p className="footer-edition"><span>editie</span> besloten proefversie · nog niet publiek</p>
      </div>
    </footer>
  );
}
