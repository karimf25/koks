import { Metadata } from "next";
import { getAutomations, getRecentRuns } from "@/lib/automations";
import { serializeAutomation, serializeAgentRun } from "@/lib/serialize";
import { AutomationsView } from "./_components/AutomationsView";

export const metadata: Metadata = { title: "Automations — LifeOS" };

export default async function AutomationsPage() {
  const [automations, runs] = await Promise.all([getAutomations(), getRecentRuns()]);

  return (
    <AutomationsView
      initialAutomations={automations.map(serializeAutomation)}
      initialRuns={runs.map(serializeAgentRun)}
    />
  );
}
