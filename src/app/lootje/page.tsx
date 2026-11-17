import type { Metadata } from "next";
import { DrawReveal } from "@/components/DrawReveal";
import { getServerI18n } from "@/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return {
    title: t("meta.drawReveal.title"),
    description: t("meta.drawReveal.description"),
    robots: { index: false, follow: false },
    openGraph: { title: t("meta.drawReveal.openGraphTitle"), description: t("meta.drawReveal.openGraphDescription") },
  };
}

export default function DrawRevealPage() {
  return <div className="shell narrow page-section"><DrawReveal /></div>;
}
