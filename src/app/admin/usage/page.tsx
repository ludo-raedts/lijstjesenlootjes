import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formattingLocales } from "@/i18n/config";
import { getServerI18n } from "@/i18n/server";
import { hasAdminSession } from "@/lib/admin-auth";
import { SITE_DOMAINS } from "@/lib/domains";
import { pathForLocale } from "@/lib/paths";
import { read, readTrafficDaily, readUsageDaily } from "@/lib/store";
import { summarizeTraffic, trafficWindow, type TrafficRow } from "@/lib/analytics";
import { buildUsageSeries, previousYearWindow, summarizeStock, totalUsage, usageEvents } from "@/lib/usage";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return {
    title: t("meta.usage.title"),
    description: t("meta.usage.description"),
    robots: { index: false, follow: false },
  };
}

export default async function UsagePage() {
  if (!await hasAdminSession()) redirect("/admin");
  const { locale, formattingLocale, t } = await getServerI18n();
  const number = new Intl.NumberFormat(formattingLocales[locale]);
  const date = (day?: string) =>
    day
      ? new Intl.DateTimeFormat(formattingLocale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`))
      : t("usage.none");

  let usage: ReturnType<typeof buildUsageSeries> | undefined;
  try {
    usage = buildUsageSeries(await readUsageDaily(800), 800);
  } catch {
    usage = undefined;
  }
  let traffic: TrafficRow[] | undefined;
  try {
    traffic = await readTrafficDaily(800);
  } catch {
    traffic = undefined;
  }
  const stock = await read((database) => summarizeStock(database));
  const periods = usage ? [
    { id: "30", title: t("usage.totals.30Days"), totals: totalUsage(usage.slice(-30)) },
    { id: "90", title: t("usage.totals.90Days"), totals: totalUsage(usage.slice(-90)) },
    { id: "previous-year", title: t("usage.totals.previousYear"), totals: totalUsage(previousYearWindow(usage, 30)) },
  ] : [];
  const recentDays = usage ? usage.slice(-14).reverse() : [];
  const trafficSummary = traffic ? summarizeTraffic(trafficWindow(traffic, 30)) : undefined;
  const trafficTotals = trafficSummary?.reduce(
    (totals, row) => ({ pageViews: totals.pageViews + row.pageViews, visits: totals.visits + row.visits }),
    { pageViews: 0, visits: 0 },
  );
  const trafficLabel = (row: NonNullable<typeof trafficSummary>[number]) => {
    const host = SITE_DOMAINS.find(({ locale: site }) => site === row.site)?.host ?? row.site;
    const path = pathForLocale(row.page, row.site);
    return `${host}${path === "/" ? "" : path}`;
  };

  return (
    <div className="shell page-section admin-page">
      <header className="admin-page-header">
        <span className="eyebrow">{t("usage.page.eyebrow")}</span>
        <h1>{t("usage.page.title")}</h1>
        <p className="lead">{t("usage.page.lead")}</p>
        <nav className="admin-subnav" aria-label={t("admin.nav.label")}>
          <Link href="/admin">{t("admin.nav.settings")}</Link>
          <Link href="/admin/usage" aria-current="page">{t("admin.nav.usage")}</Link>
        </nav>
      </header>

      {trafficSummary && trafficTotals ? (
        <section className="tool-card" aria-labelledby="usage-traffic-title">
          <h2 id="usage-traffic-title">{t("usage.traffic.title")}</h2>
          <p className="muted">{t("usage.traffic.body")}</p>
          <dl className="usage-grid">
            <div>
              <dt>{t("usage.traffic.visits")}</dt>
              <dd data-traffic-total="visits">{number.format(trafficTotals.visits)}</dd>
            </div>
            <div>
              <dt>{t("usage.traffic.pageViews")}</dt>
              <dd data-traffic-total="pageViews">{number.format(trafficTotals.pageViews)}</dd>
            </div>
          </dl>
          {trafficSummary.length > 0 ? (
            <>
              <h3 id="usage-traffic-details-title">{t("usage.traffic.details")}</h3>
              <div className="usage-table-wrap" role="region" aria-labelledby="usage-traffic-details-title" tabIndex={0}>
                <table className="usage-table">
                  <thead>
                    <tr>
                      <th scope="col">{t("usage.traffic.page")}</th>
                      <th scope="col">{t("usage.traffic.visits")}</th>
                      <th scope="col">{t("usage.traffic.pageViews")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trafficSummary.map((row) => (
                      <tr data-traffic-page={row.page} data-traffic-site={row.site} key={`${row.site}-${row.page}`}>
                        <th scope="row">{trafficLabel(row)}</th>
                        <td>{number.format(row.visits)}</td>
                        <td>{number.format(row.pageViews)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : <p className="muted">{t("usage.traffic.empty")}</p>}
        </section>
      ) : (
        <p className="notice error" role="alert">{t("usage.traffic.error")}</p>
      )}

      {usage ? (
        <>
          {periods.map((period) => (
            <section className="tool-card" aria-labelledby={`usage-totals-${period.id}`} data-period={period.id} key={period.id}>
              <h2 id={`usage-totals-${period.id}`}>{period.title}</h2>
              <dl className="usage-grid">
                {usageEvents.map((event) => (
                  <div key={event}>
                    <dt>{t(`usage.event.${event}`)}</dt>
                    <dd data-event={event}>{number.format(period.totals[event])}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}

          <section className="tool-card" aria-labelledby="usage-daily-title">
            <h2 id="usage-daily-title">{t("usage.daily.title")}</h2>
            <div className="usage-table-wrap" role="region" aria-labelledby="usage-daily-title" tabIndex={0}>
              <table className="usage-table">
                <caption>{t("usage.daily.caption")}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t("usage.daily.day")}</th>
                    {usageEvents.map((event) => <th scope="col" key={event}>{t(`usage.event.${event}`)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {recentDays.map(({ day, counts }) => (
                    <tr key={day}>
                      <th scope="row">{date(day)}</th>
                      {usageEvents.map((event) => <td key={event}>{number.format(counts[event])}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <p className="notice error" role="alert">{t("usage.error")}</p>
      )}

      <section className="tool-card" aria-labelledby="usage-stock-title">
        <h2 id="usage-stock-title">{t("usage.stock.title")}</h2>
        <p className="muted">{t("usage.stock.body")}</p>
        <dl className="usage-grid">
          <div><dt>{t("usage.stock.activeWishlists")}</dt><dd data-stock="wishlists">{number.format(stock.activeWishlists)}</dd></div>
          <div><dt>{t("usage.stock.activeDraws")}</dt><dd data-stock="draws">{number.format(stock.activeDraws)}</dd></div>
          <div><dt>{t("usage.stock.participants")}</dt><dd>{number.format(stock.participants)}</dd></div>
          <div><dt>{t("usage.stock.reservedWishes")}</dt><dd>{number.format(stock.reservedWishes)}</dd></div>
          <div><dt>{t("usage.stock.openPersonalLinks")}</dt><dd>{number.format(stock.openPersonalLinks)}</dd></div>
          <div><dt>{t("usage.stock.expiring")}</dt><dd>{number.format(stock.expiringWithin30Days)}</dd></div>
          <div><dt>{t("usage.stock.oldestWishlist")}</dt><dd>{date(stock.oldestWishlistDay)}</dd></div>
          <div><dt>{t("usage.stock.oldestDraw")}</dt><dd>{date(stock.oldestDrawDay)}</dd></div>
        </dl>
      </section>
    </div>
  );
}
