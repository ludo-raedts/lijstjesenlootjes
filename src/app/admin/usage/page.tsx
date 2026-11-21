import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formattingLocales } from "@/i18n/config";
import { getServerI18n } from "@/i18n/server";
import { hasAdminSession } from "@/lib/admin-auth";
import { SITE_DOMAINS } from "@/lib/domains";
import { pathForLocale } from "@/lib/paths";
import { read, readCountryTrafficDaily, readTrafficDaily, readUsageDaily } from "@/lib/store";
import {
  OTHER_COUNTRIES,
  summarizeCountryTraffic,
  summarizeTraffic,
  trafficWindow,
  type CountryTrafficRow,
  type TrafficRow,
} from "@/lib/analytics";
import { buildUsageSeries, isStoreContended, type UsageEvent, previousYearWindow, summarizeStock, totalUsage } from "@/lib/usage";

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
  const regions = new Intl.DisplayNames([formattingLocale], { type: "region" });
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
  let countryTraffic: CountryTrafficRow[] | undefined;
  try {
    countryTraffic = await readCountryTrafficDaily(800);
  } catch {
    countryTraffic = undefined;
  }
  const stock = await read((database) => summarizeStock(database));
  const periods = usage ? [
    { id: "30", title: t("usage.totals.30Days"), totals: totalUsage(usage.slice(-30)) },
    { id: "90", title: t("usage.totals.90Days"), totals: totalUsage(usage.slice(-90)) },
    { id: "previous-year", title: t("usage.totals.previousYear"), totals: totalUsage(previousYearWindow(usage, 30)) },
  ] : [];
  const week = usage ? totalUsage(usage.slice(-7)) : undefined;
  const contended = week ? isStoreContended(week) : false;
  const recentDays = usage ? usage.slice(-14).reverse() : [];
  const trafficSummary = traffic ? summarizeTraffic(trafficWindow(traffic, 30)) : undefined;
  const countryTrafficSummary = countryTraffic
    ? summarizeCountryTraffic(trafficWindow(countryTraffic, 30))
    : undefined;
  const trafficTotals = trafficSummary?.reduce(
    (totals, row) => ({ pageViews: totals.pageViews + row.pageViews, visits: totals.visits + row.visits }),
    { pageViews: 0, visits: 0 },
  );
  const currentTrafficDays = traffic ? new Set(trafficWindow(traffic, 30).map(({ day }) => day)) : undefined;
  const previousTrafficTotals = traffic && currentTrafficDays
    ? trafficWindow(traffic, 60)
      .filter(({ day }) => !currentTrafficDays.has(day))
      .reduce(
        (totals, row) => ({ pageViews: totals.pageViews + row.pageViews, visits: totals.visits + row.visits }),
        { pageViews: 0, visits: 0 },
      )
    : undefined;
  const previousUsageTotals = usage ? totalUsage(usage.slice(-60, -30)) : undefined;
  const kpis: { id: string; label: string; value: number; previous?: number }[] = [];
  if (trafficTotals) {
    kpis.push(
      { id: "visits", label: t("usage.traffic.visits"), value: trafficTotals.visits, previous: previousTrafficTotals?.visits },
      { id: "pageViews", label: t("usage.traffic.pageViews"), value: trafficTotals.pageViews, previous: previousTrafficTotals?.pageViews },
    );
  }
  if (periods[0] && previousUsageTotals) {
    for (const event of ["wishlist_created", "draw_created", "personal_link_opened"] as const) {
      kpis.push({ id: event, label: t(`usage.event.${event}`), value: periods[0].totals[event], previous: previousUsageTotals[event] });
    }
  }
  const trend = (value: number, previous?: number) => {
    if (previous === undefined || previous === 0) return { kind: "none" as const, text: t("usage.kpi.noPrevious") };
    const change = Math.round(((value - previous) / previous) * 100);
    if (change === 0) return { kind: "flat" as const, text: `0% ${t("usage.kpi.vsPrevious")}` };
    return {
      kind: change > 0 ? "up" as const : "down" as const,
      text: `${Math.abs(change)}% ${change > 0 ? t("usage.kpi.up") : t("usage.kpi.down")} ${t("usage.kpi.vsPrevious")}`,
    };
  };
  const trafficLabel = (row: NonNullable<typeof trafficSummary>[number]) => {
    const host = SITE_DOMAINS.find(({ locale: site }) => site === row.site)?.host ?? row.site;
    const path = pathForLocale(row.page, row.site);
    return `${host}${path === "/" ? "" : path}`;
  };
  const siteLabel = (site: CountryTrafficRow["site"]) =>
    SITE_DOMAINS.find(({ locale: candidate }) => candidate === site)?.host ?? site;
  const countryLabel = (country: string) =>
    country === OTHER_COUNTRIES ? t("usage.traffic.otherCountries") : (regions.of(country) ?? country);

  const groups = [
    { id: "lists", events: ["wishlist_created", "shared_wishlist_opened", "reservation_made"] },
    { id: "draws", events: ["draw_created", "participant_links_issued", "personal_link_opened"] },
    { id: "growth", events: ["cta_reveal_to_draw", "cta_reveal_to_wishlist", "cta_guest_to_draw", "cta_guest_to_wishlist", "share_link_copied", "manage_link_saved"] },
    { id: "mail", events: ["email_delivered", "email_bounced", "email_complained", "email_delayed"] },
    { id: "vitals", events: ["vitals_lcp_good", "vitals_lcp_needs_work", "vitals_lcp_poor", "vitals_inp_good", "vitals_inp_needs_work", "vitals_inp_poor", "vitals_cls_good", "vitals_cls_needs_work", "vitals_cls_poor"] },
    { id: "system", events: ["admin_login", "state_commit_conflict", "state_commit_failed"] },
  ] as const satisfies readonly { id: string; events: readonly UsageEvent[] }[];
  const percent = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : "–");
  const month = periods[0]?.totals;
  const ratios = month
    ? [
        {
          id: "openedShare",
          label: t("usage.ratio.opened"),
          value: percent(month.personal_link_opened, month.participant_links_issued),
          note: t("usage.ratio.openedNote", { opened: number.format(month.personal_link_opened), issued: number.format(month.participant_links_issued) }),
        },
        {
          id: "ctaShare",
          label: t("usage.ratio.cta"),
          value: percent(month.cta_reveal_to_draw + month.cta_reveal_to_wishlist, month.personal_link_opened),
          note: t("usage.ratio.ctaNote", { clicks: number.format(month.cta_reveal_to_draw + month.cta_reveal_to_wishlist), opened: number.format(month.personal_link_opened) }),
        },
        {
          id: "savedShare",
          label: t("usage.ratio.saved"),
          value: percent(month.manage_link_saved, month.wishlist_created + month.draw_created),
          note: t("usage.ratio.savedNote", { saved: number.format(month.manage_link_saved), created: number.format(month.wishlist_created + month.draw_created) }),
        },
      ]
    : [];
  const funnelEvents = ["wishlist_created", "shared_wishlist_opened", "reservation_made", "draw_created", "personal_link_opened"] as const;

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

      {contended && week ? (
        <p className="notice warning" role="status">
          {t("usage.contention.warning", { conflicts: number.format(week.state_commit_conflict), failed: number.format(week.state_commit_failed) })}
        </p>
      ) : null}

      <nav className="usage-jump" aria-label={t("usage.jump.label")}>
        <a href="#usage-kpi-title">{t("usage.jump.overview")}</a>
        <a href="#usage-traffic-title">{t("usage.jump.visitors")}</a>
        <a href="#usage-period-title">{t("usage.jump.usage")}</a>
        <a href="#usage-stock-title">{t("usage.jump.stock")}</a>
      </nav>

      {kpis.length > 0 || ratios.length > 0 ? (
        <section className="kpi-strip" aria-labelledby="usage-kpi-title">
          <h2 id="usage-kpi-title" className="kpi-strip-title">{t("usage.kpi.title")}</h2>
          <dl className="kpi-grid">
            {kpis.map((kpi) => {
              const change = trend(kpi.value, kpi.previous);
              return (
                <div data-kpi={kpi.id} key={kpi.id}>
                  <dt>{kpi.label}</dt>
                  <dd>{number.format(kpi.value)}</dd>
                  <dd className={`kpi-trend kpi-trend-${change.kind}`}>{change.text}</dd>
                </div>
              );
            })}
            {ratios.map((ratio) => (
              <div data-kpi={ratio.id} key={ratio.id}>
                <dt>{ratio.label}</dt>
                <dd>{ratio.value}</dd>
                <dd className="kpi-trend kpi-trend-none">{ratio.note}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {trafficSummary && trafficTotals ? (
        <section className="tool-card" aria-labelledby="usage-traffic-title">
          <h2 id="usage-traffic-title">{t("usage.traffic.title")}</h2>
          <p className="muted">{t("usage.traffic.body")}</p>
          <dl className="usage-grid usage-grid-compact">
            <div>
              <dt>{t("usage.traffic.visits")}</dt>
              <dd data-traffic-total="visits">{number.format(trafficTotals.visits)}</dd>
            </div>
            <div>
              <dt>{t("usage.traffic.pageViews")}</dt>
              <dd data-traffic-total="pageViews">{number.format(trafficTotals.pageViews)}</dd>
            </div>
          </dl>
          <details className="usage-details" open>
            <summary>{t("usage.traffic.details")} ({number.format(trafficSummary.length)})</summary>
            {trafficSummary.length > 0 ? (
              <div className="usage-table-wrap" role="region" aria-label={t("usage.traffic.details")} tabIndex={0}>
                <table className="usage-table">
                  <thead>
                    <tr>
                      <th scope="col">{t("usage.traffic.page")}</th>
                      <th scope="col">{t("usage.traffic.visits")}</th>
                      <th scope="col">{t("usage.traffic.pageViews")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...trafficSummary].sort((left, right) => right.pageViews - left.pageViews).map((row) => (
                      <tr data-traffic-page={row.page} data-traffic-site={row.site} key={`${row.site}-${row.page}`}>
                        <th scope="row">{trafficLabel(row)}</th>
                        <td>{number.format(row.visits)}</td>
                        <td>{number.format(row.pageViews)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="muted">{t("usage.traffic.empty")}</p>}
          </details>
          <details className="usage-details">
            <summary>{t("usage.traffic.countries")}</summary>
            <p className="muted">{t("usage.traffic.countryNote")}</p>
            {countryTrafficSummary ? (
              countryTrafficSummary.length > 0 ? (
                <div className="usage-table-wrap" role="region" aria-label={t("usage.traffic.countries")} tabIndex={0}>
                  <table className="usage-table">
                    <thead>
                      <tr>
                        <th scope="col">{t("usage.traffic.site")}</th>
                        <th scope="col">{t("usage.traffic.country")}</th>
                        <th scope="col">{t("usage.traffic.visits")}</th>
                        <th scope="col">{t("usage.traffic.pageViews")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {countryTrafficSummary.map((row) => (
                        <tr data-country={row.country} data-country-site={row.site} key={`${row.site}-${row.country}`}>
                          <th scope="row">{siteLabel(row.site)}</th>
                          <td>{countryLabel(row.country)}</td>
                          <td>{number.format(row.visits)}</td>
                          <td>{number.format(row.pageViews)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="muted">{t("usage.traffic.countryEmpty")}</p>
            ) : <p className="notice error" role="alert">{t("usage.traffic.countryError")}</p>}
          </details>
        </section>
      ) : (
        <p className="notice error" role="alert">{t("usage.traffic.error")}</p>
      )}

      {usage ? (
        <>
          <section className="tool-card" aria-labelledby="usage-period-title">
            <h2 id="usage-period-title">{t("usage.period.title")}</h2>
            <div className="usage-table-wrap" role="region" aria-labelledby="usage-period-title" tabIndex={0}>
              <table className="usage-table usage-table-periods">
                <thead>
                  <tr>
                    <th scope="col"><span className="sr-only">{t("usage.period.event")}</span></th>
                    {periods.map((period) => <th scope="col" key={period.id}>{period.title}</th>)}
                  </tr>
                </thead>
                {groups.map((group) => (
                  <tbody key={group.id}>
                    <tr className="usage-group-row"><th scope="colgroup" colSpan={periods.length + 1}>{t(`usage.group.${group.id}`)}</th></tr>
                    {group.events.map((event) => (
                      <tr key={event}>
                        <th scope="row">{t(`usage.event.${event}`)}</th>
                        {periods.map((period) => (
                          <td data-event={event} data-period={period.id} key={period.id}>{number.format(period.totals[event])}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                ))}
              </table>
            </div>
          </section>

          <section className="tool-card" aria-labelledby="usage-daily-title">
            <h2 id="usage-daily-title">{t("usage.daily.title")}</h2>
            <details className="usage-details">
              <summary>{t("usage.daily.caption")}</summary>
              <div className="usage-table-wrap" role="region" aria-labelledby="usage-daily-title" tabIndex={0}>
                <table className="usage-table">
                  <thead>
                    <tr>
                      <th scope="col">{t("usage.daily.day")}</th>
                      {funnelEvents.map((event) => <th scope="col" key={event}>{t(`usage.event.${event}`)}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {recentDays.map(({ day, counts }) => (
                      <tr key={day}>
                        <th scope="row">{date(day)}</th>
                        {funnelEvents.map((event) => <td key={event}>{number.format(counts[event])}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
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
