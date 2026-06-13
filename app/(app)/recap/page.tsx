import { Metadata } from "next";
import { getWeekRecap } from "@/lib/recap";
import { RecapView } from "./_components/RecapView";

export const metadata: Metadata = { title: "Weekly Recap — LifeOS" };

export default async function RecapPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const weekOffset = Math.min(0, Number(week) || 0);
  const data = await getWeekRecap(weekOffset);

  return <RecapView data={data} weekOffset={weekOffset} />;
}
