import type { Translator } from "@/i18n/messages";
import type { Locale } from "@/i18n/config";
import { pathForLocale } from "@/lib/paths";

export type RenderedEmail = { subject: string; text: string; html: string };

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Neutral brand tokens from DESIGN.md. Email clients ignore external CSS, so everything is inline.
const C = {
  paper: "#F8F0E3",
  white: "#FFFDF8",
  ink: "#1D2A22",
  muted: "#596259",
  forest: "#174A36",
  brick: "#A53A2E",
  peach: "#F2C8B7",
  line: "#CDBEA9",
};
const SERIF = "Georgia,'Times New Roman',serif";
const SANS = "Arial,Helvetica,sans-serif";
const MONO = "Menlo,Consolas,'Courier New',monospace";

type Block = { label: string; help: string; url: string; button: string; tone: "primary" | "accent" };

type LayoutInput = {
  t: Translator;
  locale: Locale;
  heading: string;
  intro: string;
  preheader: string;
  blocks: Block[];
  sectionHeading?: { beforeIndex: number; text: string };
  notice?: string;
  promo?: { body: string; button: string; url: string };
  site: string;
};

function button(block: Block, linkFallback: string) {
  const bg = block.tone === "primary" ? C.forest : C.brick;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 16px"><tr><td style="background:${C.white};border:1px solid ${C.line};border-radius:10px;padding:18px 20px"><p style="margin:0 0 4px;font-family:${SANS};font-size:16px;font-weight:bold;color:${C.ink}">${escapeHtml(block.label)}</p><p style="margin:0 0 14px;font-family:${SANS};font-size:14px;line-height:1.5;color:${C.muted}">${escapeHtml(block.help)}</p><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${bg}" style="background:${bg};border-radius:8px"><a href="${escapeHtml(block.url)}" style="display:inline-block;padding:12px 22px;font-family:${SANS};font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none">${escapeHtml(block.button)}</a></td></tr></table><p style="margin:14px 0 4px;font-family:${SANS};font-size:12px;color:${C.muted}">${escapeHtml(linkFallback)}</p><p style="margin:0;font-family:${MONO};font-size:12px;line-height:1.5;color:${C.ink};word-break:break-all">${escapeHtml(block.url)}</p></td></tr></table>`;
}

function layout(input: LayoutInput): RenderedEmail {
  const { t, locale, heading, intro, preheader, blocks, notice, site, sectionHeading, promo } = input;
  const footer = t("email.footer", { site });
  const fallback = t("email.linkFallback");
  const brand = t("email.brand");

  const text = [
    heading,
    "",
    intro,
    ...blocks.flatMap((block, index) => [
      ...(sectionHeading && sectionHeading.beforeIndex === index ? ["", sectionHeading.text.toUpperCase()] : []),
      "",
      block.label,
      block.url,
      block.help,
    ]),
    ...(notice ? ["", notice] : []),
    ...(promo ? ["", promo.body, promo.url] : []),
    "",
    "--",
    footer,
  ].join("\n");

  const body = blocks
    .map((block, index) => {
      const heading2 = sectionHeading && sectionHeading.beforeIndex === index
        ? `<p style="margin:24px 0 12px;font-family:${SERIF};font-size:20px;color:${C.forest}">${escapeHtml(sectionHeading.text)}</p>`
        : "";
      return heading2 + button(block, fallback);
    })
    .join("");

  const noticeHtml = notice
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0 0"><tr><td style="background:#FBE7DD;border-left:4px solid ${C.brick};border-radius:6px;padding:14px 16px;font-family:${SANS};font-size:14px;line-height:1.5;color:${C.ink}">${escapeHtml(notice)}</td></tr></table>`
    : "";

  const promoHtml = promo
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:20px 0 0"><tr><td style="border:1px dashed ${C.line};border-radius:10px;padding:16px 18px"><p style="margin:0 0 12px;font-family:${SANS};font-size:14px;line-height:1.5;color:${C.ink}">${escapeHtml(promo.body)}</p><a href="${escapeHtml(promo.url)}" style="font-family:${SANS};font-size:14px;font-weight:bold;color:${C.forest}">${escapeHtml(promo.button)} &rarr;</a></td></tr></table>`
    : "";

  const html = `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(heading)}</title></head><body style="margin:0;padding:0;background:${C.paper}"><div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.paper}">${escapeHtml(preheader)}</div><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${C.paper}" style="background:${C.paper}"><tr><td align="center" style="padding:24px 12px"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px"><tr><td style="background:${C.forest};border-radius:12px 12px 0 0;padding:20px 28px"><p style="margin:0;font-family:${SERIF};font-size:22px;font-weight:bold;color:#ffffff;letter-spacing:0.2px">${escapeHtml(brand)}</p><div style="height:3px;width:56px;background:${C.brick};margin-top:10px;border-radius:2px"></div></td></tr><tr><td style="background:${C.white};border:1px solid ${C.line};border-top:none;border-radius:0 0 12px 12px;padding:28px"><h1 style="margin:0 0 12px;font-family:${SERIF};font-size:28px;line-height:1.25;color:${C.ink}">${escapeHtml(heading)}</h1><p style="margin:0 0 24px;font-family:${SANS};font-size:16px;line-height:1.6;color:${C.ink}">${escapeHtml(intro)}</p>${body}${noticeHtml}${promoHtml}<hr style="border:none;border-top:1px solid ${C.line};margin:28px 0 14px"><p style="margin:0;font-family:${SANS};font-size:12px;line-height:1.5;color:${C.muted}">${escapeHtml(footer)}</p></td></tr></table></td></tr></table></body></html>`;

  return { subject: heading, text, html };
}

function promoFor(t: Translator, site: string, locale: Locale, kind: "wishlist" | "draw") {
  return {
    body: t(kind === "wishlist" ? "email.promo.wishlistBody" : "email.promo.drawBody"),
    button: t("email.promo.button"),
    url: `https://${site}${pathForLocale("wishlistCreate", locale)}`,
  };
}

export function renderWishlistEmail(
  t: Translator,
  input: { title: string; manageUrl: string; guestUrl: string; site: string; locale?: Locale },
): RenderedEmail {
  return layout({
    t,
    locale: input.locale ?? "nl",
    heading: t("email.wishlist.subject", { title: input.title }),
    intro: t("email.wishlist.intro", { title: input.title }),
    preheader: t("email.preheader.wishlist"),
    blocks: [
      { label: t("email.wishlist.manageLabel"), help: t("email.wishlist.manageHelp"), url: input.manageUrl, button: t("email.wishlist.manageButton"), tone: "primary" },
      { label: t("email.wishlist.guestLabel"), help: t("email.wishlist.guestHelp"), url: input.guestUrl, button: t("email.wishlist.guestButton"), tone: "accent" },
    ],
    promo: promoFor(t, input.site, input.locale ?? "nl", "wishlist"),
    site: input.site,
  });
}

export function renderDrawEmail(
  t: Translator,
  input: {
    group: string;
    adminUrl: string;
    participants: Array<{ name: string; url: string }>;
    site: string;
    locale?: Locale;
  },
): RenderedEmail {
  return layout({
    t,
    locale: input.locale ?? "nl",
    heading: t("email.draw.subject", { group: input.group }),
    intro: t("email.draw.intro", { group: input.group }),
    preheader: t("email.preheader.draw"),
    blocks: [
      { label: t("email.draw.adminLabel"), help: t("email.draw.adminHelp"), url: input.adminUrl, button: t("email.draw.adminButton"), tone: "primary" },
      ...input.participants.map((participant) => ({
        label: t("email.draw.participantLabel", { name: participant.name }),
        help: t("email.draw.participantHelp", { name: participant.name }),
        url: participant.url,
        button: t("email.draw.participantButton", { name: participant.name }),
        tone: "accent" as const,
      })),
    ],
    sectionHeading: { beforeIndex: 1, text: t("email.draw.participantsHeading") },
    notice: t("email.draw.spoilerWarning"),
    promo: promoFor(t, input.site, input.locale ?? "nl", "draw"),
    site: input.site,
  });
}

export type RecoveryItem =
  | { kind: "wishlist"; title: string; manageUrl: string; guestUrl: string }
  | { kind: "draw"; title: string; adminUrl: string };

/** One mail with fresh management links for every list or draw that was asked for. */
export function renderRecoveryEmail(
  t: Translator,
  input: { items: RecoveryItem[]; site: string; locale?: Locale },
): RenderedEmail {
  const blocks: Block[] = input.items.flatMap((item): Block[] =>
    item.kind === "wishlist"
      ? [
          { label: t("email.recovery.wishlistManageLabel", { title: item.title }), help: t("email.recovery.wishlistManageHelp"), url: item.manageUrl, button: t("email.recovery.wishlistManageButton"), tone: "primary" },
          { label: t("email.recovery.wishlistGuestLabel", { title: item.title }), help: t("email.recovery.wishlistGuestHelp"), url: item.guestUrl, button: t("email.recovery.wishlistGuestButton"), tone: "accent" },
        ]
      : [
          { label: t("email.recovery.drawAdminLabel", { title: item.title }), help: t("email.recovery.drawAdminHelp"), url: item.adminUrl, button: t("email.recovery.drawAdminButton"), tone: "primary" },
        ],
  );
  return layout({
    t,
    locale: input.locale ?? "nl",
    heading: t("email.recovery.subject"),
    intro: t("email.recovery.intro"),
    preheader: t("email.recovery.preheader"),
    blocks,
    notice: t("email.recovery.notice"),
    site: input.site,
  });
}

/** The one reminder the organizer asked for: who has not looked yet, with a fresh management link. */
export function renderReminderEmail(
  t: Translator,
  input: { group: string; date: string; pending: number; total: number; adminUrl: string; site: string; locale: Locale },
): RenderedEmail {
  return layout({
    t,
    locale: input.locale,
    heading: t("email.reminder.subject", { group: input.group }),
    intro: t("email.reminder.intro", { date: input.date, pending: input.pending, total: input.total }),
    preheader: t("email.reminder.preheader", { pending: input.pending }),
    blocks: [
      { label: t("email.reminder.adminLabel"), help: t("email.reminder.adminHelp"), url: input.adminUrl, button: t("email.reminder.adminButton"), tone: "primary" },
    ],
    notice: t("email.reminder.notice"),
    site: input.site,
  });
}
