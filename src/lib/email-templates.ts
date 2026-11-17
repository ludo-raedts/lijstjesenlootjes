import type { Translator } from "@/i18n/messages";

export type RenderedEmail = { subject: string; text: string; html: string };

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type Block = { label: string; help: string; url: string };

function layout(t: Translator, heading: string, intro: string, blocks: Block[], extra: string[], site: string): RenderedEmail {
  const footer = t("email.footer", { site });
  const text = [
    heading,
    "",
    intro,
    ...blocks.flatMap((block) => ["", block.label, block.url, block.help]),
    ...extra.flatMap((line) => ["", line]),
    "",
    "--",
    footer,
  ].join("\n");
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#faf7f2;font-family:Arial,Helvetica,sans-serif;color:#2a2420;line-height:1.5"><div style="max-width:560px;margin:0 auto;background:#ffffff;padding:24px;border-radius:8px"><h1 style="font-size:22px;margin:0 0 12px">${escapeHtml(heading)}</h1><p>${escapeHtml(intro)}</p>${blocks
    .map((block) => `<p style="margin:20px 0 4px"><strong>${escapeHtml(block.label)}</strong></p><p style="margin:0 0 4px;word-break:break-all"><a href="${escapeHtml(block.url)}" style="color:#1d5fa8">${escapeHtml(block.url)}</a></p><p style="margin:0;font-size:14px;color:#5b524a">${escapeHtml(block.help)}</p>`)
    .join("")}${extra.map((line) => `<p style="margin:20px 0 0;padding:12px;background:#fff4d6;border-radius:6px;font-size:14px">${escapeHtml(line)}</p>`).join("")}<hr style="border:none;border-top:1px solid #e6dfd5;margin:24px 0 12px"><p style="font-size:12px;color:#5b524a;margin:0">${escapeHtml(footer)}</p></div></body></html>`;
  return { subject: heading, text, html };
}

export function renderWishlistEmail(
  t: Translator,
  input: { title: string; manageUrl: string; guestUrl: string; site: string },
): RenderedEmail {
  return layout(
    t,
    t("email.wishlist.subject", { title: input.title }),
    t("email.wishlist.intro", { title: input.title }),
    [
      { label: t("email.wishlist.manageLabel"), help: t("email.wishlist.manageHelp"), url: input.manageUrl },
      { label: t("email.wishlist.guestLabel"), help: t("email.wishlist.guestHelp"), url: input.guestUrl },
    ],
    [],
    input.site,
  );
}

export function renderDrawEmail(
  t: Translator,
  input: {
    group: string;
    adminUrl: string;
    participants: Array<{ name: string; url: string }>;
    site: string;
  },
): RenderedEmail {
  return layout(
    t,
    t("email.draw.subject", { group: input.group }),
    t("email.draw.intro", { group: input.group }),
    [
      { label: t("email.draw.adminLabel"), help: t("email.draw.adminHelp"), url: input.adminUrl },
      ...input.participants.map((participant) => ({
        label: t("email.draw.participantLabel", { name: participant.name }),
        help: t("email.draw.participantHelp"),
        url: participant.url,
      })),
    ],
    [t("email.draw.spoilerWarning")],
    input.site,
  );
}
