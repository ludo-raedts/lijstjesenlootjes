import type { Metadata } from "next";
import { AudiencePage } from "@/components/AudiencePage";
import { publicPageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return publicPageMetadata("officeDraw", "meta.office.title", "meta.office.description");
}

export default function OfficeDrawPage() {
  return <AudiencePage prefix="office" primary="drawCreate" secondary="wishlistCreate" />;
}
