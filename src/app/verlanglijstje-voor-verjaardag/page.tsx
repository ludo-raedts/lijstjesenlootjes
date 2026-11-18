import type { Metadata } from "next";
import { AudiencePage } from "@/components/AudiencePage";
import { publicPageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return publicPageMetadata("birthdayWishlist", "meta.birthday.title", "meta.birthday.description");
}

export default function BirthdayWishlistPage() {
  return <AudiencePage prefix="birthday" primary="wishlistCreate" secondary="drawCreate" />;
}
