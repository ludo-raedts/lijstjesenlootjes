import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import type { MessageKey } from "@/i18n/messages";
import { getServerI18n } from "@/i18n/server";
import { getActiveAppearance } from "@/lib/theme-store";
import { publicPages, type PageKey } from "@/lib/paths";

const SIZE = { width: 1200, height: 630 } as const;

/** What each public page shows as its social headline. */
const HEADLINE_KEYS: Partial<Record<PageKey, MessageKey>> = {
  home: "meta.home.openGraphTitle",
  wishlistCreate: "meta.wishlistCreate.title",
  drawCreate: "meta.drawCreate.title",
  wheel: "meta.wheel.title",
  help: "meta.help.title",
  privacy: "meta.privacy.title",
};

async function loadAsset(url: URL): Promise<ArrayBuffer> {
  return (await fetch(url)).arrayBuffer();
}

/** Social share image (1200x630) in the visitor's domain language and the active seasonal theme. */
export async function GET(request: Request) {
  const { locale, t } = await getServerI18n();
  const requested = new URL(request.url).searchParams.get("p");
  const page = publicPages().find((candidate) => candidate.key === requested)?.key ?? "home";
  const headline = t(HEADLINE_KEYS[page] ?? "meta.home.openGraphTitle");
  const appearance = await getActiveAppearance(locale);

  // The font is bundled with the function (see outputFileTracingIncludes in next.config.ts).
  const font = await readFile(path.join(process.cwd(), "src/assets/fonts/atkinson-hyperlegible-700.woff"));
  // Public files are served by the CDN, not bundled with the function, so fetch the motif from the same origin.
  const motif = await loadAsset(new URL(appearance.definition.cornerMotif, request.url));
  const motifSrc = `data:image/svg+xml;base64,${Buffer.from(motif).toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: "64px 72px",
          background: "#f8f0e3",
          color: "#1d2a22",
          fontFamily: "Atkinson",
          borderBottom: "16px solid #1c4cb4",
        }}
      >
        <img src={motifSrc} width={260} height={260} style={{ position: "absolute", right: 0, top: 0 }} alt="" />
        <div style={{ display: "flex", fontSize: 34, letterSpacing: 1 }}>{t("app.name")}</div>
        <div style={{ display: "flex", maxWidth: 880, fontSize: headline.length > 46 ? 68 : 84, lineHeight: 1.05, fontWeight: 700 }}>
          {headline}
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#5a5f52" }}>{t("home.hero.eyebrow")}</div>
      </div>
    ),
    {
      ...SIZE,
      fonts: [{ name: "Atkinson", data: font.buffer.slice(font.byteOffset, font.byteOffset + font.byteLength) as ArrayBuffer, weight: 700, style: "normal" }],
      headers: { "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" },
    },
  );
}
