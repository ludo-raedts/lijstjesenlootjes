import type { Metadata } from "next";
import { AudiencePage } from "@/components/AudiencePage";
import { publicPageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return publicPageMetadata("christmasDraw", "meta.christmas.title", "meta.christmas.description");
}

export default function ChristmasDrawPage() {
  return <AudiencePage prefix="christmas" primary="drawCreate" secondary="wishlistCreate" />;
}
